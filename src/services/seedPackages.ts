import { PackageService } from './PackageService';
import { PACKAGES_DATA } from '../types';

/**
 * Seed initial package data into database
 * This should run once on first app launch
 */
export async function seedPackages() {
  try {
    console.log('🌱 Seeding packages...');
    
    // Strict One-Time Seeding Check
    const hasSeeded = localStorage.getItem('packages_seeded_v2');
    if (hasSeeded === 'true') {
        console.log('✅ Packages already seeded (flag present), skipping...');
        return;
    }

    // Check if packages already exist (Secondary check)
    const existing = await PackageService.getAllPackages();
    if (existing.length > 0) {
      console.log('✅ Packages already exist in DB, marking as seeded...');
      localStorage.setItem('packages_seeded_v2', 'true');
      return;
    }

    // Seed all packages from PACKAGES_DATA
    let seededCount = 0;
    for (const pkg of PACKAGES_DATA) {
      await PackageService.createPackage({
        category: pkg.categoryId,
        name: pkg.title,
        basePrice: pkg.price,
        currentPrice: pkg.price,
        currency: pkg.currency || 'IQD',
        isCustom: false,
        isActive: true,
        isBestseller: false,
        features: pkg.features || [],
      });
      seededCount++;
    }

    console.log(`✅ Seeded ${seededCount} packages`);
    localStorage.setItem('packages_seeded_v2', 'true');
  } catch (error) {
    console.error('❌ Error seeding packages:', error);
  }
}
