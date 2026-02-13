
import { supabase } from '../supabase';
import { UserRole } from '../../types';

export class AuthService {
    /**
     * Login with Email and Password
     * @param email User email
     * @param password User password
     * @returns { user, error }
     */
    static async signIn(email: string, password: string) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            
            return { user: data.user, error: null };
        } catch (error) {
            console.error('AuthService: Login Failed', error);
            return { user: null, error };
        }
    }

    /**
     * Logout
     */
    static async signOut() {
        try {
            await supabase.auth.signOut();
            return { error: null };
        } catch (error) {
            console.error('AuthService: Logout Failed', error);
            return { error };
        }
    }

    /**
     * Get Current Authenticated User
     */
    static async getUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    }

    /**
     * Get Current Session
     */
    static async getSession() {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    }

    /**
     * Map Supabase User to Local User Role
     * Uses user metadata (assuming 'role' is stored in metadata)
     */
    static getRoleFromUser(user: any): UserRole {
        if (!user || !user.user_metadata || !user.user_metadata.role) {
            return UserRole.RECEPTION; // Default fallback
        }

        // Normalize role string to Enum
        const roleStr = user.user_metadata.role.toUpperCase();
        
        // Map to UserRole enum
        if (roleStr === 'MANAGER') return UserRole.MANAGER;
        if (roleStr === 'ADMIN') return UserRole.ADMIN;
        if (roleStr === 'PHOTO_EDITOR') return UserRole.PHOTO_EDITOR;
        if (roleStr === 'VIDEO_EDITOR') return UserRole.VIDEO_EDITOR;
        if (roleStr === 'PRINTER') return UserRole.PRINTER;
        if (roleStr === 'SELECTOR') return UserRole.SELECTOR;
        
        return UserRole.RECEPTION;
    }

    /**
     * Update User Password
     */
    static async updatePassword(newPassword: string) {
        try {
            const { data, error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('AuthService: Update Password Failed', error);
            return { data: null, error };
        }
    }

    /**
     * Update User Email
     */
    static async updateEmail(newEmail: string) {
        try {
            const { data, error } = await supabase.auth.updateUser({ email: newEmail });
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('AuthService: Update Email Failed', error);
            return { data: null, error };
        }
    }
}
