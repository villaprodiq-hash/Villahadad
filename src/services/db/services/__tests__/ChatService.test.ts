import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../../../../../types';
import { UserRole } from '../../../../../types';

const createQueryBuilder = () => {
  const builder = {
    upsert: vi.fn(() => builder),
    select: vi.fn(() => builder),
    single: vi.fn(async () => ({ data: null, error: null })),
    delete: vi.fn(() => builder),
    eq: vi.fn(async () => ({ error: null })),
    update: vi.fn(() => builder),
    in: vi.fn(async () => ({ error: null })),
    gte: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(async () => ({ data: [], error: null })),
    like: vi.fn(() => builder),
  };
  return builder;
};

vi.mock('../../../supabase', () => {
  const channel = {
    on: vi.fn(() => channel),
    subscribe: vi.fn(() => channel),
  };

  return {
    supabase: {
      from: vi.fn(() => createQueryBuilder()),
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    },
  };
});

const PENDING_CHAT_SYNC_KEY = 'vh_pending_chat_sync_v1';

const getPendingQueue = () => {
  const raw = localStorage.getItem(PENDING_CHAT_SYNC_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed) ? parsed : [];
};

const withFixedUuid = (uuid: `${string}-${string}-${string}-${string}-${string}`) =>
  vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(uuid);

describe('ChatService', () => {
  beforeEach(() => {
    vi.resetModules();
    (navigator as { onLine: boolean }).onLine = false;
  });

  it('syncs retention duration and hides control messages from visible history', async () => {
    const { chatService } = await import('../ChatService');

    const manager: User = {
      id: 'manager_local_id',
      name: 'المدير',
      role: UserRole.MANAGER,
    };

    const retentionEvents: number[] = [];
    const visibleMessages: string[] = [];

    const unsubscribeRetention = chatService.subscribeRetention((durationMs) => {
      retentionEvents.push(durationMs);
    });
    const unsubscribeChat = chatService.subscribe((message) => {
      visibleMessages.push(message.id);
    });

    const normalized = await chatService.setRetentionDurationMs(5_000, manager);
    expect(normalized).toBe(5_000);

    await new Promise(resolve => setTimeout(resolve, 25));

    const lastRetentionEvent = retentionEvents[retentionEvents.length - 1];
    expect(lastRetentionEvent).toBe(5_000);
    expect(localStorage.getItem('vh_chat_retention_ms_v1')).toBe('5000');
    expect(visibleMessages.length).toBe(0);

    const recentMessages = await chatService.getRecentMessages(20);
    expect(recentMessages).toEqual([]);

    unsubscribeChat();
    unsubscribeRetention();
  });

  it('keeps retention control messages hidden from visible history', async () => {
    (navigator as { onLine: boolean }).onLine = true;
    const { chatService } = await import('../ChatService');

    localStorage.setItem(
      'vh_local_chat_messages_v1',
      JSON.stringify([
        {
          id: 'control_1',
          content:
            '__vh_chat_control__:' +
            JSON.stringify({
              kind: 'chat-control',
              version: 1,
              control: 'retention',
              retentionMs: 60_000,
              issuedBy: 'manager_remote',
              issuedAt: new Date().toISOString(),
            }),
          senderId: 'manager_remote',
          senderName: 'المدير',
          senderRole: UserRole.MANAGER,
          recipientId: null,
          type: 'text',
          createdAt: new Date().toISOString(),
          isRead: true,
        },
      ])
    );

    const recentMessages = await chatService.getRecentMessages(20);
    expect(recentMessages).toEqual([]);
  });

  it('rejects deleting a message when actor is not the owner', async () => {
    const { chatService } = await import('../ChatService');

    const sender: User = {
      id: 'sender_local',
      name: 'المستخدم',
      role: UserRole.RECEPTION,
    };

    await chatService.sendMessage('hello', sender, null, 'text', { skipRemote: true });
    const recentMessages = await chatService.getRecentMessages(20);
    const messageId = recentMessages[0]?.id;
    expect(typeof messageId).toBe('string');

    await expect(chatService.deleteMessage(messageId as string, 'another_user')).rejects.toThrow(
      'Only message owner can delete'
    );

    const remaining = await chatService.getRecentMessages(20);
    expect(remaining.some(message => message.id === messageId)).toBe(true);
  });

  it('queues cloud upsert while offline then flushes when online', async () => {
    const uuidSpy = withFixedUuid('11111111-1111-4111-8111-111111111111');
    const { chatService } = await import('../ChatService');

    const sender: User = {
      id: 'sender_offline',
      name: 'مرسل',
      role: UserRole.RECEPTION,
    };

    await chatService.sendMessage('offline text', sender, null, 'text');
    const pendingAfterOffline = getPendingQueue();

    expect(pendingAfterOffline).toHaveLength(1);
    expect(pendingAfterOffline[0]).toMatchObject({
      action: 'upsert',
      message: {
        id: '11111111-1111-4111-8111-111111111111',
      },
    });

    (navigator as { onLine: boolean }).onLine = true;
    await chatService.getRecentMessages(20);

    const pendingAfterOnline = getPendingQueue();
    expect(pendingAfterOnline).toHaveLength(0);
    uuidSpy.mockRestore();
  });

  it('does not queue LAN-only attachment for cloud sync', async () => {
    const uuidSpy = withFixedUuid('22222222-2222-4222-8222-222222222222');
    (navigator as { onLine: boolean }).onLine = true;
    const { chatService } = await import('../ChatService');
    const { supabase } = await import('../../../supabase');

    const sender: User = {
      id: 'sender_lan',
      name: 'مرسل LAN',
      role: UserRole.ADMIN,
    };

    await chatService.sendMessage(
      '__vh_attachment__:' +
        JSON.stringify({
          kind: 'attachment',
          transport: 'lan',
          fileName: 'design.psd',
          mimeType: 'application/octet-stream',
          size: 1024,
        }),
      sender,
      null,
      'file'
    );

    const pending = getPendingQueue();
    expect(pending).toHaveLength(0);

    const fromMock = supabase.from as unknown as { mock: { calls: unknown[][] } };
    expect(fromMock.mock.calls.length).toBe(0);
    uuidSpy.mockRestore();
  });

  it('queues delete while offline and flushes delete when online', async () => {
    const uuidSpy = withFixedUuid('33333333-3333-4333-8333-333333333333');
    const { chatService } = await import('../ChatService');

    const sender: User = {
      id: 'sender_delete',
      name: 'مرسل حذف',
      role: UserRole.MANAGER,
    };

    await chatService.sendMessage('to-delete', sender, null, 'text');
    await chatService.deleteMessage('33333333-3333-4333-8333-333333333333', sender.id);

    const pendingAfterDelete = getPendingQueue();
    expect(pendingAfterDelete).toHaveLength(1);
    expect(pendingAfterDelete[0]).toMatchObject({
      action: 'delete',
      messageId: '33333333-3333-4333-8333-333333333333',
    });

    (navigator as { onLine: boolean }).onLine = true;
    await chatService.getRecentMessages(20);

    const pendingAfterFlush = getPendingQueue();
    expect(pendingAfterFlush).toHaveLength(0);
    uuidSpy.mockRestore();
  });
});
