/**
 * Encryption Utility Tests
 * STORY-041D: Jira Settings API
 *
 * Unit tests for encryption utility including:
 * - AES-256-GCM encryption
 * - Decryption
 * - isEncrypted check
 * - maskSensitiveData
 * - Error handling
 */

import * as crypto from 'crypto';

// Store original env
const originalEnv = process.env.ENCRYPTION_KEY;

// Generate a valid test key (32 bytes = 64 hex chars)
const TEST_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

describe('Encryption Utility', () => {
  // We need to reset the module for each test to pick up new env values
  let encryptionUtil: typeof import('../../src/common/utils/encryption.util');

  beforeEach(() => {
    // Clear module cache to reload with new env
    jest.resetModules();
    process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
    // Re-import the module
    encryptionUtil = require('../../src/common/utils/encryption.util');
  });

  afterAll(() => {
    // Restore original env
    if (originalEnv) {
      process.env.ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
  });

  describe('encrypt', () => {
    it('should encrypt plaintext and return prefixed encrypted string', () => {
      const plainText = 'my-secret-api-token';

      const encrypted = encryptionUtil.encrypt(plainText);

      expect(encrypted).toMatch(/^encrypted:/);
      expect(encrypted).not.toContain(plainText);
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const plainText = 'my-secret-api-token';

      const encrypted1 = encryptionUtil.encrypt(plainText);
      const encrypted2 = encryptionUtil.encrypt(plainText);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should return empty string for empty input', () => {
      expect(encryptionUtil.encrypt('')).toBe('');
    });

    it('should return empty string for null-like input', () => {
      expect(encryptionUtil.encrypt(null as any)).toBeFalsy();
      expect(encryptionUtil.encrypt(undefined as any)).toBeFalsy();
    });

    it('should handle unicode characters', () => {
      const plainText = 'Token with unicode: \u4e2d\u6587 \u{1F600}';

      const encrypted = encryptionUtil.encrypt(plainText);
      const decrypted = encryptionUtil.decrypt(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it('should handle very long strings', () => {
      const plainText = 'a'.repeat(10000);

      const encrypted = encryptionUtil.encrypt(plainText);
      const decrypted = encryptionUtil.decrypt(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it('should throw error when ENCRYPTION_KEY is not set', () => {
      delete process.env.ENCRYPTION_KEY;
      jest.resetModules();
      const utilWithoutKey = require('../../src/common/utils/encryption.util');

      expect(() => utilWithoutKey.encrypt('test')).toThrow(
        'ENCRYPTION_KEY environment variable is not set',
      );
    });

    it('should throw error when ENCRYPTION_KEY is invalid length', () => {
      process.env.ENCRYPTION_KEY = 'too-short';
      jest.resetModules();
      const utilWithBadKey = require('../../src/common/utils/encryption.util');

      expect(() => utilWithBadKey.encrypt('test')).toThrow(
        'ENCRYPTION_KEY must be a 64-character hex string',
      );
    });

    it('should throw error when ENCRYPTION_KEY contains non-hex characters', () => {
      process.env.ENCRYPTION_KEY = 'g'.repeat(64); // 'g' is not valid hex
      jest.resetModules();
      const utilWithBadKey = require('../../src/common/utils/encryption.util');

      expect(() => utilWithBadKey.encrypt('test')).toThrow(
        'ENCRYPTION_KEY must be a 64-character hex string',
      );
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted text back to original', () => {
      const plainText = 'my-secret-api-token';
      const encrypted = encryptionUtil.encrypt(plainText);

      const decrypted = encryptionUtil.decrypt(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it('should return empty string for empty input', () => {
      expect(encryptionUtil.decrypt('')).toBe('');
    });

    it('should return non-encrypted text as-is (migration support)', () => {
      const plainText = 'plain-text-not-encrypted';

      const result = encryptionUtil.decrypt(plainText);

      expect(result).toBe(plainText);
    });

    it('should throw error for invalid encrypted format', () => {
      expect(() => encryptionUtil.decrypt('encrypted:invalid')).toThrow(
        'Invalid encrypted data format',
      );
    });

    it('should throw error for invalid IV', () => {
      expect(() =>
        encryptionUtil.decrypt('encrypted:invalid:tag:data'),
      ).toThrow('Invalid IV in encrypted data');
    });

    it('should throw error for tampered ciphertext', () => {
      const encrypted = encryptionUtil.encrypt('test');
      const parts = encrypted.split(':');
      // Tamper with the ciphertext
      parts[3] = 'tampered';
      const tampered = parts.join(':');

      expect(() => encryptionUtil.decrypt(tampered)).toThrow();
    });

    it('should throw error for tampered auth tag', () => {
      const encrypted = encryptionUtil.encrypt('test');
      const parts = encrypted.split(':');
      // Tamper with the auth tag
      parts[2] = '00'.repeat(16);
      const tampered = parts.join(':');

      expect(() => encryptionUtil.decrypt(tampered)).toThrow();
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted strings', () => {
      const encrypted = encryptionUtil.encrypt('test');

      expect(encryptionUtil.isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plain strings', () => {
      expect(encryptionUtil.isEncrypted('plain-text')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(encryptionUtil.isEncrypted('')).toBe(false);
    });

    it('should return false for null', () => {
      expect(encryptionUtil.isEncrypted(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(encryptionUtil.isEncrypted(undefined)).toBe(false);
    });
  });

  describe('maskSensitiveData', () => {
    it('should mask entire string by default', () => {
      expect(encryptionUtil.maskSensitiveData('my-secret-token')).toBe('********');
    });

    it('should show first N characters when specified', () => {
      expect(encryptionUtil.maskSensitiveData('my-secret-token', 3)).toBe('my-********');
    });

    it('should return empty string for null', () => {
      expect(encryptionUtil.maskSensitiveData(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(encryptionUtil.maskSensitiveData(undefined)).toBe('');
    });

    it('should return empty string for empty input', () => {
      expect(encryptionUtil.maskSensitiveData('')).toBe('');
    });

    it('should mask entire string when visibleChars >= length', () => {
      expect(encryptionUtil.maskSensitiveData('abc', 5)).toBe('********');
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a 64-character hex key', () => {
      const key = encryptionUtil.generateEncryptionKey();

      expect(key).toHaveLength(64);
      expect(/^[0-9a-f]+$/i.test(key)).toBe(true);
    });

    it('should generate unique keys', () => {
      const key1 = encryptionUtil.generateEncryptionKey();
      const key2 = encryptionUtil.generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });
  });

  describe('roundtrip encryption/decryption', () => {
    it('should handle special characters', () => {
      const testCases = [
        'simple',
        'with spaces',
        'with\nnewlines\r\n',
        'with\ttabs',
        '"quoted"',
        "with'apostrophe",
        '<html>tags</html>',
        '{"json": "data"}',
        'emoji: \u{1F600}\u{1F601}',
        'symbols: !@#$%^&*()_+-=[]{}|;:,.<>?',
      ];

      for (const text of testCases) {
        const encrypted = encryptionUtil.encrypt(text);
        const decrypted = encryptionUtil.decrypt(encrypted);
        expect(decrypted).toBe(text);
      }
    });
  });
});
