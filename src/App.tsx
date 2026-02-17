import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Camera, Building2, Loader2 } from 'lucide-react';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { UpdateNotification } from './components/shared/UpdateNotification';

// --- Loading Component ---
const AppLoader = () => {
  const [elapsedTime, setElapsedTime] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#09090b]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
        <p className="text-gray-400 text-sm font-medium animate-pulse">جارِ تحميل النظام...</p>
        <p className="text-gray-600 text-xs">⏱️ {elapsedTime} ثانية</p>
      </div>
    </div>
  );
};

const PORTAL_ROUTE_PREFIXES = ['/select', '/client-portal', '/view/', '/gallery/'] as const;
const DEFAULT_STAFF_WEB_HOST = 'staff.villahadad.org';
const DEFAULT_PORTAL_WEB_HOST = 'select.villahadad.org';

type WebHostMode = 'staff' | 'select' | 'other';

const getHostFromConfiguredUrl = (configuredUrl: string | undefined, fallback: string): string => {
  const raw = String(configuredUrl || '').trim();
  if (!raw) return fallback;
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return fallback;
  }
};

const getStaffWebHost = (): string =>
  getHostFromConfiguredUrl(import.meta.env.VITE_STAFF_BASE_URL as string | undefined, DEFAULT_STAFF_WEB_HOST);

const getPortalWebHost = (): string =>
  getHostFromConfiguredUrl(
    import.meta.env.VITE_CLIENT_PORTAL_BASE_URL as string | undefined,
    DEFAULT_PORTAL_WEB_HOST
  );

const getWebHostMode = (): WebHostMode => {
  if (typeof window === 'undefined') return 'other';
  const hostname = window.location.hostname.toLowerCase();
  if (!hostname) return 'other';

  if (hostname === getPortalWebHost()) return 'select';
  if (hostname === getStaffWebHost()) return 'staff';
  return 'other';
};

const isClientPortalRoute = (): boolean => {
  if (typeof window === 'undefined') return false;

  const path = window.location.pathname;
  const hash = window.location.hash;
  const params = new URLSearchParams(window.location.search);

  const inPath = PORTAL_ROUTE_PREFIXES.some(prefix => path.startsWith(prefix));
  const inHash = PORTAL_ROUTE_PREFIXES.some(prefix => hash.includes(prefix));
  const hasToken = params.has('token') || params.has('t');

  // Route/token signals are authoritative so portal links always open correctly
  // even if host env values are temporarily misconfigured.
  if (inPath || inHash || hasToken) return true;

  const hostMode = getWebHostMode();
  if (hostMode === 'select') return true;
  if (hostMode === 'staff') return false;

  return false;
};

const isElectronRuntime = (): boolean => {
  if (typeof window === 'undefined') return false;
  return typeof window.electronAPI !== 'undefined';
};

const WEB_ALLOWED_ROLES = new Set<UserRole>([
  UserRole.MANAGER,
  UserRole.ADMIN,
  UserRole.RECEPTION,
  UserRole.PRINTER,
]);

const WEB_BLOCKED_SECTIONS_BY_ROLE: Partial<Record<UserRole, Set<string>>> = {
  [UserRole.MANAGER]: new Set(['section-files']),
};

const WebAccessLockedScreen: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#07090f] px-6">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0f1320]/90 backdrop-blur-xl p-8 text-center">
        <p className="text-2xl font-black text-white mb-3">وصول الويب مقيّد</p>
        <p className="text-zinc-300 leading-7 mb-6">
          هذه نسخة ويب مخصّصة للرسبشن، الطباعة، المشرف، والمديرة فقط.
          <br />
          الأدوار الأخرى تعمل عبر تطبيق سطح المكتب.
        </p>
      </div>
    </div>
  );
};

// --- 1. استيراد مكونات المديرة (Lumina Design) - Lazy Load ---
const ManagerLayout = React.lazy(() => import('./components/manager/layout/ManagerLayout'));
const ManagerDashboard = React.lazy(
  () => import('./components/manager/dashboard/ManagerDashboard')
);
const ManagerClientsView = React.lazy(
  () => import('./components/manager/clients/ManagerClientsView')
);
const ManagerTeamView = React.lazy(() => import('./components/manager/team/ManagerTeamView'));
const ManagerGalleryView = React.lazy(
  () => import('./components/manager/gallery/ManagerGalleryView')
);
const ManagerBookingDetailsView = React.lazy(
  () => import('./components/manager/ManagerBookingDetailsView')
);

// --- Admin Components - Lazy Load ---
const AdminLayout = React.lazy(() => import('./components/admin/layout/AdminLayout'));
const DashboardOverview = React.lazy(
  () => import('./components/admin/dashboard/DashboardOverview')
);
const AdminClientsListView = React.lazy(
  () => import('./components/admin/clients/AdminClientsListView')
);
const AdminFinancialView = React.lazy(
  () => import('./components/admin/financial/AdminFinancialView')
);
const AdminSystemView = React.lazy(() => import('./components/admin/system/AdminSystemView'));
const ConflictResolutionView = React.lazy(
  () => import('./components/manager/sync/ConflictResolutionView')
);
const AdminAuditView = React.lazy(() => import('./components/admin/security/AdminAuditView'));
const WorkflowManagerView = React.lazy(
  () => import('./components/admin/workflow/WorkflowManagerView')
);
const AdminSentinelView = React.lazy(() => import('./components/admin/hr/AdminSentinelView'));
const AdminHRView = React.lazy(() => import('./components/admin/hr/AdminHRView'));
const AdminInventoryView = React.lazy(() => import('./components/admin/assets/AdminInventoryView'));
const AdminWarRoomView = React.lazy(() => import('./components/admin/dashboard/AdminWarRoomView'));
const AdminGeniusDashboard = React.lazy(
  () => import('./components/admin/dashboard/AdminGeniusDashboard')
);
const DeletedBookingsView = React.lazy(() => import('./components/manager/DeletedBookingsView'));

// --- 2. استيراد مكونات باقي الأدوار ---
// Reception - Lazy Load
const ReceptionSidebar = React.lazy(() => import('./components/reception/layout/ReceptionSidebar'));
const ReceptionDashboard = React.lazy(
  () => import('./components/reception/dashboard/ReceptionDashboard')
);
const ReceptionClientsView = React.lazy(
  () => import('./components/reception/clients/ReceptionClientsView')
);
const ReceptionBookingsView = React.lazy(
  () => import('./components/reception/bookings/ReceptionBookingsView')
);
const ReceptionFinancialView = React.lazy(
  () => import('./components/reception/financial/ReceptionFinancialView')
);
const ReceptionGalleryView = React.lazy(
  () => import('./components/reception/gallery/ReceptionGalleryView')
);

// Editors & Printer - Lazy Load
const PhotoEditorLayout = React.lazy(
  () => import('./components/photo-editor/layout/PhotoEditorLayout')
);
const PhotoEditorDashboard = React.lazy(
  () => import('./components/photo-editor/dashboard/PhotoEditorDashboard')
);
const VideoEditorLayout = React.lazy(
  () => import('./components/video-editor/layout/VideoEditorLayout')
);
const VideoEditorDashboard = React.lazy(
  () => import('./components/video-editor/dashboard/VideoEditorDashboard')
);
const PrinterLayout = React.lazy(() => import('./components/printer/layout/PrinterLayout'));
const PrinterDashboard = React.lazy(
  () => import('./components/printer/dashboard/PrinterDashboard')
);

// Shared Components - Lazy Load
const UnifiedTeamChat = React.lazy(() => import('./components/shared/UnifiedTeamChat'));
const SelectionLayout = React.lazy(() => import('./components/selection/layout/SelectionLayout'));
const SelectionDashboard = React.lazy(() => import('./components/selection/SelectionDashboard'));
const WorkflowView = React.lazy(() => import('./components/WorkflowView'));
const ClientPortal = React.lazy(() => import('./pages/ClientPortal'));

// Manager Financials - Lazy Load
const ManagerFinancialView = React.lazy(
  () => import('./components/manager/financial/ManagerFinancialView')
);
const ManagerAccountsView = React.lazy(
  () => import('./components/manager/financial/ManagerAccountsView')
);

// Keep Critical Components Eager (Modals, Headers, Login)
import Header from './components/Header';
import BookingDetailsView from './components/BookingDetailsView'; // Keep eager for quick transitions? Or lazy? Let's keep eager for now as it's heavily used.
import { SecurityAccessTerminal } from './components/shared/auth/SecurityAccessTerminal';
import { OfflineBanner } from './components/shared/OfflineBanner';
import { SyncManager } from './services/sync/SyncManager';
import { NasVisionService } from './services/automation/NasVisionService';

// Modals & Effects (Keep Eager or Lazy based on usage frequency)
import AddBookingModal from './components/AddBookingModal';
import ConfirmationModal from './components/shared/ConfirmationModal';
import SettingsModal from './components/shared/SettingsModal';
import AiAssistantModal from './components/AiAssistantModal';
import PaymentLockModal from './components/PaymentLockModal';
import ReminderModal from './components/ReminderModal';
import Snowfall from './components/shared/Snowfall';
import RamadanLanterns from './components/shared/RamadanLanterns';
import SparklesEffect from './components/shared/SparklesEffect';

// Types & Utils
import {
  User,
  UserRole,
  Booking,
  BookingStatus,
  ReminderType,
  BookingCategory,
  canUserSeeBooking,
  Reminder,
  PaymentRecord,
} from './types';

import { electronBackend } from './services/mockBackend';
import { callClientPortal } from './services/clientPortalService';
import { AppNotification } from './types/notification.types';
import ReceptionPageWrapper from './components/reception/layout/ReceptionPageWrapper';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useDataContextValue as useData } from './providers/data-context';

import { AuthProvider } from './providers/AuthProvider';
import { DataProvider } from './providers/DataProvider';

// ============================================
// 🔐 DEVICE LOGIN STORAGE HELPERS
// ============================================
const DEVICE_USER_KEY = 'villahaddad_lastLoggedInUserId';
const DEVICE_PINNED_USERS_KEY = 'villahaddad_pinnedUserIds';
const DEVICE_LAST_ROLE_BY_USER_KEY = 'villahaddad_lastRoleByUser';
const MAX_PINNED_USERS = 6;

const isValidUserRole = (value: unknown): value is UserRole =>
  Object.values(UserRole).includes(value as UserRole);

const DeviceStorage = {
  getLastUserId: (): string | null => {
    try {
      return localStorage.getItem(DEVICE_USER_KEY);
    } catch {
      return null;
    }
  },
  setLastUserId: (userId: string): void => {
    try {
      localStorage.setItem(DEVICE_USER_KEY, userId);
    } catch (e) {
      console.warn('Failed to save device user:', e);
    }
  },
  clearLastUserId: (): void => {
    try {
      localStorage.removeItem(DEVICE_USER_KEY);
    } catch (e) {
      console.warn('Failed to clear device user:', e);
    }
  },
  getPinnedUserIds: (): string[] => {
    try {
      const raw = localStorage.getItem(DEVICE_PINNED_USERS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const sanitized = parsed.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
      return Array.from(new Set(sanitized)).slice(0, MAX_PINNED_USERS);
    } catch (e) {
      console.warn('Failed to read pinned users:', e);
      return [];
    }
  },
  setPinnedUserIds: (userIds: string[]): string[] => {
    const sanitized = Array.from(
      new Set(userIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))
    ).slice(0, MAX_PINNED_USERS);
    try {
      localStorage.setItem(DEVICE_PINNED_USERS_KEY, JSON.stringify(sanitized));
    } catch (e) {
      console.warn('Failed to save pinned users:', e);
    }
    return sanitized;
  },
  addPinnedUserId: (userId: string): string[] => {
    const current = DeviceStorage.getPinnedUserIds();
    const next = [userId, ...current.filter(id => id !== userId)];
    return DeviceStorage.setPinnedUserIds(next);
  },
  removePinnedUserId: (userId: string): string[] => {
    const current = DeviceStorage.getPinnedUserIds();
    return DeviceStorage.setPinnedUserIds(current.filter(id => id !== userId));
  },
  getLastRoleForUser: (userId: string): UserRole | null => {
    try {
      const raw = localStorage.getItem(DEVICE_LAST_ROLE_BY_USER_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const role = parsed[userId];
      return isValidUserRole(role) ? role : null;
    } catch (e) {
      console.warn('Failed to read last role by user:', e);
      return null;
    }
  },
  setLastRoleForUser: (userId: string, role: UserRole): void => {
    try {
      const raw = localStorage.getItem(DEVICE_LAST_ROLE_BY_USER_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      parsed[userId] = role;
      localStorage.setItem(DEVICE_LAST_ROLE_BY_USER_KEY, JSON.stringify(parsed));
    } catch (e) {
      console.warn('Failed to save last role by user:', e);
    }
  }
};

type InventoryRecord = {
  id: string;
  name: string;
  icon?: string;
  status?: string;
  type?: string;
  assignedTo?: string | null;
  batteryPool?: { total: number; charged: number } | null;
  memoryPool?: { total: number; free: number } | null;
};

type StaffDeployment = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  gear: InventoryRecord[];
};

type StorageLocation = {
  id: string;
  name: string;
  type: string;
  items: InventoryRecord[];
};

export default function App() {
  // ⚡️ PERFORMANCE MODE - Auto-detect Intel Macs and disable heavy effects
  useEffect(() => {
    const detectPerformanceMode = async () => {
      try {
        // Check if running in Electron
        const electronAPI = (window as { electronAPI?: { getSystemInfo?: () => Promise<{ arch: string; platform: string }> } }).electronAPI;

        if (electronAPI?.getSystemInfo) {
          const systemInfo = await electronAPI.getSystemInfo();
          const isIntelMac = systemInfo.platform === 'darwin' && systemInfo.arch === 'x64';

          if (isIntelMac) {
            console.log('⚡️ Performance Mode: Enabled (Intel Mac detected)');
            document.documentElement.classList.add('performance-mode');
          } else {
            console.log('🚀 Performance Mode: Disabled (ARM/Modern system)');
          }
        }
      } catch (error) {
        console.warn('Could not detect system architecture:', error);
      }
    };

    detectPerformanceMode();
  }, []);

  // 🔔 Bridge IPC notifications from main process → localStorage + CustomEvent
  useEffect(() => {
    const electronAPI = window.electronAPI;
    const cleanup = electronAPI?.sessionLifecycle?.onAppNotification?.((notification: AppNotification) => {
      try {
        const stored = JSON.parse(localStorage.getItem('app_notifications') || '[]');
        stored.unshift(notification);
        if (stored.length > 50) stored.length = 50;
        localStorage.setItem('app_notifications', JSON.stringify(stored));
      } catch {
        // Ignore malformed cached notifications and continue dispatching live events.
      }
      window.dispatchEvent(new CustomEvent('app:notification', { detail: notification }));
    });
    return () => { cleanup?.(); };
  }, []);

  // 🌟 Client Portal Route Hook (Manual Routing - Moved to Top Level)
  const [isClientView, setIsClientView] = useState(() => isClientPortalRoute());

  useEffect(() => {
    const syncPortalRoute = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      console.log('🔍 Checking Route:', { path, hash });
      setIsClientView(isClientPortalRoute());
    };

    syncPortalRoute();
    window.addEventListener('popstate', syncPortalRoute);
    window.addEventListener('hashchange', syncPortalRoute);

    return () => {
      window.removeEventListener('popstate', syncPortalRoute);
      window.removeEventListener('hashchange', syncPortalRoute);
    };
  }, []);



  if (isClientView) {
    return (
      <>
        <Suspense fallback={<AppLoader />}>
          <ClientPortal />
        </Suspense>
      </>
    );
  }

  return (
    <>
    <ErrorBoundary name="Main Application">
      <Suspense fallback={<AppLoader />}>
        <AuthProvider>
          <DataProvider>
            <AppContent />
            <UpdateNotification />
          </DataProvider>
        </AuthProvider>
      </Suspense>
    </ErrorBoundary>
    </>
  );
}

function AppContent() {
  const isWebRuntime = typeof window !== 'undefined' && !isElectronRuntime();

  // Import hooks from providers
  const { currentUser, users, login, logout, updateUser } = useAuth();
  const {
    bookings,
    dashboardTasks,
    notifications,
    isOffline,
    conflictMode,
    setConflictMode,
    notificationBadges
  } = useData();

  // --- Local UI State Only ---
  const [activeSection, setActiveSection] = useState('section-home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Settings & Lock State (still needed by UI)
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isSafeMode] = useState(false);
  
  // 🔐 macOS-style Device Login State
  const [rememberedUserId, setRememberedUserId] = useState<string | null>(null);
  const [pinnedUserIds, setPinnedUserIds] = useState<string[]>([]);
  const [showFullLogin, setShowFullLogin] = useState(false); // "Not me" was clicked
  const [dataLoadAttempts, setDataLoadAttempts] = useState(0); // Loading timeout counter
  const [usersRefreshKey, setUsersRefreshKey] = useState(0); // Force refresh users
  
  // 🔐 Load remembered user from device storage on mount
  useEffect(() => {
    const storedUserId = DeviceStorage.getLastUserId();
    const storedPinnedUsers = DeviceStorage.getPinnedUserIds();
    setPinnedUserIds(storedPinnedUsers);

    if (storedUserId) {
      setRememberedUserId(storedUserId);
      console.log('📱 Device remembered user:', storedUserId);
    }
  }, []);

  useEffect(() => {
    if (users.length === 0 || pinnedUserIds.length === 0) return;

    const userIds = new Set(users.map(user => user.id));
    const cleanedPinnedUsers = pinnedUserIds.filter(userId => userIds.has(userId));
    if (cleanedPinnedUsers.length !== pinnedUserIds.length) {
      const normalized = DeviceStorage.setPinnedUserIds(cleanedPinnedUsers);
      setPinnedUserIds(normalized);
    }
  }, [users, pinnedUserIds]);
  
  // ⏱️ Loading timeout - increment counter when waiting for users
  useEffect(() => {
    if (rememberedUserId && users.length === 0 && dataLoadAttempts < 3) {
      const timer = setTimeout(() => {
        setDataLoadAttempts(prev => prev + 1);
        console.log('⏱️ Waiting for users... attempt', dataLoadAttempts + 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [rememberedUserId, users.length, dataLoadAttempts]);
  
  // Loading states (needed by old code)
  const [, _setLoading] = useState(true);
  const [, _setBookingsLoading] = useState(false);
  
  // TEMPORARY: Duplicate state for backward compatibility during migration
  // These shadow the provider state and will be removed once all setters are replaced
  // REMOVED SHADOWED USERS/CURRENTUSER STATE TO FIX SYNC BUGS
  // const [, setUsers] = useState<User[]>([]);
  // const [, setCurrentUser] = useState<User | undefined>();
  const [, setBookings] = useState<Booking[]>([]);
  const [, setDashboardTasks] = useState<unknown[]>([]);
  const [, setNotifications] = useState<AppNotification[]>([]);
  const [isUploading] = useState(false);
  const [uploadProgress] = useState(0);
  const selectedSyncInProgressRef = useRef<Set<string>>(new Set());
  const selectedSyncDoneRef = useRef<Set<string>>(new Set());
  const selectedSyncLastAttemptRef = useRef<Map<string, number>>(new Map());

  // App Effects
  const [isSnowing, setIsSnowing] = useState(false);
  const [isHeartTrail, setIsHeartTrail] = useState(false);
  const [isRamadan, setIsRamadan] = useState(false);
  const [isSparkles, setIsSparkles] = useState(false);
  const [isDraggableStates, setIsDraggableStates] = useState<Record<string, boolean>>({});

  // ... (Inventory State omitted for brevity, keeping existing) ...

  const handleRoleLogin = async (role: UserRole, userId?: string) => {
    if (isWebRuntime && !WEB_ALLOWED_ROLES.has(role)) {
      toast.error('هذا الدور غير مسموح في نسخة الويب');
      return;
    }

    // Use the AuthProvider's login method which handles all authentication logic
    await login(role, userId);

    // 🔐 Save last logged-in user to device storage
    // IMPORTANT: Always resolve to real user ID, never save 'bootstrap_manager'
    let effectiveUserId = userId;

    // If userId is 'bootstrap_manager', find the real user
    if (userId === 'bootstrap_manager') {
      const realUser = users.find(u => u.role === role);
      if (realUser) {
        effectiveUserId = realUser.id;
        console.log('📱 Resolved bootstrap to real user:', { from: userId, to: effectiveUserId });
      }
    }

    // Fallback: If still no userId, try to find user by role
    if (!effectiveUserId) {
      const userByRole = users.find(u => u.role === role);
      if (userByRole) {
        effectiveUserId = userByRole.id;
      }
    }

    // Save any valid user ID (UUID or legacy format like u_xxx)
    if (effectiveUserId && effectiveUserId !== 'bootstrap_manager') {
      DeviceStorage.setLastUserId(effectiveUserId);
      DeviceStorage.setLastRoleForUser(effectiveUserId, role);
      const updatedPinnedUsers = DeviceStorage.addPinnedUserId(effectiveUserId);
      setPinnedUserIds(updatedPinnedUsers);
      setRememberedUserId(effectiveUserId);
      console.log('📱 Saved device user:', effectiveUserId);
    } else {
      console.warn('📱 Could not determine valid user ID to save');
    }

    setActiveSection('section-home');
    setShowFullLogin(false); // Reset "Not me" state
  };

  const handleUpdateUser = async (id: string, updates: Partial<User>) => {
      // Delegate completely to AuthProvider to ensure context sync
      await updateUser(id, updates);
  };

  const handleNavClick = (sectionId: string) => {
    if (isWebRuntime && currentUser) {
      const blockedSections = WEB_BLOCKED_SECTIONS_BY_ROLE[currentUser.role];
      if (blockedSections?.has(sectionId)) {
        toast.error('قسم المعرض غير متاح للمديرة في نسخة الويب');
        return;
      }
    }

    setActiveSection(sectionId);
    setSelectedBooking(null);
    setIsSidebarOpen(false);
  };

  const handleLogout = async () => {
    // Call Provider Logout (updates global state)
    await logout();
    
    // 🔐 Keep remembered user (don't clear on logout)
    // User can still use "Not me" to switch
    
    // Also clear other local UI concerns
    setActiveSection('section-home');
    setSelectedBooking(null);
    setViewingBooking(null);
    setIsSidebarOpen(false);
    setIsLocked(false);
    
    // Force clear local storage data if needed for security
    // localStorage.removeItem('session_token'); // Handled by AuthService
  };
  
  // 🔐 Handle "Not me" - switch to full user selection
  const handleNotMe = () => {
    setShowFullLogin(true);
    console.log('📱 User clicked "Not me" - showing full login');
  };

  const handlePinUser = (userId: string) => {
    const updated = DeviceStorage.addPinnedUserId(userId);
    setPinnedUserIds(updated);
  };

  const handleUnpinUser = (userId: string) => {
    const updated = DeviceStorage.removePinnedUserId(userId);
    setPinnedUserIds(updated);
  };

  // INVENTORY STATE (Lifted for Automation)
  const [staffDeployments, setStaffDeployments] = useState<StaffDeployment[]>([
    {
      id: 's1',
      name: 'علي (مونتير)',
      role: 'Video',
      avatar: 'Ali',
      gear: [
        {
          id: 'g1',
          name: 'Canon R5C',
          icon: '📷',
          batteryPool: { total: 5, charged: 3 },
          memoryPool: { total: 4, free: 2 },
        },
        { id: 'g2', name: '24-70mm', icon: '⭕' },
      ],
    },
    {
      id: 's2',
      name: 'سُرَى (فوتو)',
      role: 'Photo',
      avatar: 'Sara',
      gear: [
        {
          id: 'g3',
          name: 'Sony A7S',
          icon: '📷',
          batteryPool: { total: 3, charged: 2 },
          memoryPool: { total: 2, free: 0 },
        },
        { id: 'g4', name: 'Godox AD600', icon: '⚡', batteryPool: { total: 2, charged: 1 } },
      ],
    },
    { id: 's3', name: 'أحمد (مساعد)', role: 'Assistant', avatar: 'Ahmed', gear: [] },
  ]);

  const [, setStorageLocations] = useState<StorageLocation[]>([
    {
      id: 'loc1',
      name: 'الرف الرئيسي (A1)',
      type: 'shelf',
      items: [
        { id: 'i1', name: 'Canon Lens 85mm', icon: '⭕' },
        { id: 'i2', name: 'Canon Lens 50mm', icon: '⭕' },
        { id: 'i3', name: 'Spare Battery', icon: '🔋' },
      ],
    },
    {
      id: 'loc2',
      name: 'حقيبة الدرون (D1)',
      type: 'bag',
      items: [
        { id: 'i4', name: 'DJI Mavic 3', icon: '🚁' },
        { id: 'i5', name: 'Controller', icon: '🎮' },
      ],
    },
    {
      id: 'loc3',
      name: 'خزنة الصيانة (M1)',
      type: 'maintenance',
      items: [{ id: 'i6', name: 'Broken Mic', icon: '🎤', status: 'broken' }],
    },
  ]);

  // 🌑 [BLACK'S FIX] Fetch REAL Inventory Data
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const items = (await electronBackend.getInventory()) as InventoryRecord[];
        if (items.length > 0) {
            // Organize items into staff and storage for the existing UI logic
            const deployed = users.map(u => ({
                id: u.id,
                name: u.name,
                role: u.role,
                avatar: u.name,
                gear: items.filter(i => i.assignedTo === u.id)
            })).filter(s => s.gear.length > 0);
            
            const storage = [
                { id: 'loc1', name: 'الرف الرئيسي (A1)', type: 'shelf', items: items.filter(i => i.status === 'storage' && i.type !== 'drone') },
                { id: 'loc2', name: 'حقيبة الدرون (D1)', type: 'bag', items: items.filter(i => i.status === 'storage' && i.type === 'drone') }
            ];

            setStaffDeployments(deployed);
            setStorageLocations(storage);
        }
      } catch (e) {
        console.error('Failed to load real inventory:', e);
      }
    };
    if (users.length > 0) fetchInventory();
  }, [users]);

  // Modal & Selection State
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [reminderInitialType, setReminderInitialType] = useState<ReminderType>('general');
  const [reminderInitialTitle, setReminderInitialTitle] = useState('');
  const [showReminderModal, setShowReminderModal] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type?: string;
    id?: string;
    message?: string;
  }>({ isOpen: false });
  const [showAddBookingModal, setShowAddBookingModal] = useState(false);
  const [bookingToEdit, setBookingToEdit] = useState<Booking | null>(null);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
  const [bookingMode, setBookingMode] = useState<'shoot' | 'location'>('shoot');
  const [initialCategory, setInitialCategory] = useState<BookingCategory>(BookingCategory.WEDDING);
  const [selectedBookingDate, setSelectedBookingDate] = useState<Date | undefined>(undefined);
  // ✅ بيانات عميل مسبقة لإعادة الحجز من كارت العملاء
  const [rebookClientData, setRebookClientData] = useState<{ name: string; phone: string } | null>(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<BookingStatus | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showBookingTypeModal, setShowBookingTypeModal] = useState(false);
  const [showResetLayoutModal, setShowResetLayoutModal] = useState(false);
  const [initialDetailTab, setInitialDetailTab] = useState<string>('client');
  const [paymentContextBooking, setPaymentContextBooking] = useState<Booking | null>(null);
  const [videoEditorTab, setVideoEditorTab] = useState('dashboard');
  const [showDeletedBookings, setShowDeletedBookings] = useState(false);

  // Mock mutations
  const updateBookingMutation = {
    mutate: async ({ id, updates }: { id: string; updates: Partial<Booking> }) => {
      // Update the booking
      setBookings(prev => prev.map(b => (b.id === id ? { ...b, ...updates } : b)));

      // ⚠️ DEPRECATED: Old localhost:3000 folder creation code removed
      // Folder creation now happens via Electron IPC in performStatusUpdate()
      // when status changes to SHOOTING_COMPLETED
      // See: performStatusUpdate() → electronAPI.sessionLifecycle.createSessionDirectory()
    },
  };
  const deleteBookingMutation = {
    mutate: (id: string) => {
      setBookings(prev => prev.filter(b => b.id !== id));
    },
  };

  // --- Effects ---
  useEffect(() => {
    loadData();
    const fetchBookings = async () => {
      _setBookingsLoading(true);
      try {
        if (electronBackend?.getBookings) {
          const data = await electronBackend.getBookings();
          // Fix: Deep clone to remove Proxy/IPC wrappers
          setBookings(JSON.parse(JSON.stringify(data)));
        }
      } catch (e) {
        console.error(e);
      }
      _setBookingsLoading(false);
    };
    fetchBookings();

    // Subscribe to real-time updates
    const unsubscribe = electronBackend.subscribe(async event => {
      console.log(`⚡ Received sync event: ${event}`);
      if (event === 'bookings_updated') {
        const data = await electronBackend.getBookings();
        setBookings(prev => {
          // Simple check: if data reference changed or lengths differ, update
          if (prev === data) return prev;
          if (!prev || !data || prev.length !== data.length) return data;
          // For most cases, trust the backend to send new data when needed
          return data;
        });
      } else if (event === 'users_updated') {
        // Handled by AuthProvider
        /* const data = await electronBackend.getUsers();
        setUsers(prev => {
          const newData = JSON.parse(JSON.stringify(data));
          if (JSON.stringify(prev) !== JSON.stringify(newData)) return newData;
          return prev;
        }); */
      } else if (event === 'tasks_updated') {
        const data = await electronBackend.getDashboardTasks();
        setDashboardTasks(prev => {
          // Simple check: if data reference changed or lengths differ, update
          if (prev === data) return prev;
          if (!prev || !data || prev.length !== data.length) return data;
          return data;
        });
      }
    });

    // 🌑 BLACK'S NAS VISION: Start Scanning
    NasVisionService.start();

    return () => {
      unsubscribe();
      NasVisionService.stop();
    };
  }, []);

  const loadData = async () => {
    try {
      // 1. Initialize Database (Schema)
      const { initDB } = await import('./services/db/schema');
      await initDB();

      // 2. Ensure database is seeded with default users
      const { seedDatabase } = await import('./services/db/seed');
      await seedDatabase();

      const tasks = await electronBackend.getDashboardTasks();
      setDashboardTasks(tasks);
      await electronBackend.getUsers(); // Warm users cache; state is managed by AuthProvider.
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      _setLoading(false);
    }
  };

  // --- Handlers ---
  // ... inside AppContent ...



  const isReception = currentUser?.role === UserRole.RECEPTION;
  const isManager = currentUser?.role === UserRole.MANAGER;

  // Booking reminders now handled exclusively by DataProvider via useBookingReminders hook
  // (removed duplicate code — was causing stale closure bugs with shadowed setNotifications)

  const visibleBookings = useMemo(() => {
    // First filter out deleted bookings
    const activeBookings = bookings.filter(booking => !booking.deletedAt);
    if (!currentUser) return activeBookings;
    return activeBookings.filter(booking => canUserSeeBooking(booking, currentUser));
  }, [bookings, currentUser]);

  const fetchClientSelectedFileNames = useCallback(async (token: string): Promise<string[]> => {
    const selected = await callClientPortal<{ names?: string[] }>({
      action: 'get_selected_names',
      token,
    });
    const selectedNames = Array.isArray(selected?.names)
      ? selected.names.filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
      : [];
    if (selectedNames.length > 0) return Array.from(new Set(selectedNames));

    const data = await callClientPortal<{ downloads?: Array<Record<string, unknown>> }>({
      action: 'get_download_urls',
      token,
    });
    const downloads = Array.isArray(data?.downloads) ? data.downloads : [];
    return Array.from(
      new Set(
        downloads
          .map(item => item?.fileName || item?.file_name)
          .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
      )
    );
  }, []);

  const resolveSessionPathForBooking = useCallback(async (booking: Booking): Promise<string> => {
    if (typeof booking.folderPath === 'string' && booking.folderPath.trim().length > 0) {
      return booking.folderPath;
    }

    const electronAPI = window.electronAPI;
    if (!electronAPI?.db?.query) return '';

    const attempts: Array<{ sql: string; params: string[] }> = [
      {
        sql: `SELECT folderPath AS path FROM bookings WHERE id = ? AND folderPath IS NOT NULL LIMIT 1`,
        params: [booking.id],
      },
      {
        sql: `SELECT folder_path AS path FROM bookings WHERE id = ? AND folder_path IS NOT NULL LIMIT 1`,
        params: [booking.id],
      },
      {
        sql: `SELECT nasPath AS path FROM sessions WHERE bookingId = ? AND nasPath IS NOT NULL ORDER BY updatedAt DESC LIMIT 1`,
        params: [booking.id],
      },
      {
        sql: `SELECT nas_path AS path FROM sessions WHERE booking_id = ? AND nas_path IS NOT NULL ORDER BY updated_at DESC LIMIT 1`,
        params: [booking.id],
      },
    ];

    for (const attempt of attempts) {
      try {
        const rows = await electronAPI.db.query(attempt.sql, attempt.params);
        const first = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
        if (first && typeof first === 'object' && 'path' in first) {
          const pathValue = (first as { path?: unknown }).path;
          if (typeof pathValue === 'string' && pathValue.trim().length > 0) {
            return pathValue;
          }
        }
      } catch {
        // Try next schema variation
      }
    }

    return '';
  }, []);

  const syncSelectedFolderFromClientPortal = useCallback(
    async (booking: Booking) => {
      const token = booking.client_token;
      const bookingKey = booking.id;
      const electronAPI = window.electronAPI;

      if (!token || !electronAPI?.sessionLifecycle?.copyToSelected) return;
      if (selectedSyncDoneRef.current.has(bookingKey)) return;
      if (selectedSyncInProgressRef.current.has(bookingKey)) return;

      const lastAttemptAt = selectedSyncLastAttemptRef.current.get(bookingKey) || 0;
      if (Date.now() - lastAttemptAt < 60_000) return;
      selectedSyncLastAttemptRef.current.set(bookingKey, Date.now());
      selectedSyncInProgressRef.current.add(bookingKey);

      try {
        const sessionPath = await resolveSessionPathForBooking(booking);
        if (!sessionPath) {
          console.warn('[ClientSelectionSync] No session path found for booking:', booking.id);
          return;
        }

        const fileNames = await fetchClientSelectedFileNames(token);
        if (!fileNames.length) return;

        const result = await electronAPI.sessionLifecycle.copyToSelected(sessionPath, fileNames);
        const copied = Number(result?.copied || 0);
        const failed = Number(result?.failed || 0);
        const expected = fileNames.length;

        if (copied === expected && failed === 0) {
          selectedSyncDoneRef.current.add(bookingKey);
          toast.success(`تم مزامنة ${copied} صورة مختارة إلى مجلد المصمم`);
          return;
        }

        console.warn('[ClientSelectionSync] Partial/failed copy', {
          bookingId: booking.id,
          expected,
          copied,
          failed,
          errors: result?.errors,
        });

        if (copied > 0) {
          toast.warning(`تم نسخ ${copied}/${expected} صورة فقط. سيتم إعادة المحاولة تلقائياً.`);
        }
      } catch (error) {
        console.warn('[ClientSelectionSync] Failed to sync selected images:', error);
      } finally {
        selectedSyncInProgressRef.current.delete(bookingKey);
      }
    },
    [fetchClientSelectedFileNames, resolveSessionPathForBooking]
  );

  useEffect(() => {
    const eligibleStatuses = new Set<BookingStatus>([
      BookingStatus.EDITING,
      BookingStatus.READY_TO_PRINT,
      BookingStatus.PRINTING,
      BookingStatus.DELIVERED,
    ]);

    bookings.forEach(booking => {
      if (!eligibleStatuses.has(booking.status)) return;
      if (!booking.folderPath || !booking.client_token) return;
      void syncSelectedFolderFromClientPortal(booking);
    });
  }, [bookings, syncSelectedFolderFromClientPortal]);

  // --- Content Renderer ---

  // --- Content Renderer ---
  const handleUpdateGearStaff = async (updatedStaff: StaffDeployment[]) => {
    setStaffDeployments(updatedStaff);
    // Find the item that was changed and sync to DB
    for (const staff of updatedStaff) {
        for (const item of staff.gear) {
            await electronBackend.updateInventoryItem(item.id, { 
                assignedTo: staff.id, 
                status: 'deployed',
                batteryPool: item.batteryPool ?? undefined,
                memoryPool: item.memoryPool ?? undefined
            });
        }
    }
  };

  const renderContent = () => {
    // 1. Show Booking Details if selected
    if (selectedBooking) {
      if (isManager) {
        return (
          <ManagerBookingDetailsView
            booking={selectedBooking}
            reminders={reminders}
            onBack={() => {
              setSelectedBooking(null);
              setInitialDetailTab('client');
            }}
            allBookings={bookings}
            initialTab={initialDetailTab as 'client' | 'logistics' | 'financials' | 'workflow'}
            onUpdateBooking={handleUpdateBooking}
          />
        );
      }

      return (
        <BookingDetailsView
          booking={selectedBooking}
          reminders={reminders}
          onStatusChange={handleStatusChange}
          onUpdateBooking={handleUpdateBooking}
          onSettlePayment={handleSettlePayment}
          onDropFolder={() => {}}
          onAddReminder={handleOpenAddReminder}
          onEditReminder={r => {
            setEditingReminder(r);
            setShowReminderModal(true);
          }}
          onToggleReminder={async id => {
            await electronBackend.toggleReminder(id);
            await loadReminders(selectedBooking.id);
          }}
          onDeleteReminder={id =>
            setConfirmModal({ isOpen: true, type: 'reminder', id, message: 'حذف التذكير؟' })
          }
          onOpenAiAssistant={() => setShowAiModal(true)}
          onBack={() => {
            setSelectedBooking(null);
            setInitialDetailTab('client');
          }}
          initialTab={initialDetailTab}
        />
      );
    }

    // 2. Admin Role Override (Sentinel HUD Experience)
    if (currentUser?.role === UserRole.ADMIN) {
      switch (activeSection) {
        case 'section-home':
          return (
            <AdminGeniusDashboard
              bookings={bookings}
              users={users}
              onSelectBooking={handleSelectBooking}
              onUpdateBooking={handleUpdateBooking}
            />
          );
        case 'section-bookings': // Was my-bookings
          // return <AdminOperationsView bookings={bookings} users={users} onSelectBooking={handleSelectBooking} onAddBooking={handleOpenAddBooking} />;
          return (
            <WorkflowManagerView
              bookings={bookings}
              users={users}
              onSelectBooking={handleSelectBooking}
              onUpdateBooking={handleUpdateBooking}
            />
          );
        case 'section-clients':
          return <AdminClientsListView bookings={bookings} />;
        case 'section-financial':
          return <AdminFinancialView />;
        case 'section-logs': // New Logs Section
          return (
            <div className="h-full p-4">
              <AdminAuditView bookings={bookings} users={users} />
            </div>
          );
        case 'section-settings':
          return <AdminSystemView users={users} onUpdateUser={handleUpdateUser} />;
        case 'section-hr':
          return <AdminHRView />;
        case 'section-sentinel':
          return <AdminSentinelView />;
        case 'section-inventory':
          return <AdminInventoryView />;
        case 'section-war-room':
          return <AdminWarRoomView />;
        case 'section-team-chat':
          return <UnifiedTeamChat users={users} currentUser={currentUser} />;
        default:
          return <DashboardOverview bookings={bookings} users={users} />;
      }
    }

    // 3. Normal Sections Switch
    switch (activeSection) {
      // --- A. Home / Dashboard ---
      case 'section-home':
        if (isManager) {
          if (conflictMode) return <ConflictResolutionView onBack={() => setConflictMode(false)} />;
          return (
            <ManagerDashboard
              bookings={visibleBookings}
              users={users}
              tasks={dashboardTasks}
              onToggleTask={async id => {
                await electronBackend.toggleTask(id);
                setDashboardTasks(await electronBackend.getDashboardTasks());
              }}
              onLogout={handleLogout}
            />
          );
        }

        if (isReception) {
          return (
            <ReceptionDashboard
              bookings={visibleBookings}
              users={users}
              onSelectBooking={handleSearchResultSelect}
              onStatusUpdate={handleDragStatusChange}
              isDraggable={isDraggableStates['section-home'] || false}
              currentUser={currentUser}
              onLogout={handleLogout}
            />
          );
        }
        // Developer dashboard not yet implemented
        // if (currentUser?.role === UserRole.DEVELOPER) return <DeveloperDashboard bookings={bookings} tasks={dashboardTasks} onToggleTask={async(id) => { await electronBackend.toggleTask(id); setDashboardTasks(await electronBackend.getDashboardTasks()); }} />;

        return <div>Dashboard not configured</div>;

      // --- B. My Bookings / Schedule ---
      case 'section-my-bookings':
        return (
          <ReceptionBookingsView
            bookings={visibleBookings}
            onAddBooking={() => handleOpenAddBooking()}
            onDateClick={date => handleOpenAddBooking(undefined, date)}
            onSelectBooking={handleSearchResultSelect}
            onDeleteBooking={async (id) => {
              // 🗑️ Soft delete - can be restored within 30 days
              try {
                await electronBackend.softDeleteBooking(id);
                deleteBookingMutation.mutate(id);
                toast.success('تم نقل الحجز إلى سلة المحذوفات (قابل للاستعادة خلال 30 يوم)');
              } catch (error) {
                console.error('❌ Failed to soft delete booking:', error);
                toast.error('فشل حذف الحجز');
              }
            }}
            onEditBooking={handlePrepareEdit}
            onViewBooking={handleViewBooking}
            onUpdateStatus={handleDragStatusChange}
            onUpdateBooking={handleUpdateBooking}
            isDraggable={isDraggableStates['section-my-bookings'] || false}
            isReception={isReception}
            isManager={isManager}
            users={users}
          />
        );

      // --- C. Clients ---
      case 'section-clients':
        if (isManager) return <ManagerClientsView bookings={visibleBookings} onRebookClient={handleRebookClient} />;
        if (isReception) return <ReceptionClientsView bookings={visibleBookings} onUpdateBooking={handleUpdateBooking} onRebookClient={handleRebookClient} />;
        return <div>Clients view not configured</div>;

      // --- D. Financial ---
      case 'section-financial':
        if (isManager)
          return (
            <ManagerFinancialView
              bookings={visibleBookings}
              onUpdateBooking={handleUpdateBooking}
            />
          );
        return <ReceptionFinancialView bookings={visibleBookings} isManager={false} />;

      // --- D2. Accounts (Legacy) ---
      case 'section-accounts':
        if (isManager)
          return (
            <ManagerAccountsView bookings={visibleBookings} onUpdateBooking={handleUpdateBooking} />
          );
        return <div>Access Denied</div>;

      // --- E. Team Analytics ---
      case 'section-team':
        if (isManager)
          return (
            <ManagerTeamView
              key={usersRefreshKey}
              users={users}
              currentUser={currentUser}
              isManager={true}
              onRefresh={async () => {
                await electronBackend.getUsers();
                setUsersRefreshKey(prev => prev + 1); // Force re-render
              }}
            />
          );
        return <UnifiedTeamChat currentUser={currentUser} users={users} />;

      // --- F. Team Chat ---
      case 'section-team-chat':
        // Use UnifiedTeamChat for everyone
        return <UnifiedTeamChat users={users} currentUser={currentUser} />;

      // --- F. Files / Gallery ---
      case 'section-files':
        if (isManager) {
          if (isWebRuntime) {
            return (
              <div className="h-full w-full flex items-center justify-center p-8">
                <div className="max-w-lg w-full rounded-3xl border border-amber-500/20 bg-amber-500/10 p-8 text-center">
                  <p className="text-xl font-black text-amber-300 mb-2">المعرض غير متاح على الويب</p>
                  <p className="text-sm text-amber-100/80">يمكن فتح المعرض من تطبيق سطح المكتب فقط.</p>
                </div>
              </div>
            );
          }
          return <ManagerGalleryView />;
        }
        // Note: Video Editor uses its own tab-based layout and doesn't use section-based navigation
        return <ReceptionGalleryView bookings={visibleBookings} isReception={isReception} />;

      // --- G. Workflow ---
      case 'section-workflow':
        return (
          <WorkflowView
            bookings={visibleBookings}
            users={users}
            onViewBooking={handleSelectBooking}
            onStatusUpdate={handleDragStatusChange}
            onUpdateBooking={handleUpdateBooking}
            isReception={isReception}
            isManager={isManager}
          />
        );

      default:
        return <div>Page Not Found</div>;
    }
  };

  const performStatusUpdate = async (status: BookingStatus, targetBookingId?: string, bookingData?: Booking) => {
    console.log('[App] performStatusUpdate called:', status, targetBookingId);
    const bookingId = targetBookingId || selectedBooking?.id;
    console.log('[App] bookingId resolved:', bookingId);
    if (!bookingId) {
      console.log('[App] No bookingId, returning');
      return;
    }

    // 1. Update Backend
    console.log('[App] Updating backend status...');
    await electronBackend.updateBookingStatus(bookingId, status);

    // 2. Automated Actions
    // Use provided booking data or find in bookings
    const booking = bookingData || bookings.find(b => b.id === bookingId);
    console.log('[App] Found booking for automated actions:', booking?.clientName, 'ID:', booking?.id);

    // ✅ ACTION NEW: Create Session Folder when SHOOTING_COMPLETED
    console.log('[App] 🎬 Checking status:', status, 'Expected:', BookingStatus.SHOOTING_COMPLETED);
    console.log('[App] 🎬 Status match:', status === BookingStatus.SHOOTING_COMPLETED);
    console.log('[App] 🎬 Booking exists:', !!booking);
    if (status === BookingStatus.SHOOTING_COMPLETED && booking) {
      console.log('[App] 🎬 INSIDE IF BLOCK - Creating folder...');
      try {
        const electronAPI = window.electronAPI;
        console.log('[App] Electron API available:', !!electronAPI);
        console.log('[App] Session lifecycle available:', !!electronAPI?.sessionLifecycle?.createSessionDirectory);
        
        if (electronAPI?.sessionLifecycle?.createSessionDirectory) {
          const sessionId = `session_${booking.id}_${Date.now()}`;
          console.log('[App] Creating session:', sessionId);
          
          // ✅ Prepare booking details for the info file
          const bookingDetails = {
            id: booking.id,
            title: booking.title,
            clientName: booking.clientName,
            clientPhone: booking.clientPhone,
            clientEmail: booking.clientEmail,
            shootDate: booking.shootDate,
            details: booking.details,
            totalAmount: booking.totalAmount,
            paidAmount: booking.paidAmount,
            packageName: booking.packageName,
            status: booking.status,
            assignedToName: booking.assignedToName,
            createdByName: booking.createdByName,
          };
          
          console.log('[App] Calling createSessionDirectory...');
          const result = await electronAPI.sessionLifecycle.createSessionDirectory(
            booking.clientName,
            sessionId,
            new Date().toISOString(),
            bookingDetails  // ✅ Pass booking details to create info file
          );
          console.log('[App] createSessionDirectory result:', result);
          
          if (result?.success && result.sessionPath) {
            console.log('[App] ✅ Folder created successfully:', result.sessionPath);
            // Update booking with folder path
            await electronBackend.updateBooking(bookingId, {
              folderPath: result.sessionPath,
              nasSessionId: sessionId,
            });
            
            // Add session note
            await electronBackend.addReminder(
              bookingId,
              `📁 تم إنشاء مجلد الجلسة: ${result.sessionPath}`,
              new Date().toISOString().slice(0, 10),
              'general',
              'Folder'
            );
            
            toast.success('✅ تم إنشاء مجلد الجلسة وملف التفاصيل على NAS بنجاح');
            console.log('[Session] Folder created:', result.sessionPath);
          }
        } else {
          console.warn('[Session] Electron API not available for folder creation');
          toast.error('⚠️ لا يمكن الاتصال بـ NAS - تأكد من تشغيل التطبيق بشكل صحيح');
        }
      } catch (error) {
        console.error('[Session] Failed to create session folder:', error);
        toast.error('❌ فشل إنشاء مجلد الجلسة على NAS');
      }
    }

    // ACTION A: Add Charging Reminder if Moving to EDITING
    if (status === BookingStatus.EDITING) {
      const gearList = 'Canon R5C, Canon R, Godox AD600B';
      await electronBackend.addReminder(
        bookingId,
        `⚡ تنبيه شحن: ${gearList}`,
        new Date().toISOString().slice(0, 10),
        'shooting',
        'Zap'
      );
      await loadReminders(bookingId);
      toast.success('تم إضافة تذكير شحن المعدات تلقائياً');
    }

    // ACTION B: Auto-Drain Battery on Session Completion (SHOOTING -> SELECTION)
    // User Rule: "Studio Rental" -> No Drain. "Villa/Studio Session" -> Drain.
    else if (status === BookingStatus.SELECTION && booking) {
      // Check if Rental
      const pkgId = booking.servicePackage || '';
      const isRental =
        pkgId.startsWith('venue_ad') ||
        pkgId.startsWith('venue_full') ||
        pkgId.startsWith('venue_room_rental');

      if (!isRental) {
        console.log('⚡ Auto-Draining Batteries for Session Completion...');
        // Find Photo Staff (Mock: Sara)
        const updatedStaff = [...staffDeployments];
        const photoStaffIdx = updatedStaff.findIndex(s => s.role === 'Photo');

        if (photoStaffIdx !== -1) {
          const photoStaff = updatedStaff[photoStaffIdx];
          if (!photoStaff) return;
          let drainedCount = 0;
          photoStaff.gear.forEach(g => {
            if (g.batteryPool && g.batteryPool.charged > 0) {
              g.batteryPool.charged--;
              drainedCount++;
            }
          });

          if (drainedCount > 0) {
            handleUpdateGearStaff(updatedStaff); // ✅ Use the DB-syncing handler
            setNotifications(prev => [
              {
                id: Date.now().toString(),
                title: `🔋 استهلاك بطاريات`,
                message: `تم تسجيل استهلاك ${drainedCount} بطاريات تلقائياً للمصور`,
                time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                read: false,
                type: 'system' as const,
              },
              ...prev,
            ]);
            toast.info(`🔋 تم تسجيل استهلاك ${drainedCount} بطاريات تلقائياً للمصور`);
          }
        }
      } else {
        console.log('ℹ️ Rental Session - No Battery Drain Triggered.');
      }
    } else {
      toast.success('تم تحديث الحالة بنجاح');
    }

    updateBookingMutation.mutate({ id: bookingId, updates: { status } });
    if (selectedBooking?.id === bookingId) setSelectedBooking(null);
    setPaymentContextBooking(null);
    SyncManager.pushChanges();
  };
  const handleAddBooking = async (newBookingData: Omit<Booking, 'id'> & { id?: string }) => {
    console.log('🚀 Adding new booking:', newBookingData);

    // Inject Audit Fields (Persisted to SQLite)
    newBookingData.created_by = currentUser?.id;
    newBookingData.updated_by = currentUser?.id;
    newBookingData.updated_at = new Date().toISOString();

    const created = await electronBackend.addBooking(newBookingData);
    console.log('✅ Booking created:', created);

    // Immediately add to UI state (optimistic update)
    setBookings(prev => [...prev, created]);

    // Then reload from database to ensure consistency
    setTimeout(async () => {
      if (electronBackend.getBookings) {
        const allBookings = await electronBackend.getBookings();
        setBookings(allBookings);
      }
    }, 100);
    SyncManager.pushChanges();
    toast.success('تم إضافة الحجز بنجاح');
  };
  const handlePrepareEdit = (id: string) => {
    const booking = bookings.find(b => b.id === id);
    if (booking) {
      setBookingToEdit(booking);
      setShowAddBookingModal(true);
    }
  };
  const handleViewBooking = (input: string | Booking, tab: string = 'workflow') => {
    let booking: Booking | undefined;
    if (typeof input === 'string') {
      booking = bookings.find(b => b.id === input);
    } else {
      booking = input;
    }
    if (booking) {
      setInitialDetailTab(tab);
      setViewingBooking(booking);
      setBookingToEdit(null);
      setShowAddBookingModal(true);
    }
  };
  const handleSelectBooking = (input: string | Booking, tab: string = 'workflow') => {
    let booking: Booking | undefined;
    if (typeof input === 'string') {
      booking = bookings.find(b => b.id === input);
    } else {
      booking = input;
    }
    if (booking) {
      setInitialDetailTab(tab);
      setSelectedBooking(booking);
      loadReminders(booking.id);
    }
  };
  const handleSwitchUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      login(user.role, user.id);
      setActiveSection('section-home');
    }
  };
  const handleOpenAddBooking = (type?: 'shoot' | 'location', selectedDate?: Date) => {
    if (selectedDate) setSelectedBookingDate(selectedDate);
    else setSelectedBookingDate(undefined);
    setBookingToEdit(null);
    if (type) {
      setBookingMode(type);
      setInitialCategory(type === 'location' ? BookingCategory.STUDIO : BookingCategory.WEDDING);
      setShowAddBookingModal(true);
    } else {
      setShowBookingTypeModal(true);
    }
  };
  const handleBookingTypeSelect = (type: 'shoot' | 'location') => {
    setShowBookingTypeModal(false);
    setBookingMode(type);
    setInitialCategory(type === 'location' ? BookingCategory.STUDIO : BookingCategory.WEDDING);
    setShowAddBookingModal(true);
  };

  // ✅ إعادة حجز من كارت العميل — يفتح نافذة اختيار النوع أولاً ثم AddBookingModal مع البيانات مسبقة
  const handleRebookClient = (clientName: string, clientPhone: string) => {
    setRebookClientData({ name: clientName, phone: clientPhone });
    setBookingToEdit(null);
    setViewingBooking(null);
    setSelectedBookingDate(undefined);
    setShowBookingTypeModal(true);
  };

  const handleUpdateBooking = async (id: string, updates: Partial<Booking>) => {
    // Inject Audit Fields
    const auditUpdates = {
      ...updates,
      updatedBy: currentUser?.id,
      updatedAt: new Date().toISOString(),
    };
    const updated = await electronBackend.updateBooking(id, auditUpdates);
    updateBookingMutation.mutate({ id, updates: auditUpdates });
    if (selectedBooking?.id === id && updated) setSelectedBooking(updated);
    SyncManager.pushChanges();
    toast.success('تم تحديث الحجز بنجاح');
  };
  const handleDragStatusChange = async (id: string, newStatus: BookingStatus, statusUpdates?: Partial<Booking>) => {
    console.log('[App] handleDragStatusChange called:', id, newStatus);
    console.log('[App] 🎯 newStatus value:', JSON.stringify(newStatus));
    console.log('[App] 🎯 BookingStatus.SHOOTING_COMPLETED:', JSON.stringify(BookingStatus.SHOOTING_COMPLETED));
    console.log('[App] 🎯 Match check:', newStatus === BookingStatus.SHOOTING_COMPLETED);
    
    const booking = bookings.find(b => b.id === id);
    console.log('[App] Found booking:', booking?.clientName, 'Current status:', booking?.status);
    
    // 🚨 FIX: If dragging from SHOOTING directly to DELIVERED, 
    // automatically trigger SHOOTING_COMPLETED first to create the folder!
    if (
      booking &&
      booking.status === BookingStatus.SHOOTING &&
      newStatus === BookingStatus.DELIVERED
    ) {
      console.log('[App] 📁 INTERCEPT: Shooting → Delivered detected!');
      console.log('[App] 📁 Will trigger SHOOTING_COMPLETED first to create folder...');
      
      // Step 1: Create the folder by triggering SHOOTING_COMPLETED
      const bookingForFolder: Booking = {
        ...booking,
        status: BookingStatus.SHOOTING_COMPLETED,
      };
      await performStatusUpdate(BookingStatus.SHOOTING_COMPLETED, id, bookingForFolder);
      console.log('[App] 📁 Folder creation triggered, now proceeding to Delivered...');
      
      // Small delay to ensure folder creation completes
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (
      booking &&
      (newStatus === BookingStatus.SHOOTING || newStatus === BookingStatus.DELIVERED)
    ) {
      const balance = booking.totalAmount - booking.paidAmount;
      if (balance > 0) {
        console.log('[App] Balance due, showing payment modal');
        setPaymentContextBooking(booking);
        setPendingStatus(newStatus);
        setShowPaymentModal(true);
        return;
      }
    }

    const updates: Partial<Booking> = { status: newStatus, ...(statusUpdates || {}) };
    if (newStatus === BookingStatus.SHOOTING) {
      updates.shootDate = new Date().toISOString();
    }
    console.log('[App] Updating booking status to:', newStatus);
    
    // ✅ Update local state first
    updateBookingMutation.mutate({ id, updates });
    
    // ✅ Then update backend
    const updated = await electronBackend.updateBooking(id, updates);
    if (selectedBooking?.id === id && updated) setSelectedBooking(updated);
    
    // ✅ FIX: Create updated booking object with NEW status for automated actions
    // This ensures performStatusUpdate sees the correct new status
    const bookingWithNewStatus: Booking = {
      ...booking!,
      status: newStatus, // ✅ CRITICAL: Use the NEW status, not the old one!
    };
    
    console.log('[App] Calling performStatusUpdate with newStatus:', newStatus);
    console.log('[App] bookingWithNewStatus.status:', bookingWithNewStatus.status);
    await performStatusUpdate(newStatus, id, bookingWithNewStatus);
    console.log('[App] performStatusUpdate completed');
  };
  const handleSettlePayment = async (amountInput?: number, currentExchangeRate?: number) => {
    const targetBooking = paymentContextBooking || selectedBooking;
    if (!targetBooking) return;

    // ✅ الحصول على سعر الصرف الحالي إذا لم يُمرر
    const rateToUse = currentExchangeRate || targetBooking.exchangeRate || 1400;

    let updated;
    if (amountInput !== undefined) {
      const newPaid = targetBooking.paidAmount + amountInput;
      
      // ✅ إنشاء سجل الدفعة الجديدة
      const newPaymentRecord: PaymentRecord = {
        id: `payment_${Date.now()}`,
        amount: amountInput,
        currency: targetBooking.currency,
        exchangeRate: rateToUse,
        convertedAmount: amountInput, // ✅ No conversion - stays in original currency
        paidAt: new Date().toISOString(),
        receivedBy: currentUser?.name,
        paymentMethod: targetBooking.paymentMethod,
      };

      // ✅ تحديث سجلات الدفعات
      const existingRecords = targetBooking.paymentRecords || [];
      const updatedRecords = [...existingRecords, newPaymentRecord];

      updated = await electronBackend.updateBooking(targetBooking.id, { 
        paidAmount: newPaid,
        paymentRecords: updatedRecords,
      });
    } else {
      updated = await electronBackend.settlePayment(targetBooking.id);
    }

    updateBookingMutation.mutate({
      id: targetBooking.id,
      updates: { 
        paidAmount: updated.paidAmount,
        paymentRecords: updated.paymentRecords,
      },
    });

    if (pendingStatus) {
      await performStatusUpdate(pendingStatus, targetBooking.id);
      setPendingStatus(null);
      setShowPaymentModal(false);
    } else {
      if (selectedBooking?.id === targetBooking.id) setSelectedBooking(null);
      setPaymentContextBooking(null);
      setShowPaymentModal(false);
    }
    SyncManager.pushChanges();
  };
  const handleOpenAddReminder = (type: ReminderType = 'general', title: string = '') => {
    setEditingReminder(null);
    setReminderInitialType(type);
    setReminderInitialTitle(title);
    setShowReminderModal(true);
  };
  const handleSaveReminder = async (
    title: string,
    date: string,
    type: ReminderType,
    customIcon?: string
  ) => {
    if (editingReminder) {
      await electronBackend.updateReminder(editingReminder.id, {
        title,
        dueDate: date,
        type,
        customIcon,
      });
    } else {
      if (!selectedBooking) return;
      await electronBackend.addReminder(selectedBooking.id, title, date, type, customIcon);
    }
    if (selectedBooking) await loadReminders(selectedBooking.id);
    setShowReminderModal(false);
  };
  const handleConfirmDelete = async () => {
    const { type, id } = confirmModal;
    if (!id) return;
    if (type === 'booking') {
      try {
        // 🗑️ Soft delete - moves to trash (restorable within 30 days)
        await electronBackend.softDeleteBooking(id);
        deleteBookingMutation.mutate(id);
        if (selectedBooking?.id === id) setSelectedBooking(null);
        toast.success('تم نقل الحجز إلى سلة المحذوفات (قابل للاستعادة خلال 30 يوم)');
      } catch (error) {
        console.error('❌ Failed to soft delete booking:', error);
        toast.error('فشل حذف الحجز');
      }
    } else if (type === 'reminder') {
      await electronBackend.deleteReminder(id);
      if (selectedBooking) await loadReminders(selectedBooking.id);
    }
    setConfirmModal({ ...confirmModal, isOpen: false });
  };
  const handleToggleDraggable = () => {
    setIsDraggableStates(prev => ({ ...prev, [activeSection]: !prev[activeSection] }));
  };
  const handleResetLayout = () => {
    setShowResetLayoutModal(true);
  };
  const confirmResetLayout = () => {
    setShowResetLayoutModal(false);
    toast.success('تم إعادة ضبط المخطط');
  };
  // Layout export/import handlers - to be implemented
  // const handleExportLayout = () => {};
  // const handleImportLayout = () => {};

  const loadReminders = async (bookingId: string) => {
    const data = await electronBackend.getReminders(bookingId);
    setReminders(data);
  };
  const handleSearchResultSelect = async (booking: Booking) => {
    setSelectedBooking(booking);
    await loadReminders(booking.id);
  };
  const handleStatusChange = async (newStatus: BookingStatus) => {
    if (!selectedBooking) return;
    const balance = selectedBooking.totalAmount - selectedBooking.paidAmount;
    if (
      balance > 0 &&
      (newStatus === BookingStatus.DELIVERED || newStatus === BookingStatus.SHOOTING)
    ) {
      setPaymentContextBooking(selectedBooking);
      setPendingStatus(newStatus);
      setShowPaymentModal(true);
      return;
    }
    await performStatusUpdate(newStatus);
  };

  // if (loading || bookingsLoading) return <div className="h-screen bg-[#09090b] flex items-center justify-center text-white font-sans">جارِ التحميل...</div>;



  // REMOVED BLOCKING LOADER for Instant UI Shell
  // Auto-Lock Logic
  const idleTimeout = useRef<NodeJS.Timeout | null>(null);
  const resetIdleTimer = useCallback(() => {
    if (!currentUser) return;

    if (idleTimeout.current) clearTimeout(idleTimeout.current);

    // 5 Minutes Timeout
    idleTimeout.current = setTimeout(
      () => {
        setIsLocked(true);
      },
      5 * 60 * 1000
    );
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const events = ['mousemove', 'mousedown', 'keypress', 'touchmove', 'scroll', 'click'];
    const handleActivity = () => {
      if (isLocked) return;
      resetIdleTimer();
    };

    events.forEach(event => window.addEventListener(event, handleActivity));
    resetIdleTimer();

    return () => {
      if (idleTimeout.current) clearTimeout(idleTimeout.current);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [currentUser, isLocked, resetIdleTimer]);

  // 🔐 macOS-style Device Login Logic
  // Find the remembered user from the users list
  // Support both UUID and legacy 'bootstrap_manager' ID
  const rememberedUser = useMemo(() => {
    if (!rememberedUserId) return null;
    
    // First try exact ID match
    let user = users.find(u => u.id === rememberedUserId);
    
    // Fallback: if 'bootstrap_manager', find the Manager role user
    if (!user && rememberedUserId === 'bootstrap_manager') {
      user = users.find(u => u.role === UserRole.MANAGER);
      // Update localStorage with the real UUID for future use
      if (user) {
        console.log('📱 Migrating bootstrap_manager to real UUID:', user.id);
        DeviceStorage.setLastUserId(user.id);
      }
    }
    
    return user;
  }, [rememberedUserId, users]);
  
  // 🔐 Check if we should show loading state for remembered user
  const isWaitingForRememberedUser = useMemo(() => {
    // If we have a rememberedUserId but users list is empty, we're still loading
    if (rememberedUserId && users.length === 0) {
      return true;
    }
    // If we have a rememberedUserId and users loaded, check if user exists
    if (rememberedUserId && users.length > 0) {
      const found = users.find(u => u.id === rememberedUserId);
      // Also check for 'bootstrap_manager' fallback
      if (!found && rememberedUserId === 'bootstrap_manager') {
        return !users.some(u => u.role === UserRole.MANAGER);
      }
      // 🛡️ FIX: If users loaded but remembered user NOT found (deleted/removed),
      // clear the stale remembered user immediately instead of waiting forever
      if (!found) {
        console.log('🧹 Remembered user not found in loaded users — clearing stale device storage');
        // Use setTimeout to avoid setState during render
        setTimeout(() => {
          DeviceStorage.clearLastUserId();
          setRememberedUserId(null);
        }, 0);
        return false; // Don't wait — show login immediately
      }
      return false; // User found — not waiting
    }
    return false;
  }, [rememberedUserId, users]);
  
  // � DEBUG: Log the state (commented out to prevent log spam)
  // console.log('🔐 [Login Screen] State:', {
  //   rememberedUserId,
  //   rememberedUser: rememberedUser ? { id: rememberedUser.id, name: rememberedUser.name, hasAvatar: !!rememberedUser.avatar } : null,
  //   showFullLogin,
  //   usersCount: users.length,
  //   userIds: users.map(u => u.id).slice(0, 5) // Show first 5 IDs
  // });
  
  // Determine which login screen to show
  if (!currentUser || isLocked) {
    const webAllowedUsers = isWebRuntime
      ? users.filter(user => WEB_ALLOWED_ROLES.has(user.role))
      : users;
    const webAllowedUsersById = new Map(webAllowedUsers.map(user => [user.id, user]));
    const pinnedUsers = pinnedUserIds
      .map(userId => webAllowedUsersById.get(userId))
      .filter((user): user is User => Boolean(user));
    const rememberedAllowedOnWeb = !isWebRuntime || (rememberedUser ? WEB_ALLOWED_ROLES.has(rememberedUser.role) : false);

    // 🔐 Wait for users to load if we have a remembered user ID
    // This prevents showing all users briefly before switching to single-user mode
    // ⚠️ BUT: If users failed to load (still empty after data loaded), show login anyway
    
    // Show loader for max 5 seconds, then show login screen
    // Use isWaitingForRememberedUser to handle case where users list has items but not our remembered user yet
    if (rememberedUserId && isWaitingForRememberedUser && dataLoadAttempts < 3) {
      return <AppLoader />;
    }
    
    // 🧹 Clear remembered user if no users loaded (stale device storage)
    if (rememberedUserId && isWaitingForRememberedUser && dataLoadAttempts >= 3) {
      console.log('🧹 Clearing stale remembered user - no users in database');
      DeviceStorage.clearLastUserId();
      setRememberedUserId(null);
    }
    
    // Show pinned users first. If no pinned users, fallback to remembered single-user flow.
    const showPinnedUsers = !showFullLogin && pinnedUsers.length > 0;
    const showRememberedUser = rememberedUser && !showFullLogin && !showPinnedUsers;
    
    
    // console.log('🔐 [Login Screen] Rendering:', {
    //   showRememberedUser,
    //   willShowSingleUser: showRememberedUser
    // });
    
    return (
      <SecurityAccessTerminal
        onLogin={(role, userId) => {
          handleRoleLogin(role, userId);
          setIsLocked(false);
        }}
        users={webAllowedUsers}
        pinnedUsers={showPinnedUsers ? pinnedUsers : []}
        rememberedUser={showRememberedUser && rememberedAllowedOnWeb ? rememberedUser : null}
        onNotMe={handleNotMe}
        onPinUser={handlePinUser}
        onUnpinUser={handleUnpinUser}
      />
    );
  }

  if (isWebRuntime && !WEB_ALLOWED_ROLES.has(currentUser.role)) {
    return <WebAccessLockedScreen />;
  }

  // ------------------------------------------------------------------
  // 🔥🔥🔥 MAIN RENDER RETURN 🔥🔥🔥
  // ------------------------------------------------------------------

  // 🌟 السيناريو الأول: المديرة (Lumina Design الكامل)
  if (currentUser.role === UserRole.MANAGER) {
    return (
      <ManagerLayout
        activeSection={activeSection}
        onNavigate={handleNavClick}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenDeletedBookings={() => setShowDeletedBookings(true)}
        hideHeader={!!selectedBooking || !!viewingBooking || showAddBookingModal}
        badges={notificationBadges}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>

        {/* Manager Modals */}
        <PaymentLockModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          outstandingAmount={
            selectedBooking ? selectedBooking.totalAmount - selectedBooking.paidAmount : 0
          }
          onSettle={handleSettlePayment}
        />
        <AddBookingModal
          isOpen={showAddBookingModal}
          onClose={() => {
            setShowAddBookingModal(false);
            setBookingToEdit(null);
            setViewingBooking(null);
            setRebookClientData(null);
          }}
          onSave={async data => {
            if (bookingToEdit && !viewingBooking) await handleUpdateBooking(bookingToEdit.id, data);
            else if (!viewingBooking) await handleAddBooking(data);
            setShowAddBookingModal(false);
            setBookingToEdit(null);
            setViewingBooking(null);
            setRebookClientData(null);
          }}
          initialCategory={initialCategory}
          mode={bookingMode}
          initialDate={selectedBookingDate}
          editingBooking={bookingToEdit || viewingBooking}
          readOnly={!!viewingBooking}
          existingBookings={bookings}
          hideHeader={true}
          rebookClient={rebookClientData}
        />
        {selectedBooking && (
          <AiAssistantModal
            isOpen={showAiModal}
            onClose={() => setShowAiModal(false)}
            clientName={selectedBooking.clientName}
            bookingStatus={selectedBooking.status}
            outstandingAmount={selectedBooking.totalAmount - selectedBooking.paidAmount}
            onSend={() => toast.success('تم الإرسال')}
          />
        )}

        {/* Global Settings Modal */}
        {currentUser && (
          <SettingsModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            currentUser={currentUser}
            allUsers={users}
            onUpdateUser={handleUpdateUser}
            isSafeMode={isSafeMode}
          />
        )}
      </ManagerLayout>
    );
  }

  // 🌟 السيناريو الثاني: المشرف العام (تصميم الـ HUD الجديد)
  if (currentUser?.role === UserRole.ADMIN) {
    return (
      <AdminLayout
        activeSection={activeSection}
        onNavigate={handleNavClick}
        currentUser={currentUser}
        onLogout={handleLogout}
        onLock={() => setIsLocked(true)}
        isSidebarCollapsed={!isSidebarOpen}
        badges={notificationBadges}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>

        {/* Admin Specific Modals */}
        <AddBookingModal
          isOpen={showAddBookingModal}
          onClose={() => {
            setShowAddBookingModal(false);
            setBookingToEdit(null);
            setViewingBooking(null);
            setRebookClientData(null);
          }}
          onSave={async data => {
            if (bookingToEdit && !viewingBooking) await handleUpdateBooking(bookingToEdit.id, data);
            else if (!viewingBooking) await handleAddBooking(data);
            setShowAddBookingModal(false);
            setBookingToEdit(null);
            setViewingBooking(null);
            setRebookClientData(null);
          }}
          initialCategory={initialCategory}
          mode={bookingMode}
          initialDate={selectedBookingDate}
          editingBooking={bookingToEdit || viewingBooking}
          readOnly={!!viewingBooking}
          existingBookings={bookings}
          hideHeader={true}
          rebookClient={rebookClientData}
        />
        <ReminderModal
          isOpen={showReminderModal}
          onClose={() => setShowReminderModal(false)}
          onSubmit={handleSaveReminder}
          initialType={reminderInitialType}
          initialTitle={reminderInitialTitle}
          initialData={editingReminder}
        />
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          onConfirm={handleConfirmDelete}
          message={confirmModal.message ?? ''}
          title="تأكيد العملية"
          confirmLabel="تنفيذ"
          cancelLabel="تراجع"
        />
        {selectedBooking && (
          <AiAssistantModal
            isOpen={showAiModal}
            onClose={() => setShowAiModal(false)}
            clientName={selectedBooking.clientName}
            bookingStatus={selectedBooking.status}
            outstandingAmount={selectedBooking.totalAmount - selectedBooking.paidAmount}
            onSend={() => toast.success('تم الإرسال')}
          />
        )}

        {/* Global Settings Modal */}
        {currentUser && (
          <SettingsModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            currentUser={currentUser}
            allUsers={users}
            onUpdateUser={handleUpdateUser}
            isSafeMode={isSafeMode}
          />
        )}
      </AdminLayout>
    );
  }

  // 🌟 السيناريو الثالث: الوصيفة (Selection Gallery - Soft Theme)
  if (currentUser.role === UserRole.SELECTOR) {
    return (
      <SelectionLayout
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenSettings={() => setShowSettingsModal(true)}
        badges={notificationBadges}
      >
        {activeSection !== 'section-team-chat' && (
          <SelectionDashboard bookings={bookings} currentUser={currentUser} users={users} onStatusUpdate={handleDragStatusChange} />
        )}

        {/* Global Settings Modal */}
        {currentUser && (
          <SettingsModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            currentUser={currentUser}
            allUsers={users}
            onUpdateUser={handleUpdateUser}
            isSafeMode={isSafeMode}
          />
        )}
        {activeSection === 'section-team-chat' && (
          <ReceptionPageWrapper isReception={false} allowOverflow hideBackground>
            <UnifiedTeamChat currentUser={currentUser} users={users} />
          </ReceptionPageWrapper>
        )}
      </SelectionLayout>
    );
  }

  // 🌟 السيناريو الرابع: Photo Editor (محرر الصور)
  if (currentUser.role === UserRole.PHOTO_EDITOR) {
    return (
      <PhotoEditorLayout
        activeSection={activeSection}
        onNavigate={handleNavClick}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenSettings={() => setShowSettingsModal(true)}
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        badges={notificationBadges}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <PhotoEditorDashboard
              activeSection={activeSection}
              currentUser={currentUser}
              users={users}
              bookings={bookings}
              onStatusUpdate={handleDragStatusChange}
            />
          </motion.div>
        </AnimatePresence>

        {/* Global Settings Modal */}
        {currentUser && (
          <SettingsModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            currentUser={currentUser}
            allUsers={users}
            onUpdateUser={handleUpdateUser}
            isSafeMode={isSafeMode}
          />
        )}
      </PhotoEditorLayout>
    );
  }

  // 🌟 السيناريو الخامس: Video Editor (محرر الفيديو)
  if (currentUser.role === UserRole.VIDEO_EDITOR) {
    return (
      <VideoEditorLayout
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenSettings={() => setShowSettingsModal(true)}
        activeTab={videoEditorTab}
        onNavigate={setVideoEditorTab}
        badges={notificationBadges}
      >
        {videoEditorTab === 'dashboard' ? (
          <VideoEditorDashboard currentUser={currentUser} bookings={bookings} onStatusUpdate={handleDragStatusChange} />
        ) : (
          <UnifiedTeamChat currentUser={currentUser} users={users} />
        )}

        {/* Global Settings Modal */}
        {currentUser && (
          <SettingsModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            currentUser={currentUser}
            allUsers={users}
            onUpdateUser={handleUpdateUser}
            isSafeMode={isSafeMode}
          />
        )}
      </VideoEditorLayout>
    );
  }

  // 🌟 السيناريو السادس: Printer (قسم الطباعة)
  if (currentUser.role === UserRole.PRINTER) {
    return (
      <PrinterLayout
        activeSection={activeSection}
        onNavigate={handleNavClick}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenSettings={() => setShowSettingsModal(true)}
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        badges={notificationBadges}
        isWebRuntime={isWebRuntime}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <PrinterDashboard
              activeSection={activeSection}
              bookings={bookings}
              users={users}
              currentUser={currentUser}
              onStatusUpdate={handleDragStatusChange}
              onUpdateBooking={handleUpdateBooking}
              onAddBooking={handleAddBooking}
            />
          </motion.div>
        </AnimatePresence>

        {/* Global Settings Modal */}
        {currentUser && (
          <SettingsModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            currentUser={currentUser}
            allUsers={users}
            onUpdateUser={handleUpdateUser}
            isSafeMode={isSafeMode}
          />
        )}
      </PrinterLayout>
    );
  }

  // 🌟 السيناريو السابع: باقي الموظفين (التصميم القديم - Sidebar)
  const legacyContentMarginClass = isSidebarCollapsed ? 'lg:mr-[90px]' : 'lg:mr-[160px]';

  return (
    <div
      className={`flex ${isWebRuntime ? 'min-h-[100dvh] overflow-x-hidden overflow-y-auto' : 'h-screen overflow-hidden'} ${currentUser?.role === UserRole.RECEPTION ? 'bg-[#0F0F0F] text-gray-100' : 'bg-[#21242b] text-gray-100'} font-sans ${isSnowing ? 'winter-mode' : ''}`}
      dir="rtl"
    >
      {isSnowing && <Snowfall />}
      {isRamadan && <RamadanLanterns />}
      {isSparkles && <SparklesEffect />}
      <OfflineBanner isOffline={isOffline} />

      {/* Render Sidebar based on Role (Reception and Developer only) */}
      {currentUser?.role === UserRole.RECEPTION && (
        <ReceptionSidebar
          activeSection={activeSection}
          onNavigate={handleNavClick}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenSettings={() => setShowSettingsModal(true)}
          badges={notificationBadges}
        />
      )}

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col min-w-0 relative transition-all duration-300 ${legacyContentMarginClass}`}
      >
        {currentUser?.role !== UserRole.RECEPTION && (
          <Header
            currentUser={currentUser}
            allUsers={users}
            onSwitchUser={handleSwitchUser}
            onLogout={handleLogout}
            activeSection={activeSection}
            onNavigate={handleNavClick}
            notifications={notifications}
            onMarkAllRead={() => setNotifications(n => n.map(x => ({ ...x, read: true })))}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            isSnowing={isSnowing}
            onToggleSnow={() => setIsSnowing(!isSnowing)}
            isHeartTrail={isHeartTrail}
            onToggleHeartTrail={() => setIsHeartTrail(!isHeartTrail)}
            isRamadan={isRamadan}
            onToggleRamadan={() => setIsRamadan(!isRamadan)}
            isSparkles={isSparkles}
            onToggleSparkles={() => setIsSparkles(!isSparkles)}
            isDraggable={isDraggableStates[activeSection] || false}
            onToggleDraggable={handleToggleDraggable}
            onResetLayout={handleResetLayout}
          />
        )}
        <main
          className={`flex-1 min-h-0 p-4 lg:p-6 relative ${isWebRuntime ? 'overflow-x-hidden overflow-y-auto xl:overflow-hidden' : 'overflow-hidden'}`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Common Modals */}
      <PaymentLockModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setPaymentContextBooking(null);
          setPendingStatus(null);
        }}
        outstandingAmount={
          paymentContextBooking
            ? paymentContextBooking.totalAmount - paymentContextBooking.paidAmount
            : selectedBooking
              ? selectedBooking.totalAmount - selectedBooking.paidAmount
              : 0
        }
        onSettle={handleSettlePayment}
      />
      <ReminderModal
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        onSubmit={handleSaveReminder}
        initialType={reminderInitialType}
        initialTitle={reminderInitialTitle}
        initialData={editingReminder}
      />
      <AddBookingModal
        isOpen={showAddBookingModal}
        onClose={() => {
          setShowAddBookingModal(false);
          setBookingToEdit(null);
          setViewingBooking(null);
          setRebookClientData(null);
        }}
        onSave={async data => {
          if (bookingToEdit && !viewingBooking) await handleUpdateBooking(bookingToEdit.id, data);
          else if (!viewingBooking) await handleAddBooking(data);
          setShowAddBookingModal(false);
          setBookingToEdit(null);
          setViewingBooking(null);
          setRebookClientData(null);
        }}
        initialCategory={initialCategory}
        mode={bookingMode}
        initialDate={selectedBookingDate}
        editingBooking={bookingToEdit || viewingBooking}
        readOnly={!!viewingBooking}
        existingBookings={bookings}
        rebookClient={rebookClientData}
      />
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={handleConfirmDelete}
        message={confirmModal.message ?? ''}
        title="تأكيد"
        confirmLabel="نعم"
        cancelLabel="إلغاء"
      />
      <ConfirmationModal
        isOpen={showResetLayoutModal}
        onClose={() => setShowResetLayoutModal(false)}
        onConfirm={confirmResetLayout}
        message="هل تريد إعادة المخطط الحالي للوضع الافتراضي؟"
        title="إعادة ضبط المخطط"
        confirmLabel="نعم، إعادة الضبط"
        cancelLabel="إلغاء"
      />
      {selectedBooking && (
        <AiAssistantModal
          isOpen={showAiModal}
          onClose={() => setShowAiModal(false)}
          clientName={selectedBooking.clientName}
          bookingStatus={selectedBooking.status}
          outstandingAmount={selectedBooking.totalAmount - selectedBooking.paidAmount}
          onSend={() => toast.success('تم الإرسال')}
        />
      )}
      <ConfirmationModal
        isOpen={showBookingTypeModal}
        onClose={() => setShowBookingTypeModal(false)}
        onConfirm={() => {}}
        message=""
        title="نوع الحجز"
        confirmLabel=""
        cancelLabel=""
        customContent={
          <div className="space-y-4">
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-4">
              <p className="text-gray-300 text-sm leading-relaxed text-center">
                <span className="text-amber-500 font-bold block mb-2">سؤال للعميل:</span>
                &quot;تحب تحجز الفيلا لمصورك الخاص؟ لو تحب إحنا نصورك بكادرنا؟&quot;
              </p>
            </div>

            <div className="grid gap-3">
              <button
                onClick={() => handleBookingTypeSelect('shoot')}
                className="group w-full p-4 bg-linear-to-r from-pink-500/10 to-purple-500/10 border-2 border-pink-500/30 rounded-2xl hover:bg-pink-500/20 transition-all text-right relative overflow-hidden"
              >
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <h3 className="text-white font-bold text-lg group-hover:text-pink-400 transition-colors">
                      جلسات التصوير
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-1 opacity-80">
                      الجواب: &quot;إنتو صوروني&quot; (كادرنا)
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-500 shadow-lg shadow-pink-500/10">
                    <Camera size={24} />
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleBookingTypeSelect('location')}
                className="group w-full p-4 bg-linear-to-r from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/30 rounded-2xl hover:bg-blue-500/20 transition-all text-right relative overflow-hidden"
              >
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <h3 className="text-white font-bold text-lg group-hover:text-blue-400 transition-colors">
                      حجوزات الفيلا
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-1 opacity-80">
                      الجواب: &quot;مصوري وياي&quot; (تأجير فقط)
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 shadow-lg shadow-blue-500/10">
                    <Building2 size={24} />
                  </div>
                </div>
              </button>
            </div>
          </div>
        }
      />

      {/* Deleted Bookings View */}
      <DeletedBookingsView
        isOpen={showDeletedBookings}
        onClose={() => setShowDeletedBookings(false)}
        onRestore={(booking) => {
          // Refresh bookings after restore
          deleteBookingMutation.mutate(booking.id);
          toast.success(`تم استعادة حجز "${booking.clientName}"`);
        }}
      />

      {/* Global Settings Modal */}
      {currentUser && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          currentUser={currentUser}
          allUsers={users}
          onUpdateUser={handleUpdateUser}
          isSafeMode={isSafeMode}
        />
      )}
    </div>
  );
}
