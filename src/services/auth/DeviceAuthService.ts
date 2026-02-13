/**
 * DeviceAuthService - Per-device user persistence (macOS-style login)
 * 
 * Stores only the last logged-in user ID on this device.
 * Does NOT store passwords or sensitive data.
 */

const STORAGE_KEY = 'villa_hadad_last_user';

export interface DeviceAuthData {
  userId: string;
  userRole: string;
  timestamp: number;
}

export const DeviceAuthService = {
  /**
   * Get the last logged-in user ID for this device
   */
  getLastUser(): DeviceAuthData | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return null;
      
      const parsed = JSON.parse(data) as DeviceAuthData;
      
      // Optional: Expire after 30 days of inactivity
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.timestamp > thirtyDays) {
        this.clearLastUser();
        return null;
      }
      
      return parsed;
    } catch (error) {
      console.error('DeviceAuthService: Failed to read last user', error);
      return null;
    }
  },

  /**
   * Save the last logged-in user ID for this device
   */
  setLastUser(userId: string, userRole: string): void {
    try {
      const data: DeviceAuthData = {
        userId,
        userRole,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.log('DeviceAuthService: Saved last user', userId);
    } catch (error) {
      console.error('DeviceAuthService: Failed to save last user', error);
    }
  },

  /**
   * Clear the remembered user (for "Not me" action or logout)
   */
  clearLastUser(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('DeviceAuthService: Cleared last user');
    } catch (error) {
      console.error('DeviceAuthService: Failed to clear last user', error);
    }
  },

  /**
   * Update timestamp to refresh expiry
   */
  touchLastUser(): void {
    const data = this.getLastUser();
    if (data) {
      this.setLastUser(data.userId, data.userRole);
    }
  }
};

export default DeviceAuthService;
