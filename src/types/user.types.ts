// User Roles
export enum UserRole {
  MANAGER = 'manager',
  ADMIN = 'admin',
  RECEPTION = 'reception',
  PHOTO_EDITOR = 'photo_editor',
  VIDEO_EDITOR = 'video_editor',
  PRINTER = 'printer',
  SELECTOR = 'selector',
}

// Role Permissions
export interface RolePermissions {
  canViewFinancials: boolean;
  canEditBookings: boolean;
  canDeleteBookings: boolean;
  canViewGallery: boolean;
  canEditGallery: boolean;
  canViewClientPhone: boolean;
  canViewPrices: boolean;
  canAccessSettings: boolean;
  canAssignTasks: boolean;
  canManageUsers: boolean;
  canAccessDevTools: boolean;
  canViewSystemLogs: boolean;
  canApproveBookings: boolean; // صلاحية الموافقة على الحجوزات المتعارضة
}

// User Interface
export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
  email?: string;
  password?: string;
  jobTitle?: string;
  preferences?: {
    hiddenSections?: string[];
    hiddenWidgets?: string[];
    hr_strikes?: number;
    hr_performance?: number;
    hr_notes?: string;
    managerMobileAccess?: {
      trustedDeviceId: string;
      trustedDeviceLabel?: string;
      trustedAt: string;
      updatedAt?: string;
    };
    staffWebAccess?: {
      trustedDeviceId: string;
      trustedDeviceLabel?: string;
      trustedAt: string;
      updatedAt?: string;
    };
  };
}
