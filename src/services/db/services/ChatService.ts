import { supabase } from '../../supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { User } from '../../../types';

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  recipientId?: string | null;
  type: 'text' | 'image' | 'file' | 'audio';
  createdAt: string;
  isRead: boolean;
}

interface SendMessageOptions {
  skipRemote?: boolean;
}

interface MessageRow {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  recipient_id: string | null;
  type: 'text' | 'image' | 'file' | 'audio';
  created_at: string;
  is_read: boolean;
}

const LOCAL_MESSAGES_KEY = 'vh_local_chat_messages_v1';
const LOCAL_MESSAGE_EVENT = 'vh:chat-message';
const LOCAL_MESSAGE_DELETED_EVENT = 'vh:chat-message-deleted';
const LOCAL_RETENTION_EVENT = 'vh:chat-retention-updated';
const DAY_MS = 24 * 60 * 60 * 1000;
const CHAT_RETENTION_MS_DEFAULT = 60 * DAY_MS;
const CHAT_RETENTION_MS_MIN = 5 * 1000;
const CHAT_RETENTION_MS_MAX = 365 * DAY_MS;
const CHAT_RETENTION_MS_KEY = 'vh_chat_retention_ms_v1';
const CHAT_RETENTION_DAYS_LEGACY_KEY = 'vh_chat_retention_days_v1';
const PENDING_CHAT_SYNC_KEY = 'vh_pending_chat_sync_v1';
const SQLITE_POLL_INTERVAL_MS = 1500;
const LAN_CHAT_CHANNEL = 'chat-message';
const CHAT_CONTROL_PREFIX = '__vh_chat_control__:';
const CHAT_CONTROL_VERSION = 1;

interface LanChatPayload {
  action?: 'upsert' | 'delete';
  message?: ChatMessage;
  messageId?: string;
}

interface LanSyncEvent {
  channel?: string;
  payload?: unknown;
}

interface PendingChatSyncItem {
  action: 'upsert' | 'delete';
  message?: ChatMessage;
  messageId?: string;
  queuedAt: string;
}

interface ChatRetentionControlPayload {
  kind: 'chat-control';
  version: number;
  control: 'retention';
  retentionMs: number;
  issuedBy?: string;
  issuedAt: string;
}

interface ChatRetentionEventDetail {
  durationMs: number;
  source: 'local' | 'sync';
  issuedBy?: string;
  issuedAt?: string;
}

class ChatService {
  private channel: RealtimeChannel | null = null;
  private sqliteReady = false;
  private chatRetentionMs = CHAT_RETENTION_MS_DEFAULT;
  private isFlushingPendingSync = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.chatRetentionMs = this.readRetentionMs();
      window.addEventListener('online', () => {
        void this.flushPendingCloudSync();
      });
    }
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  private getDb() {
    if (typeof window === 'undefined') return null;
    return window.electronAPI?.db ?? null;
  }

  private getLanSync() {
    if (typeof window === 'undefined') return null;
    return window.electronAPI?.lanSync ?? null;
  }

  private generateMessageId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `local_msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private hasInternetConnection(): boolean {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  }

  private readPendingSyncItems(): PendingChatSyncItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(PENDING_CHAT_SYNC_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item): item is PendingChatSyncItem => {
        if (typeof item !== 'object' || item === null) return false;
        const value = item as PendingChatSyncItem;
        return (
          (value.action === 'upsert' || value.action === 'delete') &&
          typeof value.queuedAt === 'string'
        );
      });
    } catch (error) {
      console.error('[ChatService] Failed to read pending sync queue:', error);
      return [];
    }
  }

  private savePendingSyncItems(items: PendingChatSyncItem[]) {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(PENDING_CHAT_SYNC_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('[ChatService] Failed to save pending sync queue:', error);
    }
  }

  private enqueuePendingUpsert(message: ChatMessage) {
    const queue = this.readPendingSyncItems();
    const withoutDuplicate = queue.filter(item => {
      if (item.action !== 'upsert') return true;
      return item.message?.id !== message.id;
    });
    withoutDuplicate.push({
      action: 'upsert',
      message,
      queuedAt: new Date().toISOString()
    });
    this.savePendingSyncItems(withoutDuplicate);
  }

  private enqueuePendingDelete(messageId: string) {
    if (!messageId) return;
    const queue = this.readPendingSyncItems();
    const filtered = queue.filter(item => {
      if (item.action === 'delete') return item.messageId !== messageId;
      if (item.action === 'upsert') return item.message?.id !== messageId;
      return true;
    });
    filtered.push({
      action: 'delete',
      messageId,
      queuedAt: new Date().toISOString()
    });
    this.savePendingSyncItems(filtered);
  }

  private shouldSyncMessageToCloud(message: ChatMessage): boolean {
    if (!message?.id || !this.isUuid(message.id)) return false;
    if (typeof message.content !== 'string') return false;

    // LAN-only attachments should stay local/LAN.
    if (message.content.startsWith('__vh_attachment__:')) {
      try {
        const parsed = JSON.parse(message.content.slice('__vh_attachment__:'.length)) as {
          transport?: string;
        };
        if (parsed?.transport === 'lan') return false;
      } catch {
        return false;
      }
    }

    return true;
  }

  private isRetentionControlContent(content: string): boolean {
    return typeof content === 'string' && content.startsWith(CHAT_CONTROL_PREFIX);
  }

  private parseRetentionControl(content: string): ChatRetentionControlPayload | null {
    if (!this.isRetentionControlContent(content)) return null;
    try {
      const payload = JSON.parse(content.slice(CHAT_CONTROL_PREFIX.length)) as ChatRetentionControlPayload;
      if (
        payload &&
        payload.kind === 'chat-control' &&
        payload.control === 'retention' &&
        Number.isFinite(payload.retentionMs) &&
        typeof payload.issuedAt === 'string'
      ) {
        return payload;
      }
      return null;
    } catch {
      return null;
    }
  }

  private buildRetentionControlContent(
    durationMs: number,
    actor: Pick<User, 'id'> | null | undefined
  ): string {
    const normalized = this.clampRetentionMs(durationMs);
    const payload: ChatRetentionControlPayload = {
      kind: 'chat-control',
      version: CHAT_CONTROL_VERSION,
      control: 'retention',
      retentionMs: normalized,
      issuedBy: actor?.id,
      issuedAt: new Date().toISOString()
    };
    return `${CHAT_CONTROL_PREFIX}${JSON.stringify(payload)}`;
  }

  private dispatchRetentionEvent(detail: ChatRetentionEventDetail) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<ChatRetentionEventDetail>(LOCAL_RETENTION_EVENT, { detail }));
  }

  private async applyRetentionDurationMs(
    durationMs: number,
    source: 'local' | 'sync',
    meta?: { issuedBy?: string; issuedAt?: string }
  ): Promise<number> {
    const normalized = this.clampRetentionMs(durationMs);
    this.chatRetentionMs = normalized;
    this.persistRetentionMs(normalized);
    await this.pruneCachesByRetention();
    this.dispatchRetentionEvent({
      durationMs: normalized,
      source,
      issuedBy: meta?.issuedBy,
      issuedAt: meta?.issuedAt
    });
    return normalized;
  }

  private pickLatestRetentionFromMessages(messages: ChatMessage[]): ChatRetentionControlPayload | null {
    let latest: ChatRetentionControlPayload | null = null;
    let latestTime = -1;

    for (const message of messages) {
      const control = this.parseRetentionControl(message.content);
      if (!control) continue;
      const issuedAtTime = new Date(control.issuedAt).getTime();
      const fallbackTime = new Date(message.createdAt).getTime();
      const candidateTime = Number.isFinite(issuedAtTime) ? issuedAtTime : fallbackTime;
      if (!Number.isFinite(candidateTime)) continue;
      if (candidateTime > latestTime) {
        latestTime = candidateTime;
        latest = control;
      }
    }

    return latest;
  }

  private clampRetentionMs(value: number): number {
    if (!Number.isFinite(value)) return CHAT_RETENTION_MS_DEFAULT;
    const rounded = Math.round(value);
    return Math.min(CHAT_RETENTION_MS_MAX, Math.max(CHAT_RETENTION_MS_MIN, rounded));
  }

  private readRetentionMs(): number {
    if (typeof window === 'undefined') return this.chatRetentionMs;
    try {
      const rawMs = window.localStorage.getItem(CHAT_RETENTION_MS_KEY);
      if (rawMs) {
        return this.clampRetentionMs(Number(rawMs));
      }

      const rawLegacyDays = window.localStorage.getItem(CHAT_RETENTION_DAYS_LEGACY_KEY);
      if (rawLegacyDays) {
        return this.clampRetentionMs(Number(rawLegacyDays) * DAY_MS);
      }

      return CHAT_RETENTION_MS_DEFAULT;
    } catch {
      return CHAT_RETENTION_MS_DEFAULT;
    }
  }

  private persistRetentionMs(durationMs: number) {
    if (typeof window === 'undefined') return;
    try {
      const normalized = this.clampRetentionMs(durationMs);
      window.localStorage.setItem(CHAT_RETENTION_MS_KEY, String(normalized));
      // Keep backward compatibility with old builds that still read day-based retention.
      window.localStorage.setItem(CHAT_RETENTION_DAYS_LEGACY_KEY, String(Math.max(1, Math.round(normalized / DAY_MS))));
    } catch (error) {
      console.error('[ChatService] Failed to persist retention duration:', error);
    }
  }

  private getRetentionCutoff(durationMs = this.chatRetentionMs): number {
    return Date.now() - this.clampRetentionMs(durationMs);
  }

  private getRetentionCutoffIso(durationMs = this.chatRetentionMs): string {
    return new Date(this.getRetentionCutoff(durationMs)).toISOString();
  }

  private toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') return value.toLowerCase().trim() === 'true' || value === '1';
    return false;
  }

  private mapRowToMessage(row: MessageRow): ChatMessage {
    return {
      id: row.id,
      content: row.content,
      senderId: row.sender_id,
      senderName: row.sender_name,
      senderRole: row.sender_role,
      recipientId: row.recipient_id,
      type: row.type,
      createdAt: row.created_at,
      isRead: row.is_read
    };
  }

  private isMessageRow(value: unknown): value is MessageRow {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as MessageRow).id === 'string' &&
      typeof (value as MessageRow).content === 'string' &&
      typeof (value as MessageRow).sender_id === 'string' &&
      typeof (value as MessageRow).sender_name === 'string' &&
      typeof (value as MessageRow).sender_role === 'string' &&
      typeof (value as MessageRow).created_at === 'string'
    );
  }

  private mapSqliteRowToMessage(value: unknown): ChatMessage | null {
    if (typeof value !== 'object' || value === null) return null;
    const row = value as Record<string, unknown>;

    const id = typeof row.id === 'string' ? row.id : '';
    const content = typeof row.content === 'string' ? row.content : '';
    const senderId =
      typeof row.senderId === 'string'
        ? row.senderId
        : typeof row.sender_id === 'string'
          ? row.sender_id
          : '';
    const senderName =
      typeof row.senderName === 'string'
        ? row.senderName
        : typeof row.sender_name === 'string'
          ? row.sender_name
          : '';
    const senderRole =
      typeof row.senderRole === 'string'
        ? row.senderRole
        : typeof row.sender_role === 'string'
          ? row.sender_role
          : '';
    const createdAt =
      typeof row.createdAt === 'string'
        ? row.createdAt
        : typeof row.created_at === 'string'
          ? row.created_at
          : new Date().toISOString();

    if (!id || !content || !senderId || !senderName || !senderRole) return null;

    const typeValue =
      row.type === 'image' || row.type === 'file' || row.type === 'audio' || row.type === 'text'
        ? row.type
        : 'text';

    return {
      id,
      content,
      senderId,
      senderName,
      senderRole,
      recipientId:
        typeof row.recipientId === 'string'
          ? row.recipientId
          : typeof row.recipient_id === 'string'
            ? row.recipient_id
            : null,
      type: typeValue,
      createdAt,
      isRead: this.toBoolean(row.isRead ?? row.is_read)
    };
  }

  private readLocalMessages(): ChatMessage[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(LOCAL_MESSAGES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item): item is ChatMessage =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as ChatMessage).id === 'string' &&
          typeof (item as ChatMessage).content === 'string'
      );
    } catch (error) {
      console.error('[ChatService] Failed to read local messages:', error);
      return [];
    }
  }

  private saveLocalMessages(messages: ChatMessage[]) {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error('[ChatService] Failed to write local messages:', error);
    }
  }

  private dispatchLocalDeleteEvent(messageId: string) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<string>(LOCAL_MESSAGE_DELETED_EVENT, { detail: messageId }));
  }

  private removeMessageFromLocalCache(messageId: string): boolean {
    if (!messageId) return false;
    const local = this.readLocalMessages();
    const next = local.filter(message => message.id !== messageId);
    if (next.length === local.length) return false;
    this.saveLocalMessages(next);
    return true;
  }

  private normalizeMessages(messages: ChatMessage[]): ChatMessage[] {
    const cutoffTime = this.getRetentionCutoff();

    const deduped = new Map<string, ChatMessage>();
    for (const message of messages) {
      if (!message?.id) continue;
      if (this.isRetentionControlContent(message.content)) {
        deduped.set(message.id, message);
        continue;
      }
      const createdTime = new Date(message.createdAt || '').getTime();
      if (Number.isFinite(createdTime) && createdTime < cutoffTime) continue;
      deduped.set(message.id, message);
    }

    return Array.from(deduped.values()).sort((a, b) => {
      const aTime = new Date(a.createdAt || '').getTime();
      const bTime = new Date(b.createdAt || '').getTime();
      return aTime - bTime;
    });
  }

  private async ensureSqliteMessagesTable() {
    if (this.sqliteReady) return;
    const db = this.getDb();
    if (!db?.run) return;

    try {
      await db.run(`
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          senderId TEXT NOT NULL,
          senderName TEXT NOT NULL,
          senderRole TEXT NOT NULL,
          recipientId TEXT,
          type TEXT NOT NULL DEFAULT 'text',
          createdAt TEXT NOT NULL,
          isRead INTEGER NOT NULL DEFAULT 0
        )
      `);
      this.sqliteReady = true;
    } catch (error) {
      console.error('[ChatService] Failed to ensure sqlite messages table:', error);
    }
  }

  private async upsertSqliteMessage(message: ChatMessage) {
    const db = this.getDb();
    if (!db?.run) return;
    await this.ensureSqliteMessagesTable();

    try {
      await db.run(
        `
          INSERT INTO messages (
            id, content, senderId, senderName, senderRole, recipientId, type, createdAt, isRead
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            content = excluded.content,
            senderId = excluded.senderId,
            senderName = excluded.senderName,
            senderRole = excluded.senderRole,
            recipientId = excluded.recipientId,
            type = excluded.type,
            createdAt = excluded.createdAt,
            isRead = excluded.isRead
        `,
        [
          message.id,
          message.content,
          message.senderId,
          message.senderName,
          message.senderRole,
          message.recipientId ?? null,
          message.type,
          message.createdAt,
          message.isRead ? 1 : 0
        ]
      );
    } catch (error) {
      console.error('[ChatService] Failed to upsert sqlite message:', error);
    }
  }

  private async fetchSqliteMessages(limit = 300): Promise<ChatMessage[]> {
    const db = this.getDb();
    if (!db?.query) return [];
    await this.ensureSqliteMessagesTable();

    try {
      const cutoffIso = this.getRetentionCutoffIso();
      const rows = await db.query(
        `
          SELECT id, content, senderId, senderName, senderRole, recipientId, type, createdAt, isRead
          FROM messages
          WHERE createdAt >= ? OR content LIKE ?
          ORDER BY createdAt DESC
          LIMIT ?
        `,
        [cutoffIso, `${CHAT_CONTROL_PREFIX}%`, limit]
      );

      if (!Array.isArray(rows)) return [];
      const parsed = rows
        .map(row => this.mapSqliteRowToMessage(row))
        .filter((message): message is ChatMessage => message !== null);

      return this.normalizeMessages(parsed);
    } catch (error) {
      console.error('[ChatService] Failed to read sqlite messages:', error);
      return [];
    }
  }

  private async persistAndBroadcast(message: ChatMessage) {
    await this.upsertSqliteMessage(message);
    const next = this.normalizeMessages([...this.readLocalMessages(), message]);
    this.saveLocalMessages(next);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent<ChatMessage>(LOCAL_MESSAGE_EVENT, { detail: message }));
    }
  }

  private isChatMessage(value: unknown): value is ChatMessage {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as ChatMessage).id === 'string' &&
      typeof (value as ChatMessage).content === 'string' &&
      typeof (value as ChatMessage).senderId === 'string' &&
      typeof (value as ChatMessage).senderName === 'string' &&
      typeof (value as ChatMessage).senderRole === 'string' &&
      typeof (value as ChatMessage).createdAt === 'string'
    );
  }

  private async publishLanMessage(message: ChatMessage) {
    const lanSync = this.getLanSync();
    if (!lanSync?.publish) return;

    try {
      await lanSync.publish(LAN_CHAT_CHANNEL, { action: 'upsert', message });
    } catch (error) {
      console.error('[ChatService] LAN publish failed:', error);
    }
  }

  private async publishLanDelete(messageId: string) {
    const lanSync = this.getLanSync();
    if (!lanSync?.publish) return;

    try {
      await lanSync.publish(LAN_CHAT_CHANNEL, { action: 'delete', messageId });
    } catch (error) {
      console.error('[ChatService] LAN delete publish failed:', error);
    }
  }

  private async deleteSqliteMessage(messageId: string) {
    const db = this.getDb();
    if (!db?.run) return;
    await this.ensureSqliteMessagesTable();
    try {
      await db.run(`DELETE FROM messages WHERE id = ?`, [messageId]);
    } catch (error) {
      console.error('[ChatService] Failed to delete sqlite message:', error);
    }
  }

  private async removeMessageFromCaches(messageId: string, emitEvent: boolean) {
    if (!messageId) return;
    await this.deleteSqliteMessage(messageId);
    const removed = this.removeMessageFromLocalCache(messageId);
    if (emitEvent && removed) this.dispatchLocalDeleteEvent(messageId);
  }

  private async pruneCachesByRetention() {
    const cutoffTime = this.getRetentionCutoff();
    const cutoffIso = this.getRetentionCutoffIso();

    const local = this.readLocalMessages();
    const next = local.filter(message => {
      if (this.isRetentionControlContent(message.content)) return true;
      const created = new Date(message.createdAt || '').getTime();
      if (!Number.isFinite(created)) return true;
      return created >= cutoffTime;
    });
    this.saveLocalMessages(next);

    const db = this.getDb();
    if (db?.run) {
      await this.ensureSqliteMessagesTable();
      try {
        await db.run(
          `DELETE FROM messages WHERE createdAt < ? AND content NOT LIKE ?`,
          [cutoffIso, `${CHAT_CONTROL_PREFIX}%`]
        );
      } catch (error) {
        console.error('[ChatService] Failed to prune sqlite messages by retention:', error);
      }
    }
  }

  getRetentionDurationMs(): number {
    this.chatRetentionMs = this.readRetentionMs();
    return this.chatRetentionMs;
  }

  private async broadcastRetentionControlMessage(
    durationMs: number,
    actor: Pick<User, 'id' | 'name' | 'role'>
  ): Promise<void> {
    const controlMessage: ChatMessage = {
      id: this.generateMessageId(),
      content: this.buildRetentionControlContent(durationMs, actor),
      senderId: actor.id,
      senderName: actor.name,
      senderRole: actor.role,
      recipientId: null,
      type: 'text',
      createdAt: new Date().toISOString(),
      isRead: true
    };

    await this.persistAndBroadcast(controlMessage);
    await this.publishLanMessage(controlMessage);

    if (!this.shouldSyncMessageToCloud(controlMessage)) return;

    if (!this.hasInternetConnection()) {
      this.enqueuePendingUpsert(controlMessage);
      return;
    }

    await this.flushPendingCloudSync();
    try {
      const persisted = await this.pushMessageToCloud(controlMessage);
      if (persisted) {
        await this.persistAndBroadcast(persisted);
      }
    } catch (error) {
      console.error('[ChatService] Failed to sync retention control, queued locally:', error);
      this.enqueuePendingUpsert(controlMessage);
    }
  }

  async setRetentionDurationMs(durationMs: number, actor?: Pick<User, 'id' | 'name' | 'role'>): Promise<number> {
    const normalized = await this.applyRetentionDurationMs(durationMs, 'local', {
      issuedBy: actor?.id,
      issuedAt: new Date().toISOString()
    });
    if (actor) {
      await this.broadcastRetentionControlMessage(normalized, actor);
    }
    return normalized;
  }

  subscribeRetention(callback: (durationMs: number, detail: ChatRetentionEventDetail) => void): () => void {
    if (typeof window === 'undefined') {
      return () => {};
    }

    const onRetentionUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<ChatRetentionEventDetail>;
      const detail = customEvent.detail;
      if (!detail || !Number.isFinite(detail.durationMs)) return;
      callback(detail.durationMs, detail);
    };

    window.addEventListener(LOCAL_RETENTION_EVENT, onRetentionUpdate as EventListener);
    return () => {
      window.removeEventListener(LOCAL_RETENTION_EVENT, onRetentionUpdate as EventListener);
    };
  }

  // Backward compatibility for any legacy callers.
  getRetentionDays(): number {
    const durationMs = this.getRetentionDurationMs();
    return Math.max(1, Math.round(durationMs / DAY_MS));
  }

  // Backward compatibility for any legacy callers.
  async setRetentionDays(days: number): Promise<number> {
    const normalizedDuration = await this.setRetentionDurationMs(days * DAY_MS);
    return Math.max(1, Math.round(normalizedDuration / DAY_MS));
  }

  private async pushMessageToCloud(message: ChatMessage): Promise<ChatMessage | null> {
    if (!this.shouldSyncMessageToCloud(message)) return message;

    const messagePayload = {
      id: message.id,
      content: message.content,
      sender_id: message.senderId,
      sender_name: message.senderName,
      sender_role: message.senderRole,
      recipient_id: message.recipientId ?? null,
      type: message.type,
      created_at: message.createdAt,
      is_read: message.isRead
    };

    const { data, error } = await supabase.from('messages').upsert(messagePayload).select().single();
    if (error) throw error;
    if (!this.isMessageRow(data)) return message;
    return this.mapRowToMessage(data);
  }

  private async flushPendingCloudSync() {
    if (!this.hasInternetConnection()) return;
    if (this.isFlushingPendingSync) return;

    this.isFlushingPendingSync = true;
    try {
      const queue = this.readPendingSyncItems().sort((a, b) => {
        const aTime = new Date(a.queuedAt).getTime();
        const bTime = new Date(b.queuedAt).getTime();
        return aTime - bTime;
      });

      if (queue.length === 0) return;
      const remaining: PendingChatSyncItem[] = [];

      for (const item of queue) {
        try {
          if (item.action === 'upsert' && item.message) {
            const synced = await this.pushMessageToCloud(item.message);
            if (synced) {
              await this.persistAndBroadcast(synced);
            }
            continue;
          }

          if (item.action === 'delete' && typeof item.messageId === 'string' && this.isUuid(item.messageId)) {
            const { error } = await supabase.from('messages').delete().eq('id', item.messageId);
            if (error) throw error;
            continue;
          }
        } catch (error) {
          console.error('[ChatService] Failed to sync pending chat item:', error);
          remaining.push(item);
        }
      }

      this.savePendingSyncItems(remaining);
    } finally {
      this.isFlushingPendingSync = false;
    }
  }

  async deleteMessage(messageId: string, actorUserId?: string): Promise<boolean> {
    if (!messageId) return false;
    if (actorUserId) {
      const localMessage = this.readLocalMessages().find(message => message.id === messageId);
      if (localMessage && localMessage.senderId !== actorUserId) {
        throw new Error('Only message owner can delete');
      }
    }

    await this.removeMessageFromCaches(messageId, true);
    await this.publishLanDelete(messageId);

    if (!this.hasInternetConnection()) {
      this.enqueuePendingDelete(messageId);
      return true;
    }
    if (!this.isUuid(messageId)) return true;

    try {
      const { error } = await supabase.from('messages').delete().eq('id', messageId);
      if (error) {
        console.error('[ChatService] Failed to delete remote message:', error);
        this.enqueuePendingDelete(messageId);
      }
    } catch (error) {
      console.error('[ChatService] Failed to delete remote message:', error);
      this.enqueuePendingDelete(messageId);
    }

    return true;
  }

  async sendMessage(
    content: string,
    sender: User,
    recipientId?: string | null,
    type: 'text' | 'image' | 'file' | 'audio' = 'text',
    options: SendMessageOptions = {}
  ) {
    const localMessage: ChatMessage = {
      id: this.generateMessageId(),
      content,
      senderId: sender.id,
      senderName: sender.name,
      senderRole: sender.role,
      recipientId: recipientId || null,
      type,
      createdAt: new Date().toISOString(),
      isRead: false
    };

    await this.persistAndBroadcast(localMessage);
    await this.publishLanMessage(localMessage);

    if (options.skipRemote) {
      return localMessage;
    }

    if (!this.shouldSyncMessageToCloud(localMessage)) {
      return localMessage;
    }

    if (!this.hasInternetConnection()) {
      this.enqueuePendingUpsert(localMessage);
      return localMessage;
    }

    await this.flushPendingCloudSync();

    try {
      const persistedMessage = await this.pushMessageToCloud(localMessage);
      if (!persistedMessage) return localMessage;
      await this.persistAndBroadcast(persistedMessage);
      return persistedMessage;
    } catch (error) {
      console.error('[ChatService] Supabase send failed, kept LAN/local copy:', error);
      this.enqueuePendingUpsert(localMessage);
      return localMessage;
    }
  }

  async updateMessage(messageId: string, nextContent: string, actorUserId: string): Promise<ChatMessage | null> {
    const trimmedContent = nextContent.trim();
    if (!messageId || !trimmedContent || !actorUserId) return null;

    const localMessages = this.readLocalMessages();
    const currentMessage = localMessages.find(message => message.id === messageId);
    if (!currentMessage) return null;
    if (currentMessage.senderId !== actorUserId) {
      throw new Error('Only message owner can edit');
    }
    if (currentMessage.content === trimmedContent) {
      return currentMessage;
    }

    const updatedMessage: ChatMessage = {
      ...currentMessage,
      content: trimmedContent
    };

    await this.persistAndBroadcast(updatedMessage);
    await this.publishLanMessage(updatedMessage);

    if (!this.shouldSyncMessageToCloud(updatedMessage)) {
      return updatedMessage;
    }

    if (!this.hasInternetConnection()) {
      this.enqueuePendingUpsert(updatedMessage);
      return updatedMessage;
    }

    await this.flushPendingCloudSync();

    try {
      const persistedMessage = await this.pushMessageToCloud(updatedMessage);
      if (!persistedMessage) return updatedMessage;
      await this.persistAndBroadcast(persistedMessage);
      return persistedMessage;
    } catch (error) {
      console.error('[ChatService] Failed to update remote message, kept LAN/local copy:', error);
      this.enqueuePendingUpsert(updatedMessage);
      return updatedMessage;
    }
  }

  async markAllAsRead(currentUserId: string): Promise<number> {
    if (!currentUserId) return 0;

    const localMessages = this.readLocalMessages();
    const updatedMessages: ChatMessage[] = [];
    const nextLocal = localMessages.map(message => {
      const shouldMarkRead =
        !message.isRead &&
        !this.isRetentionControlContent(message.content) &&
        message.senderId !== currentUserId &&
        (!message.recipientId || message.recipientId === currentUserId);

      if (!shouldMarkRead) return message;

      const updated = { ...message, isRead: true };
      updatedMessages.push(updated);
      return updated;
    });

    if (updatedMessages.length === 0) return 0;

    this.saveLocalMessages(nextLocal);
    await Promise.all(updatedMessages.map(message => this.upsertSqliteMessage(message)));

    if (!this.hasInternetConnection()) {
      return updatedMessages.length;
    }

    const remoteIds = updatedMessages
      .map(message => message.id)
      .filter(id => this.isUuid(id));

    if (remoteIds.length > 0) {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', remoteIds);
      if (error) {
        console.error('[ChatService] Failed to mark remote messages as read:', error);
      }
    }

    return updatedMessages.length;
  }

  getUnreadCountForUser(currentUserId: string): number {
    if (!currentUserId) return 0;
    const localMessages = this.readLocalMessages();
    return localMessages.filter(message => {
      return (
        !message.isRead &&
        !this.isRetentionControlContent(message.content) &&
        message.senderId !== currentUserId &&
        (!message.recipientId || message.recipientId === currentUserId)
      );
    }).length;
  }

  subscribe(callback: (message: ChatMessage) => void, onDelete?: (messageId: string) => void) {
    let removeLocalListener: (() => void) | null = null;
    let removeLocalDeleteListener: (() => void) | null = null;
    let removeLanListener: (() => void) | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    const knownMessageSignatures = new Map<string, string>();
    let initialized = false;

    const buildSignature = (message: ChatMessage): string =>
      `${message.content}|${message.type}|${message.isRead ? 1 : 0}|${message.createdAt}`;

    const processRetentionControlMessage = (message: ChatMessage): boolean => {
      const control = this.parseRetentionControl(message.content);
      if (!control) return false;
      void this.applyRetentionDurationMs(control.retentionMs, 'sync', {
        issuedBy: control.issuedBy,
        issuedAt: control.issuedAt
      });
      return true;
    };

    const dispatchMessage = (message: ChatMessage) => {
      const nextSignature = buildSignature(message);
      const previousSignature = knownMessageSignatures.get(message.id);
      if (previousSignature === nextSignature) return;
      knownMessageSignatures.set(message.id, nextSignature);
      if (processRetentionControlMessage(message)) return;
      callback(message);
    };

    if (typeof window !== 'undefined') {
      const onLocalMessage = (event: Event) => {
        const customEvent = event as CustomEvent<ChatMessage>;
        if (!customEvent.detail) return;
        dispatchMessage(customEvent.detail);
      };
      window.addEventListener(LOCAL_MESSAGE_EVENT, onLocalMessage as EventListener);
      removeLocalListener = () =>
        window.removeEventListener(LOCAL_MESSAGE_EVENT, onLocalMessage as EventListener);

      const onLocalDelete = (event: Event) => {
        const customEvent = event as CustomEvent<string>;
        const messageId = typeof customEvent.detail === 'string' ? customEvent.detail : '';
        if (!messageId) return;
        knownMessageSignatures.delete(messageId);
        onDelete?.(messageId);
      };
      window.addEventListener(LOCAL_MESSAGE_DELETED_EVENT, onLocalDelete as EventListener);
      removeLocalDeleteListener = () =>
        window.removeEventListener(LOCAL_MESSAGE_DELETED_EVENT, onLocalDelete as EventListener);
    }

    const lanSync = this.getLanSync();
    if (lanSync?.onEvent) {
      removeLanListener = lanSync.onEvent((event: LanSyncEvent) => {
        if (!event || event.channel !== LAN_CHAT_CHANNEL) return;

        const payload = (event.payload as LanChatPayload | null) ?? null;
        if (!payload) return;

        if (payload.action === 'delete' && typeof payload.messageId === 'string') {
          void this.removeMessageFromCaches(payload.messageId, true);
          return;
        }

        if (!payload.message || !this.isChatMessage(payload.message)) return;
        void this.persistAndBroadcast(payload.message);
        dispatchMessage(payload.message);
      });
    }

    const pollSqlite = async () => {
      if (this.hasInternetConnection()) {
        await this.flushPendingCloudSync();
      }

      const sqliteMessages = await this.fetchSqliteMessages();
      const merged = this.normalizeMessages([...this.readLocalMessages(), ...sqliteMessages]);
      this.saveLocalMessages(merged);

      if (!initialized) {
        const latestRetention = this.pickLatestRetentionFromMessages(merged);
        if (latestRetention) {
          await this.applyRetentionDurationMs(latestRetention.retentionMs, 'sync', {
            issuedBy: latestRetention.issuedBy,
            issuedAt: latestRetention.issuedAt
          });
        }
        for (const message of merged) {
          knownMessageSignatures.set(message.id, buildSignature(message));
        }
        initialized = true;
        return;
      }

      for (const message of merged) {
        dispatchMessage(message);
      }
    };

    void pollSqlite();
    pollTimer = setInterval(() => {
      void pollSqlite();
    }, SQLITE_POLL_INTERVAL_MS);

    if (this.hasInternetConnection()) {
      this.channel = supabase
        .channel('chat-room')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages' },
          payload => {
            if (payload.eventType === 'DELETE') {
              const oldRow = payload.old as Record<string, unknown> | null;
              const messageId = typeof oldRow?.id === 'string' ? oldRow.id : '';
              if (!messageId) return;
              knownMessageSignatures.delete(messageId);
              void this.removeMessageFromCaches(messageId, true);
              return;
            }

            const row = payload.new as RealtimePostgresChangesPayload<MessageRow>['new'];
            if (!this.isMessageRow(row)) return;
            const message = this.mapRowToMessage(row);
            void this.persistAndBroadcast(message);
            dispatchMessage(message);
          }
        )
        .subscribe();
    }

    return () => {
      if (this.channel) supabase.removeChannel(this.channel);
      this.channel = null;
      removeLocalListener?.();
      removeLocalDeleteListener?.();
      removeLanListener?.();
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
    };
  }

  async getRecentMessages(limit = 100): Promise<ChatMessage[]> {
    this.chatRetentionMs = this.readRetentionMs();
    const localMessages = this.readLocalMessages();
    const sqliteMessages = await this.fetchSqliteMessages(limit * 3);
    const baseline = this.normalizeMessages([...localMessages, ...sqliteMessages]);
    this.saveLocalMessages(baseline);
    const visibleBaseline = baseline.filter(message => !this.isRetentionControlContent(message.content));

    if (!this.hasInternetConnection()) {
      return visibleBaseline.slice(-limit);
    }

    await this.flushPendingCloudSync();

    const cutoffIso = this.getRetentionCutoffIso();

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .gte('created_at', cutoffIso)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const remoteRows = (data ?? []) as MessageRow[];
      const remoteMessages = remoteRows.filter(this.isMessageRow.bind(this)).map(row => this.mapRowToMessage(row));

      let latestRemoteControlMessage: ChatMessage | null = null;
      try {
        const { data: controlData, error: controlError } = await supabase
          .from('messages')
          .select('*')
          .like('content', `${CHAT_CONTROL_PREFIX}%`)
          .order('created_at', { ascending: false })
          .limit(1);
        if (controlError) throw controlError;
        const controlRows = (controlData ?? []) as MessageRow[];
        const mappedControl = controlRows
          .filter(this.isMessageRow.bind(this))
          .map(row => this.mapRowToMessage(row))
          .at(0);
        if (mappedControl) {
          latestRemoteControlMessage = mappedControl;
        }
      } catch (controlError) {
        console.error('[ChatService] Failed to fetch latest retention control message:', controlError);
      }

      const merged = this.normalizeMessages([
        ...baseline,
        ...remoteMessages,
        ...(latestRemoteControlMessage ? [latestRemoteControlMessage] : [])
      ]);
      this.saveLocalMessages(merged);
      await Promise.all(
        [...remoteMessages, ...(latestRemoteControlMessage ? [latestRemoteControlMessage] : [])].map(message =>
          this.upsertSqliteMessage(message)
        )
      );

      const latestRetention = this.pickLatestRetentionFromMessages(merged);
      if (latestRetention) {
        await this.applyRetentionDurationMs(latestRetention.retentionMs, 'sync', {
          issuedBy: latestRetention.issuedBy,
          issuedAt: latestRetention.issuedAt
        });
      }

      const visibleMerged = merged.filter(message => !this.isRetentionControlContent(message.content));
      return visibleMerged.slice(-limit);
    } catch (error) {
      console.error('[ChatService] Failed to fetch remote messages, using LAN/local cache:', error);
      return visibleBaseline.slice(-limit);
    }
  }
}

export const chatService = new ChatService();
