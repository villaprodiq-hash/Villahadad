import React, { useState, useEffect } from 'react';
import { PACKAGES_DATA } from '../../../types';
import {
  EDITING_PACKAGES_DATA,
  VIDEO_PACKAGES_DATA,
  ALBUMS_PACKAGES_DATA,
} from '../../../services/constants';
import {
  Camera,
  MapPin,
  Wand2,
  Video,
  BookOpen,
  Printer,
  Sparkles,
  Crown,
  Heart,
  Baby,
  Users,
  Gem,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Package } from '../../../types';
import { PackageService } from '../../../services/PackageService';
import { db } from '../../../services/db/index';

// ... (other imports)

type PackageCategory = 'photography' | 'venue' | 'editing' | 'video' | 'albums' | 'printing';

interface PriceState {
  [key: string]: {
    selectedPackage: string;
    newPrice: string;
    discountType: 'percentage' | 'fixed';
    discountValue: string;
    discountStartDate: string; // ISO datetime
    discountEndDate: string; // ISO datetime
    newCurrency?: 'IQD' | 'USD';
  };
}

interface NewPackageState {
  categoryId: string;
  name: string;
  price: string;
  currency: 'IQD' | 'USD';
}

interface StaticPackageItem {
  id: string;
  title?: string;
  name?: string;
  price: number;
  currency: string;
  features?: string[];
}

const ManagerPackagesView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PackageCategory>('photography');
  const [priceStates, setPriceStates] = useState<PriceState>({});
  const [newPackage, setNewPackage] = useState<NewPackageState | null>(null);
  const [showDiscount, setShowDiscount] = useState<{ [key: string]: boolean }>({});
  const [editingPrice, setEditingPrice] = useState<{ [key: string]: boolean }>({});
  const [dbPackages, setDbPackages] = useState<Package[]>([]);

  const [editNameModal, setEditNameModal] = useState<{
    isOpen: boolean;
    categoryId: string;
    packageId: string;
    currentName: string;
  } | null>(null);

  // Load packages from database and seed if needed
  useEffect(() => {
    const initPackages = async () => {
      // Seed packages on first load
      const { seedPackages } = await import('../../../services/seedPackages');
      await seedPackages();
      // Then load packages
      await loadPackages();
    };

    initPackages();
  }, []); // Run once on mount

  useEffect(() => {
    loadPackages();
  }, [activeTab]);

  const loadPackages = async () => {
    try {
      const allPackages = await PackageService.getAllPackages();
      console.log('📦 Loaded packages from DB:', allPackages.length, allPackages);
      setDbPackages(allPackages);
    } catch (error) {
      console.error('Failed to load packages:', error);
    }
  };

  // Helper: Convert Arabic numerals to English
  const toEnglishNumerals = (str: string): string => {
    return str.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  };

  // Photography categories with icons and colors
  const photographyCategories = [
    {
      id: 'vip',
      title: 'عروض VIP (أعراس)',
      icon: Crown,
      gradient: 'from-amber-400 via-yellow-500 to-amber-600',
      shadow: 'shadow-amber-500/50',
      packages: PACKAGES_DATA.filter(p => p.categoryId === 'vip'),
    },
    {
      id: 'wedding_external',
      title: 'أعراس وحفلات (خارجي)',
      icon: Heart,
      gradient: 'from-rose-400 via-pink-500 to-rose-600',
      shadow: 'shadow-rose-500/50',
      packages: PACKAGES_DATA.filter(p => p.categoryId === 'wedding_party'),
    },
    {
      id: 'wedding_studio',
      title: 'عروض عرسان (استوديو)',
      icon: Users,
      gradient: 'from-purple-400 via-violet-500 to-purple-600',
      shadow: 'shadow-purple-500/50',
      packages: PACKAGES_DATA.filter(
        p => p.categoryId === 'wedding_studio' || p.categoryId === 'bride_studio'
      ),
    },
    {
      id: 'kids',
      title: 'جلسات أطفال',
      icon: Baby,
      gradient: 'from-cyan-400 via-blue-500 to-cyan-600',
      shadow: 'shadow-cyan-500/50',
      packages: PACKAGES_DATA.filter(p => p.categoryId === 'kids'),
    },
    {
      id: 'special',
      title: 'جلسات متنوعة (تخرج، ميلاد، حمل)',
      icon: Gem,
      gradient: 'from-emerald-400 via-green-500 to-emerald-600',
      shadow: 'shadow-emerald-500/50',
      packages: PACKAGES_DATA.filter(p => p.categoryId === 'venue_session'),
    },
  ];

  // Default packages from types.ts
  const editingPackages = EDITING_PACKAGES_DATA;
  const videoPackages = VIDEO_PACKAGES_DATA;

  // Venue categories - Luxury Gold-Bronze
  const venueCategories = [
    {
      id: 'venue_room',
      title: 'غرفة VIP',
      icon: Crown,
      gradient: 'from-amber-600 via-yellow-600 to-amber-700',
      shadow: 'shadow-amber-600/50',
      packages: PACKAGES_DATA.filter(p => p.categoryId === 'venue_room'),
    },
    { id: 'venue_party', title: 'حجز الفيلا بالكامل',
      icon: MapPin,
      gradient: 'from-yellow-700 via-amber-800 to-yellow-900',
      shadow: 'shadow-yellow-700/50',
      packages: PACKAGES_DATA.filter(p => p.categoryId === 'venue_party'),
    },
    {
      id: 'venue_commercial',
      title: 'تصوير تجاري',
      icon: Camera,
      gradient: 'from-amber-500 via-orange-600 to-amber-700',
      shadow: 'shadow-amber-500/50',
      packages: PACKAGES_DATA.filter(p => p.categoryId === 'venue_commercial'),
    },
  ];

  // Editing categories - Silver-Platinum
  const editingCategories = [
    {
      id: 'editing_basic',
      title: 'تعديل أساسي',
      icon: Wand2,
      gradient: 'from-slate-400 via-gray-400 to-zinc-400',
      shadow: 'shadow-slate-400/50',
      packages: editingPackages.slice(0, 2),
    },
    {
      id: 'editing_advanced',
      title: 'تعديل متقدم',
      icon: Sparkles,
      gradient: 'from-zinc-300 via-slate-300 to-gray-300',
      shadow: 'shadow-zinc-300/50',
      packages: editingPackages.slice(2, 4),
    },
  ];

  // Video categories - Fire Red-Orange
  const videoCategories = [
    {
      id: 'video_standard',
      title: 'مونتاج قياسي',
      icon: Video,
      gradient: 'from-red-600 via-orange-500 to-red-700',
      shadow: 'shadow-red-600/50',
      packages: videoPackages.slice(0, 2),
    },
    {
      id: 'video_premium',
      title: 'مونتاج احترافي',
      icon: Sparkles,
      gradient: 'from-orange-500 via-red-500 to-orange-600',
      shadow: 'shadow-orange-500/50',
      packages: videoPackages.slice(2, 4),
    },
  ];

  // Albums categories - Burgundy-Gold (from printer inventory)
  const albumsCategories = [
    {
      id: 'album_sets',
      title: 'سيتات الألبومات',
      icon: Crown,
      gradient: 'from-rose-800 via-red-700 to-amber-600',
      shadow: 'shadow-rose-800/50',
      packages: ALBUMS_PACKAGES_DATA.filter(p => p.categoryId === 'album_sets'),
    },
    {
      id: 'album_single',
      title: 'ألبومات منفردة',
      icon: BookOpen,
      gradient: 'from-amber-700 via-orange-700 to-red-800',
      shadow: 'shadow-amber-700/50',
      packages: ALBUMS_PACKAGES_DATA.filter(p => p.categoryId === 'album_single'),
    },
    {
      id: 'printing',
      title: 'طباعة الصور',
      icon: Printer,
      gradient: 'from-red-800 via-rose-700 to-pink-600',
      shadow: 'shadow-red-800/50',
      packages: ALBUMS_PACKAGES_DATA.filter(p => p.categoryId === 'printing'),
    },
  ];

  const handlePackageSelect = (categoryId: string, packageId: string) => {
    if (packageId === 'add_new') {
      // Open new package form
      setNewPackage({ categoryId, name: '', price: '', currency: 'IQD' });
      return;
    }

    // Find package to get its currency (DB or Static)
    let initialCurrency: 'IQD' | 'USD' = 'IQD';

    // 1. Check DB first
    const dbPkg = dbPackages.find(p => p.id === packageId);
    if (dbPkg) {
      initialCurrency = dbPkg.currency;
    } else {
      // 2. Check Static Files
      const allStatic = [
        ...PACKAGES_DATA,
        ...EDITING_PACKAGES_DATA,
        ...VIDEO_PACKAGES_DATA,
        ...ALBUMS_PACKAGES_DATA,
      ];
      const staticPkg = allStatic.find(p => p.id === packageId);
      if (staticPkg) {
        // Handle legacy string currency if needed, though types enforce 'IQD' | 'USD'
        initialCurrency = (staticPkg.currency as 'IQD' | 'USD') || 'IQD';
      }
    }

    setPriceStates(prev => ({
      ...prev,
      [categoryId]: {
        selectedPackage: packageId,
        newPrice: '',
        discountType: 'percentage',
        discountValue: '',
        discountStartDate: '',
        discountEndDate: '',
        newCurrency: initialCurrency,
      },
    }));
  };

  const handleCurrencyChange = (categoryId: string, currency: 'IQD' | 'USD') => {
    setPriceStates(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        newCurrency: currency,
      },
    }));
  };

  const handleNewPriceChange = (categoryId: string, value: string) => {
    // Force English numerals and remove commas
    const englishValue = toEnglishNumerals(value);
    const numericValue = englishValue.replace(/,/g, '');
    setPriceStates(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        newPrice: numericValue,
      },
    }));
  };

  const handleDiscountChange = (
    categoryId: string,
    field: 'discountType' | 'discountValue' | 'discountStartDate' | 'discountEndDate',
    value: string
  ) => {
    let processedValue = value;
    if (field === 'discountValue') {
      processedValue = toEnglishNumerals(value).replace(/,/g, '');
    }

    setPriceStates(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        [field]: processedValue,
      },
    }));
  };

  // Format number with commas
  const formatNumber = (num: number | string): string => {
    if (num === undefined || num === null) return '';
    const numStr = String(num).replace(/,/g, '');
    if (!numStr || isNaN(Number(numStr))) return '';
    return Number(numStr).toLocaleString('en-US');
  };

  // Handle new package form
  const handleNewPackageChange = (field: 'name' | 'price', value: string) => {
    if (!newPackage) return;

    let processedValue = value;
    if (field === 'price') {
      // Convert Arabic numerals to English
      processedValue = toEnglishNumerals(value);
      // Remove commas
      processedValue = processedValue.replace(/,/g, '');
    }

    setNewPackage(prev => (prev ? { ...prev, [field]: processedValue } : null));
  };

  const saveNewPackage = async () => {
    if (!newPackage || !newPackage.name || !newPackage.price) {
      alert('الرجاء إدخال اسم العرض والسعر');
      return;
    }

    try {
      const price = Number(newPackage.price.replace(/,/g, ''));

      const result = await PackageService.createPackage({
        category: newPackage.categoryId,
        name: newPackage.name,
        basePrice: price,
        currentPrice: price,
        currency: newPackage.currency || 'IQD',
        isCustom: true,
        isActive: true,
        isBestseller: false,
        features: ['باقة مخصصة'],
      });

      if (result) {
        alert(`تم إضافة العرض: ${newPackage.name} - أعد فتح التطبيق لرؤية التغييرات`);
        setNewPackage(null);
        await loadPackages();
      } else {
        alert('فشل في إضافة العرض');
      }
    } catch (error) {
      console.error('Error saving package:', error);
      alert('حدث خطأ أثناء الحفظ');
    }
  };

  const toggleDiscount = (categoryId: string) => {
    setShowDiscount(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const togglePriceEdit = (categoryId: string) => {
    setEditingPrice(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const savePrice = async (categoryId: string) => {
    const state = priceStates[categoryId];
    if (!state?.newPrice) {
      alert('الرجاء إدخال السعر الجديد');
      return;
    }

    // Validate discount dates if discount is active
    if (showDiscount[categoryId] && state.discountValue) {
      if (!state.discountStartDate || !state.discountEndDate) {
        alert('الرجاء تحديد تاريخ بداية ونهاية التخفيض');
        return;
      }
    }

    try {
      const newPrice = Number(toEnglishNumerals(state.newPrice).replace(/,/g, ''));

      // Update price with currency
      await PackageService.updatePackagePrice(
        state.selectedPackage,
        newPrice,
        state.newCurrency || 'IQD'
      );

      // Apply discount if active
      if (showDiscount[categoryId] && state.discountValue) {
        await PackageService.applyDiscount(
          state.selectedPackage,
          state.discountType,
          Number(toEnglishNumerals(state.discountValue).replace(/,/g, '')),
          state.discountStartDate,
          state.discountEndDate
        );
      }

      alert('تم حفظ السعر الجديد بنجاح!');
      setEditingPrice(prev => ({ ...prev, [categoryId]: false }));
      setShowDiscount(prev => ({ ...prev, [categoryId]: false }));
      await loadPackages(); // Reload
    } catch (error) {
      console.error('Error saving price:', error);
      alert('حدث خطأ أثناء الحفظ');
    }
  };

  // Helper to ensure package exists in DB before modification
  const ensurePackageExists = async (categoryId: string, packageId: string): Promise<boolean> => {
    try {
      const existingPkg = await PackageService.getPackageById(packageId);
      if (existingPkg && existingPkg.id) {
        return true;
      }

      console.log('➕ Creating static package in DB before modification:', packageId);

      // Dynamic Static Data Lookup
      // We aggregate all static sources here to ensure we find the package regardless of category

      // 1. Gather all static packages into a flat list
      const allStaticPackages: StaticPackageItem[] = [];

      // Source A: Global PACKAGES_DATA (Photography, Venue)
      allStaticPackages.push(...PACKAGES_DATA);

      // Source B: Local Editing Packages
      allStaticPackages.push(...EDITING_PACKAGES_DATA);

      // Source C: Local Video Packages
      allStaticPackages.push(...VIDEO_PACKAGES_DATA);

      // Source D: Local Albums & Printing Packages (Nested in categories)
      allStaticPackages.push(...ALBUMS_PACKAGES_DATA);

      // 2. Find the target package
      const selectedPkg = allStaticPackages.find(p => p.id === packageId);

      if (!selectedPkg) {
        console.error('❌ Could not find static package data for:', packageId);
        return false;
      }

      // Create with the ORIGINAL ID from static data

      await db
        .insertInto('packages')
        .values({
          id: packageId,
          category: categoryId,
          name: selectedPkg.title || selectedPkg.name || 'Unnamed Package',
          basePrice: selectedPkg.price,
          currentPrice: selectedPkg.price,
          currency: (selectedPkg.currency || 'IQD') as 'IQD' | 'USD',
          discountType: null,
          discountValue: null,
          discountStart: null,
          discountEnd: null,
          isCustom: 0,
          isActive: 1,
          isBestseller: 0,
          features: JSON.stringify(selectedPkg.features || []),
          details: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        })
        .execute();

      console.log('✅ Static package created in DB:', packageId);
      return true;
    } catch (e) {
      console.error('Error ensuring package exists:', e);
      return false;
    }
  };

  const deletePackage = async (categoryId: string, packageId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الباقة؟')) {
      return;
    }

    try {
      // Vital: Ensure package exists in DB effectively before deleting
      const exists = await ensurePackageExists(categoryId, packageId);
      if (!exists) {
        alert('فشل في العثور على الباقة للحذف');
        return;
      }

      await PackageService.deletePackage(packageId);

      // Clear selection if deleted package was selected
      if (priceStates[categoryId]?.selectedPackage === packageId) {
        setPriceStates(prev => {
          const newState = { ...prev };
          delete newState[categoryId];
          return newState;
        });
      }

      alert('تم حذف الباقة بنجاح!');
      await loadPackages(); // Reload
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const updatePackageName = async (categoryId: string, packageId: string, newName: string) => {
    console.log('🔵 updatePackageName called:', { categoryId, packageId, newName });

    try {
      const exists = await ensurePackageExists(categoryId, packageId);
      if (!exists) {
        alert('فشل في العثور على الباقة للتعديل');
        return;
      }

      console.log('✏️ Updating package name...');
      await PackageService.updatePackageName(packageId, newName);

      alert('تم تحديث الاسم بنجاح! - أعد فتح التطبيق لرؤية التغييرات');
      await loadPackages();
    } catch (error) {
      console.error('❌ Error updating package name:', error);
      alert('حدث خطأ أثناء التحديث');
    }
  };

  const getSelectedPackage = (categoryId: string) => {
    const state = priceStates[categoryId];
    if (!state?.selectedPackage) return null;

    // Get all packages for this category (static + dynamic)
    const allCategories = getPackages();
    const category = allCategories.find(c => c.id === categoryId);

    return category?.packages.find(p => p.id === state.selectedPackage);
  };

  // Get packages by category
  const getPackages = () => {
    let baseCategories;
    switch (activeTab) {
      case 'photography':
        baseCategories = photographyCategories;
        break;
      case 'venue':
        baseCategories = venueCategories;
        break;
      case 'editing':
        baseCategories = editingCategories;
        break;
      case 'video':
        baseCategories = videoCategories;
        break;
      case 'albums':
        baseCategories = albumsCategories;
        break;
      case 'printing':
        baseCategories = albumsCategories; // Shows all album/printing packages
        break;
      default:
        baseCategories = [];
    }

    // Merge database packages with static ones
    return baseCategories.map(cat => {
      const categoryDbPackages = dbPackages
        .filter(pkg => pkg.category === cat.id)
        .map(pkg => ({
          id: pkg.id,
          title: pkg.name,
          price: pkg.currentPrice,
          currency: pkg.currency,
          features: pkg.features || [],
        }));

      // Create a map of DB packages by ID for quick lookup
      const dbPackageMap = new Map(categoryDbPackages.map(pkg => [pkg.id, pkg]));

      // Merge: use DB version if exists, otherwise use static version
      const staticPackages = cat.packages.filter(pkg => !dbPackageMap.has(pkg.id));

      return {
        ...cat,
        packages: [...categoryDbPackages, ...staticPackages],
      };
    });
  };

  const categories = [
    {
      id: 'photography' as const,
      label: 'التصوير',
      icon: Camera,
      color: 'from-blue-500 to-cyan-500',
    },
    { id: 'venue' as const, label: 'فيلا حداد', icon: MapPin, color: 'from-purple-500 to-pink-500' },
    {
      id: 'editing' as const,
      label: 'التعديل',
      icon: Wand2,
      color: 'from-green-500 to-emerald-500',
    },
    { id: 'video' as const, label: 'المونتاج', icon: Video, color: 'from-red-500 to-orange-500' },
    {
      id: 'printing' as const,
      label: 'الطباعة',
      icon: Printer,
      color: 'from-violet-500 to-purple-500',
    },
  ];

  const activeCategory = categories.find(c => c.id === activeTab);

  return (
    <div
      className="h-full flex flex-col p-6 space-y-6 overflow-y-auto bg-linear-to-br from-gray-50 to-gray-100 dark:from-[#0a0b0d] dark:to-[#1a1c22]"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl bg-linear-to-br ${activeCategory?.color} flex items-center justify-center shadow-lg`}
            >
              {activeCategory && <activeCategory.icon size={24} className="text-white" />}
            </div>
            {activeCategory?.label}
          </h1>
        </div>
        {/* Cleanup button hidden as requested */}
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 bg-white dark:bg-[#1a1c22] p-2 rounded-2xl shadow-lg border border-gray-200 dark:border-white/5">
        {categories.map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === cat.id
                  ? `bg-linear-to-r ${cat.color} text-white shadow-lg`
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* All Categories - Simple Clean Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(() => {
          const categories = getPackages();
          return Array.isArray(categories) && categories.length > 0 ? (
            categories.map((category, index) => {
              const Icon = category.icon;
              const selectedPkg = getSelectedPackage(category.id);
              const state = priceStates[category.id];

              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative bg-white dark:bg-[#1a1c22] rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-white/5 hover:border-violet-500/30 overflow-hidden"
                >
                  {/* Subtle gradient overlay on hover */}
                  <div
                    className={`absolute inset-0 bg-linear-to-br ${category.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                  ></div>

                  <div className="relative z-10">
                    {/* Icon & Title */}
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`w-12 h-12 rounded-xl bg-linear-to-br ${category.gradient} opacity-10 flex items-center justify-center`}
                      >
                        <Icon
                          size={24}
                          className={`bg-linear-to-r ${category.gradient} bg-clip-text text-transparent`}
                          style={{
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }}
                        />
                      </div>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white">
                        {category.title}
                      </h3>
                    </div>

                    {/* Dropdown */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400">
                          اختر الباقة
                        </label>
                        {selectedPkg && (
                          <button
                            onClick={() => {
                              setEditNameModal({
                                isOpen: true,
                                categoryId: category.id,
                                packageId: selectedPkg.id,
                                currentName: selectedPkg.title,
                              });
                            }}
                            className="text-xs text-blue-600 hover:text-blue-500 flex items-center gap-1 font-bold"
                            title="تعديل اسم الباقة"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                            تعديل الاسم
                          </button>
                        )}
                      </div>
                      <select
                        key={`${category.id}-${dbPackages.length}-${Date.now()}`}
                        value={
                          state?.selectedPackage ||
                          (newPackage?.categoryId === category.id ? 'add_new' : '')
                        }
                        onChange={e => handlePackageSelect(category.id, e.target.value)}
                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-violet-500/50 outline-none"
                      >
                        <option value="">اختر...</option>
                        {category.packages.map((pkg: StaticPackageItem) => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.title} - {formatNumber(pkg.price)}{' '}
                            {pkg.currency === 'USD' ? '$' : 'د.ع'}
                          </option>
                        ))}
                        <option value="add_new" className="font-black">
                          + إضافة عرض جديد
                        </option>
                      </select>

                      {/* Delete button for ANY package */}
                      {selectedPkg && (
                        <button
                          onClick={() => deletePackage(category.id, selectedPkg.id)}
                          className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          حذف هذه الباقة
                        </button>
                      )}
                    </div>

                    {/* New Package Form */}
                    {newPackage && newPackage.categoryId === category.id && (
                      <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-4 space-y-3 mb-4 border border-gray-200 dark:border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                            <span className="text-white text-lg font-black">+</span>
                          </div>
                          <label className="text-xs font-bold text-gray-900 dark:text-white">
                            عرض جديد
                          </label>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block">
                            اسم العرض
                          </label>
                          <input
                            type="text"
                            value={newPackage.name}
                            onChange={e => handleNewPackageChange('name', e.target.value)}
                            placeholder="مثال: العرض الرابع"
                            className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-violet-500/50 outline-none placeholder:text-gray-400"
                            dir="rtl"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block">
                            السعر
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formatNumber(newPackage.price)}
                            onChange={e => handleNewPackageChange('price', e.target.value)}
                            placeholder="مثال: 1,500"
                            className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-violet-500/50 outline-none placeholder:text-gray-400"
                            style={{ direction: 'ltr' }}
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block">
                            العملة
                          </label>
                          <select
                            value={newPackage.currency || 'IQD'}
                            onChange={e =>
                              setNewPackage({
                                ...newPackage,
                                currency: e.target.value as 'IQD' | 'USD',
                              })
                            }
                            className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-violet-500/50 outline-none"
                          >
                            <option value="IQD">دينار عراقي (IQD)</option>
                            <option value="USD">دولار أمريكي (USD)</option>
                          </select>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={saveNewPackage}
                            className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-2 rounded-lg text-sm font-black transition-all"
                          >
                            حفظ
                          </button>
                          <button
                            onClick={() => setNewPackage(null)}
                            className="flex-1 bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white py-2 rounded-lg text-sm font-bold hover:bg-gray-300 dark:hover:bg-white/20 transition-all"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Price Display & Editing */}
                    {selectedPkg && !newPackage && (
                      <div className="space-y-3">
                        {/* Discount Badge */}
                        {showDiscount[category.id] && state?.discountValue && (
                          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                            <svg
                              className="w-4 h-4 text-red-600 dark:text-red-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                              />
                            </svg>
                            <div className="flex-1">
                              <p className="text-xs font-bold text-red-600 dark:text-red-400">
                                تخفيض نشط:{' '}
                                {state.discountType === 'percentage'
                                  ? `${state.discountValue}%`
                                  : `${formatNumber(state.discountValue)} د.ع`}
                              </p>
                              {state.discountStartDate && state.discountEndDate && (
                                <p className="text-xs text-red-500 mt-0.5">
                                  من {new Date(state.discountStartDate).toLocaleDateString('ar-IQ')}{' '}
                                  إلى {new Date(state.discountEndDate).toLocaleDateString('ar-IQ')}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        {/* Current Price with Inline Edit */}
                        <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-4 border border-gray-200 dark:border-white/5">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                              السعر الحالي
                            </p>
                            <button
                              onClick={() => togglePriceEdit(category.id)}
                              className="text-violet-600 hover:text-violet-500 transition-colors"
                              title="تعديل السعر"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                            </button>
                          </div>

                          {editingPrice[category.id] ? (
                            <div className="space-y-2">
                              {/* Currency Toggle */}
                              <div className="flex bg-gray-100 dark:bg-black/40 rounded-lg p-1">
                                <button
                                  onClick={() => handleCurrencyChange(category.id, 'IQD')}
                                  className={`flex-1 py-1 px-2 rounded-md text-xs font-bold transition-all ${
                                    (state?.newCurrency || 'IQD') === 'IQD'
                                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                  }`}
                                >
                                  IQD
                                </button>
                                <button
                                  onClick={() => handleCurrencyChange(category.id, 'USD')}
                                  className={`flex-1 py-1 px-2 rounded-md text-xs font-bold transition-all ${
                                    state?.newCurrency === 'USD'
                                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                  }`}
                                >
                                  USD
                                </button>
                              </div>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatNumber(
                                  state?.newPrice || selectedPkg.price.toString()
                                )}
                                onChange={e => handleNewPriceChange(category.id, e.target.value)}
                                placeholder="أدخل السعر الجديد..."
                                className="w-full bg-white dark:bg-black/40 border border-violet-500 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-2xl font-black focus:ring-2 focus:ring-violet-500/50 outline-none"
                                style={{ direction: 'ltr' }}
                                autoFocus
                              />
                            </div>
                          ) : (
                            <p
                              className={`text-3xl font-black bg-linear-to-r ${category.gradient} bg-clip-text text-transparent cursor-pointer`}
                              style={{
                                direction: 'ltr',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                              }}
                              onClick={() => togglePriceEdit(category.id)}
                            >
                              {formatNumber(state?.newPrice || selectedPkg.price)}
                              <span className="text-lg ml-2">
                                {selectedPkg.currency === 'USD' ? '$' : 'د.ع'}
                              </span>
                            </p>
                          )}
                        </div>

                        {/* Discount Toggle Button */}
                        <button
                          onClick={() => toggleDiscount(category.id)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                            showDiscount[category.id]
                              ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500'
                              : 'bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/5 hover:border-red-500/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                              <span className="text-white text-xs font-black">%</span>
                            </div>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {showDiscount[category.id] ? 'إخفاء الخصم' : 'إضافة خصم'}
                            </span>
                          </div>
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform ${showDiscount[category.id] ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>

                        {/* Discount Section - Collapsible */}
                        {showDiscount[category.id] && (
                          <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-4 space-y-3 border border-red-200 dark:border-red-500/20">
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() =>
                                  handleDiscountChange(category.id, 'discountType', 'percentage')
                                }
                                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                                  state?.discountType === 'percentage'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-white dark:bg-black/40 text-gray-900 dark:text-white hover:bg-red-100 dark:hover:bg-red-900/30'
                                }`}
                              >
                                نسبة %
                              </button>
                              <button
                                onClick={() =>
                                  handleDiscountChange(category.id, 'discountType', 'fixed')
                                }
                                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                                  state?.discountType === 'fixed'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-white dark:bg-black/40 text-gray-900 dark:text-white hover:bg-red-100 dark:hover:bg-red-900/30'
                                }`}
                              >
                                مبلغ ثابت
                              </button>
                            </div>

                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatNumber(state?.discountValue || '')}
                              onChange={e =>
                                handleDiscountChange(category.id, 'discountValue', e.target.value)
                              }
                              placeholder={
                                state?.discountType === 'percentage' ? 'مثال: 10' : 'مثال: 50,000'
                              }
                              className="w-full bg-white dark:bg-black/40 border border-red-300 dark:border-red-500/30 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-red-500/50 outline-none placeholder:text-gray-400"
                              style={{ direction: 'ltr' }}
                            />

                            <div>
                              <label className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 block">
                                تاريخ ووقت البدء
                              </label>
                              <input
                                type="datetime-local"
                                value={state?.discountStartDate || ''}
                                onChange={e =>
                                  handleDiscountChange(
                                    category.id,
                                    'discountStartDate',
                                    e.target.value
                                  )
                                }
                                className="w-full bg-white dark:bg-black/40 border border-red-300 dark:border-red-500/30 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-red-500/50 outline-none"
                                style={{ direction: 'ltr' }}
                              />
                            </div>

                            <div>
                              <label className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 block">
                                تاريخ ووقت الانتهاء
                              </label>
                              <input
                                type="datetime-local"
                                value={state?.discountEndDate || ''}
                                onChange={e =>
                                  handleDiscountChange(
                                    category.id,
                                    'discountEndDate',
                                    e.target.value
                                  )
                                }
                                className="w-full bg-white dark:bg-black/40 border border-red-300 dark:border-red-500/30 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-red-500/50 outline-none"
                                style={{ direction: 'ltr' }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Save Button - Shows when editing or discount is active */}
                        {(editingPrice[category.id] || showDiscount[category.id]) && (
                          <button
                            onClick={() => savePrice(category.id)}
                            className="w-full bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl font-black transition-all shadow-lg"
                          >
                            حفظ التغييرات
                          </button>
                        )}
                      </div>
                    )}

                    {/* Package Count Badge */}
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Sparkles size={12} />
                          {category.packages.length} باقة
                        </span>
                        <span className="font-mono">ID: {category.id.slice(0, 8)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="col-span-full flex-1 flex items-center justify-center py-20">
              <div className="text-center space-y-3">
                <div
                  className={`w-20 h-20 rounded-full bg-linear-to-br ${activeCategory?.color} opacity-20 mx-auto flex items-center justify-center`}
                >
                  {activeCategory && <activeCategory.icon size={40} className="text-gray-400" />}
                </div>
                <p className="text-gray-500 font-bold">لا توجد باقات في هذا القسم</p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Edit Name Modal */}
      {editNameModal?.isOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setEditNameModal(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-96 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-4">
              تعديل اسم الباقة
            </h3>
            <input
              type="text"
              defaultValue={editNameModal.currentName}
              id="edit-name-input"
              className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/50 outline-none mb-4"
              placeholder="أدخل الاسم الجديد..."
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const input = e.currentTarget;
                  if (input.value.trim()) {
                    updatePackageName(
                      editNameModal.categoryId,
                      editNameModal.packageId,
                      input.value.trim()
                    );
                    setEditNameModal(null);
                  }
                }
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const input = document.getElementById('edit-name-input') as HTMLInputElement;
                  if (input?.value.trim()) {
                    updatePackageName(
                      editNameModal.categoryId,
                      editNameModal.packageId,
                      input.value.trim()
                    );
                    setEditNameModal(null);
                  }
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 font-bold transition-colors"
              >
                حفظ
              </button>
              <button
                onClick={() => setEditNameModal(null)}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 font-bold transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerPackagesView;
