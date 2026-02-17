import { createContext, useContext } from 'react';
import type { User, UserRole } from '../types';

export interface AuthContextValue {
  currentUser: User | undefined;
  users: User[];
  login: (role: UserRole, userId?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuthContextValue() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
