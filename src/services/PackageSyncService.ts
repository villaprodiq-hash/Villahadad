import { db } from './db/index';
import { PACKAGES_DATA } from '../types';
import { EDITING_PACKAGES_DATA, VIDEO_PACKAGES_DATA, ALBUMS_PACKAGES_DATA } from './constants';

export class PackageSyncService {
  /**
    * Get merged packages (DB + Static)
    * This ensures any updates in DB override the static definitions
    */
  static async getMergedPackages(): Promise<any[]> {
    try {
        // Fetch DB packages directly (Kysely)
        const result = await db
            .selectFrom('packages')
            .selectAll()
            .where('isActive', '=', 1)
            .where('deletedAt', 'is', null)
            .execute();
      
        const dbPackages = result.map((row) => ({
            id: row.id,
            category: row.category,
            name: row.name,
            currentPrice: row.currentPrice,
            currency: row.currency,
            features: row.features ? JSON.parse(row.features) : [],
        }));

        const dbPackageMap = new Map(dbPackages.map((p: any) => [p.id, p]));
        
        const allStaticPackages = [
            ...PACKAGES_DATA,
            ...EDITING_PACKAGES_DATA,
            ...VIDEO_PACKAGES_DATA,
            ...ALBUMS_PACKAGES_DATA
        ];

        // Map static packages with DB updates
        const mergedPackages = allStaticPackages.map(staticPkg => {
            const dbPkg = dbPackageMap.get(staticPkg.id);
            if (dbPkg) {
                // Return DB version (renamed/repriced)
                return {
                    ...staticPkg,
                    title: dbPkg.name, // Use updated name
                    price: dbPkg.currentPrice, // Use updated price
                    currency: dbPkg.currency,
                    categoryId: dbPkg.category, // Should be same
                    features: dbPkg.features || staticPkg.features
                };
            }
            return staticPkg; // Return original static version
        });

        // Add NEW packages from DB that don't exist in static list
        const staticIds = new Set(allStaticPackages.map(p => p.id));
        const newDbPackages = dbPackages
            .filter((dbPkg: any) => !staticIds.has(dbPkg.id))
            .map((dbPkg: any) => ({
                id: dbPkg.id,
                title: dbPkg.name,
                price: dbPkg.currentPrice,
                currency: dbPkg.currency,
                categoryId: dbPkg.category,
                features: dbPkg.features || [],
                description: `باقة مخصصة - ${dbPkg.name}`,
                isCustom: true // Mark as custom package
            }));


        const finalPackages = [...mergedPackages, ...newDbPackages];
        
        return finalPackages;
    } catch (e) {
        console.error('Error fetching merged packages:', e);
        // Fallback to static data
        return [
            ...PACKAGES_DATA,
            ...EDITING_PACKAGES_DATA,
            ...VIDEO_PACKAGES_DATA,
            ...ALBUMS_PACKAGES_DATA
        ];
    }
  }
}
