import React, { useState, useEffect, useCallback } from 'react';
import {
  Camera, Search, Plus, Trash2, Edit3, Save,
  Battery, HardDrive, User, Box, X,
  Zap, Aperture, Package, RefreshCw,
  ArrowLeftRight, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { electronBackend } from '../../../services/mockBackend';

// ─── Types ───────────────────────────────────────────────────
interface InventoryItem {
  id: string;
  name: string;
  type: 'camera' | 'lens' | 'light' | 'accessory' | 'drone' | 'audio';
  icon: string;
  status: 'storage' | 'deployed' | 'maintenance';
  assignedTo: string | null;
  assignedToName?: string;
  batteryPool: { total: number; charged: number } | null;
  memoryPool: { total: number; free: number } | null;
  notes: string;
}

interface InventoryLog {
  id: string;
  itemId: string;
  action: string;
  userId: string;
  details: string;
  createdAt: string;
}

interface StaffUser {
  id: string;
  name: string;
  role: string;
}

type InventoryType = InventoryItem['type'];
type InventoryStatus = InventoryItem['status'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseStaffUser = (row: unknown): StaffUser | null => {
  if (!isRecord(row)) return null;

  const id = row.id;
  const name = row.name;
  const role = row.role;

  if (!id || !name || !role) return null;

  return {
    id: String(id),
    name: String(name),
    role: String(role),
  };
};

// ─── Canon Catalog ───────────────────────────────────────────
const CANON_CAMERAS = [
  { name: 'Canon EOS R', icon: '📷', batteryTotal: 2, memoryTotal: 2 },
  { name: 'Canon EOS R3', icon: '📷', batteryTotal: 4, memoryTotal: 2 },
  { name: 'Canon EOS R5', icon: '📷', batteryTotal: 3, memoryTotal: 2 },
  { name: 'Canon EOS R5 C', icon: '🎬', batteryTotal: 4, memoryTotal: 3 },
  { name: 'Canon EOS R5 Mark II', icon: '📷', batteryTotal: 3, memoryTotal: 2 },
  { name: 'Canon EOS R6 Mark III', icon: '📷', batteryTotal: 3, memoryTotal: 2 },
  { name: 'Canon EOS R6 Mark II', icon: '📷', batteryTotal: 3, memoryTotal: 2 },
  { name: 'Canon EOS R7', icon: '📷', batteryTotal: 2, memoryTotal: 2 },
  { name: 'Canon EOS R8', icon: '📷', batteryTotal: 2, memoryTotal: 1 },
  { name: 'Canon EOS R10', icon: '📷', batteryTotal: 2, memoryTotal: 1 },
  { name: 'Canon EOS R50', icon: '📷', batteryTotal: 1, memoryTotal: 1 },
  { name: 'Canon EOS R100', icon: '📷', batteryTotal: 1, memoryTotal: 1 },
  { name: 'Canon EOS C70', icon: '🎬', batteryTotal: 4, memoryTotal: 2 },
  { name: 'Canon EOS C80', icon: '🎬', batteryTotal: 4, memoryTotal: 2 },
];

const CANON_LENSES = [
  { name: 'RF 14-35mm f/4 L IS USM', icon: '⭕' },
  { name: 'RF 15-35mm f/2.8 L IS USM', icon: '⭕' },
  { name: 'RF 24-70mm f/2.8 L IS USM', icon: '⭕' },
  { name: 'RF 24-105mm f/4 L IS USM', icon: '⭕' },
  { name: 'RF 28-70mm f/2 L USM', icon: '⭕' },
  { name: 'RF 70-200mm f/2.8 L IS USM', icon: '⭕' },
  { name: 'RF 100-300mm f/2.8 L IS USM', icon: '⭕' },
  { name: 'RF 100-500mm f/4.5-7.1 L IS USM', icon: '⭕' },
  { name: 'RF 35mm f/1.4 L VCM', icon: '⭕' },
  { name: 'RF 50mm f/1.2 L USM', icon: '⭕' },
  { name: 'RF 50mm f/1.8 STM', icon: '⭕' },
  { name: 'RF 85mm f/1.2 L USM', icon: '⭕' },
  { name: 'RF 85mm f/2 Macro IS STM', icon: '⭕' },
  { name: 'RF 100mm f/2.8 L Macro IS USM', icon: '⭕' },
  { name: 'RF 135mm f/1.8 L IS USM', icon: '⭕' },
  { name: 'RF 200-800mm f/6.3-9 IS USM', icon: '⭕' },
  { name: 'RF 16mm f/2.8 STM', icon: '⭕' },
  { name: 'RF-S 18-150mm f/3.5-6.3 IS STM', icon: '⭕' },
];

const TYPE_CONFIG: Record<InventoryType, { label: string; color: string; icon: React.ReactNode }> = {
  camera: { label: 'كاميرا', color: 'text-cyan-400', icon: <Camera size={12} /> },
  lens: { label: 'عدسة', color: 'text-purple-400', icon: <Aperture size={12} /> },
  light: { label: 'إضاءة', color: 'text-yellow-400', icon: <Zap size={12} /> },
  accessory: { label: 'ملحقات', color: 'text-emerald-400', icon: <Package size={12} /> },
  drone: { label: 'درون', color: 'text-orange-400', icon: <Camera size={12} /> },
  audio: { label: 'صوت', color: 'text-pink-400', icon: <Camera size={12} /> },
};

const INVENTORY_TYPES: ReadonlyArray<InventoryType> = ['camera', 'lens', 'light', 'accessory', 'drone', 'audio'];
const INVENTORY_STATUSES: ReadonlyArray<InventoryStatus> = ['storage', 'deployed', 'maintenance'];

const normalizeInventoryType = (value: string): InventoryType =>
  INVENTORY_TYPES.includes(value as InventoryType) ? (value as InventoryType) : 'accessory';

const normalizeInventoryStatus = (value: string): InventoryStatus =>
  INVENTORY_STATUSES.includes(value as InventoryStatus) ? (value as InventoryStatus) : 'storage';

// ─── Main Component ──────────────────────────────────────────
const AdminInventoryView: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<InventoryType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<InventoryStatus | 'all'>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [inspectingItem, setInspectingItem] = useState<InventoryItem | null>(null);

  // Add form state
  const [addMode, setAddMode] = useState<'catalog' | 'custom'>('catalog');
  const [addCatalogType, setAddCatalogType] = useState<'camera' | 'lens'>('camera');
  const [customName, setCustomName] = useState('');
  const [customType, setCustomType] = useState<string>('light');
  const [customBatteryTotal, setCustomBatteryTotal] = useState(0);
  const [customMemoryTotal, setCustomMemoryTotal] = useState(0);

  // ─── Data Fetching ─────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [inventoryItems, inventoryLogs] = await Promise.all([
        electronBackend.getInventory(),
        electronBackend.getInventoryLogs(),
      ]);

      // Fetch users for assignment
      const api = window.electronAPI;
      let staffUsers: StaffUser[] = [];
      if (api?.db) {
        try {
          const rows = await api.db.query('SELECT id, name, role FROM users WHERE deletedAt IS NULL ORDER BY name ASC');
          staffUsers = rows
            .map(parseStaffUser)
            .filter((user): user is StaffUser => Boolean(user));
        } catch { /* ignore */ }
      }

      // Map assignedTo names
      const userMap = new Map(staffUsers.map(u => [u.id, u.name]));
      const mappedItems: InventoryItem[] = inventoryItems.map(item => ({
        ...item,
        type: normalizeInventoryType(item.type),
        status: normalizeInventoryStatus(item.status),
        assignedToName: item.assignedTo ? (userMap.get(item.assignedTo) ?? 'غير معروف') : undefined,
      }));

      setItems(mappedItems);
      setLogs(inventoryLogs);
      setUsers(staffUsers);
    } catch (e) {
      console.error('Failed to load inventory:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── CRUD Operations ──────────────────────────────────────
  const handleAddFromCatalog = async (catalogItem: { name: string; icon: string; batteryTotal?: number; memoryTotal?: number }, type: 'camera' | 'lens') => {
    const id = await electronBackend.addInventoryItem({
      name: catalogItem.name,
      type,
      icon: catalogItem.icon,
      status: 'storage',
      batteryTotal: catalogItem.batteryTotal,
      batteryCharged: catalogItem.batteryTotal,
      memoryTotal: catalogItem.memoryTotal,
      memoryFree: catalogItem.memoryTotal,
    });
    if (id) {
      await electronBackend.addInventoryLog({ itemId: id, action: 'created', userId: 'admin', details: `تمت إضافة ${catalogItem.name}` });
      await fetchData();
    }
  };

  const handleAddCustom = async () => {
    if (!customName.trim()) return;
    const id = await electronBackend.addInventoryItem({
      name: customName.trim(),
      type: customType,
      icon: customType === 'light' ? '💡' : customType === 'audio' ? '🎤' : customType === 'drone' ? '🚁' : '📦',
      status: 'storage',
      batteryTotal: customBatteryTotal > 0 ? customBatteryTotal : undefined,
      batteryCharged: customBatteryTotal > 0 ? customBatteryTotal : undefined,
      memoryTotal: customMemoryTotal > 0 ? customMemoryTotal : undefined,
      memoryFree: customMemoryTotal > 0 ? customMemoryTotal : undefined,
    });
    if (id) {
      await electronBackend.addInventoryLog({ itemId: id, action: 'created', userId: 'admin', details: `تمت إضافة ${customName}` });
      setCustomName('');
      setCustomBatteryTotal(0);
      setCustomMemoryTotal(0);
      setShowAddModal(false);
      await fetchData();
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    await electronBackend.deleteInventoryItem(id);
    await electronBackend.addInventoryLog({ itemId: id, action: 'deleted', userId: 'admin', details: `تم حذف ${name}` });
    setInspectingItem(null);
    setEditingItem(null);
    await fetchData();
  };

  const handleAssign = async (itemId: string, userId: string | null) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const userName = userId ? users.find(u => u.id === userId)?.name : null;
    await electronBackend.updateInventoryItem(itemId, {
      assignedTo: userId,
      status: userId ? 'deployed' : 'storage',
    });
    await electronBackend.addInventoryLog({
      itemId,
      action: userId ? 'assigned' : 'returned',
      userId: 'admin',
      details: userId ? `تم تسليم ${item.name} إلى ${userName}` : `تم إرجاع ${item.name} إلى المستودع`,
    });
    await fetchData();
  };

  const handleUpdateBattery = async (itemId: string, action: 'charge' | 'drain') => {
    const item = items.find(i => i.id === itemId);
    if (!item?.batteryPool) return;
    const newCharged = action === 'charge'
      ? Math.min(item.batteryPool.charged + 1, item.batteryPool.total)
      : Math.max(item.batteryPool.charged - 1, 0);
    await electronBackend.updateInventoryItem(itemId, { batteryPool: { ...item.batteryPool, charged: newCharged } });
    await electronBackend.addInventoryLog({ itemId, action: action === 'charge' ? 'battery_charge' : 'battery_drain', userId: 'admin', details: `${item.name}: ${newCharged}/${item.batteryPool.total}` });
    await fetchData();
    // Update inspecting item if open
    setInspectingItem(prev => prev?.id === itemId ? { ...prev, batteryPool: { ...prev.batteryPool!, charged: newCharged } } : prev);
  };

  const handleUpdateMemory = async (itemId: string, action: 'format' | 'full') => {
    const item = items.find(i => i.id === itemId);
    if (!item?.memoryPool) return;
    const newFree = action === 'format'
      ? Math.min(item.memoryPool.free + 1, item.memoryPool.total)
      : Math.max(item.memoryPool.free - 1, 0);
    await electronBackend.updateInventoryItem(itemId, { memoryPool: { ...item.memoryPool, free: newFree } });
    await electronBackend.addInventoryLog({ itemId, action: action === 'format' ? 'card_format' : 'card_full', userId: 'admin', details: `${item.name}: ${newFree}/${item.memoryPool.total} فارغة` });
    await fetchData();
    setInspectingItem(prev => prev?.id === itemId ? { ...prev, memoryPool: { ...prev.memoryPool!, free: newFree } } : prev);
  };

  const handleSetMaintenance = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const newStatus = item.status === 'maintenance' ? 'storage' : 'maintenance';
    await electronBackend.updateInventoryItem(itemId, { status: newStatus, assignedTo: null });
    await electronBackend.addInventoryLog({ itemId, action: newStatus === 'maintenance' ? 'maintenance' : 'maintenance_done', userId: 'admin', details: `${item.name}: ${newStatus === 'maintenance' ? 'تم إرسال للصيانة' : 'تم الإصلاح'}` });
    setInspectingItem(null);
    await fetchData();
  };

  const handleEditSave = async () => {
    if (!editingItem) return;
    await electronBackend.updateInventoryItem(editingItem.id, {
      name: editingItem.name,
      notes: editingItem.notes,
    });
    setEditingItem(null);
    await fetchData();
  };

  // ─── Filtering ─────────────────────────────────────────────
  const filteredItems = items.filter(item => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    return true;
  });

  const storageItems = filteredItems.filter(i => i.status === 'storage');
  const deployedItems = filteredItems.filter(i => i.status === 'deployed');
  const maintenanceItems = filteredItems.filter(i => i.status === 'maintenance');

  // Group deployed items by staff
  const deployedByStaff = deployedItems.reduce<Record<string, { user: StaffUser; items: InventoryItem[] }>>((acc, item) => {
    const assignedId = item.assignedTo;
    if (!assignedId) return acc;
    if (!acc[assignedId]) {
      const user = users.find(u => u.id === assignedId) || { id: assignedId, name: item.assignedToName || 'غير معروف', role: '' };
      acc[assignedId] = { user, items: [] };
    }
    acc[assignedId].items.push(item);
    return acc;
  }, {});

  // ─── Status badge ──────────────────────────────────────────
  const statusBadge = (status: string) => {
    switch (status) {
      case 'storage': return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400">مخزن</span>;
      case 'deployed': return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">مستلم</span>;
      case 'maintenance': return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400">صيانة</span>;
      default: return null;
    }
  };

  // ─── Render ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw size={24} className="text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col font-sans p-3 gap-3 text-zinc-100" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Package className="text-amber-500" size={20} />
            إدارة المخزون
          </h2>
          <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-0.5">
            {items.length} عنصر &bull; {deployedItems.length} مستلم &bull; {storageItems.length} مخزن &bull; {maintenanceItems.length} صيانة
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowLogModal(true)} className="px-3 py-1.5 text-[10px] font-bold bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg flex items-center gap-1 transition-colors border border-white/5">
            <Calendar size={12} /> السجل
          </button>
          <button onClick={fetchData} className="px-3 py-1.5 text-[10px] font-bold bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg flex items-center gap-1 transition-colors border border-white/5">
            <RefreshCw size={12} /> تحديث
          </button>
          <button onClick={() => setShowAddModal(true)} className="px-3 py-1.5 text-[10px] font-bold bg-amber-500 hover:bg-amber-400 text-black rounded-lg flex items-center gap-1 transition-colors">
            <Plus size={12} /> إضافة معدة
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-2 items-center">
        <div className="flex-1 relative">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم..."
            className="w-full bg-zinc-900/60 border border-white/5 rounded-lg py-2 pr-9 pl-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <select
          value={filterType}
          onChange={e => {
            const nextType = e.target.value;
            if (nextType === 'all') {
              setFilterType('all');
              return;
            }
            setFilterType(
              INVENTORY_TYPES.includes(nextType as InventoryType) ? (nextType as InventoryType) : 'all'
            );
          }}
          className="bg-zinc-900/60 border border-white/5 rounded-lg py-2 px-3 text-[11px] text-zinc-300 focus:outline-none focus:border-amber-500/50"
        >
          <option value="all">كل الأنواع</option>
          <option value="camera">كاميرات</option>
          <option value="lens">عدسات</option>
          <option value="light">إضاءة</option>
          <option value="accessory">ملحقات</option>
          <option value="drone">درون</option>
          <option value="audio">صوت</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => {
            const nextStatus = e.target.value;
            if (nextStatus === 'all') {
              setFilterStatus('all');
              return;
            }
            setFilterStatus(
              INVENTORY_STATUSES.includes(nextStatus as InventoryStatus)
                ? (nextStatus as InventoryStatus)
                : 'all'
            );
          }}
          className="bg-zinc-900/60 border border-white/5 rounded-lg py-2 px-3 text-[11px] text-zinc-300 focus:outline-none focus:border-amber-500/50"
        >
          <option value="all">كل الحالات</option>
          <option value="storage">مخزن</option>
          <option value="deployed">مستلم</option>
          <option value="maintenance">صيانة</option>
        </select>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 min-h-0 overflow-hidden">

        {/* LEFT: Staff Deployments */}
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-3 flex flex-col overflow-hidden">
          <h3 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
            <User size={14} /> المعدات المستلمة ({deployedItems.length})
          </h3>

          <div className="space-y-3 overflow-y-auto flex-1 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
            {Object.values(deployedByStaff).length === 0 ? (
              <div className="border border-dashed border-white/5 rounded-xl p-8 text-center">
                <p className="text-xs text-zinc-600">لا توجد معدات مستلمة حالياً</p>
              </div>
            ) : (
              Object.values(deployedByStaff).map(({ user, items: staffItems }) => (
                <div key={user.id} className="bg-black/40 border border-white/5 rounded-xl p-3 hover:border-emerald-500/20 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-xs text-zinc-400">
                      {user.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{user.name}</p>
                      <p className="text-[10px] text-zinc-600 font-mono uppercase">{user.role}</p>
                    </div>
                    <span className="mr-auto bg-emerald-500/10 text-emerald-500 text-[9px] px-2 py-0.5 rounded-full font-bold">
                      {staffItems.length} معدة
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {staffItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => setInspectingItem(item)}
                        className="bg-zinc-900 border border-white/5 rounded-xl p-2 flex flex-col items-center justify-center gap-1 hover:bg-zinc-800 hover:border-amber-500/40 transition-all"
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-[8px] text-zinc-400 font-bold truncate w-full text-center">{item.name}</span>
                        {item.batteryPool && (
                          <div className="flex gap-px">
                            {Array.from({ length: item.batteryPool.total }).map((_, i) => (
                              <div key={i} className={`w-1 h-1.5 rounded-[0.5px] ${i < item.batteryPool!.charged ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
                            ))}
                          </div>
                        )}
                        {item.memoryPool && (
                          <div className="flex gap-px">
                            {Array.from({ length: item.memoryPool.total }).map((_, i) => (
                              <div key={i} className={`w-1.5 h-1.5 rounded-[0.5px] ${i < item.memoryPool!.free ? 'bg-cyan-500' : 'bg-red-900/50'}`} />
                            ))}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}

            {/* Maintenance Items */}
            {maintenanceItems.length > 0 && (
              <div className="bg-black/40 border border-red-500/10 rounded-xl p-3">
                <h4 className="text-xs font-bold text-red-400 mb-2 flex items-center gap-1">
                  <Zap size={12} /> في الصيانة ({maintenanceItems.length})
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {maintenanceItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setInspectingItem(item)}
                      className="bg-zinc-900 border border-red-500/10 rounded-xl p-2 flex flex-col items-center justify-center gap-1 hover:bg-zinc-800 transition-all opacity-60"
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-[8px] text-red-400 font-bold truncate w-full text-center">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Storage */}
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-3 flex flex-col overflow-hidden">
          <h3 className="text-sm font-bold text-amber-500 mb-3 flex items-center gap-2">
            <Box size={14} /> المستودع ({storageItems.length})
          </h3>

          <div className="space-y-2 overflow-y-auto flex-1 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
            {storageItems.length === 0 ? (
              <div className="border border-dashed border-white/5 rounded-xl p-8 text-center">
                <p className="text-xs text-zinc-600">المستودع فارغ - أضف معدات جديدة</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {storageItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setInspectingItem(item)}
                    className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all group"
                  >
                    <span className="text-xl opacity-70 group-hover:opacity-100 transition-opacity">{item.icon}</span>
                    <span className="text-[9px] text-zinc-400 group-hover:text-amber-400 font-bold truncate w-full text-center transition-colors">{item.name}</span>
                    <div className="flex items-center gap-1">
                      {TYPE_CONFIG[item.type] && <span className={`text-[8px] ${TYPE_CONFIG[item.type]!.color}`}>{TYPE_CONFIG[item.type]!.label}</span>}
                    </div>
                    {item.batteryPool && (
                      <div className="flex gap-px">
                        {Array.from({ length: item.batteryPool.total }).map((_, i) => (
                          <div key={i} className={`w-1 h-1.5 rounded-[0.5px] ${i < item.batteryPool!.charged ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── INSPECT MODAL ──────────────────────────────────── */}
      <AnimatePresence>
        {inspectingItem && !editingItem && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setInspectingItem(null)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#18181b] border border-white/10 rounded-2xl p-5 w-full max-w-md shadow-2xl relative"
              dir="rtl"
            >
              <button onClick={() => setInspectingItem(null)} className="absolute top-4 left-4 text-zinc-500 hover:text-white"><X size={18} /></button>

              {/* Item Info */}
              <div className="flex flex-col items-center mb-5">
                <div className="text-5xl mb-2">{inspectingItem.icon}</div>
                <h3 className="text-lg font-bold text-white mb-1">{inspectingItem.name}</h3>
                <div className="flex gap-2 items-center">
                  <span className={`text-[10px] ${TYPE_CONFIG[inspectingItem.type].color} flex items-center gap-1`}>
                    {TYPE_CONFIG[inspectingItem.type].icon} {TYPE_CONFIG[inspectingItem.type].label}
                  </span>
                  {statusBadge(inspectingItem.status)}
                </div>
                {inspectingItem.assignedToName && (
                  <p className="text-xs text-emerald-400 mt-1">مستلم بواسطة: {inspectingItem.assignedToName}</p>
                )}
              </div>

              <div className="space-y-4">
                {/* Battery */}
                {inspectingItem.batteryPool && (
                  <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xs font-bold text-zinc-400 flex items-center gap-1"><Battery size={12} /> البطاريات</h4>
                      <div className="flex gap-1">
                        {Array.from({ length: inspectingItem.batteryPool.total }).map((_, i) => (
                          <div key={i} className={`w-2 h-4 rounded-[1px] ${i < inspectingItem.batteryPool!.charged ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]' : 'bg-zinc-800'}`} />
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => handleUpdateBattery(inspectingItem.id, 'drain')} disabled={inspectingItem.batteryPool.charged === 0} className="p-2 bg-zinc-800 border border-white/5 rounded-lg hover:bg-zinc-700 disabled:opacity-30 text-[10px] font-bold text-white transition-colors">
                        استهلكت بطارية
                      </button>
                      <button onClick={() => handleUpdateBattery(inspectingItem.id, 'charge')} disabled={inspectingItem.batteryPool.charged === inspectingItem.batteryPool.total} className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 disabled:opacity-30 text-[10px] font-bold text-emerald-500 transition-colors">
                        شحنة مكتملة
                      </button>
                    </div>
                  </div>
                )}

                {/* Memory */}
                {inspectingItem.memoryPool && (
                  <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xs font-bold text-zinc-400 flex items-center gap-1"><HardDrive size={12} /> الذواكر</h4>
                      <div className="flex gap-1">
                        {Array.from({ length: inspectingItem.memoryPool.total }).map((_, i) => (
                          <div key={i} className={`w-3 h-3 rounded-sm ${i < inspectingItem.memoryPool!.free ? 'bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.4)]' : 'bg-red-900/50'}`} />
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => handleUpdateMemory(inspectingItem.id, 'full')} disabled={inspectingItem.memoryPool.free === 0} className="p-2 bg-zinc-800 border border-white/5 rounded-lg hover:bg-zinc-700 disabled:opacity-30 text-[10px] font-bold text-white transition-colors">
                        تملت الذاكرة
                      </button>
                      <button onClick={() => handleUpdateMemory(inspectingItem.id, 'format')} disabled={inspectingItem.memoryPool.free === inspectingItem.memoryPool.total} className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 disabled:opacity-30 text-[10px] font-bold text-cyan-500 transition-colors">
                        فورمات / تفريغ
                      </button>
                    </div>
                  </div>
                )}

                {/* Assign */}
                <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                  <h4 className="text-xs font-bold text-zinc-400 mb-2 flex items-center gap-1"><ArrowLeftRight size={12} /> تسليم / إرجاع</h4>
                  {inspectingItem.status === 'deployed' ? (
                    <button onClick={() => handleAssign(inspectingItem.id, null)} className="w-full p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] font-bold text-amber-500 hover:bg-amber-500/20 transition-colors">
                      إرجاع إلى المستودع
                    </button>
                  ) : inspectingItem.status === 'maintenance' ? (
                    <p className="text-xs text-red-400 text-center py-2">هذا العنصر في الصيانة</p>
                  ) : (
                    <select
                      onChange={e => { if (e.target.value) handleAssign(inspectingItem.id, e.target.value); }}
                      defaultValue=""
                      className="w-full bg-zinc-800 border border-white/5 rounded-lg py-2 px-3 text-[11px] text-zinc-300 focus:outline-none focus:border-emerald-500/50"
                    >
                      <option value="" disabled>اختر الموظف للتسليم...</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => { setEditingItem(inspectingItem); }} className="py-2 rounded-lg border border-dashed border-zinc-700 text-zinc-400 text-[10px] font-bold hover:text-white hover:border-white transition-colors flex items-center justify-center gap-1">
                    <Edit3 size={10} /> تعديل
                  </button>
                  <button onClick={() => handleSetMaintenance(inspectingItem.id)} className="py-2 rounded-lg bg-yellow-500/10 text-yellow-500 text-[10px] font-bold hover:bg-yellow-500/20 transition-colors">
                    {inspectingItem.status === 'maintenance' ? 'تم الإصلاح' : 'صيانة'}
                  </button>
                  <button onClick={() => handleDeleteItem(inspectingItem.id, inspectingItem.name)} className="py-2 rounded-lg bg-red-500/10 text-red-500 text-[10px] font-bold hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-1">
                    <Trash2 size={10} /> حذف
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── EDIT MODAL ─────────────────────────────────────── */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingItem(null)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#18181b] border border-white/10 rounded-2xl p-5 w-full max-w-sm shadow-2xl"
              dir="rtl"
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Edit3 size={16} /> تعديل المعدة</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-zinc-500 mb-1 block">الاسم</label>
                  <input
                    value={editingItem.name}
                    onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 mb-1 block">ملاحظات</label>
                  <textarea
                    value={editingItem.notes || ''}
                    onChange={e => setEditingItem({ ...editingItem, notes: e.target.value })}
                    rows={3}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-amber-500/50 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setEditingItem(null)} className="py-2 rounded-lg border border-white/10 text-zinc-400 text-xs font-bold hover:text-white transition-colors">
                    إلغاء
                  </button>
                  <button onClick={handleEditSave} className="py-2 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors flex items-center justify-center gap-1">
                    <Save size={12} /> حفظ
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── ADD MODAL ──────────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#18181b] border border-white/10 rounded-2xl p-5 w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col"
              dir="rtl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Plus size={16} /> إضافة معدة جديدة</h3>
                <button onClick={() => setShowAddModal(false)}><X size={18} className="text-zinc-500 hover:text-white" /></button>
              </div>

              {/* Tabs */}
              <div className="flex bg-black/40 p-1 rounded-lg border border-white/10 mb-4">
                <button onClick={() => setAddMode('catalog')} className={`flex-1 px-3 py-1.5 text-[11px] font-bold rounded transition-colors ${addMode === 'catalog' ? 'bg-amber-500 text-black' : 'text-zinc-500 hover:text-white'}`}>
                  من الكتالوج
                </button>
                <button onClick={() => setAddMode('custom')} className={`flex-1 px-3 py-1.5 text-[11px] font-bold rounded transition-colors ${addMode === 'custom' ? 'bg-amber-500 text-black' : 'text-zinc-500 hover:text-white'}`}>
                  إضافة يدوية
                </button>
              </div>

              {addMode === 'catalog' ? (
                <div className="flex-1 overflow-hidden flex flex-col">
                  {/* Camera / Lens switch */}
                  <div className="flex gap-2 mb-3">
                    <button onClick={() => setAddCatalogType('camera')} className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${addCatalogType === 'camera' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-zinc-500 border border-white/5'}`}>
                      <Camera size={12} className="inline ml-1" /> كاميرات Canon
                    </button>
                    <button onClick={() => setAddCatalogType('lens')} className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${addCatalogType === 'lens' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-white/5 text-zinc-500 border border-white/5'}`}>
                      <Aperture size={12} className="inline ml-1" /> عدسات Canon RF
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
                    {(addCatalogType === 'camera' ? CANON_CAMERAS : CANON_LENSES).map((cat, idx) => {
                      const alreadyExists = items.some(i => i.name === cat.name);
                      return (
                        <div key={idx} className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${alreadyExists ? 'border-white/5 bg-zinc-900/30 opacity-40' : 'border-white/5 bg-black/40 hover:border-amber-500/30 hover:bg-amber-500/5'}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{cat.icon}</span>
                            <span className="text-xs font-bold text-white">{cat.name}</span>
                            {'batteryTotal' in cat && typeof cat.batteryTotal === 'number' && (
                              <span className="text-[9px] text-zinc-500">{cat.batteryTotal} بطاريات</span>
                            )}
                          </div>
                          {alreadyExists ? (
                            <span className="text-[9px] text-zinc-600">موجود</span>
                          ) : (
                            <button
                              onClick={() => handleAddFromCatalog(cat, addCatalogType)}
                              className="px-3 py-1 text-[10px] font-bold bg-amber-500 hover:bg-amber-400 text-black rounded-lg transition-colors"
                            >
                              + أضف
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-zinc-500 mb-1 block">اسم المعدة</label>
                    <input
                      value={customName}
                      onChange={e => setCustomName(e.target.value)}
                      placeholder="مثال: Godox AD600 Pro"
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg py-2 px-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 mb-1 block">النوع</label>
                    <select value={customType} onChange={e => setCustomType(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-amber-500/50">
                      <option value="light">إضاءة</option>
                      <option value="camera">كاميرا</option>
                      <option value="lens">عدسة</option>
                      <option value="accessory">ملحقات</option>
                      <option value="drone">درون</option>
                      <option value="audio">صوت</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-zinc-500 mb-1 block">عدد البطاريات (اختياري)</label>
                      <input
                        type="number"
                        min={0}
                        value={customBatteryTotal}
                        onChange={e => setCustomBatteryTotal(Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 mb-1 block">عدد الذواكر (اختياري)</label>
                      <input
                        type="number"
                        min={0}
                        value={customMemoryTotal}
                        onChange={e => setCustomMemoryTotal(Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAddCustom}
                    disabled={!customName.trim()}
                    className="w-full py-2.5 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 disabled:opacity-30 transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus size={14} /> إضافة
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── LOG MODAL ──────────────────────────────────────── */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowLogModal(false)}>
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              onClick={e => e.stopPropagation()}
              className="bg-[#09090b] border-r border-white/10 w-full max-w-md h-full fixed left-0 top-0 shadow-2xl flex flex-col"
              dir="rtl"
            >
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
                <h3 className="text-lg font-black text-white flex items-center gap-2"><Calendar size={18} /> سجل الحركة</h3>
                <button onClick={() => setShowLogModal(false)}><X className="text-zinc-500 hover:text-white" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {logs.length === 0 ? (
                  <p className="text-xs text-zinc-600 text-center py-8">لا توجد سجلات بعد</p>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className="flex gap-3 p-3 bg-zinc-900/50 rounded-xl border border-white/5 items-start">
                      <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400 mt-0.5">
                        {log.action === 'assigned' ? '📤' : log.action === 'returned' ? '📥' : log.action === 'created' ? '➕' : log.action === 'deleted' ? '🗑️' : log.action === 'battery_charge' ? '⚡' : log.action === 'battery_drain' ? '🔋' : log.action === 'card_format' ? '💾' : log.action === 'maintenance' ? '🔧' : '📋'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-white truncate">{log.details}</p>
                        <p className="text-[9px] text-zinc-600 font-mono mt-0.5">{new Date(log.createdAt).toLocaleString('ar-IQ')}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminInventoryView;
