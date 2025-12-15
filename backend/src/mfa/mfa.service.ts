/**
 * MFA Service
 * STORY-005A: MFA Setup (Backend)
 * STORY-005B: MFA Login-Flow (Backend)
 *
 * Business logic for Multi-Factor Authentication setup, verification, and login flow.
 * Handles TOTP secret generation, QR code URL creation, backup code management,
 * code verification, and MFA login verification.
 *
 * Features:
 * - Generate 32-character Base32 TOTP secrets
 * - Generate otpauth:// URLs for authenticator apps
 * - Generate and hash backup codes
 * - Verify TOTP codes with ±1 window drift tolerance
 * - Generate temporary tokens for MFA login flow (5-minute expiry)
 * - Verify backup codes during login
 * - Rate limiting for MFA attempts (max 5, then lock)
 */

import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { DatabaseService } from '../database/database.service';
import { WinstonLoggerService } from '../common/services/logger.service';
import { AuditService } from '../common/services/audit.service';
import { MFASetupResponseDto } from './dto/mfa-setup.dto';
import { MFAVerifyResponseDto } from './dto/mfa-verify.dto';
import { UserBackupCode } from '../database/types';
import { Request } from 'express';

/**
 * Extended Request interface with user info
 */
interface AuthRequest extends Request {
  user?: { id?: number; email?: string };
  requestId?: string;
}

/**
 * MFA Temporary Token Payload
 * STORY-005B: MFA Login-Flow
 */
interface MFATempTokenPayload {
  sub: number; // user ID
  email: string;
  type: 'mfa_temp';
  iat: number;
  exp: number;
}

/**
 * MFA Attempt tracking for rate limiting
 * STORY-005B: MFA Login-Flow
 */
interface MFAAttemptRecord {
  user_id: number;
  attempts: number;
  last_attempt: Date;
  locked_until: Date | null;
}

/**
 * MFA Service
 * Handles all MFA-related business logic
 */
@Injectable()
export class MFAService {
  private readonly mfaIssuer: string;
  private readonly bcryptRounds: number;
  private readonly backupCodeCount: number = 10;
  private readonly backupCodeLength: number = 8;

  // STORY-005B: MFA Login-Flow configuration
  private readonly mfaTempTokenSecret: string;
  private readonly mfaTempTokenExpiry: number; // in seconds (default: 300 = 5 minutes)
  private readonly mfaMaxAttempts: number = 5;
  private readonly mfaLockoutDuration: number; // in seconds (default: 900 = 15 minutes)

  // In-memory cache for MFA attempts (in production, use Redis)
  private mfaAttempts: Map<number, MFAAttemptRecord> = new Map();

  constructor(
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
  ) {
    // Configuration from environment variables
    this.mfaIssuer = process.env.MFA_ISSUER || 'CoreApp';
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

    // STORY-005B: MFA Login-Flow configuration
    // MFA_TEMP_TOKEN_SECRET should be different from JWT_SECRET for security
    this.mfaTempTokenSecret = process.env.MFA_TEMP_TOKEN_SECRET || process.env.JWT_SECRET || '';
    this.mfaTempTokenExpiry = parseInt(process.env.MFA_TEMP_TOKEN_EXPIRY || '300', 10);
    this.mfaLockoutDuration = parseInt(process.env.MFA_LOCKOUT_DURATION || '900', 10);

    // Configure otplib for ±1 window drift tolerance (±30 seconds)
    authenticator.options = {
      window: 1,
    };
  }

  /**
   * Initiate MFA setup for a user
   * Generates TOTP secret, QR code URL, and backup codes
   *
   * @param userId - User ID
   * @param email - User email (for QR code label)
   * @param request - Express request for audit logging
   * @returns MFA setup response with secret, QR URL, and backup codes
   */
  async setupMFA(
    userId: number,
    email: string,
    request: AuthRequest,
  ): Promise<MFASetupResponseDto> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    // Check if MFA is already enabled
    const userResult = await pool.query(
      'SELECT mfa_enabled, mfa_secret FROM users WHERE id = $1',
      [userId],
    );

    if (userResult.rows.length === 0) {
      throw new BadRequestException('User not found');
    }

    const user = userResult.rows[0];

    // If MFA is already fully enabled, don't allow re-setup
    if (user.mfa_enabled === true) {
      throw new ConflictException('MFA is already enabled. Disable it first to set up again.');
    }

    // Generate TOTP secret (32 characters Base32)
    const secret = this.generateSecret();

    // Generate QR code URL
    const qrCodeUrl = this.generateQRCodeUrl(email, secret);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Hash backup codes
    const hashedCodes = await this.hashBackupCodes(backupCodes);

    // Start transaction to save secret and backup codes
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Store the secret temporarily (MFA not enabled yet until verification)
      await client.query(
        'UPDATE users SET mfa_secret = $1, updated_at = NOW() WHERE id = $2',
        [secret, userId],
      );

      // Delete any existing backup codes for this user
      await client.query(
        'DELETE FROM user_backup_codes WHERE user_id = $1',
        [userId],
      );

      // Insert new backup codes
      for (const codeHash of hashedCodes) {
        await client.query(
          'INSERT INTO user_backup_codes (user_id, code_hash) VALUES ($1, $2)',
          [userId, codeHash],
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    // Audit log
    await this.auditService.log({
      action: 'MFA_SETUP_INITIATED',
      userId,
      resource: 'mfa',
      details: { backupCodesGenerated: backupCodes.length },
      request,
    });

    this.logger.log(`MFA setup initiated for user ${userId}`, 'MFAService');

    return new MFASetupResponseDto({
      secret,
      qrCodeUrl,
      backupCodes,
    });
  }

  /**
   * Verify TOTP code and enable MFA
   * Called after user has scanned QR code and entered verification code
   *
   * @param userId - User ID
   * @param code - 6-digit TOTP code from authenticator app
   * @param request - Express request for audit logging
   * @returns MFA verify response
   */
  async verifySetup(
    userId: number,
    code: string,
    request: AuthRequest,
  ): Promise<MFAVerifyResponseDto> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    // Get user's MFA secret
    const userResult = await pool.query(
      'SELECT mfa_enabled, mfa_secret FROM users WHERE id = $1',
      [userId],
    );

    if (userResult.rows.length === 0) {
      throw new BadRequestException('User not found');
    }

    const user = userResult.rows[0];

    if (user.mfa_enabled === true) {
      throw new ConflictException('MFA is already enabled');
    }

    if (!user.mfa_secret) {
      throw new BadRequestException('MFA setup has not been initiated. Please call /api/auth/mfa/setup first.');
    }

    // Verify the TOTP code
    const isValid = this.verifyToken(user.mfa_secret, code);

    if (!isValid) {
      // Audit log failed attempt
      await this.auditService.log({
        action: 'MFA_VERIFY_FAILED',
        userId,
        resource: 'mfa',
        details: { reason: 'Invalid code' },
        request,
        level: 'warn',
      });

      this.logger.warn(`MFA verification failed for user ${userId}`, 'MFAService');
      throw new BadRequestException('Invalid verification code');
    }

    // Enable MFA
    await pool.query(
      'UPDATE users SET mfa_enabled = TRUE, updated_at = NOW() WHERE id = $1',
      [userId],
    );

    // Audit log
    await this.auditService.log({
      action: 'MFA_ENABLED',
      userId,
      resource: 'mfa',
      details: { method: 'TOTP' },
      request,
    });

    this.logger.log(`MFA enabled for user ${userId}`, 'MFAService');

    return new MFAVerifyResponseDto({
      message: 'MFA enabled successfully',
      enabled: true,
    });
  }

  /**
   * Verify a TOTP code against a secret
   * Used during login when MFA is enabled
   *
   * @param secret - User's TOTP secret
   * @param token - 6-digit TOTP code
   * @returns Whether the code is valid
   */
  verifyToken(secret: string, token: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch {
      return false;
    }
  }

  /**
   * Verify a backup code for a user
   * Marks the code as used if valid
   *
   * @param userId - User ID
   * @param code - Backup code to verify
   * @returns Whether the code is valid
   */
  async verifyBackupCode(userId: number, code: string): Promise<boolean> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    // Get all unused backup codes for the user
    const result = await pool.query<UserBackupCode>(
      'SELECT id, code_hash FROM user_backup_codes WHERE user_id = $1 AND used = FALSE',
      [userId],
    );

    // Check each code hash
    for (const row of result.rows) {
      const isMatch = await bcrypt.compare(code.toUpperCase(), row.code_hash);
      if (isMatch) {
        // Mark code as used
        await pool.query(
          'UPDATE user_backup_codes SET used = TRUE, used_at = NOW() WHERE id = $1',
          [row.id],
        );

        this.logger.log(`Backup code used for user ${userId}`, 'MFAService');
        return true;
      }
    }

    return false;
  }

  /**
   * Get count of remaining backup codes for a user
   *
   * @param userId - User ID
   * @returns Number of unused backup codes
   */
  async getRemainingBackupCodesCount(userId: number): Promise<number> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const result = await pool.query(
      'SELECT COUNT(*) as count FROM user_backup_codes WHERE user_id = $1 AND used = FALSE',
      [userId],
    );

    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Check if MFA is enabled for a user
   *
   * @param userId - User ID
   * @returns Whether MFA is enabled
   */
  async isMFAEnabled(userId: number): Promise<boolean> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const result = await pool.query(
      'SELECT mfa_enabled FROM users WHERE id = $1',
      [userId],
    );

    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].mfa_enabled === true;
  }

  /**
   * Get user's MFA secret (for verification during login)
   *
   * @param userId - User ID
   * @returns MFA secret or null if not set
   */
  async getMFASecret(userId: number): Promise<string | null> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const result = await pool.query(
      'SELECT mfa_secret FROM users WHERE id = $1',
      [userId],
    );

    if (result.rows.length === 0 || !result.rows[0].mfa_secret) {
      return null;
    }

    return result.rows[0].mfa_secret;
  }

  // ===========================================
  // Private Helper Methods
  // ===========================================

  /**
   * Generate a 32-character Base32 TOTP secret
   */
  private generateSecret(): string {
    // otplib generates a properly formatted Base32 secret
    return authenticator.generateSecret(32);
  }

  /**
   * Generate otpauth:// URL for QR code
   *
   * @param email - User email (used as account label)
   * @param secret - TOTP secret
   * @returns otpauth:// URL
   */
  private generateQRCodeUrl(email: string, secret: string): string {
    return authenticator.keyuri(email, this.mfaIssuer, secret);
  }

  /**
   * Generate backup codes
   * Creates 10 unique 8-character alphanumeric codes
   *
   * @returns Array of backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes confusing chars: 0, O, I, 1

    for (let i = 0; i < this.backupCodeCount; i++) {
      let code = '';
      const bytes = crypto.randomBytes(this.backupCodeLength);

      for (let j = 0; j < this.backupCodeLength; j++) {
        code += charset[bytes[j] % charset.length];
      }

      // Ensure uniqueness
      if (!codes.includes(code)) {
        codes.push(code);
      } else {
        // Regenerate if duplicate (rare)
        i--;
      }
    }

    return codes;
  }

  /**
   * Hash backup codes using bcrypt
   *
   * @param codes - Array of plain text backup codes
   * @returns Array of hashed codes
   */
  private async hashBackupCodes(codes: string[]): Promise<string[]> {
    const hashedCodes: string[] = [];

    for (const code of codes) {
      const hash = await bcrypt.hash(code, this.bcryptRounds);
      hashedCodes.push(hash);
    }

    return hashedCodes;
  }

  // ===========================================
  // STORY-005B: MFA Login-Flow Methods
  // ===========================================

  /**
   * Generate a temporary token for MFA verification
   * Token is valid for 5 minutes (configurable via MFA_TEMP_TOKEN_EXPIRY)
   *
   * @param userId - User ID
   * @param email - User email
   * @returns Temporary token string
   */
  generateTempToken(userId: number, email: string): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const payload: MFATempTokenPayload = {
      sub: userId,
      email,
      type: 'mfa_temp',
      iat: now,
      exp: now + this.mfaTempTokenExpiry,
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));

    const signature = crypto
      .createHmac('sha256', this.mfaTempTokenSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `mfa_${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Validate a temporary MFA token and return the payload
   *
   * @param tempToken - Temporary token to validate
   * @returns Token payload with user ID and email
   * @throws UnauthorizedException if token is invalid or expired
   */
  validateTempToken(tempToken: string): { userId: number; email: string } {
    try {
      // Remove 'mfa_' prefix if present
      const token = tempToken.startsWith('mfa_') ? tempToken.slice(4) : tempToken;
      const parts = token.split('.');

      if (parts.length !== 3) {
        throw new UnauthorizedException('Invalid temporary token format');
      }

      const [encodedHeader, encodedPayload, signature] = parts;

      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', this.mfaTempTokenSecret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');

      if (signature !== expectedSignature) {
        throw new UnauthorizedException('Invalid temporary token signature');
      }

      // Decode payload
      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString(),
      ) as MFATempTokenPayload;

      // Check type
      if (payload.type !== 'mfa_temp') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        throw new UnauthorizedException('Temporary token has expired');
      }

      return {
        userId: payload.sub,
        email: payload.email,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn('MFA temp token validation failed', 'MFAService');
      throw new UnauthorizedException('Invalid or expired temporary token');
    }
  }

  /**
   * Check if user is locked out due to too many MFA attempts
   *
   * @param userId - User ID
   * @returns Whether the user is locked out
   */
  isLockedOut(userId: number): boolean {
    const record = this.mfaAttempts.get(userId);
    if (!record || !record.locked_until) {
      return false;
    }

    const now = new Date();
    if (record.locked_until > now) {
      return true;
    }

    // Lockout expired, reset
    this.mfaAttempts.delete(userId);
    return false;
  }

  /**
   * Get remaining MFA attempts for a user
   *
   * @param userId - User ID
   * @returns Remaining attempts (0 if locked out)
   */
  getRemainingAttempts(userId: number): number {
    if (this.isLockedOut(userId)) {
      return 0;
    }

    const record = this.mfaAttempts.get(userId);
    if (!record) {
      return this.mfaMaxAttempts;
    }

    return Math.max(0, this.mfaMaxAttempts - record.attempts);
  }

  /**
   * Record a failed MFA attempt
   * Locks the user out after max attempts exceeded
   *
   * @param userId - User ID
   * @param request - Request for audit logging
   * @returns Updated remaining attempts
   */
  async recordFailedAttempt(userId: number, request: AuthRequest): Promise<number> {
    let record = this.mfaAttempts.get(userId);

    if (!record) {
      record = {
        user_id: userId,
        attempts: 0,
        last_attempt: new Date(),
        locked_until: null,
      };
    }

    record.attempts += 1;
    record.last_attempt = new Date();

    if (record.attempts >= this.mfaMaxAttempts) {
      // Lock the user out
      record.locked_until = new Date(Date.now() + this.mfaLockoutDuration * 1000);

      this.logger.warn(
        `User ${userId} locked out due to ${record.attempts} failed MFA attempts`,
        'MFAService',
      );

      await this.auditService.log({
        action: 'MFA_LOCKOUT',
        userId,
        resource: 'mfa',
        details: {
          attempts: record.attempts,
          lockedUntil: record.locked_until.toISOString(),
        },
        request,
        level: 'warn',
      });
    }

    this.mfaAttempts.set(userId, record);

    return Math.max(0, this.mfaMaxAttempts - record.attempts);
  }

  /**
   * Clear MFA attempts for a user (after successful login)
   *
   * @param userId - User ID
   */
  clearAttempts(userId: number): void {
    this.mfaAttempts.delete(userId);
  }

  /**
   * Verify TOTP code during MFA login flow
   *
   * @param tempToken - Temporary token from login
   * @param code - 6-digit TOTP code
   * @param request - Request for audit logging
   * @returns User ID and email if successful
   * @throws UnauthorizedException if code is invalid
   * @throws ForbiddenException if user is locked out
   */
  async verifyMFALogin(
    tempToken: string,
    code: string,
    request: AuthRequest,
  ): Promise<{ userId: number; email: string }> {
    // Validate temp token and get user info
    const { userId, email } = this.validateTempToken(tempToken);

    // Check lockout status
    if (this.isLockedOut(userId)) {
      throw new ForbiddenException(
        'Account temporarily locked due to too many failed MFA attempts',
      );
    }

    // Get user's MFA secret
    const secret = await this.getMFASecret(userId);
    if (!secret) {
      throw new BadRequestException('MFA is not configured for this user');
    }

    // Verify the TOTP code
    const isValid = this.verifyToken(secret, code);

    if (!isValid) {
      const remaining = await this.recordFailedAttempt(userId, request);

      await this.auditService.log({
        action: 'MFA_LOGIN_FAILED',
        userId,
        resource: 'mfa',
        details: { reason: 'Invalid TOTP code', remainingAttempts: remaining },
        request,
        level: 'warn',
      });

      if (remaining === 0) {
        throw new ForbiddenException(
          'Account temporarily locked due to too many failed MFA attempts',
        );
      }

      throw new UnauthorizedException(`Invalid MFA code. ${remaining} attempts remaining.`);
    }

    // Clear attempts on success
    this.clearAttempts(userId);

    await this.auditService.log({
      action: 'MFA_LOGIN_SUCCESS',
      userId,
      resource: 'mfa',
      details: { method: 'TOTP' },
      request,
    });

    this.logger.log(`MFA login successful for user ${userId}`, 'MFAService');

    return { userId, email };
  }

  /**
   * Verify backup code during MFA login flow
   *
   * @param tempToken - Temporary token from login
   * @param backupCode - 8-character backup code
   * @param request - Request for audit logging
   * @returns User ID, email, and remaining backup codes count
   * @throws UnauthorizedException if code is invalid
   * @throws ForbiddenException if user is locked out
   */
  async verifyBackupCodeLogin(
    tempToken: string,
    backupCode: string,
    request: AuthRequest,
  ): Promise<{ userId: number; email: string; remainingBackupCodes: number }> {
    // Validate temp token and get user info
    const { userId, email } = this.validateTempToken(tempToken);

    // Check lockout status
    if (this.isLockedOut(userId)) {
      throw new ForbiddenException(
        'Account temporarily locked due to too many failed MFA attempts',
      );
    }

    // Verify the backup code (this also marks it as used if valid)
    const isValid = await this.verifyBackupCode(userId, backupCode);

    if (!isValid) {
      const remaining = await this.recordFailedAttempt(userId, request);

      await this.auditService.log({
        action: 'MFA_LOGIN_FAILED',
        userId,
        resource: 'mfa',
        details: { reason: 'Invalid backup code', remainingAttempts: remaining },
        request,
        level: 'warn',
      });

      if (remaining === 0) {
        throw new ForbiddenException(
          'Account temporarily locked due to too many failed MFA attempts',
        );
      }

      throw new UnauthorizedException(`Invalid backup code. ${remaining} attempts remaining.`);
    }

    // Clear attempts on success
    this.clearAttempts(userId);

    // Get remaining backup codes count
    const remainingBackupCodes = await this.getRemainingBackupCodesCount(userId);

    await this.auditService.log({
      action: 'MFA_LOGIN_SUCCESS',
      userId,
      resource: 'mfa',
      details: {
        method: 'BACKUP_CODE',
        remainingBackupCodes,
      },
      request,
    });

    this.logger.log(
      `MFA login successful for user ${userId} using backup code (${remainingBackupCodes} remaining)`,
      'MFAService',
    );

    return { userId, email, remainingBackupCodes };
  }

  // ===========================================
  // Private Helper Methods for MFA Login Flow
  // ===========================================

  /**
   * Base64 URL encode (for token generation)
   */
  private base64UrlEncode(str: string): string {
    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}
