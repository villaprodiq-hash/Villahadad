/**
 * Current User Service
 * Manages the currently logged-in user's context across the application
 * Tracks: name, role, and provides formatted display names
 */

import { UserRole } from '../types';

export interface CurrentUser {
  id: string;
  name: string;
  role: UserRole;
  roleLabel: string; // Arabic label: "رسبشن", "إشراف", etc.
}

class CurrentUserServiceClass {
  private currentUser: CurrentUser | null = null;
  private readonly STORAGE_KEY = 'villahadad_current_user';

  /**
   * Set the current logged-in user
   */
  setCurrentUser(user: CurrentUser): void {
    this.currentUser = user;
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    }
  }

  /**
   * Get the current logged-in user
   */
  getCurrentUser(): CurrentUser | null {
    if (!this.currentUser && typeof window !== 'undefined') {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        try {
          this.currentUser = JSON.parse(stored);
        } catch (e) {
          console.error('Failed to parse stored user:', e);
          this.currentUser = null;
        }
      }
    }
    return this.currentUser;
  }

  /**
   * Get formatted full name: "رسبشن مريم"
   */
  getFullName(): string {
    const user = this.getCurrentUser();
    if (!user) return 'مستخدم غير معروف';
    return `${user.roleLabel} ${user.name}`;
  }

  /**
   * Get just the employee name
   */
  getName(): string {
    const user = this.getCurrentUser();
    return user?.name || 'غير معروف';
  }

  /**
   * Get just the role label
   */
  getRoleLabel(): string {
    const user = this.getCurrentUser();
    return user?.roleLabel || 'غير محدد';
  }

  /**
   * Clear current user (logout)
   */
  clearCurrentUser(): void {
    this.currentUser = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null;
  }
}

// Export singleton instance
export const CurrentUserService = new CurrentUserServiceClass();
