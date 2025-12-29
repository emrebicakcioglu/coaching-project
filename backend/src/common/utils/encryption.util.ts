/**
 * Encryption Utility
 * STORY-041D: Jira Settings API
 *
 * Provides AES-256-GCM encryption and decryption for sensitive data
 * such as API tokens and credentials.
 *
 * Usage:
 * - encrypt(plainText) -> Returns encrypted string in format "iv:authTag:encrypted"
 * - decrypt(encryptedText) -> Returns original plaintext
 * - isEncrypted(text) -> Checks if text is in encrypted format
 *
 * Security:
 * - Uses AES-256-GCM (authenticated encryption)
 * - Generates random IV for each encryption
 * - Includes authentication tag for integrity verification
 * - Requires ENCRYPTION_KEY environment variable (32 bytes hex)
 */

import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // AES block size
const AUTH_TAG_LENGTH = 16;
const ENCRYPTED_PREFIX = 'encrypted:';

/**
 * Get encryption key from environment
 * The key must be a 64-character hex string (32 bytes)
 *
 * @throws Error if ENCRYPTION_KEY is not set or invalid
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY environment variable is not set. Required for encrypting sensitive data.');
  }

  // Key should be 64 hex characters (32 bytes)
  if (keyHex.length !== 64 || !/^[0-9a-fA-F]+$/.test(keyHex)) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes for AES-256)');
  }

  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt plaintext using AES-256-GCM
 *
 * @param plainText - The text to encrypt
 * @returns Encrypted string in format "encrypted:iv:authTag:ciphertext" (all hex encoded)
 * @throws Error if encryption fails or key is not configured
 */
export function encrypt(plainText: string): string {
  if (!plainText) {
    return plainText;
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  // Format: encrypted:iv:authTag:ciphertext
  return `${ENCRYPTED_PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt ciphertext using AES-256-GCM
 *
 * @param encryptedText - The encrypted string in format "encrypted:iv:authTag:ciphertext"
 * @returns Decrypted plaintext
 * @throws Error if decryption fails, format is invalid, or authentication fails
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) {
    return encryptedText;
  }

  // Handle non-encrypted text (for migration purposes)
  if (!encryptedText.startsWith(ENCRYPTED_PREFIX)) {
    return encryptedText;
  }

  const key = getEncryptionKey();

  // Remove prefix and split
  const data = encryptedText.slice(ENCRYPTED_PREFIX.length);
  const parts = data.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format. Expected format: encrypted:iv:authTag:ciphertext');
  }

  const [ivHex, authTagHex, ciphertext] = parts;

  // Validate hex strings
  if (ivHex.length !== IV_LENGTH * 2 || !/^[0-9a-fA-F]+$/.test(ivHex)) {
    throw new Error('Invalid IV in encrypted data');
  }

  if (authTagHex.length !== AUTH_TAG_LENGTH * 2 || !/^[0-9a-fA-F]+$/.test(authTagHex)) {
    throw new Error('Invalid authentication tag in encrypted data');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Check if a string is in encrypted format
 *
 * @param text - The text to check
 * @returns true if the text starts with the encrypted prefix
 */
export function isEncrypted(text: string | null | undefined): boolean {
  if (!text) {
    return false;
  }
  return text.startsWith(ENCRYPTED_PREFIX);
}

/**
 * Mask sensitive data for display
 * Used for GET responses to hide actual token values
 *
 * @param text - The text to mask
 * @param visibleChars - Number of characters to show at start (default: 0)
 * @returns Masked string (e.g., "********")
 */
export function maskSensitiveData(text: string | null | undefined, visibleChars = 0): string {
  if (!text) {
    return '';
  }

  if (visibleChars > 0 && text.length > visibleChars) {
    return text.substring(0, visibleChars) + '********';
  }

  return '********';
}

/**
 * Generate a secure encryption key (for documentation/setup purposes)
 * This should be run once during initial setup and stored securely
 *
 * @returns A 64-character hex string suitable for ENCRYPTION_KEY
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
