/**
 * Password Service Unit Tests
 * STORY-025: Benutzerdaten (User Data Storage)
 *
 * Tests for password hashing, verification, and validation.
 */

import { PasswordService, DEFAULT_PASSWORD_REQUIREMENTS } from '../../src/users/password.service';

describe('PasswordService', () => {
  let passwordService: PasswordService;

  beforeEach(() => {
    // Reset environment variable for consistent testing
    process.env.BCRYPT_ROUNDS = '10'; // Use lower rounds for faster tests
    passwordService = new PasswordService();
  });

  afterEach(() => {
    // Restore default
    process.env.BCRYPT_ROUNDS = '12';
  });

  describe('constructor', () => {
    it('should use default bcrypt rounds when env var is not set', () => {
      delete process.env.BCRYPT_ROUNDS;
      const service = new PasswordService();
      expect(service.getBcryptRounds()).toBe(12);
    });

    it('should use configured bcrypt rounds from environment', () => {
      expect(passwordService.getBcryptRounds()).toBe(10);
    });

    it('should throw error for invalid bcrypt rounds (too low)', () => {
      process.env.BCRYPT_ROUNDS = '3';
      expect(() => new PasswordService()).toThrow('BCRYPT_ROUNDS must be between 4 and 31');
    });

    it('should throw error for invalid bcrypt rounds (too high)', () => {
      process.env.BCRYPT_ROUNDS = '32';
      expect(() => new PasswordService()).toThrow('BCRYPT_ROUNDS must be between 4 and 31');
    });
  });

  describe('hash', () => {
    it('should hash a password', async () => {
      const password = 'SecurePass123!';
      const hash = await passwordService.hash(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'SecurePass123!';
      const hash1 = await passwordService.hash(password);
      const hash2 = await passwordService.hash(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate bcrypt format hash', async () => {
      const password = 'TestPassword123';
      const hash = await passwordService.hash(password);

      // bcrypt hash format: $2b$XX$...
      expect(hash).toMatch(/^\$2[aby]?\$\d{2}\$/);
    });
  });

  describe('verify', () => {
    it('should verify correct password', async () => {
      const password = 'SecurePass123!';
      const hash = await passwordService.hash(password);

      const isValid = await passwordService.verify(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'SecurePass123!';
      const hash = await passwordService.hash(password);

      const isValid = await passwordService.verify('WrongPassword', hash);
      expect(isValid).toBe(false);
    });

    it('should reject similar but different passwords', async () => {
      const password = 'SecurePass123!';
      const hash = await passwordService.hash(password);

      const isValid = await passwordService.verify('SecurePass123', hash);
      expect(isValid).toBe(false);
    });

    it('should be case sensitive', async () => {
      const password = 'SecurePass123!';
      const hash = await passwordService.hash(password);

      const isValid = await passwordService.verify('securepass123!', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('validate', () => {
    it('should pass valid password', () => {
      const result = passwordService.validate('SecurePass123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail password that is too short', () => {
      const result = passwordService.validate('Short1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(`Password must be at least ${DEFAULT_PASSWORD_REQUIREMENTS.minLength} characters long`);
    });

    it('should fail password without uppercase', () => {
      const result = passwordService.validate('securepass123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should fail password without lowercase', () => {
      const result = passwordService.validate('SECUREPASS123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should fail password without numbers', () => {
      const result = passwordService.validate('SecurePassword');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should return multiple errors for weak password', () => {
      const result = passwordService.validate('abc');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('getRequirements', () => {
    it('should return password requirements', () => {
      const requirements = passwordService.getRequirements();

      expect(requirements.minLength).toBe(8);
      expect(requirements.requireUppercase).toBe(true);
      expect(requirements.requireLowercase).toBe(true);
      expect(requirements.requireNumbers).toBe(true);
    });

    it('should return a copy of requirements', () => {
      const requirements1 = passwordService.getRequirements();
      const requirements2 = passwordService.getRequirements();

      expect(requirements1).not.toBe(requirements2);
      expect(requirements1).toEqual(requirements2);
    });
  });

  describe('generateRandomPassword', () => {
    it('should generate password with default length', () => {
      const password = passwordService.generateRandomPassword();
      expect(password.length).toBe(16);
    });

    it('should generate password with specified length', () => {
      const password = passwordService.generateRandomPassword(20);
      expect(password.length).toBe(20);
    });

    it('should generate password that passes validation', () => {
      const password = passwordService.generateRandomPassword();
      const result = passwordService.validate(password);
      expect(result.valid).toBe(true);
    });

    it('should generate unique passwords', () => {
      const passwords = new Set<string>();
      for (let i = 0; i < 10; i++) {
        passwords.add(passwordService.generateRandomPassword());
      }
      expect(passwords.size).toBe(10);
    });

    it('should include uppercase, lowercase, numbers, and special chars', () => {
      const password = passwordService.generateRandomPassword();

      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[0-9]/.test(password)).toBe(true);
      expect(/[!@#$%^&*()]/.test(password)).toBe(true);
    });
  });

  describe('needsRehash', () => {
    it('should return false for hash with current rounds', async () => {
      const hash = await passwordService.hash('TestPassword123');
      expect(passwordService.needsRehash(hash)).toBe(false);
    });

    it('should return true for hash with different rounds', async () => {
      // Create hash with current rounds (10)
      const hash = await passwordService.hash('TestPassword123');

      // Change rounds
      process.env.BCRYPT_ROUNDS = '12';
      const newService = new PasswordService();

      expect(newService.needsRehash(hash)).toBe(true);
    });

    it('should return true for invalid hash format', () => {
      expect(passwordService.needsRehash('invalid-hash')).toBe(true);
      expect(passwordService.needsRehash('')).toBe(true);
    });
  });
});
