/**
 * Custom hook for authentication
 * Provides access to auth context and user state
 */
import { useAuthContextValue } from '../providers/auth-context';

export const useAuth = useAuthContextValue;
