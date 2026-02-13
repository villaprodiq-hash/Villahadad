/**
 * 🧠 Entity Memory System
 * 
 * Implements a temporal knowledge graph for tracking entities
 * (clients, bookings, users) across time with relationship preservation.
 * 
 * Based on Memory Systems Skill - Temporal Knowledge Graph pattern
 */

import { logger } from '../../utils/logger';

// Entity Types
export type EntityType = 'client' | 'booking' | 'user' | 'payment' | 'task';

// Relationship Types
export type RelationshipType = 
  | 'created_by' 
  | 'assigned_to' 
  | 'belongs_to' 
  | 'paid_for' 
  | 'depends_on'
  | 'related_to';

// Entity Interface
export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  properties: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  validFrom: Date;
  validUntil?: Date; // undefined means still valid
}

// Relationship Interface
export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  properties: Record<string, unknown>;
  createdAt: Date;
  validFrom: Date;
  validUntil?: Date;
}

// Memory Store
class EntityMemoryStore {
  private entities: Map<string, Entity> = new Map();
  private relationships: Map<string, Relationship> = new Map();
  private entityRelationships: Map<string, Set<string>> = new Map(); // entityId -> relationshipIds

  /**
   * Add or update an entity
   */
  addEntity(entity: Omit<Entity, 'updatedAt' | 'validFrom'>): Entity {
    const now = new Date();
    const fullEntity: Entity = {
      ...entity,
      updatedAt: now,
      validFrom: now,
    };

    // If entity exists, mark old version as invalid
    const existing = this.entities.get(entity.id);
    if (existing) {
      existing.validUntil = now;
      this.entities.set(`${existing.id}@${existing.validFrom.getTime()}`, existing);
    }

    this.entities.set(entity.id, fullEntity);
    
    logger.debug('Entity added to memory', { 
      entityId: entity.id, 
      type: entity.type,
      name: entity.name 
    });

    return fullEntity;
  }

  /**
   * Get entity by ID (current version)
   */
  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  /**
   * Get entity as of a specific date (temporal query)
   */
  getEntityAt(id: string, date: Date): Entity | undefined {
    // Check current version first
    const current = this.entities.get(id);
    if (current && current.validFrom <= date && (!current.validUntil || current.validUntil > date)) {
      return current;
    }

    // Search historical versions
    for (const [key, entity] of this.entities) {
      if (key.startsWith(`${id}@`)) {
        if (entity.validFrom <= date && (!entity.validUntil || entity.validUntil > date)) {
          return entity;
        }
      }
    }

    return undefined;
  }

  /**
   * Get all entities of a type
   */
  getEntitiesByType(type: EntityType): Entity[] {
    return Array.from(this.entities.values()).filter(e => e.type === type && !e.validUntil);
  }

  /**
   * Add a relationship between entities
   */
  addRelationship(rel: Omit<Relationship, 'createdAt' | 'validFrom'>): Relationship {
    const now = new Date();
    const fullRel: Relationship = {
      ...rel,
      createdAt: now,
      validFrom: now,
    };

    this.relationships.set(rel.id, fullRel);

    // Index by source and target
    if (!this.entityRelationships.has(rel.sourceId)) {
      this.entityRelationships.set(rel.sourceId, new Set());
    }
    this.entityRelationships.get(rel.sourceId)!.add(rel.id);

    if (!this.entityRelationships.has(rel.targetId)) {
      this.entityRelationships.set(rel.targetId, new Set());
    }
    this.entityRelationships.get(rel.targetId)!.add(rel.id);

    logger.debug('Relationship added', { 
      relId: rel.id,
      type: rel.type,
      source: rel.sourceId,
      target: rel.targetId
    });

    return fullRel;
  }

  /**
   * Get relationships for an entity
   */
  getRelationships(entityId: string, type?: RelationshipType): Relationship[] {
    const relIds = this.entityRelationships.get(entityId);
    if (!relIds) return [];

    return Array.from(relIds)
      .map(id => this.relationships.get(id))
      .filter((rel): rel is Relationship => 
        rel !== undefined && 
        !rel.validUntil &&
        (!type || rel.type === type)
      );
  }

  /**
   * Find related entities
   */
  findRelated(entityId: string, relationshipType?: RelationshipType): Entity[] {
    const relationships = this.getRelationships(entityId, relationshipType);
    
    return relationships.map(rel => {
      const relatedId = rel.sourceId === entityId ? rel.targetId : rel.sourceId;
      return this.getEntity(relatedId);
    }).filter((e): e is Entity => e !== undefined);
  }

  /**
   * Search entities by name or property
   */
  searchEntities(query: string, type?: EntityType): Entity[] {
    const lowerQuery = query.toLowerCase();
    
    return Array.from(this.entities.values()).filter(entity => {
      if (entity.validUntil) return false;
      if (type && entity.type !== type) return false;
      
      const nameMatch = entity.name.toLowerCase().includes(lowerQuery);
      const propertyMatch = Object.values(entity.properties).some(value => 
        String(value).toLowerCase().includes(lowerQuery)
      );
      
      return nameMatch || propertyMatch;
    });
  }

  /**
   * Get entity history (temporal tracking)
   */
  getEntityHistory(id: string): Entity[] {
    const history: Entity[] = [];
    
    // Current version
    const current = this.entities.get(id);
    if (current) history.push(current);
    
    // Historical versions
    for (const [key, entity] of this.entities) {
      if (key.startsWith(`${id}@`)) {
        history.push(entity);
      }
    }
    
    return history.sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime());
  }

  /**
   * Export memory to JSON
   */
  export(): { entities: Entity[]; relationships: Relationship[] } {
    return {
      entities: Array.from(this.entities.values()),
      relationships: Array.from(this.relationships.values()),
    };
  }

  /**
   * Import memory from JSON
   */
  import(data: { entities: Entity[]; relationships: Relationship[] }): void {
    this.entities.clear();
    this.relationships.clear();
    this.entityRelationships.clear();

    for (const entity of data.entities) {
      this.entities.set(entity.id, entity);
    }

    for (const rel of data.relationships) {
      this.relationships.set(rel.id, rel);
      
      if (!this.entityRelationships.has(rel.sourceId)) {
        this.entityRelationships.set(rel.sourceId, new Set());
      }
      this.entityRelationships.get(rel.sourceId)!.add(rel.id);

      if (!this.entityRelationships.has(rel.targetId)) {
        this.entityRelationships.set(rel.targetId, new Set());
      }
      this.entityRelationships.get(rel.targetId)!.add(rel.id);
    }

    logger.info('Memory imported', { 
      entityCount: data.entities.length,
      relationshipCount: data.relationships.length
    });
  }

  /**
   * Clear all memory
   */
  clear(): void {
    this.entities.clear();
    this.relationships.clear();
    this.entityRelationships.clear();
    logger.info('Memory cleared');
  }

  /**
   * Get memory statistics
   */
  getStats(): { entities: number; relationships: number } {
    return {
      entities: this.entities.size,
      relationships: this.relationships.size,
    };
  }
}

// Export singleton instance
export const entityMemory = new EntityMemoryStore();

// Helper functions for common operations
export const memoryHelpers = {
  /**
   * Track a booking with all its relationships
   */
  trackBooking(booking: {
    id: string;
    clientName: string;
    clientId?: string;
    createdBy?: string;
    assignedTo?: string;
    status: string;
    totalAmount: number;
  }): void {
    // Add client entity
    if (booking.clientId) {
      entityMemory.addEntity({
        id: booking.clientId,
        type: 'client',
        name: booking.clientName,
        properties: {
          totalBookings: 1,
          totalSpent: booking.totalAmount,
        },
        createdAt: new Date(),
      });
    }

    // Add booking entity
    entityMemory.addEntity({
      id: booking.id,
      type: 'booking',
      name: `Booking: ${booking.clientName}`,
      properties: {
        clientName: booking.clientName,
        status: booking.status,
        totalAmount: booking.totalAmount,
      },
      createdAt: new Date(),
    });

    // Create relationships
    if (booking.clientId) {
      entityMemory.addRelationship({
        id: `rel-${booking.id}-client`,
        sourceId: booking.id,
        targetId: booking.clientId,
        type: 'belongs_to',
        properties: {},
      });
    }

    if (booking.createdBy) {
      entityMemory.addRelationship({
        id: `rel-${booking.id}-creator`,
        sourceId: booking.id,
        targetId: booking.createdBy,
        type: 'created_by',
        properties: {},
      });
    }

    if (booking.assignedTo) {
      entityMemory.addRelationship({
        id: `rel-${booking.id}-assignee`,
        sourceId: booking.id,
        targetId: booking.assignedTo,
        type: 'assigned_to',
        properties: {},
      });
    }
  },

  /**
   * Get client booking history
   */
  getClientBookings(clientId: string): Entity[] {
    return entityMemory.findRelated(clientId, 'belongs_to');
  },

  /**
   * Get user's created bookings
   */
  getUserBookings(userId: string): Entity[] {
    return entityMemory.findRelated(userId, 'created_by');
  },
};

export default entityMemory;
