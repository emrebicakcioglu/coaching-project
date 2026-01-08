/**
 * Auth Token Service
 * Handles all JWT and refresh token operations.
 *
 * Extracted from AuthService during refactoring.
 * Contains:
 * - generateAccessToken
 * - generateRefreshToken
 * - validateRefreshToken
 * - revokeRefreshToken
 * - revokeRefreshTokenById
 * - revokeAllRefreshTokens
 * - decodeToken
 * - getTokenHash
 * - parseExpiresIn
 * - base64UrlEncode
 */

import { Injectable, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '../database/database.service';
import { User, RefreshToken } from '../database/types';
import { AuthRequest, JwtPayload } from './auth.types';

@Injectable()
export class AuthTokenService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly jwtRefreshExpiresIn: string;
  // STORY-008: Session Management token expiry settings
  private readonly jwtAccessExpiryShort: string;
  private readonly jwtRefreshExpiryShort: string;
  private readonly jwtRefreshExpiryLong: string;

  constructor(
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
  ) {
    this.jwtSecret = process.env.JWT_SECRET || '';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
    // STORY-008: Session Management configurations
    this.jwtAccessExpiryShort = process.env.JWT_ACCESS_EXPIRY || '15m';
    this.jwtRefreshExpiryShort = process.env.JWT_REFRESH_EXPIRY_SHORT || '24h';
    this.jwtRefreshExpiryLong = process.env.JWT_REFRESH_EXPIRY_LONG || '30d';
  }

  /**
   * Get default access token expiry
   */
  getAccessExpiryShort(): string {
    return this.jwtAccessExpiryShort;
  }

  /**
   * Get refresh token expiry based on rememberMe
   */
  getRefreshExpiry(rememberMe: boolean): string {
    return rememberMe ? this.jwtRefreshExpiryLong : this.jwtRefreshExpiryShort;
  }

  /**
   * Generate JWT access token
   * Uses simple HMAC-SHA256 signing (no external JWT library needed)
   * STORY-008: Updated to accept custom expiry time
   *
   * @param user - User entity
   * @param expiresIn - Token expiry time (e.g., '15m', '24h')
   */
  generateAccessToken(user: User, expiresIn?: string): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const expiresInSeconds = this.parseExpiresIn(expiresIn || this.jwtExpiresIn);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      iat: now,
      exp: now + expiresInSeconds,
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));

    const signature = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Generate session fingerprint from user-agent and IP address
   * STORY-107: Used for session reuse detection
   *
   * @param userAgent - User-Agent header
   * @param ipAddress - Client IP address
   * @returns SHA256 hash fingerprint
   */
  generateSessionFingerprint(userAgent: string | null, ipAddress: string | null): string {
    const data = `${userAgent || 'unknown'}|${ipAddress || 'unknown'}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Find existing active session by fingerprint
   * STORY-107: Used for session reuse logic
   *
   * @param userId - User ID
   * @param fingerprint - Session fingerprint
   * @returns Existing session or null
   */
  async findExistingSessionByFingerprint(
    userId: number,
    fingerprint: string,
  ): Promise<RefreshToken | null> {
    const pool = this.databaseService.ensurePool();

    const result = await pool.query<RefreshToken>(
      `SELECT * FROM refresh_tokens
       WHERE user_id = $1
         AND fingerprint = $2
         AND revoked_at IS NULL
         AND expires_at > NOW()
         AND device_info != 'PASSWORD_RESET'
       ORDER BY last_used_at DESC
       LIMIT 1`,
      [userId, fingerprint],
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Update existing session with new activity and extend expiry
   * STORY-107: Reuses session instead of creating duplicate
   *
   * @param sessionId - Session ID to update
   * @param newExpiresAt - New expiration date
   * @returns Updated token hash
   */
  async updateExistingSession(
    sessionId: number,
    newExpiresAt: Date,
  ): Promise<string> {
    const pool = this.databaseService.ensurePool();

    // Generate a new token for security (token rotation)
    const newToken = crypto.randomBytes(64).toString('hex');
    const newTokenHash = crypto.createHash('sha256').update(newToken).digest('hex');

    await pool.query(
      `UPDATE refresh_tokens
       SET token_hash = $1,
           last_used_at = NOW(),
           expires_at = $2
       WHERE id = $3`,
      [newTokenHash, newExpiresAt, sessionId],
    );

    return newToken;
  }

  /**
   * Generate and store refresh token
   * STORY-008: Updated to support rememberMe and enhanced session info
   * STORY-107: Updated to support session reuse for same browser/device
   *
   * @param user - User entity
   * @param request - Express request for device info extraction
   * @param expiresIn - Optional custom expiry time
   * @param rememberMe - Whether "Remember Me" was selected
   */
  async generateRefreshToken(
    user: User,
    request: AuthRequest,
    expiresIn?: string,
    rememberMe: boolean = false,
  ): Promise<string> {
    const pool = this.databaseService.ensurePool();

    // Get device info and IP
    const deviceInfo = request.headers['user-agent'] || null;
    const ipAddress =
      request.headers['x-forwarded-for']?.toString().split(',')[0] ||
      request.headers['x-real-ip']?.toString() ||
      request.ip ||
      null;

    // STORY-107: Generate session fingerprint for session reuse
    const fingerprint = this.generateSessionFingerprint(deviceInfo, ipAddress);

    // STORY-107: Check for existing session with same fingerprint
    const existingSession = await this.findExistingSessionByFingerprint(user.id, fingerprint);

    // Calculate expiration
    const expiryDuration = this.parseExpiresIn(expiresIn || this.jwtRefreshExpiresIn);
    const expiresAt = new Date(Date.now() + expiryDuration * 1000);

    if (existingSession) {
      // STORY-107: Reuse existing session - update last activity and extend expiry
      const newToken = await this.updateExistingSession(existingSession.id, expiresAt);
      return newToken;
    }

    // Generate random token for new session
    const token = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // STORY-008: Parse browser name from user-agent
    const browser = this.parseBrowserFromUserAgent(deviceInfo);

    // Store in database with new session management columns including fingerprint
    await pool.query(
      `INSERT INTO refresh_tokens
       (user_id, token_hash, expires_at, device_info, ip_address, browser, remember_me, last_used_at, fingerprint)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)`,
      [user.id, tokenHash, expiresAt, deviceInfo, ipAddress, browser, rememberMe, fingerprint],
    );

    return token;
  }

  /**
   * Validate refresh token and return token record
   */
  async validateRefreshToken(token: string): Promise<RefreshToken> {
    const pool = this.databaseService.ensurePool();

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await pool.query<RefreshToken>(
      `SELECT * FROM refresh_tokens
       WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
      [tokenHash],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return result.rows[0];
  }

  /**
   * Revoke refresh token by token string
   */
  async revokeRefreshToken(token: string, userId: number): Promise<void> {
    const pool = this.databaseService.ensurePool();

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND user_id = $2`,
      [tokenHash, userId],
    );
  }

  /**
   * Revoke refresh token by ID
   */
  async revokeRefreshTokenById(id: number): Promise<void> {
    const pool = this.databaseService.ensurePool();

    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
      [id],
    );
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllRefreshTokens(userId: number): Promise<void> {
    const pool = this.databaseService.ensurePool();

    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
  }

  /**
   * Decode and validate JWT token (for middleware/guards)
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const [encodedHeader, encodedPayload, signature] = parts;

      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', this.jwtSecret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');

      if (signature !== expectedSignature) {
        return null;
      }

      // Decode payload
      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString(),
      ) as JwtPayload;

      // Check expiration
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Get token hash from token string
   * STORY-008: Helper for session identification
   */
  getTokenHash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Parse expires in string to seconds
   * Supports formats like "24h", "30d", "7d", "60m", "3600s"
   */
  parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      // Default to 24 hours if invalid format
      return 24 * 60 * 60;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 24 * 60 * 60;
    }
  }

  /**
   * Base64 URL encode
   */
  private base64UrlEncode(str: string): string {
    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Parse browser name from User-Agent string
   * STORY-008: Helper method for session display
   */
  private parseBrowserFromUserAgent(userAgent: string | null): string {
    if (!userAgent) return 'Unknown';

    // Common browser patterns
    if (userAgent.includes('Firefox/')) return 'Firefox';
    if (userAgent.includes('Edg/')) return 'Edge';
    if (userAgent.includes('Chrome/')) return 'Chrome';
    if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Opera/') || userAgent.includes('OPR/')) return 'Opera';
    if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) return 'Internet Explorer';

    return 'Unknown';
  }
}
