import { db } from './index';
import { UserRole } from '../../types';
import { hashPasswordSync } from '../security/PasswordService';

/**
 * 🔐 REAL DATA SEEDING (WITH SECURE PASSWORDS)
 * Ensures the app has WORKING data on first launch.
 *
 * ✅ SECURITY: All passwords are now bcrypt hashed
 * ⚠️ DISABLED IN PRODUCTION: No auto-seeding of users
 */
export async function seedDatabase() {
  console.log('[seedDatabase] 🌱 Starting database seed check...');
  const startTime = Date.now();

  // ⚠️ PRODUCTION MODE: Skip seeding completely
  // Users should be added manually through the app
  const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';
  if (isProduction) {
    console.log('[seedDatabase] 🚫 Seed DISABLED in production mode');
    return;
  }

  try {
    // ===== CHECK IF ALREADY SEEDED =====
    const existingUsers = await db
      .selectFrom('users')
      .selectAll()
      .execute();  // Don't filter by deletedAt - check ALL users including deleted

    const existingPackages = await db
      .selectFrom('packages')
      .selectAll()
      .where('deletedAt', 'is', null)
      .execute();

    // If ANY users exist (active or deleted), we consider the DB seeded.
    if (existingUsers.length > 0) {
      console.log(
        `[seedDatabase] ✅ Database already seeded (${existingUsers.length} users, ${existingPackages.length} packages) - ${Date.now() - startTime}ms`
      );
      return;
    }

    console.log('[seedDatabase] 📦 Database is EMPTY. Inserting REAL DATA...');

    // ===== 1. SEED USERS (REAL PEOPLE) =====
    if (existingUsers.length === 0) {
      console.log('🔐 Hashing passwords with bcrypt...');
      
      // ✅ SECURITY FIX: Hash passwords before storing
      const defaultPassword = hashPasswordSync('1234');
      
      const users = [
        {
          id: crypto.randomUUID(),
          name: 'Black',
          role: UserRole.MANAGER,
          password: defaultPassword,  // ✅ Hashed!
          avatar: 'bg-gradient-to-br from-purple-500 to-pink-500',
          jobTitle: 'المديرة العامة',
          email: 'black@villahadad.studio',
          preferences: JSON.stringify({}),
          deletedAt: null,
        },
        {
          id: crypto.randomUUID(),
          name: 'Sarah',
          role: UserRole.RECEPTION,
          password: defaultPassword,  // ✅ Hashed!
          avatar: 'bg-gradient-to-br from-blue-500 to-cyan-500',
          jobTitle: 'موظفة الاستقبال',
          email: 'sarah@villahadad.studio',
          preferences: JSON.stringify({}),
          deletedAt: null,
        },
        {
          id: crypto.randomUUID(),
          name: 'Ahmed',
          role: UserRole.PHOTO_EDITOR,
          password: defaultPassword,  // ✅ Hashed!
          avatar: 'bg-gradient-to-br from-green-500 to-emerald-500',
          jobTitle: 'مصمم الصور',
          email: 'ahmed@villahadad.studio',
          preferences: JSON.stringify({}),
          deletedAt: null,
        },
      ];

      for (const user of users) {
        await db.insertInto('users').values(user).execute();
      }

      console.log(`✅ Seeded ${users.length} users with HASHED passwords`);
    }

    // ===== 2. SEED PACKAGES (REAL PRICES) =====
    if (existingPackages.length === 0) {
      const now = new Date().toISOString();

      const packages = [
        {
          id: crypto.randomUUID(),
          category: 'Wedding',
          name: 'Wedding Premium',
          basePrice: 500000,
          currentPrice: 500000,
          currency: 'IQD',
          discountType: null,
          discountValue: null,
          discountStart: null,
          discountEnd: null,
          isCustom: 0,
          isActive: 1,
          isBestseller: 1,
          features: JSON.stringify([
            'تصوير فوتو وفيديو احترافي',
            '500+ صورة معدلة ومنسقة',
            'ألبوم فاخر 40x40',
            'فيديو سينمائي 10-15 دقيقة',
            'طباعة 100 صورة',
          ]),
          details: JSON.stringify({
            description: 'باقة الزفاف المميزة - التجربة الكاملة',
            duration: 'يوم كامل',
            photographer: 'كادر متكامل',
          }),
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
        {
          id: crypto.randomUUID(),
          category: 'Studio',
          name: 'Studio Session',
          basePrice: 25000,
          currentPrice: 25000,
          currency: 'IQD',
          discountType: null,
          discountValue: null,
          discountStart: null,
          discountEnd: null,
          isCustom: 0,
          isActive: 1,
          isBestseller: 0,
          features: JSON.stringify([
            'جلسة تصوير في الاستوديو',
            '30 دقيقة',
            '10 صور معدلة',
            'خلفيات متنوعة',
          ]),
          details: JSON.stringify({
            description: 'جلسة استوديو شخصية - للصور الاحترافية',
            duration: '30 دقيقة',
            deliveryTime: '3 أيام',
          }),
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
        {
          id: crypto.randomUUID(),
          category: 'Birthday',
          name: 'Birthday Basic',
          basePrice: 75000,
          currentPrice: 60000,
          currency: 'IQD',
          discountType: 'percentage',
          discountValue: 20,
          discountStart: now,
          discountEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          isCustom: 0,
          isActive: 1,
          isBestseller: 0,
          features: JSON.stringify([
            'تصوير حفلة عيد ميلاد',
            'ديكورات',
            '50 صورة معدلة',
            'فيديو قصير',
          ]),
          details: JSON.stringify({
            description: 'باقة عيد الميلاد - خصم خاص!',
            duration: 'ساعتين',
            includes: 'كيك + بالونات',
          }),
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
        {
          id: crypto.randomUUID(),
          category: 'Graduation',
          name: 'Graduation Standard',
          basePrice: 50000,
          currentPrice: 50000,
          currency: 'IQD',
          discountType: null,
          discountValue: null,
          discountStart: null,
          discountEnd: null,
          isCustom: 0,
          isActive: 1,
          isBestseller: 0,
          features: JSON.stringify([
            'تصوير حفل تخرج',
            'عباءة وقبعة',
            '20 صورة معدلة',
            'إطار صورة تذكاري',
          ]),
          details: JSON.stringify({
            description: 'احتفال بالنجاح والتخرج',
            duration: 'ساعة',
            note: 'يشمل تصوير داخلي وخارجي',
          }),
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
      ];

      for (const pkg of packages) {
        await db.insertInto('packages').values(pkg).execute();
      }

      console.log(`[seedDatabase] ✅ Seeded ${packages.length} packages with REAL PRICES`);
    }

    // ===== 3. SEED INVENTORY (BLACK'S GEAR) =====
    const existingInventory = await db.selectFrom('inventory').selectAll().execute();
    if (existingInventory.length === 0) {
      console.log('📦 Seeding inventory items...');
      const now = new Date().toISOString();
      const inventory = [
        {
          id: 'cam-sony-a7iv-1',
          name: 'Sony A7IV #1',
          type: 'camera',
          icon: '📷',
          status: 'storage',
          batteryTotal: 4,
          batteryCharged: 4,
          memoryTotal: 2,
          memoryFree: 2,
          createdAt: now,
        },
        {
          id: 'cam-canon-r6-1',
          name: 'Canon R6 #1',
          type: 'camera',
          icon: '📷',
          status: 'storage',
          batteryTotal: 3,
          batteryCharged: 3,
          memoryTotal: 2,
          memoryFree: 2,
          createdAt: now,
        },
        {
          id: 'lens-85mm-1',
          name: 'Sony 85mm f1.4 GM',
          type: 'lens',
          icon: '🔍',
          status: 'storage',
          createdAt: now,
        },
        {
          id: 'flash-godox-v1-1',
          name: 'Godox V1 #1',
          type: 'flash',
          icon: '⚡',
          status: 'storage',
          batteryTotal: 2,
          batteryCharged: 2,
          createdAt: now,
        },
      ];

      for (const item of inventory) {
        await db.insertInto('inventory').values(item).execute();
      }
      console.log(`✅ Seeded ${inventory.length} inventory items`);
    }

    console.log(`[seedDatabase] 🎉 Database seeding complete! (${Date.now() - startTime}ms)`);
  } catch (error) {
    console.error('[seedDatabase] ❌ Database seeding failed:', error);
    throw error;
  }
}
