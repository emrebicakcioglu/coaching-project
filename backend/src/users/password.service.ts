/**
 * Password Service
 * STORY-025: Benutzerdaten (User Data Storage)
 *
 * Centralized service for password hashing and verification using bcrypt.
 * Implements secure password handling with configurable cost factor.
 *
 * Security:
 * - Uses bcrypt with configurable cost factor (default: 12)
 * - No plain-text password storage
 * - Constant-time comparison for password verification
 */

import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/**
 * Password strength requirements
 */
export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Default password requirements
 */
export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
};

/**
 * Password Service
 * Handles all password-related operations including hashing and verification
 */
@Injectable()
export class PasswordService {
  /**
   * bcrypt cost factor (rounds)
   * Higher values increase security but also CPU time
   * Configured via BCRYPT_ROUNDS environment variable
   */
  private readonly bcryptRounds: number;

  /**
   * Password requirements
   */
  private readonly requirements: PasswordRequirements;

  constructor() {
    // Get bcrypt rounds from environment variable (default: 12)
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

    // Validate bcrypt rounds (must be between 4 and 31)
    if (this.bcryptRounds < 4 || this.bcryptRounds > 31) {
      throw new Error('BCRYPT_ROUNDS must be between 4 and 31');
    }

    this.requirements = DEFAULT_PASSWORD_REQUIREMENTS;
  }

  /**
   * Get the current bcrypt cost factor
   * @returns Current bcrypt rounds setting
   */
  getBcryptRounds(): number {
    return this.bcryptRounds;
  }

  /**
   * Get password requirements
   * @returns Password requirements configuration
   */
  getRequirements(): PasswordRequirements {
    return { ...this.requirements };
  }

  /**
   * Hash a plain-text password
   * Uses bcrypt with the configured cost factor
   *
   * @param password - Plain-text password to hash
   * @returns Promise resolving to the hashed password
   */
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.bcryptRounds);
  }

  /**
   * Verify a password against a hash
   * Uses bcrypt's constant-time comparison
   *
   * @param password - Plain-text password to verify
   * @param hash - Stored password hash
   * @returns Promise resolving to true if password matches
   */
  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate password against requirements
   *
   * @param password - Password to validate
   * @returns Validation result with any errors
   */
  validate(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (password.length < this.requirements.minLength) {
      errors.push(`Password must be at least ${this.requirements.minLength} characters long`);
    }

    if (this.requirements.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (this.requirements.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (this.requirements.requireNumbers && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (this.requirements.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate a random password
   * Useful for admin password resets
   *
   * @param length - Password length (default: 16)
   * @returns Random password meeting requirements
   */
  generateRandomPassword(length = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()';
    const allChars = uppercase + lowercase + numbers + special;

    // Ensure at least one of each required type
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest with random characters
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * Check if a hash needs to be rehashed
   * This is useful when updating bcrypt rounds
   *
   * @param hash - Existing password hash
   * @returns True if hash should be updated
   */
  needsRehash(hash: string): boolean {
    // Extract the rounds from the hash (format: $2b$XX$...)
    const match = hash.match(/^\$2[aby]?\$(\d{2})\$/);
    if (!match) {
      return true; // Invalid hash format, needs rehash
    }

    const hashRounds = parseInt(match[1], 10);
    return hashRounds !== this.bcryptRounds;
  }
}
