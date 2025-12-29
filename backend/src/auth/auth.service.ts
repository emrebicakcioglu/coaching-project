/**
 * Auth Service
 * STORY-021B: Resource Endpoints
 * STORY-008: Session Management mit "Remember Me"
 * STORY-023A: E-Mail Service Setup (Resend.com)
 * STORY-005B: MFA Login-Flow (Backend)
 * STORY-023: User Registration
 *
 * Main authentication service orchestrating login, logout, token refresh,
 * MFA verification, and delegating to specialized sub-services:
 * - AuthTokenService: Token operations
 * - AuthSessionService: Session management
 * - AuthPasswordService: Password reset
 * - AuthRegistrationService: User registration
 */

import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { WinstonLoggerService } from '../common/services/logger.service';
import { AuditService } from '../common/services/audit.service';
import { UsersService } from '../users/users.service';
import { User } from '../database/types';
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
  SessionsListResponseDto,
  SessionTerminatedResponseDto,
  AllSessionsTerminatedResponseDto,
} from './dto/session.dto';
// STORY-005B: MFA Login-Flow imports
import { MFAService } from '../mfa/mfa.service';
import { MFALoginSuccessResponseDto } from '../mfa/dto/mfa-login.dto';
// STORY-023: User Registration imports
import {
  RegisterDto,
  RegisterResponseDto,
  VerifyEmailResponseDto,
  ResendVerificationDto,
  ResendVerificationResponseDto,
} from './dto/register.dto';
// Sub-services
import { AuthTokenService } from './auth-token.service';
import { AuthSessionService } from './auth-session.service';
import { AuthPasswordService } from './auth-password.service';
import { AuthRegistrationService } from './auth-registration.service';
import { AuthRequest, JwtPayload } from './auth.types';

/**
 * Auth Service
 * Handles core authentication logic and orchestrates sub-services
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    // STORY-005B: MFA Login-Flow
    @Inject(forwardRef(() => MFAService))
    private readonly mfaService: MFAService,
    // Sub-services
    @Inject(forwardRef(() => AuthTokenService))
    private readonly authTokenService: AuthTokenService,
    @Inject(forwardRef(() => AuthSessionService))
    private readonly authSessionService: AuthSessionService,
    @Inject(forwardRef(() => AuthPasswordService))
    private readonly authPasswordService: AuthPasswordService,
    @Inject(forwardRef(() => AuthRegistrationService))
    private readonly authRegistrationService: AuthRegistrationService,
  ) {}

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
      throw new UnauthorizedException('AUTH_INVALID_CREDENTIALS');
    }

    // Check if user is active
    // STORY-023: Check for pending status (unverified email)
    if (user.status === 'pending') {
      await this.auditService.logLoginFailed(email, request);
      throw new UnauthorizedException('AUTH_EMAIL_NOT_VERIFIED');
    }
    if (user.status !== 'active') {
      await this.auditService.logLoginFailed(email, request);
      throw new UnauthorizedException('AUTH_ACCOUNT_INACTIVE');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      await this.auditService.logLoginFailed(email, request);
      throw new UnauthorizedException('AUTH_INVALID_CREDENTIALS');
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
    const accessTokenExpiry = this.authTokenService.getAccessExpiryShort();
    const refreshTokenExpiry = this.authTokenService.getRefreshExpiry(rememberMe);

    const accessToken = this.authTokenService.generateAccessToken(user, accessTokenExpiry);
    const refreshToken = await this.authTokenService.generateRefreshToken(
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
      expires_in: this.authTokenService.parseExpiresIn(accessTokenExpiry),
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
    await this.authTokenService.revokeRefreshToken(refresh_token, userId);

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
    const tokenRecord = await this.authTokenService.validateRefreshToken(refresh_token);

    // STORY-008: Token Rotation Security - Detect token reuse attack
    if (tokenRecord.revoked_at) {
      this.logger.warn(
        `Token reuse detected for user ${tokenRecord.user_id}. Potential security breach!`,
        'AuthService',
      );
      // Revoke ALL tokens for this user as a security measure
      await this.authTokenService.revokeAllRefreshTokens(tokenRecord.user_id);
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
    await this.authTokenService.revokeRefreshTokenById(tokenRecord.id);

    // STORY-008: Preserve rememberMe setting from original token
    const rememberMe = tokenRecord.remember_me || false;
    const accessExpiry = this.authTokenService.getAccessExpiryShort();
    const refreshExpiry = this.authTokenService.getRefreshExpiry(rememberMe);

    // Generate new tokens
    const accessToken = this.authTokenService.generateAccessToken(user, accessExpiry);
    const newRefreshToken = await this.authTokenService.generateRefreshToken(
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
      expires_in: this.authTokenService.parseExpiresIn(accessExpiry),
    };
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
    const accessTokenExpiry = this.authTokenService.getAccessExpiryShort();
    const refreshTokenExpiry = this.authTokenService.getRefreshExpiry(rememberMe);

    const accessToken = this.authTokenService.generateAccessToken(user, accessTokenExpiry);
    const refreshToken = await this.authTokenService.generateRefreshToken(
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
      expires_in: this.authTokenService.parseExpiresIn(accessTokenExpiry),
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
    const accessTokenExpiry = this.authTokenService.getAccessExpiryShort();
    const refreshTokenExpiry = this.authTokenService.getRefreshExpiry(rememberMe);

    const accessToken = this.authTokenService.generateAccessToken(user, accessTokenExpiry);
    const refreshToken = await this.authTokenService.generateRefreshToken(
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
      expires_in: this.authTokenService.parseExpiresIn(accessTokenExpiry),
      user: UserResponseDto.fromEntity(user),
      message: `Backup code used. ${remainingBackupCodes} remaining.`,
    };
  }

  // ===========================================
  // Delegated Session Management Methods (STORY-008)
  // ===========================================

  /**
   * Get all active sessions for a user
   * Delegated to AuthSessionService
   */
  async getSessions(
    userId: number,
    currentTokenHash?: string,
  ): Promise<SessionsListResponseDto> {
    return this.authSessionService.getSessions(userId, currentTokenHash);
  }

  /**
   * Terminate a specific session
   * Delegated to AuthSessionService
   */
  async terminateSession(
    sessionId: number,
    userId: number,
    request: AuthRequest,
  ): Promise<SessionTerminatedResponseDto> {
    return this.authSessionService.terminateSession(sessionId, userId, request);
  }

  /**
   * Terminate all sessions for a user except current
   * Delegated to AuthSessionService
   */
  async terminateAllSessions(
    userId: number,
    currentTokenHash: string | null,
    request: AuthRequest,
  ): Promise<AllSessionsTerminatedResponseDto> {
    return this.authSessionService.terminateAllSessions(userId, currentTokenHash, request);
  }

  /**
   * Cleanup expired refresh tokens
   * Delegated to AuthSessionService
   */
  async cleanupExpiredTokens(): Promise<number> {
    return this.authSessionService.cleanupExpiredTokens();
  }

  /**
   * Update last_used_at for a token
   * Delegated to AuthSessionService
   */
  async updateTokenLastUsed(tokenHash: string): Promise<void> {
    return this.authSessionService.updateTokenLastUsed(tokenHash);
  }

  /**
   * Get token hash from token string
   * Delegated to AuthTokenService
   */
  getTokenHash(token: string): string {
    return this.authTokenService.getTokenHash(token);
  }

  /**
   * Decode and validate JWT token (for middleware/guards)
   * Delegated to AuthTokenService
   */
  decodeToken(token: string): JwtPayload | null {
    return this.authTokenService.decodeToken(token);
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
    await this.authTokenService.revokeAllRefreshTokens(userId);
    this.logger.log(
      `All tokens invalidated for user ${userId} due to role change`,
      'AuthService',
    );
  }

  // ===========================================
  // Delegated Password Reset Methods
  // ===========================================

  /**
   * Request password reset (forgot password)
   * Delegated to AuthPasswordService
   */
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
    request: AuthRequest,
  ): Promise<ForgotPasswordResponseDto> {
    return this.authPasswordService.forgotPassword(forgotPasswordDto, request);
  }

  /**
   * Execute password reset with token
   * Delegated to AuthPasswordService
   */
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
    request: AuthRequest,
  ): Promise<ResetPasswordResponseDto> {
    return this.authPasswordService.resetPassword(resetPasswordDto, request);
  }

  // ===========================================
  // Delegated User Registration Methods (STORY-023)
  // ===========================================

  /**
   * Register a new user
   * Delegated to AuthRegistrationService
   */
  async register(
    registerDto: RegisterDto,
    request: AuthRequest,
  ): Promise<RegisterResponseDto> {
    return this.authRegistrationService.register(registerDto, request);
  }

  /**
   * Verify user email address
   * Delegated to AuthRegistrationService
   */
  async verifyEmail(
    token: string,
    request: AuthRequest,
  ): Promise<VerifyEmailResponseDto> {
    return this.authRegistrationService.verifyEmail(token, request);
  }

  /**
   * Resend verification email
   * Delegated to AuthRegistrationService
   */
  async resendVerificationEmail(
    resendDto: ResendVerificationDto,
    request: AuthRequest,
  ): Promise<ResendVerificationResponseDto> {
    return this.authRegistrationService.resendVerificationEmail(resendDto, request);
  }
}
