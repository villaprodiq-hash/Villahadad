/**
 * 🔐 Secure Authentication Service
 * 
 * هذا الملف يوضح كيفية تطبيق المصادقة الصحيحة
 * استبدل AuthProvider الحالي بهذا التطبيق
 */

import { PasswordService } from '../security/PasswordService';
import { supabase } from '../supabase';
import { User, UserRole } from '../../types';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User | null;
  error: Error | null;
  requiresPasswordReset?: boolean;
}

/**
 * ✅ SECURE LOGIN - مع التحقق من كلمة المرور
 */
export async function secureLogin(credentials: AuthCredentials): Promise<AuthResponse> {
  const { email, password } = credentials;

  // 1. Validate input
  if (!email || !password) {
    return {
      user: null,
      error: new Error('البريد الإلكتروني وكلمة المرور مطلوبان'),
    };
  }

  try {
    // 2. Get user from database
    const { data: users, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (dbError) throw dbError;

    if (!users || users.length === 0) {
      // Don't reveal if user exists or not
      return {
        user: null,
        error: new Error('بيانات الاعتماد غير صحيحة'),
      };
    }

    const dbUser = users[0];

    // 3. Check if password is still in plain text (needs migration)
    if (PasswordService.needsMigration(dbUser.password)) {
      console.warn('⚠️ User has legacy plain-text password');
      
      // Verify plain text password
      if (password !== dbUser.password) {
        return {
          user: null,
          error: new Error('بيانات الاعتماد غير صحيحة'),
        };
      }

      // Force password reset
      return {
        user: null,
        error: new Error('PASSWORD_RESET_REQUIRED'),
        requiresPasswordReset: true,
      };
    }

    // 4. Verify hashed password
    const isValid = await PasswordService.verify(password, dbUser.password);
    
    if (!isValid) {
      // Log failed attempt (for security monitoring)
      console.warn(`⚠️ Failed login attempt for: ${email}`);
      
      return {
        user: null,
        error: new Error('بيانات الاعتماد غير صحيحة'),
      };
    }

    // 5. Create Supabase session (for RLS)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: dbUser.password_hash || password, // Use actual hashed password
    });

    if (authError) {
      console.error('Supabase auth error:', authError);
      // Continue with local auth even if Supabase fails
    }

    // 6. Map database user to app user
    const user: User = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role as UserRole,
      avatar: dbUser.avatar_url || dbUser.avatar,
      jobTitle: dbUser.job_title,
    };

    // 7. Log successful login
    console.log(`✅ User logged in: ${user.name} (${user.role})`);

    return {
      user,
      error: null,
    };

  } catch (error) {
    console.error('Login error:', error);
    return {
      user: null,
      error: error as Error,
    };
  }
}

/**
 * ✅ SECURE LOGOUT
 */
export async function secureLogout(): Promise<void> {
  try {
    // 1. Sign out from Supabase
    await supabase.auth.signOut();

    // 2. Clear local session data
    sessionStorage.clear();
    
    // 3. Clear any sensitive data from memory
    // (implement based on your state management)

    console.log('✅ User logged out successfully');
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}

/**
 * ✅ CHANGE PASSWORD - مع التحقق
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: Error }> {
  
  // 1. Validate new password strength
  if (newPassword.length < 8) {
    return {
      success: false,
      error: new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
    };
  }

  try {
    // 2. Get current user
    const { data: users, error: dbError } = await supabase
      .from('users')
      .select('password')
      .eq('id', userId)
      .limit(1);

    if (dbError) throw dbError;
    if (!users || users.length === 0) {
      throw new Error('المستخدم غير موجود');
    }

    const currentUser = users[0];

    // 3. Verify current password
    const isValid = await PasswordService.verify(currentPassword, currentUser.password);
    if (!isValid) {
      return {
        success: false,
        error: new Error('كلمة المرور الحالية غير صحيحة'),
      };
    }

    // 4. Hash new password
    const hashedPassword = await PasswordService.hash(newPassword);

    // 5. Update in database
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', userId);

    if (updateError) throw updateError;

    console.log(`✅ Password changed for user: ${userId}`);

    return { success: true };

  } catch (error) {
    console.error('Change password error:', error);
    return {
      success: false,
      error: error as Error,
    };
  }
}

/**
 * ✅ RESET PASSWORD - إجبار إعادة تعيين لكلمات المرور القديمة
 */
export async function forcePasswordReset(email: string): Promise<{ success: boolean }> {
  try {
    // Send password reset email via Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    return { success: false };
  }
}

/**
 * 🔒 AUTHORIZATION HELPER - فحص الصلاحيات
 */
export function hasPermission(user: User | null, requiredRoles: UserRole[]): boolean {
  if (!user) return false;
  return requiredRoles.includes(user.role);
}

/**
 * 🔒 CHECK IF USER IS ADMIN/MANAGER
 */
export function isAdminOrManager(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'manager';
}

// Export all functions
export const SecureAuthService = {
  login: secureLogin,
  logout: secureLogout,
  changePassword,
  forcePasswordReset,
  hasPermission,
  isAdminOrManager,
};

export default SecureAuthService;
