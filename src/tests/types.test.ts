import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BookingStatus,
  BookingCategory,
  UserRole,
  ROLE_PERMISSIONS,
  getUserPermissions,
  canUserSeeBooking,
  maskSensitiveData,
  StatusLabels,
  CategoryLabels,
  RoleLabels,
} from '../../types';
import type { User, Booking } from '../../types';

describe('Types & RBAC System', () => {
  
  // ============ Enums & Labels ============
  describe('Enums & Labels', () => {
    it('should have all booking statuses with Arabic labels', () => {
      const statuses = Object.values(BookingStatus);
      
      expect(statuses).toContain(BookingStatus.CONFIRMED);
      expect(statuses).toContain(BookingStatus.SHOOTING);
      expect(statuses).toContain(BookingStatus.DELIVERED);
      
      // Check Arabic labels exist
      expect(StatusLabels[BookingStatus.CONFIRMED]).toBe('مؤكد (قادم)');
      expect(StatusLabels[BookingStatus.DELIVERED]).toBe('تم');
    });

    it('should have all booking categories with Arabic labels', () => {
      const categories = Object.values(BookingCategory);
      
      expect(categories).toContain(BookingCategory.WEDDING);
      expect(categories).toContain(BookingCategory.STUDIO);
      
      expect(CategoryLabels[BookingCategory.WEDDING]).toBe('أعراس');
      expect(CategoryLabels[BookingCategory.STUDIO]).toBe('ستوديو');
    });

    it('should have all user roles with Arabic labels', () => {
      const roles = Object.values(UserRole);
      
      expect(roles).toHaveLength(7); // 7 roles in system
      expect(roles).toContain(UserRole.MANAGER);
      expect(roles).toContain(UserRole.RECEPTION);
      
      expect(RoleLabels[UserRole.MANAGER]).toContain('المديرة');
      expect(RoleLabels[UserRole.RECEPTION]).toContain('الحجوزات');
    });
  });

  // ============ RBAC Permissions ============
  describe('RBAC Permissions', () => {
    it('should give MANAGER all permissions', () => {
      const managerPerms = ROLE_PERMISSIONS[UserRole.MANAGER];
      
      expect(managerPerms.canViewFinancials).toBe(true);
      expect(managerPerms.canEditBookings).toBe(true);
      expect(managerPerms.canDeleteBookings).toBe(true);
      expect(managerPerms.canManageUsers).toBe(true);
      expect(managerPerms.canApproveBookings).toBe(true);
    });

    it('should restrict RECEPTION permissions', () => {
      const receptionPerms = ROLE_PERMISSIONS[UserRole.RECEPTION];
      
      expect(receptionPerms.canViewFinancials).toBe(false);
      expect(receptionPerms.canEditBookings).toBe(true);
      expect(receptionPerms.canDeleteBookings).toBe(false);
      expect(receptionPerms.canManageUsers).toBe(false);
      expect(receptionPerms.canViewClientPhone).toBe(true);
    });

    it('should restrict PHOTO_EDITOR to gallery only', () => {
      const editorPerms = ROLE_PERMISSIONS[UserRole.PHOTO_EDITOR];
      
      expect(editorPerms.canViewGallery).toBe(true);
      expect(editorPerms.canEditGallery).toBe(true);
      expect(editorPerms.canViewFinancials).toBe(false);
      expect(editorPerms.canEditBookings).toBe(false);
      expect(editorPerms.canViewClientPhone).toBe(false);
    });

    it('should restrict PRINTER permissions', () => {
      const printerPerms = ROLE_PERMISSIONS[UserRole.PRINTER];
      
      expect(printerPerms.canViewGallery).toBe(true);
      expect(printerPerms.canEditGallery).toBe(false);
      expect(printerPerms.canViewPrices).toBe(false);
    });
  });

  // ============ getUserPermissions ============
  describe('getUserPermissions()', () => {
    it('should return correct permissions for a user', () => {
      const manager: User = {
        id: 'user-1',
        name: 'سورة',
        role: UserRole.MANAGER,
      };
      
      const perms = getUserPermissions(manager);
      
      expect(perms.canManageUsers).toBe(true);
      expect(perms.canApproveBookings).toBe(true);
    });

    it('should return restricted permissions for reception', () => {
      const reception: User = {
        id: 'user-2',
        name: 'علي',
        role: UserRole.RECEPTION,
      };
      
      const perms = getUserPermissions(reception);
      
      expect(perms.canManageUsers).toBe(false);
      expect(perms.canEditBookings).toBe(true);
    });
  });

  // ============ canUserSeeBooking ============
  describe('canUserSeeBooking()', () => {
    const mockBooking: Booking = {
      id: 'booking-1',
      clientName: 'Test Client',
      clientId: 'client-1',
      clientPhone: '07801234567',
      title: 'Wedding',
      category: BookingCategory.WEDDING,
      shootDate: '2026-02-01',
      status: BookingStatus.CONFIRMED,
      totalAmount: 500000,
      paidAmount: 250000,
      currency: 'IQD',
      servicePackage: 'Gold',
      location: 'Studio',
      assignedPhotoEditor: 'editor-1',
      assignedPrinter: 'printer-1',
    };

    it('should allow MANAGER to see any booking', () => {
      const manager: User = { id: 'mgr-1', name: 'Manager', role: UserRole.MANAGER };
      expect(canUserSeeBooking(mockBooking, manager)).toBe(true);
    });

    it('should allow ADMIN to see any booking', () => {
      const admin: User = { id: 'admin-1', name: 'Admin', role: UserRole.ADMIN };
      expect(canUserSeeBooking(mockBooking, admin)).toBe(true);
    });

    it('should allow RECEPTION to see any booking', () => {
      const reception: User = { id: 'rec-1', name: 'Reception', role: UserRole.RECEPTION };
      expect(canUserSeeBooking(mockBooking, reception)).toBe(true);
    });

    it('should allow assigned PHOTO_EDITOR to see booking', () => {
      const editor: User = { id: 'editor-1', name: 'Editor', role: UserRole.PHOTO_EDITOR };
      expect(canUserSeeBooking(mockBooking, editor)).toBe(true);
    });

    it('should NOT allow unassigned PHOTO_EDITOR to see booking', () => {
      const unassignedEditor: User = { id: 'editor-99', name: 'Other Editor', role: UserRole.PHOTO_EDITOR };
      // Only sees if in EDITING status
      expect(canUserSeeBooking(mockBooking, unassignedEditor)).toBe(false);
    });

    it('should allow PHOTO_EDITOR to see any booking in EDITING status', () => {
      const editingBooking = { ...mockBooking, status: BookingStatus.EDITING };
      const anyEditor: User = { id: 'editor-99', name: 'Any Editor', role: UserRole.PHOTO_EDITOR };
      expect(canUserSeeBooking(editingBooking, anyEditor)).toBe(true);
    });

    it('should allow assigned PRINTER to see booking', () => {
      const printer: User = { id: 'printer-1', name: 'Printer', role: UserRole.PRINTER };
      expect(canUserSeeBooking(mockBooking, printer)).toBe(true);
    });
  });

  // ============ maskSensitiveData ============
  describe('maskSensitiveData()', () => {
    it('should mask phone for users without permission', () => {
      const printer: User = { id: 'p-1', name: 'Printer', role: UserRole.PRINTER };
      const masked = maskSensitiveData('07801234567', printer, 'phone');
      expect(masked).toBe('***-****');
    });

    it('should show phone for users with permission', () => {
      const reception: User = { id: 'r-1', name: 'Reception', role: UserRole.RECEPTION };
      const phone = maskSensitiveData('07801234567', reception, 'phone');
      expect(phone).toBe('07801234567');
    });

    it('should mask price for users without permission', () => {
      const editor: User = { id: 'e-1', name: 'Editor', role: UserRole.PHOTO_EDITOR };
      const masked = maskSensitiveData('500000', editor, 'price');
      expect(masked).toBe('****');
    });

    it('should show price for manager', () => {
      const manager: User = { id: 'm-1', name: 'Manager', role: UserRole.MANAGER };
      const price = maskSensitiveData('500000', manager, 'price');
      expect(price).toBe('500000');
    });
  });
});
