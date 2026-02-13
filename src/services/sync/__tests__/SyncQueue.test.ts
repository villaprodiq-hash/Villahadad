/**
 * 🧪 SyncQueue Tests
 * 
 * Unit tests for the SyncQueue service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncQueueService } from '../SyncQueue';

// Mock the database module
vi.mock('../../db/index', () => ({
  db: {
    insertInto: vi.fn(() => ({
      values: vi.fn(() => ({
        execute: vi.fn().mockResolvedValue(undefined),
      })),
    })),
    selectFrom: vi.fn(() => ({
      selectAll: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            execute: vi.fn().mockResolvedValue([]),
          })),
        })),
      })),
    })),
    updateTable: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          execute: vi.fn().mockResolvedValue(undefined),
        })),
      })),
    })),
    deleteFrom: vi.fn(() => ({
      where: vi.fn(() => ({
        execute: vi.fn().mockResolvedValue(undefined),
      })),
    })),
  },
}));

describe('SyncQueueService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('enqueue', () => {
    it('should add an item to the queue without throwing', async () => {
      const data = { id: '123', name: 'Test' };
      
      await expect(SyncQueueService.enqueue('create', 'booking', data)).resolves.not.toThrow();
    });

    it('should handle errors gracefully', async () => {
      const { db } = await import('../../db/index');
      vi.mocked(db.insertInto).mockImplementationOnce(() => {
        throw new Error('DB Error');
      });

      const data = { id: '123', name: 'Test' };
      
      // Should not throw
      await expect(SyncQueueService.enqueue('create', 'booking', data)).resolves.not.toThrow();
    });
  });

  describe('peekAll', () => {
    it('should return an array', async () => {
      const result = await SyncQueueService.peekAll();
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('dequeue', () => {
    it('should remove an item without throwing', async () => {
      await expect(SyncQueueService.dequeue('test-id')).resolves.not.toThrow();
    });
  });

  describe('updateRetryCount', () => {
    it('should update retry count without throwing', async () => {
      await expect(SyncQueueService.updateRetryCount('test-id', 2)).resolves.not.toThrow();
    });
  });
});
