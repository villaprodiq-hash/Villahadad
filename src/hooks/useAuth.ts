/**
 * Custom hook for authentication
 * Provides access to auth context and user state
 */
import { useAuth as useAuthContext } from '../providers/AuthProvider';

export const useAuth = useAuthContext;
