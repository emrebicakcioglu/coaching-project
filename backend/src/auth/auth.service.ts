/**
 * Auth Service
 * STORY-021B: Resource Endpoints
 * STORY-008: Session Management mit "Remember Me"
 * STORY-023A: E-Mail Service Setup (Resend.com)
 * STORY-005B: MFA Login-Flow (Backend)
 * STORY-023: User Registration
 *
 * Business logic for authentication including login, logout, token refresh,
 * password reset functionality, session management, MFA verification,
 * and user registration with email verification.
 */

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { DatabaseService } from '../database/database.service';
import { WinstonLoggerService } from '../common/services/logger.service';
import { AuditService } from '../common/services/audit.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { User, RefreshToken } from '../database/types';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import {
  AuthResponseDto,
  TokenRefreshResponseDto,
  LogoutResponseDto,
  ForgotPasswordResponseDto,
  ResetPasswordResponseDto,
} from './dto/auth-response.dto';
import {
  SessionItemDto,
  SessionsListResponseDto,
  SessionTerminatedResponseDto,
  AllSessionsTerminatedResponseDto,
} from './dto/session.dto';
import { Request } from 'express';
// STORY-005B: MFA Login-Flow imports
import { MFAService } from '../mfa/mfa.service';
import { MFALoginSuccessResponseDto } from '../mfa/dto/mfa-login.dto';
// STORY-023: User Registration imports
import { UserRepository } from '../users/user.repository';
import {
  RegisterDto,
  RegisterResponseDto,
  VerifyEmailResponseDto,
  ResendVerificationDto,
  ResendVerificationResponseDto,
} from './dto/register.dto';

/**
 * Extended Request interface with optional user
 */
interface AuthRequest extends Request {
  user?: { id?: number; email?: string };
  requestId?: string;
}

/**
 * JWT Token Payload
 */
interface JwtPayload {
  sub: number;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Auth Service
 * Handles all authentication-related business logic
 */
@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly jwtRefreshExpiresIn: string;
  private readonly bcryptRounds: number;
  // STORY-008: Session Management token expiry settings
  private readonly jwtAccessExpiryShort: string; // 15 minutes for access token
  private readonly jwtRefreshExpiryShort: string; // 24 hours without rememberMe
  private readonly jwtRefreshExpiryLong: string; // 30 days with rememberMe

  constructor(
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => EmailService))
    private readonly emailService: EmailService,
    // STORY-005B: MFA Login-Flow
    @Inject(forwardRef(() => MFAService))
    private readonly mfaService: MFAService,
    // STORY-023: User Registration
    @Inject(forwardRef(() => UserRepository))
    private readonly userRepository: UserRepository,
  ) {
    this.jwtSecret = process.env.JWT_SECRET || '';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    // STORY-008: Session Management configurations
    this.jwtAccessExpiryShort = process.env.JWT_ACCESS_EXPIRY || '15m'; // 15 minutes
    this.jwtRefreshExpiryShort = process.env.JWT_REFRESH_EXPIRY_SHORT || '24h'; // Without Remember Me
    this.jwtRefreshExpiryLong = process.env.JWT_REFRESH_EXPIRY_LONG || '30d'; // With Remember Me
  }

  /**
   * Authenticate user with email and password
   * STORY-008: Updated to support rememberMe parameter
   * STORY-005B: Updated to support MFA login flow
   *
   * @param loginDto - Login credentials including optional rememberMe flag
   * @param request - Express request for audit logging
   * @returns Auth response with tokens and user, or MFA required response
   */
  async login(loginDto: LoginDto, request: AuthRequest): Promise<AuthResponseDto> {
    const { email, password, rememberMe = false } = loginDto;

    // Find user by email
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      await this.auditService.logLoginFailed(email, request);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user is active
    // STORY-023: Check for pending status (unverified email)
    if (user.status === 'pending') {
      await this.auditService.logLoginFailed(email, request);
      throw new UnauthorizedException('Please verify your email first');
    }
    if (user.status !== 'active') {
      await this.auditService.logLoginFailed(email, request);
      throw new UnauthorizedException('Account is not active');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      await this.auditService.logLoginFailed(email, request);
      throw new UnauthorizedException('Invalid email or password');
    }

    // STORY-005B: Check if MFA is enabled for this user
    if (user.mfa_enabled) {
      // Check if user is locked out due to too many MFA attempts
      if (this.mfaService.isLockedOut(user.id)) {
        throw new ForbiddenException(
          'Account temporarily locked due to too many failed MFA attempts',
        );
      }

      // Generate temporary token for MFA verification
      const tempToken = this.mfaService.generateTempToken(user.id, user.email);

      this.logger.log(
        `MFA required for user: ${user.email}`,
        'AuthService',
      );

      await this.auditService.log({
        action: 'MFA_LOGIN_REQUIRED',
        userId: user.id,
        resource: 'auth',
        details: { email: user.email },
        request,
      });

      // Return MFA required response
      return {
        mfaRequired: true,
        tempToken,
        message: 'MFA verification required',
      };
    }

    // STORY-008: Generate tokens with rememberMe support
    // Access token: 15 minutes (short-lived for security)
    // Refresh token: 30 days (rememberMe) or 24 hours (standard)
    const accessTokenExpiry = this.jwtAccessExpiryShort;
    const refreshTokenExpiry = rememberMe
      ? this.jwtRefreshExpiryLong
      : this.jwtRefreshExpiryShort;

    const accessToken = this.generateAccessToken(user, accessTokenExpiry);
    const refreshToken = await this.generateRefreshToken(
      user,
      request,
      refreshTokenExpiry,
      rememberMe,
    );

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    // Log successful login with rememberMe info
    await this.auditService.logLogin(user.id, request, {
      email: user.email,
      rememberMe,
    });

    this.logger.log(
      `User logged in: ${user.email} (rememberMe: ${rememberMe})`,
      'AuthService',
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: this.parseExpiresIn(accessTokenExpiry),
      user: UserResponseDto.fromEntity(user),
    };
  }

  /**
   * Logout user and revoke refresh token
   *
   * @param refreshTokenDto - Refresh token to revoke
   * @param userId - User ID from authenticated request
   * @param request - Express request for audit logging
   * @returns Logout response
   */
  async logout(
    refreshTokenDto: RefreshTokenDto,
    userId: number,
    request: AuthRequest,
  ): Promise<LogoutResponseDto> {
    const { refresh_token } = refreshTokenDto;

    // Revoke the refresh token
    await this.revokeRefreshToken(refresh_token, userId);

    // Log logout
    await this.auditService.logLogout(userId, request);

    this.logger.log(`User logged out (ID: ${userId})`, 'AuthService');

    return { message: 'Logged out successfully' };
  }

  /**
   * Refresh access token using refresh token
   * STORY-008: Token rotation - always issues new refresh token
   *
   * @param refreshTokenDto - Refresh token
   * @param request - Express request for audit logging
   * @param currentTokenHash - Optional: hash of current token for detecting reuse attacks
   * @returns New tokens
   */
  async refresh(
    refreshTokenDto: RefreshTokenDto,
    request: AuthRequest,
    _currentTokenHash?: string,
  ): Promise<TokenRefreshResponseDto> {
    const { refresh_token } = refreshTokenDto;

    // Validate and get the refresh token record
    const tokenRecord = await this.validateRefreshToken(refresh_token);

    // STORY-008: Token Rotation Security - Detect token reuse attack
    // If a token that was already rotated is used again, invalidate ALL user sessions
    if (tokenRecord.revoked_at) {
      this.logger.warn(
        `Token reuse detected for user ${tokenRecord.user_id}. Potential security breach!`,
        'AuthService',
      );
      // Revoke ALL tokens for this user as a security measure
      await this.revokeAllRefreshTokens(tokenRecord.user_id);
      throw new UnauthorizedException('Security violation: Token reuse detected. All sessions invalidated.');
    }

    // Get user
    const user = await this.usersService.findById(tokenRecord.user_id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if user is still active
    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    // STORY-008: Token Rotation - Revoke old refresh token
    await this.revokeRefreshTokenById(tokenRecord.id);

    // STORY-008: Preserve rememberMe setting from original token
    const rememberMe = tokenRecord.remember_me || false;
    const refreshExpiry = rememberMe
      ? this.jwtRefreshExpiryLong
      : this.jwtRefreshExpiryShort;

    // Generate new tokens (short-lived access token, new refresh token)
    const accessToken = this.generateAccessToken(user, this.jwtAccessExpiryShort);
    const newRefreshToken = await this.generateRefreshToken(
      user,
      request,
      refreshExpiry,
      rememberMe,
    );

    this.logger.debug(
      `Token refreshed for user: ${user.email} (rememberMe: ${rememberMe})`,
      'AuthService',
    );

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      token_type: 'Bearer',
      expires_in: this.parseExpiresIn(this.jwtAccessExpiryShort),
    };
  }

  /**
   * Request password reset (forgot password)
   * STORY-023A: Now sends email via Resend.com
   * Always returns success to prevent email enumeration
   *
   * @param forgotPasswordDto - Email to send reset link to
   * @param request - Express request for audit logging
   * @returns Password reset request response
   */
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
    _request: AuthRequest,
  ): Promise<ForgotPasswordResponseDto> {
    const { email } = forgotPasswordDto;

    // Find user by email
    const user = await this.usersService.findByEmail(email);

    // Always return success to prevent email enumeration
    // But only actually send email if user exists
    if (user) {
      // Generate reset token
      const resetToken = await this.generatePasswordResetToken(user.id);

      // Build the reset link
      const frontendUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
      const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

      // Log password reset request
      this.logger.log(
        `Password reset requested for: ${email}`,
        'AuthService',
      );

      // STORY-023A: Send password reset email via Resend
      try {
        // Use the first part of the name (before space) or fallback to email username
        const userName = user.name?.split(' ')[0] || user.email.split('@')[0];
        await this.emailService.sendPasswordResetEmail({
          email: user.email,
          name: userName,
          resetLink,
        });
        this.logger.log(
          `Password reset email sent to: ${email}`,
          'AuthService',
        );
      } catch (error) {
        // Log error but don't fail - we don't want to reveal if the email exists
        this.logger.error(
          `Failed to send password reset email: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : undefined,
          'AuthService',
        );
      }

      // In development, also log the token for testing
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(
          `Password reset token (DEV ONLY): ${resetToken}`,
          'AuthService',
        );
      }
    }

    return { message: 'If the email exists, a password reset link has been sent' };
  }

  /**
   * Execute password reset with token
   *
   * @param resetPasswordDto - Reset token and new password
   * @param request - Express request for audit logging
   * @returns Password reset response
   */
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
    request: AuthRequest,
  ): Promise<ResetPasswordResponseDto> {
    const { token, new_password } = resetPasswordDto;

    // Validate reset token and get user ID
    const userId = await this.validatePasswordResetToken(token);

    // Hash new password
    const passwordHash = await bcrypt.hash(new_password, this.bcryptRounds);

    // Update password
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, userId],
    );

    // Invalidate the reset token
    await this.invalidatePasswordResetToken(token);

    // Revoke all refresh tokens for security
    await this.revokeAllRefreshTokens(userId);

    // Log password change
    await this.auditService.logPasswordChange(userId, request);

    this.logger.log(`Password reset completed for user ID: ${userId}`, 'AuthService');

    return { message: 'Password has been reset successfully' };
  }

  /**
   * Validate user credentials (for JWT strategy)
   *
   * @param email - User email
   * @param password - User password
   * @returns User or null
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  // ===========================================
  // MFA Login Flow Methods (STORY-005B)
  // ===========================================

  /**
   * Complete MFA login with TOTP code
   * STORY-005B: MFA Login-Flow
   *
   * @param tempToken - Temporary token from initial login
   * @param code - 6-digit TOTP code
   * @param request - Express request for audit logging
   * @param rememberMe - Optional: Override rememberMe from original login
   * @returns Auth response with final JWT tokens
   */
  async completeMFALogin(
    tempToken: string,
    code: string,
    request: AuthRequest,
    rememberMe: boolean = false,
  ): Promise<MFALoginSuccessResponseDto> {
    // Verify MFA code and get user info
    const { userId } = await this.mfaService.verifyMFALogin(tempToken, code, request);

    // Get user
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate final tokens
    const accessTokenExpiry = this.jwtAccessExpiryShort;
    const refreshTokenExpiry = rememberMe
      ? this.jwtRefreshExpiryLong
      : this.jwtRefreshExpiryShort;

    const accessToken = this.generateAccessToken(user, accessTokenExpiry);
    const refreshToken = await this.generateRefreshToken(
      user,
      request,
      refreshTokenExpiry,
      rememberMe,
    );

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    // Log successful login
    await this.auditService.logLogin(user.id, request, {
      email: user.email,
      rememberMe,
      mfaVerified: true,
    });

    this.logger.log(
      `User completed MFA login: ${user.email}`,
      'AuthService',
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: this.parseExpiresIn(accessTokenExpiry),
      user: UserResponseDto.fromEntity(user),
    };
  }

  /**
   * Complete MFA login with backup code
   * STORY-005B: MFA Login-Flow
   *
   * @param tempToken - Temporary token from initial login
   * @param backupCode - 8-character backup code
   * @param request - Express request for audit logging
   * @param rememberMe - Optional: Override rememberMe from original login
   * @returns Auth response with final JWT tokens and remaining backup code count
   */
  async completeMFALoginWithBackupCode(
    tempToken: string,
    backupCode: string,
    request: AuthRequest,
    rememberMe: boolean = false,
  ): Promise<MFALoginSuccessResponseDto> {
    // Verify backup code and get user info
    const { userId, remainingBackupCodes } = await this.mfaService.verifyBackupCodeLogin(
      tempToken,
      backupCode,
      request,
    );

    // Get user
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate final tokens
    const accessTokenExpiry = this.jwtAccessExpiryShort;
    const refreshTokenExpiry = rememberMe
      ? this.jwtRefreshExpiryLong
      : this.jwtRefreshExpiryShort;

    const accessToken = this.generateAccessToken(user, accessTokenExpiry);
    const refreshToken = await this.generateRefreshToken(
      user,
      request,
      refreshTokenExpiry,
      rememberMe,
    );

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    // Log successful login
    await this.auditService.logLogin(user.id, request, {
      email: user.email,
      rememberMe,
      mfaVerified: true,
      usedBackupCode: true,
      remainingBackupCodes,
    });

    this.logger.log(
      `User completed MFA login with backup code: ${user.email} (${remainingBackupCodes} codes remaining)`,
      'AuthService',
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: this.parseExpiresIn(accessTokenExpiry),
      user: UserResponseDto.fromEntity(user),
      message: `Backup code used. ${remainingBackupCodes} remaining.`,
    };
  }

  // ===========================================
  // Session Management Methods (STORY-008)
  // ===========================================

  /**
   * Get all active sessions for a user
   * STORY-008: Session Management
   *
   * @param userId - User ID
   * @param currentTokenHash - Hash of current token to mark as "current"
   * @returns List of active sessions
   */
  async getSessions(
    userId: number,
    currentTokenHash?: string,
  ): Promise<SessionsListResponseDto> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const result = await pool.query<RefreshToken>(
      `SELECT id, device_info, browser, ip_address, location, created_at, last_used_at, token_hash
       FROM refresh_tokens
       WHERE user_id = $1
         AND revoked_at IS NULL
         AND expires_at > NOW()
         AND (device_info IS NULL OR device_info != 'PASSWORD_RESET')
       ORDER BY last_used_at DESC`,
      [userId],
    );

    const sessions: SessionItemDto[] = result.rows.map((row) => ({
      id: row.id,
      device: this.parseDeviceFromUserAgent(row.device_info ?? null),
      browser: row.browser || this.parseBrowserFromUserAgent(row.device_info ?? null),
      ip: row.ip_address || 'Unknown',
      location: row.location || null,
      lastActivity: row.last_used_at?.toISOString() || row.created_at.toISOString(),
      createdAt: row.created_at.toISOString(),
      current: currentTokenHash ? row.token_hash === currentTokenHash : false,
    }));

    return { sessions };
  }

  /**
   * Terminate a specific session
   * STORY-008: Session Management
   *
   * @param sessionId - Session/Token ID to terminate
   * @param userId - User ID (for authorization)
   * @param request - Express request for audit logging
   * @returns Termination response
   */
  async terminateSession(
    sessionId: number,
    userId: number,
    request: AuthRequest,
  ): Promise<SessionTerminatedResponseDto> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    // Verify session belongs to user
    const sessionResult = await pool.query<RefreshToken>(
      `SELECT * FROM refresh_tokens WHERE id = $1 AND user_id = $2`,
      [sessionId, userId],
    );

    if (sessionResult.rows.length === 0) {
      throw new ForbiddenException('Session not found or does not belong to you');
    }

    // Revoke the session
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
      [sessionId],
    );

    // Audit log
    await this.auditService.log({
      action: 'SESSION_TERMINATED',
      userId,
      resource: 'session',
      resourceId: sessionId,
      details: { sessionId },
      request,
    });

    this.logger.log(
      `Session ${sessionId} terminated for user ${userId}`,
      'AuthService',
    );

    return { message: 'Session terminated' };
  }

  /**
   * Terminate all sessions for a user except current
   * STORY-008: Session Management
   *
   * @param userId - User ID
   * @param currentTokenHash - Optional: hash of current token to preserve
   * @param request - Express request for audit logging
   * @returns All sessions terminated response
   */
  async terminateAllSessions(
    userId: number,
    currentTokenHash: string | null,
    request: AuthRequest,
  ): Promise<AllSessionsTerminatedResponseDto> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    let result;
    if (currentTokenHash) {
      // Keep the current session active
      result = await pool.query(
        `UPDATE refresh_tokens
         SET revoked_at = NOW()
         WHERE user_id = $1
           AND revoked_at IS NULL
           AND token_hash != $2
           AND (device_info IS NULL OR device_info != 'PASSWORD_RESET')`,
        [userId, currentTokenHash],
      );
    } else {
      // Revoke all sessions including current
      result = await pool.query(
        `UPDATE refresh_tokens
         SET revoked_at = NOW()
         WHERE user_id = $1
           AND revoked_at IS NULL
           AND (device_info IS NULL OR device_info != 'PASSWORD_RESET')`,
        [userId],
      );
    }

    const count = result.rowCount || 0;

    // Audit log
    await this.auditService.log({
      action: 'ALL_SESSIONS_TERMINATED',
      userId,
      resource: 'session',
      details: { count, preservedCurrent: !!currentTokenHash },
      request,
    });

    this.logger.log(
      `All sessions (${count}) terminated for user ${userId}`,
      'AuthService',
    );

    return { message: 'All sessions terminated', count };
  }

  /**
   * Cleanup expired refresh tokens
   * STORY-008: Maintenance task
   *
   * @returns Number of tokens cleaned up
   */
  async cleanupExpiredTokens(): Promise<number> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const result = await pool.query(
      `DELETE FROM refresh_tokens WHERE expires_at < NOW()`,
    );

    const count = result.rowCount || 0;
    if (count > 0) {
      this.logger.log(`Cleaned up ${count} expired refresh tokens`, 'AuthService');
    }

    return count;
  }

  /**
   * Update last_used_at for a token
   * STORY-008: Session activity tracking
   *
   * @param tokenHash - Hash of the token
   */
  async updateTokenLastUsed(tokenHash: string): Promise<void> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    await pool.query(
      `UPDATE refresh_tokens SET last_used_at = NOW() WHERE token_hash = $1`,
      [tokenHash],
    );
  }

  /**
   * Get token hash from token string
   * STORY-008: Helper for session identification
   */
  getTokenHash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // ===========================================
  // Private helper methods
  // ===========================================

  /**
   * Generate JWT access token
   * Uses simple HMAC-SHA256 signing (no external JWT library needed)
   * STORY-008: Updated to accept custom expiry time
   *
   * @param user - User entity
   * @param expiresIn - Token expiry time (e.g., '15m', '24h')
   */
  private generateAccessToken(user: User, expiresIn?: string): string {
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
   * Generate and store refresh token
   * STORY-008: Updated to support rememberMe and enhanced session info
   *
   * @param user - User entity
   * @param request - Express request for device info extraction
   * @param expiresIn - Optional custom expiry time
   * @param rememberMe - Whether "Remember Me" was selected
   */
  private async generateRefreshToken(
    user: User,
    request: AuthRequest,
    expiresIn?: string,
    rememberMe: boolean = false,
  ): Promise<string> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    // Generate random token
    const token = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Calculate expiration
    const expiryDuration = this.parseExpiresIn(expiresIn || this.jwtRefreshExpiresIn);
    const expiresAt = new Date(Date.now() + expiryDuration * 1000);

    // Get device info and IP
    const deviceInfo = request.headers['user-agent'] || null;
    const ipAddress =
      request.headers['x-forwarded-for']?.toString().split(',')[0] ||
      request.headers['x-real-ip']?.toString() ||
      request.ip ||
      null;

    // STORY-008: Parse browser name from user-agent
    const browser = this.parseBrowserFromUserAgent(deviceInfo);

    // Store in database with new session management columns
    await pool.query(
      `INSERT INTO refresh_tokens
       (user_id, token_hash, expires_at, device_info, ip_address, browser, remember_me, last_used_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [user.id, tokenHash, expiresAt, deviceInfo, ipAddress, browser, rememberMe],
    );

    return token;
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

  /**
   * Parse device/OS from User-Agent string
   * STORY-008: Helper method for session display
   */
  private parseDeviceFromUserAgent(userAgent: string | null): string {
    if (!userAgent) return 'Unknown Device';

    const browser = this.parseBrowserFromUserAgent(userAgent);
    let os = 'Unknown';

    // Parse OS
    if (userAgent.includes('Windows NT 10')) os = 'Windows 10';
    else if (userAgent.includes('Windows NT 6.3')) os = 'Windows 8.1';
    else if (userAgent.includes('Windows NT 6.2')) os = 'Windows 8';
    else if (userAgent.includes('Windows NT 6.1')) os = 'Windows 7';
    else if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac OS X')) os = 'macOS';
    else if (userAgent.includes('iPhone')) os = 'iPhone';
    else if (userAgent.includes('iPad')) os = 'iPad';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('Linux')) os = 'Linux';

    return `${browser} on ${os}`;
  }

  /**
   * Validate refresh token and return token record
   */
  private async validateRefreshToken(token: string): Promise<RefreshToken> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

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
  private async revokeRefreshToken(token: string, userId: number): Promise<void> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND user_id = $2`,
      [tokenHash, userId],
    );
  }

  /**
   * Revoke refresh token by ID
   */
  private async revokeRefreshTokenById(id: number): Promise<void> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
      [id],
    );
  }

  /**
   * Revoke all refresh tokens for a user
   */
  private async revokeAllRefreshTokens(userId: number): Promise<void> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
  }

  /**
   * Invalidate all user tokens (public method)
   * STORY-007B: User Role Assignment
   *
   * Called when user roles change to force re-authentication
   * This ensures the user gets a new JWT with updated permissions
   *
   * @param userId - User ID whose tokens should be invalidated
   */
  async invalidateUserTokens(userId: number): Promise<void> {
    await this.revokeAllRefreshTokens(userId);
    this.logger.log(
      `All tokens invalidated for user ${userId} due to role change`,
      'AuthService',
    );
  }

  /**
   * Generate password reset token
   * Stores token in a temporary table or uses refresh_tokens with special flag
   */
  private async generatePasswordResetToken(userId: number): Promise<string> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    // Generate random token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Store as a special refresh token with device_info as 'PASSWORD_RESET'
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_info)
       VALUES ($1, $2, $3, 'PASSWORD_RESET')`,
      [userId, tokenHash, expiresAt],
    );

    return token;
  }

  /**
   * Validate password reset token and return user ID
   */
  private async validatePasswordResetToken(token: string): Promise<number> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await pool.query<RefreshToken>(
      `SELECT * FROM refresh_tokens
       WHERE token_hash = $1 AND device_info = 'PASSWORD_RESET'
       AND revoked_at IS NULL AND expires_at > NOW()`,
      [tokenHash],
    );

    if (result.rows.length === 0) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    return result.rows[0].user_id;
  }

  /**
   * Invalidate password reset token
   */
  private async invalidatePasswordResetToken(token: string): Promise<void> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`,
      [tokenHash],
    );
  }

  /**
   * Parse expires in string to seconds
   * Supports formats like "24h", "30d", "7d", "60m", "3600s"
   */
  private parseExpiresIn(expiresIn: string): number {
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

  // ===========================================
  // User Registration Methods (STORY-023)
  // ===========================================

  /**
   * Register a new user
   * STORY-023: User Registration
   *
   * Creates a new user with 'pending' status and sends verification email.
   *
   * @param registerDto - Registration data
   * @param request - Express request for audit logging
   * @returns Registration response with user ID
   */
  async register(
    registerDto: RegisterDto,
    request: AuthRequest,
  ): Promise<RegisterResponseDto> {
    const { email, name, password, passwordConfirm } = registerDto;

    // Validate password confirmation
    if (password !== passwordConfirm) {
      throw new BadRequestException('Passwords do not match');
    }

    // Check if email already exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      // If user exists and is pending, allow re-registration (resend verification)
      if (existingUser.status === 'pending') {
        return this.resendVerificationInternal(existingUser, request);
      }
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, this.bcryptRounds);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    // Token expires in 24 hours
    const tokenExpiry = process.env.VERIFICATION_TOKEN_EXPIRY || '24h';
    const expiresInSeconds = this.parseExpiresIn(tokenExpiry);
    const verificationTokenExpires = new Date(
      Date.now() + expiresInSeconds * 1000,
    );

    // Create user with pending status
    const newUser = await this.userRepository.create({
      email,
      password_hash: passwordHash,
      name,
      status: 'pending',
      mfa_enabled: false,
      verification_token_hash: verificationTokenHash,
      verification_token_expires: verificationTokenExpires,
    });

    // Build verification link
    const frontendUrl =
      process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
    const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}`;

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail({
        email: newUser.email,
        name: newUser.name,
        verificationLink,
      });
      this.logger.log(
        `Verification email sent to: ${newUser.email}`,
        'AuthService',
      );
    } catch (error) {
      this.logger.error(
        `Failed to send verification email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'AuthService',
      );
      // Continue with registration even if email fails
      // User can request resend later
    }

    // Log registration
    await this.auditService.log({
      action: 'USER_REGISTER',
      userId: newUser.id,
      resource: 'user',
      resourceId: newUser.id,
      details: { email: newUser.email, name: newUser.name },
      request,
    });

    this.logger.log(`User registered: ${newUser.email}`, 'AuthService');

    // In development, log the token for testing
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(
        `Verification token (DEV ONLY): ${verificationToken}`,
        'AuthService',
      );
    }

    return {
      message:
        'Registration successful. Please check your email to verify your account.',
      userId: newUser.id,
    };
  }

  /**
   * Verify user email address
   * STORY-023: User Registration
   *
   * Validates the verification token and activates the user account.
   *
   * @param token - Email verification token
   * @param request - Express request for audit logging
   * @returns Verification response
   */
  async verifyEmail(
    token: string,
    request: AuthRequest,
  ): Promise<VerifyEmailResponseDto> {
    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user by verification token
    const user = await this.userRepository.findByVerificationToken(tokenHash);

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Verify the user
    const verifiedUser = await this.userRepository.verifyEmail(user.id);

    if (!verifiedUser) {
      throw new BadRequestException('Failed to verify email');
    }

    // Log verification
    await this.auditService.log({
      action: 'USER_PASSWORD_CHANGE', // Using existing action type for email verification
      userId: verifiedUser.id,
      resource: 'user',
      resourceId: verifiedUser.id,
      details: { action: 'email_verified', email: verifiedUser.email },
      request,
    });

    this.logger.log(
      `Email verified for user: ${verifiedUser.email}`,
      'AuthService',
    );

    return {
      message: 'Email verified successfully. You can now log in.',
    };
  }

  /**
   * Resend verification email
   * STORY-023: User Registration
   *
   * Generates a new verification token and sends a new verification email.
   *
   * @param resendDto - Email address
   * @param request - Express request for audit logging
   * @returns Response message
   */
  async resendVerificationEmail(
    resendDto: ResendVerificationDto,
    request: AuthRequest,
  ): Promise<ResendVerificationResponseDto> {
    const { email } = resendDto;

    // Find pending user by email
    const user = await this.userRepository.findPendingByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        message:
          'If the email exists and is not verified, a new verification email has been sent.',
      };
    }

    return this.resendVerificationInternal(user, request);
  }

  /**
   * Internal method to resend verification email
   * STORY-023: User Registration
   */
  private async resendVerificationInternal(
    user: User,
    request: AuthRequest,
  ): Promise<RegisterResponseDto> {
    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    // Token expires in 24 hours
    const tokenExpiry = process.env.VERIFICATION_TOKEN_EXPIRY || '24h';
    const expiresInSeconds = this.parseExpiresIn(tokenExpiry);
    const verificationTokenExpires = new Date(
      Date.now() + expiresInSeconds * 1000,
    );

    // Update user with new token
    await this.userRepository.updateVerificationToken(
      user.id,
      verificationTokenHash,
      verificationTokenExpires,
    );

    // Build verification link
    const frontendUrl =
      process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
    const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}`;

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail({
        email: user.email,
        name: user.name,
        verificationLink,
      });
      this.logger.log(
        `Verification email resent to: ${user.email}`,
        'AuthService',
      );
    } catch (error) {
      this.logger.error(
        `Failed to resend verification email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'AuthService',
      );
    }

    // Log resend
    await this.auditService.log({
      action: 'USER_REGISTER',
      userId: user.id,
      resource: 'user',
      resourceId: user.id,
      details: { action: 'verification_resent', email: user.email },
      request,
    });

    // In development, log the token for testing
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(
        `Verification token (DEV ONLY): ${verificationToken}`,
        'AuthService',
      );
    }

    return {
      message:
        'Registration successful. Please check your email to verify your account.',
      userId: user.id,
    };
  }
}
