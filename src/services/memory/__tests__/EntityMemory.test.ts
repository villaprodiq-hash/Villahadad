/**
 * 🧪 EntityMemory Tests
 * 
 * Unit tests for the EntityMemory system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { entityMemory, memoryHelpers } from '../EntityMemory';

describe('EntityMemory', () => {
  beforeEach(() => {
    entityMemory.clear();
  });

  describe('addEntity', () => {
    it('should add an entity', () => {
      const entity = entityMemory.addEntity({
        id: 'client-1',
        type: 'client',
        name: 'John Doe',
        properties: { email: 'john@example.com' },
        createdAt: new Date(),
      });

      expect(entity.id).toBe('client-1');
      expect(entity.name).toBe('John Doe');
      expect(entity.type).toBe('client');
    });

    it('should retrieve entity by id', () => {
      entityMemory.addEntity({
        id: 'client-1',
        type: 'client',
        name: 'John Doe',
        properties: {},
        createdAt: new Date(),
      });

      const retrieved = entityMemory.getEntity('client-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('John Doe');
    });
  });

  describe('getEntitiesByType', () => {
    it('should return entities by type', () => {
      entityMemory.addEntity({
        id: 'client-1',
        type: 'client',
        name: 'John Doe',
        properties: {},
        createdAt: new Date(),
      });

      entityMemory.addEntity({
        id: 'client-2',
        type: 'client',
        name: 'Jane Doe',
        properties: {},
        createdAt: new Date(),
      });

      entityMemory.addEntity({
        id: 'booking-1',
        type: 'booking',
        name: 'Booking 1',
        properties: {},
        createdAt: new Date(),
      });

      const clients = entityMemory.getEntitiesByType('client');
      expect(clients).toHaveLength(2);
    });
  });

  describe('searchEntities', () => {
    it('should search entities by name', () => {
      entityMemory.addEntity({
        id: 'client-1',
        type: 'client',
        name: 'John Doe',
        properties: {},
        createdAt: new Date(),
      });

      entityMemory.addEntity({
        id: 'client-2',
        type: 'client',
        name: 'Jane Smith',
        properties: {},
        createdAt: new Date(),
      });

      const results = entityMemory.searchEntities('john');
      expect(results).toHaveLength(1);
      expect(results[0]).toBeDefined();
      expect(results[0]?.name).toBe('John Doe');
    });
  });

  describe('memoryHelpers.trackBooking', () => {
    it('should track a booking with relationships', () => {
      memoryHelpers.trackBooking({
        id: 'booking-1',
        clientName: 'John Doe',
        clientId: 'client-1',
        createdBy: 'user-1',
        status: 'confirmed',
        totalAmount: 1000,
      });

      const booking = entityMemory.getEntity('booking-1');
      expect(booking).toBeDefined();
      expect(booking?.type).toBe('booking');

      const client = entityMemory.getEntity('client-1');
      expect(client).toBeDefined();
      expect(client?.type).toBe('client');
    });
  });

  describe('getStats', () => {
    it('should return memory statistics', () => {
      entityMemory.addEntity({
        id: 'client-1',
        type: 'client',
        name: 'John Doe',
        properties: {},
        createdAt: new Date(),
      });

      const stats = entityMemory.getStats();
      expect(stats.entities).toBe(1);
    });
  });
});
