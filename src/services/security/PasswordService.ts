/**
 * 🔐 Password Security Service
 * Uses bcryptjs for secure password hashing
 * 
 * Features:
 * - bcrypt hashing (industry standard)
 * - Automatic salt generation
 * - Backward compatible with plain-text passwords (for migration)
 */

import bcrypt from 'bcryptjs';

// Configuration - OWASP recommended
const SALT_ROUNDS = 12;  // 2^12 iterations, ~300ms on modern hardware

/**
 * Hash a password using bcrypt
 * 
 * @example
 * const hashed = await hashPassword('myPassword123');
 * // Returns: "$2a$12$..."
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const hash = await bcrypt.hash(password, salt);
  return hash;
}

/**
 * Synchronous version for use in seed scripts
 */
export function hashPasswordSync(password: string): string {
  const salt = bcrypt.genSaltSync(SALT_ROUNDS);
  return bcrypt.hashSync(password, salt);
}

/**
 * Verify a password against a stored hash
 * Handles both bcrypt hashes and legacy plain-text passwords
 * 
 * @example
 * const isValid = await verifyPassword('myPassword123', storedHash);
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    // Handle legacy plain-text passwords (for migration)
    if (!storedHash.startsWith('$2a$') && !storedHash.startsWith('$2b$')) {
      console.warn('⚠️ Legacy plain-text password detected. Please migrate to hashed passwords.');
      return password === storedHash;
    }

    // Verify bcrypt hash
    return await bcrypt.compare(password, storedHash);
  } catch (error) {
    console.error('Password verification failed:', error);
    return false;
  }
}

/**
 * Synchronous version for specific use cases
 */
export function verifyPasswordSync(password: string, storedHash: string): boolean {
  try {
    if (!storedHash.startsWith('$2a$') && !storedHash.startsWith('$2b$')) {
      return password === storedHash;
    }
    return bcrypt.compareSync(password, storedHash);
  } catch (error) {
    console.error('Password verification failed:', error);
    return false;
  }
}

/**
 * Check if a stored password needs migration (is plain-text)
 */
export function needsMigration(storedPassword: string): boolean {
  return !storedPassword.startsWith('$2a$') && !storedPassword.startsWith('$2b$');
}

/**
 * Generate a secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    const randomByte = randomValues[i] ?? 0;
    password += charset[randomByte % charset.length];
  }
  
  return password;
}

/**
 * Migrate a plain-text password to hashed version
 */
export async function migratePassword(plainPassword: string): Promise<string> {
  if (!needsMigration(plainPassword)) {
    return plainPassword; // Already hashed
  }
  return await hashPassword(plainPassword);
}

// ============================================
// Export Service Object
// ============================================
export const PasswordService = {
  hash: hashPassword,
  hashSync: hashPasswordSync,
  verify: verifyPassword,
  verifySync: verifyPasswordSync,
  needsMigration,
  generateSecurePassword,
  migratePassword,
};

export default PasswordService;
