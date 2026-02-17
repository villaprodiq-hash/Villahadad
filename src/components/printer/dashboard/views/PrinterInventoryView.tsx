import React, { useEffect, useState } from 'react';
import { Package, Search, Plus, Edit, Trash2, AlertTriangle, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface InventoryItem {
  id: string;
  name: string;
  category: 'album' | 'frame' | 'canvas' | 'material' | 'set' | 'package';
  price: number;
  stock: number;
  minStock: number;
  image: string;
  description: string;
}

type InventoryCategory = InventoryItem['category'];

const STORAGE_KEY = 'printer_inventory_items_v1';
const DEFAULT_PRODUCT_IMAGE_PATH = 'images/products/services_list.jpg';

const resolveProductImageSrc = (path?: string): string => {
  if (!path) {
    return `${import.meta.env.BASE_URL}${DEFAULT_PRODUCT_IMAGE_PATH}`;
  }

  // Keep external or data/blob URLs as-is.
  if (/^(https?:|file:|data:|blob:)/i.test(path)) {
    return path;
  }

  const cleanedPath = path.replace(/^\/+/, '');
  return `${import.meta.env.BASE_URL}${cleanedPath}`;
};

const DEFAULT_INVENTORY_ITEMS: InventoryItem[] = [
  // --- Album Sets (Seetat) ---
  {
    id: 'set-1',
    name: 'السيت الأول: قديفة مع زجاج',
    category: 'set',
    price: 85000,
    stock: 5,
    minStock: 2,
    image: '/images/products/album_set_1.jpg',
    description:
      'بوكس كبير فخم + ألبوم كبير 30x40 + ألبوم مني + 2 منضديات + جدارية. (ألوان بيجي/أسود)'
  },
  {
    id: 'set-2',
    name: 'السيت الثاني: خشب مع الجام',
    category: 'set',
    price: 85000,
    stock: 3,
    minStock: 1,
    image: '/images/products/album_set_2.jpg',
    description:
      'بوكس خشبي فخم + ألبوم كبير 30x40 (قديفة لون خشبي/زيتوني) + ألبوم مني + 2 منضديات + جدارية.'
  },
  {
    id: 'set-3',
    name: 'السيت الثالث: الاكريليك وقديفة',
    category: 'set',
    price: 85000,
    stock: 4,
    minStock: 1,
    image: '/images/products/album_set_3.jpg',
    description: 'بوكس كبير + ألبوم كبير 30x40 (بيجي/أسود/زيتوني) + ألبوم مني + 2 منضديات + جدارية.'
  },
  {
    id: 'set-4',
    name: 'السيت الرابع: قديفة فيونكة',
    category: 'set',
    price: 85000,
    stock: 6,
    minStock: 2,
    image: '/images/products/album_set_1.jpg',
    description: 'بوكس خشبي فخم + ألبوم كبير 30x40 (بيجي/أبيض/زيتوني) + ألبوم مني + 2 منضديات + جدارية.'
  },
  {
    id: 'set-5',
    name: 'السيت السادس: قديفة متعدد',
    category: 'set',
    price: 65000,
    stock: 8,
    minStock: 3,
    image: '/images/products/album_set_3.jpg',
    description: 'مقاس 50x25 (جلد/شاموا/قديفة). بوكس قديفة + ألبوم كبير + ألبوم مني + 2 منضديات + جدارية.'
  },

  // --- Single Album Packages ---
  {
    id: 'pkg-1',
    name: 'البكج الأول: ألبوم قديفة 30x40',
    category: 'album',
    price: 48000,
    stock: 10,
    minStock: 4,
    image: '/images/products/velvet_albums.jpg',
    description: 'طباعة حرارية، حفر الأسماء مجاني. 16 صورة.'
  },
  {
    id: 'pkg-2',
    name: 'البكج الثاني: ألبوم كامل',
    category: 'album',
    price: 75000,
    stock: 8,
    minStock: 3,
    image: '/images/products/velvet_albums.jpg',
    description: 'ألبوم 30x40 + منضدية 6x8 + جدارية A4. عدد 24 صورة.'
  },
  {
    id: 'pkg-3',
    name: 'البكج الثالث: ألبوم 15x20',
    category: 'album',
    price: 29000,
    stock: 15,
    minStock: 5,
    image: '/images/products/mini_albums.jpg',
    description: 'ألبوم مني (8 ورقيات فوجي) + 8 صور ألبوم + 16 صورة مجموع.'
  },

  // --- Photo Packages ---
  {
    id: 'print-6x8',
    name: 'طباعة صور 6x8 (بكج)',
    category: 'package',
    price: 75000,
    stock: 50,
    minStock: 10,
    image: '/images/products/paper_photos.jpg',
    description: '50 صورة بـ 75 ألف | 100 بـ 125 ألف | 200 بـ 200 ألف. ورق فوجي.'
  },
  {
    id: 'instant-100',
    name: 'صور فورية (100 صورة)',
    category: 'package',
    price: 69000,
    stock: 20,
    minStock: 5,
    image: '/images/products/instant_photos.jpg',
    description: 'نفس تصميم وقياس الصور الفورية. مع توصيل مجاني وهدية.'
  },
];

const getInitialInventory = (): InventoryItem[] => {
  if (typeof window === 'undefined') return DEFAULT_INVENTORY_ITEMS;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_INVENTORY_ITEMS;

    const parsed = JSON.parse(saved) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_INVENTORY_ITEMS;

    const normalized = parsed
      .filter((item): item is InventoryItem => {
        return (
          typeof item === 'object' &&
          item !== null &&
          'id' in item &&
          'name' in item &&
          'category' in item &&
          'price' in item &&
          'stock' in item &&
          'minStock' in item &&
          'image' in item &&
          'description' in item
        );
      })
      .map(item => ({
        ...item,
        price: Number(item.price) || 0,
        stock: Number(item.stock) || 0,
        minStock: Number(item.minStock) || 0,
        image: typeof item.image === 'string' && item.image.trim() ? item.image : DEFAULT_PRODUCT_IMAGE_PATH,
      }));

    return normalized.length > 0 ? normalized : DEFAULT_INVENTORY_ITEMS;
  } catch (error) {
    console.error('[PrinterInventoryView] Failed to restore local inventory:', error);
    return DEFAULT_INVENTORY_ITEMS;
  }
};

const PrinterInventoryView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<'all' | 'album' | 'frame' | 'set' | 'package'>('all');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(getInitialInventory);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({ category: 'package', image: DEFAULT_PRODUCT_IMAGE_PATH });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inventoryItems));
    } catch (error) {
      console.error('[PrinterInventoryView] Failed to persist local inventory:', error);
    }
  }, [inventoryItems]);

  const filteredItems = inventoryItems.filter(item => {
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    const matchesSearch = item.name.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  const resetForm = () => {
    setEditingItemId(null);
    setNewItem({ category: 'package', image: DEFAULT_PRODUCT_IMAGE_PATH });
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItemId(item.id);
    setNewItem(item);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  const handleDeleteItem = (item: InventoryItem) => {
    const confirmed = window.confirm(`هل أنت متأكد من حذف المنتج: ${item.name} ؟`);
    if (!confirmed) return;

    setInventoryItems(prev => prev.filter(entry => entry.id !== item.id));
    toast.success('تم حذف المنتج من المخزن');
  };

  const handleSubmitItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name?.trim()) {
      toast.error('يرجى إدخال اسم المنتج');
      return;
    }

    const price = Math.max(0, Number(newItem.price) || 0);
    const stock = Math.max(0, Number(newItem.stock) || 0);
    const minStock = Math.max(0, Number(newItem.minStock) || 0);

    const item: InventoryItem = {
      id: editingItemId || `new-${Date.now()}`,
      name: newItem.name.trim(),
      category: (newItem.category as InventoryCategory) || 'package',
      price,
      stock,
      minStock,
      image: newItem.image || DEFAULT_PRODUCT_IMAGE_PATH,
      description: newItem.description || '',
    };

    if (editingItemId) {
      setInventoryItems(prev => prev.map(entry => (entry.id === editingItemId ? item : entry)));
      toast.success('تم تحديث المنتج بنجاح');
    } else {
      setInventoryItems(prev => [item, ...prev]);
      toast.success('تمت إضافة المنتج للمخزن');
    }

    closeModal();
  };

  return (
    <div className="h-full flex flex-col space-y-6 overflow-hidden p-2 relative">
      
      {/* Header & Stats */}
      <div className="grid grid-cols-4 gap-4 shrink-0">
        <div className="bg-[#151a18] border border-white/5 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
            <Package size={20} />
          </div>
          <div>
            <p className="text-gray-400 text-[10px]">إجمالي المواد</p>
            <h3 className="text-xl font-bold text-white">{inventoryItems.length}</h3>
          </div>
        </div>
        
        <div className="bg-[#151a18] border border-white/5 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-400">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-gray-400 text-[10px]">نواقص المخزن</p>
            <h3 className="text-xl font-bold text-white">{inventoryItems.filter(i => i.stock <= i.minStock).length}</h3>
          </div>
        </div>

        <div className="bg-[#151a18] border border-white/5 p-4 rounded-2xl flex items-center gap-3 col-span-2">
           <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400">
            <DollarSign size={20} />
           </div>
           <div>
             <p className="text-gray-400 text-[10px]">قيمة المخزون التقريبية</p>
             <h3 className="text-xl font-bold text-white font-mono">
               {inventoryItems.reduce((acc, item) => acc + (item.price * item.stock), 0).toLocaleString()} <span className="text-xs font-normal text-gray-500">د.ع</span>
             </h3>
           </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div className="flex bg-[#151a18] p-1 rounded-xl border border-white/5">
          <button onClick={() => setFilterCategory('all')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterCategory === 'all' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>الكل</button>
          <button onClick={() => setFilterCategory('set')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterCategory === 'set' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>سيتات</button>
          <button onClick={() => setFilterCategory('album')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterCategory === 'album' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>ألبومات</button>
          <button onClick={() => setFilterCategory('package')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterCategory === 'package' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>صور</button>
        </div>

        <div className="relative flex-1 max-w-md">
           <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
           <input 
             type="text" 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             placeholder="بحث عن منتج..." 
             className="w-full pl-4 pr-10 py-2.5 bg-[#151a18] border border-white/5 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
           />
        </div>

        <button 
          onClick={openAddModal}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20"
        >
           <Plus size={16} />
           <span>إضافة منتج</span>
        </button>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {/* Add New Quick Card */}
            <button 
              onClick={openAddModal}
              className="border-2 border-dashed border-white/5 hover:border-emerald-500/30 rounded-2xl flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-emerald-400 transition-all min-h-[300px] group order-first"
            >
               <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-emerald-500/10 flex items-center justify-center transition-colors">
                 <Plus size={24} />
               </div>
               <p className="text-xs font-bold">إضافة منتج جديد</p>
            </button>

            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group bg-[#151a18] border border-white/5 hover:border-emerald-500/40 rounded-2xl p-4 flex flex-col gap-4 transition-all hover:shadow-2xl relative overflow-hidden h-full"
              >
                {/* Status Badge */}
                <div className="absolute top-3 left-3 z-10 flex gap-1">
                   {item.stock === 0 ? (
                     <span className="px-2 py-1 rounded-md bg-rose-500/80 backdrop-blur-sm text-white text-[9px] font-bold shadow-lg">نفذت الكمية</span>
                   ) : item.stock <= item.minStock ? (
                     <span className="px-2 py-1 rounded-md bg-amber-500/80 backdrop-blur-sm text-white text-[9px] font-bold shadow-lg">مخزون منخفض</span>
                   ) : null}
                </div>

                {/* Aspect Ratio Image Placeholder */}
                <div className="aspect-[4/3] bg-linear-to-br from-gray-800 to-black rounded-xl border border-white/5 overflow-hidden relative group-hover:scale-[1.02] transition-transform duration-500">
                   <img 
                      src={resolveProductImageSrc(item.image)} 
                      alt={item.name}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      onError={(e) => {
                         (e.currentTarget as HTMLImageElement).src = resolveProductImageSrc(DEFAULT_PRODUCT_IMAGE_PATH);
                      }}
                   />
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-2 bg-white/10 hover:bg-emerald-500 text-white rounded-full backdrop-blur-sm transition-colors"
                        title="تعديل"
                      >
                         <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="p-2 bg-white/10 hover:bg-rose-500 text-white rounded-full backdrop-blur-sm transition-colors"
                        title="حذف"
                      >
                         <Trash2 size={16} />
                      </button>
                   </div>
                </div>

                <div className="flex-1 flex flex-col gap-1">
                   <div className="flex justify-between items-start">
                     <h3 className="text-sm font-bold text-white leading-tight">{item.name}</h3>
                   </div>
                   <p className="text-[10px] text-gray-500 line-clamp-3 leading-relaxed">{item.description}</p>
                   
                   <div className="mt-auto pt-3 flex items-end justify-between border-t border-white/5">
                      <div>
                        <p className="text-[10px] text-gray-400">السعر</p>
                        <p className="text-emerald-400 font-bold font-mono text-sm">{item.price.toLocaleString()}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] text-gray-400">الكمية</p>
                        <p className={`font-bold font-mono text-sm ${item.stock === 0 ? 'text-rose-500' : 'text-white'}`}>{item.stock}</p>
                      </div>
                   </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1a1f1d] border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h2 className="text-lg font-bold text-white">
                  {editingItemId ? 'تعديل منتج المخزن' : 'إضافة منتج جديد للمخزن'}
                </h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-white">✕</button>
              </div>
              
              <form onSubmit={handleSubmitItem} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400">اسم المنتج / البكج</label>
                  <input 
                    required
                    value={newItem.name || ''}
                    onChange={e => setNewItem({...newItem, name: e.target.value})}
                    className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 outline-none"
                    placeholder="مثال: سيت ألبوم ملكي فاخر"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400">التصنيف</label>
                    <select 
                      value={newItem.category || 'package'}
                      onChange={e => setNewItem({...newItem, category: e.target.value as InventoryCategory})}
                      className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 outline-none"
                    >
                      <option value="set">سيت ألبوم</option>
                      <option value="album">ألبوم منفرد</option>
                      <option value="package">بكج صور</option>
                      <option value="frame">إطار / برواز</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400">السعر (د.ع)</label>
                    <input 
                      type="number"
                      required
                      value={newItem.price || ''}
                      onChange={e => setNewItem({...newItem, price: Number(e.target.value)})}
                      className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400">الكمية المتوفرة</label>
                    <input 
                      type="number"
                      value={newItem.stock || ''}
                      onChange={e => setNewItem({...newItem, stock: Number(e.target.value)})}
                      className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 outline-none"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400">حد التنبيه (Low Stock)</label>
                    <input 
                      type="number"
                      value={newItem.minStock || ''}
                      onChange={e => setNewItem({...newItem, minStock: Number(e.target.value)})}
                      className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 outline-none"
                      placeholder="5"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400">الوصف والتفاصيل</label>
                  <textarea 
                    value={newItem.description || ''}
                    onChange={e => setNewItem({...newItem, description: e.target.value})}
                    className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 outline-none min-h-[80px]"
                    placeholder="أضف تفاصيل المحتويات، القياسات، وأي ملاحظات أخرى..."
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={closeModal}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
                  >
                    إلغاء
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors shadow-lg shadow-emerald-600/20"
                  >
                    {editingItemId ? 'حفظ التعديلات' : 'إضافة للمخزن'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PrinterInventoryView;
