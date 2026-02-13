import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { User, UserRole, RoleLabels } from '../types';
import { electronBackend } from '../services/mockBackend';
import { supabase } from '../services/supabase';
import { SyncManager } from '../services/sync/SyncManager';
import { attendanceService } from '../services/db/services/AttendanceService';
import { presenceService } from '../services/db/services/PresenceService';

interface AuthContextValue {
  currentUser: User | undefined;
  users: User[];
  login: (role: UserRole, userId?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | undefined>(undefined);
  const [users, setUsers] = useState<User[]>([]);

  // Load users on mount + Real-time sync
  useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      try {
        const usersData = await electronBackend.getUsers();
        if (isMounted) {
          setUsers(usersData);
          console.log(`✅ Loaded ${usersData.length} users`);
        }
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    };

    loadUsers();

    // ⚡ REAL-TIME SUBSCRIPTION للتزامن الفوري
    const channel = supabase
      .channel('users-realtime-sync')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'users',
        },
        async (payload) => {
          console.log('⚡ Real-time user change:', payload.eventType);
          
          // Refresh all users from Supabase
          const freshUsers = await electronBackend.getUsers();
          if (isMounted) {
            setUsers(freshUsers);
            
            // Update currentUser if changed
            setCurrentUser(prevUser => {
              if (!prevUser) return undefined;
              const updated = freshUsers.find(u => u.id === prevUser.id);
              if (updated && JSON.stringify(updated) !== JSON.stringify(prevUser)) {
                return updated;
              }
              return prevUser;
            });
            
            // Show notification for new users
            if (payload.eventType === 'INSERT' && payload.new) {
              const newUser = payload.new as { name?: string };
              toast.success(`👤 موظف جديد: ${newUser.name || 'مستخدم جديد'}`);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Users real-time subscription:', status);
      });

    // Legacy event subscription (for local changes)
    const unsubscribe = electronBackend.subscribe(async (event) => {
      if (event === 'users_updated' && isMounted) {
        const data = await electronBackend.getUsers();
        setUsers((prev) => {
          const newData = JSON.parse(JSON.stringify(data));
          if (JSON.stringify(prev) !== JSON.stringify(newData)) {
            return newData;
          }
          return prev;
        });
        
        setCurrentUser(prevUser => {
          if (!prevUser) return undefined;
          const updatedUser = data.find(u => u.id === prevUser.id);
          if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(prevUser)) {
             return updatedUser;
          }
          return prevUser;
        });
      }
    });

    // Cleanup
    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      unsubscribe();
    };
  }, []);

  const login = async (role: UserRole, userId?: string) => {
    // 1. Try to find precise user by ID (if provided)
    let rawUser = userId ? users.find((u) => u.id === userId) : null;

    // 2. Fallback to first user of that role (legacy behavior)
    if (!rawUser) {
      rawUser = users.find((u) => u.role === role);
    }

    if (rawUser) {
      // Defensive clone to avoid mutating state
      const safeUser = { ...rawUser };

      // Critical fallback for data persistence issues
      if (!safeUser.name || safeUser.name === 'undefined') {
        const label = RoleLabels[role] || role;
        safeUser.name = `User (${label})`;
        console.warn('LOGIN_RESCUE: User had no name, allocated fallback:', safeUser.name);
      }

      setCurrentUser(safeUser);

      // Inform SyncManager of current user (for audit trail)
      SyncManager.setCurrentUser(safeUser.id);

      // Join Real-Time Presence
      try {
        await presenceService.join(safeUser);
      } catch (e) {
        console.error('Presence Join Failed', e);
      }

      // ✅ Start real-time bookings sync after auth
      try {
        electronBackend.initRealtimeSync();
      } catch (e) {
        console.error('Real-time sync init failed:', e);
      }

      // Smart Attendance Check-In
      try {
        await attendanceService.recordCheckIn({ id: safeUser.id, name: safeUser.name });
        toast.success('تم تسجيل الحضور بنجاح');
      } catch (e) {
        console.error('Attendance Check-In Failed', e);
      }

      toast.success(`مرحباً بك: ${RoleLabels[role]}`);
      SyncManager.pushChanges(); // Force sync on login
    } else {
      // Create mock user if not found
      const mockUser: User = {
        id: `temp_${role}`,
        name: RoleLabels[role] || role,
        role: role,
        avatar: '',
      };
      setCurrentUser(mockUser);
      SyncManager.setCurrentUser(mockUser.id);
      toast.success(`مرحباً بك: ${RoleLabels[role]}`);
    }
  };

  const logout = async () => {
    if (currentUser) {
      try {
        await presenceService.leave(); // Leave Presence
        await attendanceService.recordCheckOut(currentUser.id);
        console.log('Attendance Check-Out Recorded');
      } catch (e) {
        console.error('Attendance Check-Out Failed', e);
      }
    }
    setCurrentUser(undefined);
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    try {
      const updatedUser = await electronBackend.updateUser(id, updates);
      setUsers((prev) => prev.map((u) => (u.id === id ? updatedUser : u)));
      if (currentUser && currentUser.id === id) {
        setCurrentUser(updatedUser);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to update user');
      throw e;
    }
  };

  const value: AuthContextValue = {
    currentUser,
    users,
    login,
    logout,
    updateUser,
    isAuthenticated: !!currentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
