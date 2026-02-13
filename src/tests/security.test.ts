import { describe, it, expect } from 'vitest';
import { 
  hashPassword, 
  verifyPassword, 
  needsMigration, 
  generateSecurePassword,
  hashPasswordSync,
  verifyPasswordSync
} from '../services/security/PasswordService';

describe('PasswordService (bcrypt)', () => {
  
  describe('hashPassword()', () => {
    it('should hash a password with bcrypt format', async () => {
      const password = 'MySecurePassword123!';
      const hash = await hashPassword(password);
      
      // bcrypt format: $2a$ or $2b$ followed by cost factor
      expect(hash).toMatch(/^\$2[ab]\$\d{2}\$.{53}$/);
      expect(hash.startsWith('$2')).toBe(true);
    });

    it('should generate different hashes for same password (unique salt)', async () => {
      const password = 'SamePassword';
      
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      // Same password should produce different hashes due to random salt
      expect(hash1).not.toBe(hash2);
    });

    it('should handle Arabic characters', async () => {
      const password = 'كلمة_سر_عربية_123';
      const hash = await hashPassword(password);
      
      expect(hash.startsWith('$2')).toBe(true);
    });

    it('should handle special characters', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hash = await hashPassword(password);
      
      expect(hash.startsWith('$2')).toBe(true);
    });
  });

  describe('hashPasswordSync()', () => {
    it('should hash synchronously', () => {
      const password = 'TestPassword';
      const hash = hashPasswordSync(password);
      
      expect(hash.startsWith('$2')).toBe(true);
    });
  });

  describe('verifyPassword()', () => {
    it('should verify correct password', async () => {
      const password = 'CorrectPassword123';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'CorrectPassword123';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword('WrongPassword', hash);
      
      expect(isValid).toBe(false);
    });

    it('should handle case-sensitive passwords', async () => {
      const password = 'CaseSensitive';
      const hash = await hashPassword(password);
      
      expect(await verifyPassword('casesensitive', hash)).toBe(false);
      expect(await verifyPassword('CASESENSITIVE', hash)).toBe(false);
      expect(await verifyPassword('CaseSensitive', hash)).toBe(true);
    });

    it('should handle legacy plain-text passwords (backward compatible)', async () => {
      const plainPassword = '1234';
      
      // Legacy format (plain text) - should still work for migration
      const isValid = await verifyPassword('1234', plainPassword);
      
      expect(isValid).toBe(true);
    });

    it('should reject wrong legacy plain-text password', async () => {
      const plainPassword = '1234';
      
      const isValid = await verifyPassword('wrong', plainPassword);
      
      expect(isValid).toBe(false);
    });
  });

  describe('verifyPasswordSync()', () => {
    it('should verify synchronously', () => {
      const password = 'TestPassword';
      const hash = hashPasswordSync(password);
      
      expect(verifyPasswordSync(password, hash)).toBe(true);
      expect(verifyPasswordSync('wrong', hash)).toBe(false);
    });
  });

  describe('needsMigration()', () => {
    it('should return true for plain-text password', () => {
      expect(needsMigration('1234')).toBe(true);
      expect(needsMigration('plaintext')).toBe(true);
      expect(needsMigration('')).toBe(true);
    });

    it('should return false for bcrypt hashed password', async () => {
      const hash = await hashPassword('test');
      
      expect(needsMigration(hash)).toBe(false);
    });

    it('should detect $2a$ format', () => {
      expect(needsMigration('$2a$12$somehashvalue')).toBe(false);
    });

    it('should detect $2b$ format', () => {
      expect(needsMigration('$2b$12$somehashvalue')).toBe(false);
    });
  });

  describe('generateSecurePassword()', () => {
    it('should generate password of specified length', () => {
      const password = generateSecurePassword(16);
      expect(password.length).toBe(16);
      
      const longPassword = generateSecurePassword(32);
      expect(longPassword.length).toBe(32);
    });

    it('should generate unique passwords each time', () => {
      const passwords = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        passwords.add(generateSecurePassword(16));
      }
      
      // All 100 passwords should be unique
      expect(passwords.size).toBe(100);
    });

    it('should use default length of 16', () => {
      const password = generateSecurePassword();
      expect(password.length).toBe(16);
    });
  });

  describe('Integration: Full Password Lifecycle', () => {
    it('should complete full password workflow', async () => {
      // 1. User creates password
      const originalPassword = 'UserPassword123!';
      
      // 2. Hash for storage
      const storedHash = await hashPassword(originalPassword);
      
      // 3. Check if needs migration (should not)
      expect(needsMigration(storedHash)).toBe(false);
      
      // 4. User logs in with correct password
      expect(await verifyPassword(originalPassword, storedHash)).toBe(true);
      
      // 5. User tries wrong password
      expect(await verifyPassword('WrongPassword', storedHash)).toBe(false);
    });

    it('should handle password migration scenario', async () => {
      // 1. Legacy plain-text password
      const legacyPassword = '1234';
      
      // 2. Check if needs migration
      expect(needsMigration(legacyPassword)).toBe(true);
      
      // 3. Still works for verification (backward compatible)
      expect(await verifyPassword('1234', legacyPassword)).toBe(true);
      
      // 4. Migrate to hashed version
      const newHash = await hashPassword(legacyPassword);
      
      // 5. New hash works
      expect(await verifyPassword('1234', newHash)).toBe(true);
      expect(needsMigration(newHash)).toBe(false);
    });
  });
});
