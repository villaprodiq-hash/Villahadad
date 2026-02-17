import { db } from './db/index';
import { Package } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const packageService = {
  async getPackages(): Promise<Package[]> {
    try {
      const allPackages = await db
        .selectFrom('packages')
        .selectAll()
        .where('deletedAt', 'is', null)
        .execute();

      return allPackages.map(p => ({
        ...p,
        details: p.details ? JSON.parse(p.details) : [],
        // Ensure prices are numbers
        currentPrice: Number(String(p.currentPrice).replace(/,/g, '')) || 0,
        basePrice: Number(String(p.basePrice).replace(/,/g, '')) || 0,
        // Manual boolean conversion
        isActive: Boolean(p.isActive),
        isCustom: Boolean(p.isCustom),
        isBestseller: Boolean(p.isBestseller),
        features: p.features ? JSON.parse(p.features) : [],
        deletedAt: p.deletedAt === null ? null : String(p.deletedAt)
      })) as Package[];
    } catch (error) {
      console.error('Error fetching packages:', error);
      return [];
    }
  },

  async getAllPackages(): Promise<Package[]> {
      return this.getPackages();
  },

  async getPackageById(id: string): Promise<Package | null> {
      const p = await db
        .selectFrom('packages')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      if (p) {
          return {
            ...p,
            details: p.details ? JSON.parse(p.details) : [],
            isActive: Boolean(p.isActive),
            isCustom: Boolean(p.isCustom),
            isBestseller: Boolean(p.isBestseller),
            features: p.features ? JSON.parse(p.features) : [],
            deletedAt: p.deletedAt === null ? null : String(p.deletedAt)
          } as Package;
      }
      return null;
  },

  async createPackage(pkg: Omit<Package, 'id' | 'createdAt' | 'updatedAt'>): Promise<Package> {
      return this.addPackage(pkg);
  },

  async addPackage(pkg: Omit<Package, 'id' | 'createdAt' | 'updatedAt'>): Promise<Package> {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    // Serialize complex objects
    const detailsString = typeof pkg.details === 'string' ? pkg.details : JSON.stringify(pkg.details || []);
    const featuresString = JSON.stringify(pkg.features || []);

    const newPackage = {
      ...pkg,
      id,
      details: detailsString,
      features: featuresString,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      isActive: pkg.isActive ? 1 : 0,
      isCustom: pkg.isCustom ? 1 : 0,
      isBestseller: pkg.isBestseller ? 1 : 0,
      // Ensure required numeric fields are set
      currentPrice: Number(pkg.currentPrice) || 0,
      basePrice: Number(pkg.basePrice) || 0,
      currency: pkg.currency || 'IQD'
    };

    try {
      await db
        .insertInto('packages')
        .values(newPackage)
        .execute();

      return { 
          ...pkg, 
          id, 
          createdAt: now, 
          updatedAt: now,
          details: JSON.parse(detailsString),
          features: JSON.parse(featuresString)
      } as Package;
    } catch (error) {
        console.error('Error adding package:', error);
        throw error;
    }
  },

  async updatePackage(id: string, updates: Partial<Package>): Promise<void> {
    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = { ...updates, updatedAt: now };
    
    if (updates.details) {
        updateData.details = JSON.stringify(updates.details);
    }
    
    // Handle booleans
    if (typeof updates.isActive !== 'undefined') updateData.isActive = updates.isActive ? 1 : 0;
    if (typeof updates.isCustom !== 'undefined') updateData.isCustom = updates.isCustom ? 1 : 0;
    if (typeof updates.isBestseller !== 'undefined') updateData.isBestseller = updates.isBestseller ? 1 : 0;

    // Filter out undefined values to simulate dynamic set
    const validUpdates: Record<string, unknown> = {};
    for (const key in updateData) {
        if (updateData[key] !== undefined) {
             validUpdates[key] = updateData[key];
        }
    }

    if (Object.keys(validUpdates).length === 0) return;

    try {
      await db
        .updateTable('packages')
        .set(validUpdates)
        .where('id', '=', id)
        .execute();
    } catch (error) {
        console.error('Error updating package:', error);
        throw error;
    }
  },

  async updatePackagePrice(id: string, newPrice: number, currency: 'IQD' | 'USD'): Promise<void> {
      await this.updatePackage(id, { currentPrice: newPrice, currency });
  },

  async applyDiscount(id: string, type: 'percentage' | 'fixed', value: number, start: string, end: string): Promise<void> {
      await this.updatePackage(id, {
          discountType: type,
          discountValue: value,
          discountStart: start,
          discountEnd: end
      });
  },

  async updatePackageName(id: string, newName: string): Promise<void> {
      await this.updatePackage(id, { name: newName }); 
  },

  async deletePackage(id: string): Promise<void> {
    // Soft delete
    try {
        const now = Date.now();
        await db
          .updateTable('packages')
          .set({ deletedAt: now })
          .where('id', '=', id)
          .execute();
    } catch (error) {
        console.error('Error deleting package:', error);
        throw error;
    }
  },

  async seedPackages(): Promise<number> {
    try {
      const existingPackages = await this.getPackages();
      if (existingPackages.length > 0) {
        console.log('📦 Packages already exist, skipping seed. Count:', existingPackages.length);
        return 0;
      }

      console.log('🌱 Seeding packages...');
      // Logic for seeding would go here
      return 0;
    } catch (error) {
      console.error('Error seeding packages:', error);
      throw error;
    }
  }
};

export const PackageService = packageService;
