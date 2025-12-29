/**
 * Auth Password Service
 * Handles password reset operations.
 *
 * Extracted from AuthService during refactoring.
 * Contains:
 * - forgotPassword
 * - resetPassword
 * - generatePasswordResetToken
 * - validatePasswordResetToken
 * - invalidatePasswordResetToken
 */

import {
  Injectable,
  BadRequestException,
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
import { RefreshToken } from '../database/types';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import {
  ForgotPasswordResponseDto,
  ResetPasswordResponseDto,
} from './dto/auth-response.dto';
import { AuthRequest } from './auth.types';
import { AuthTokenService } from './auth-token.service';

@Injectable()
export class AuthPasswordService {
  private readonly bcryptRounds: number;

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
    @Inject(forwardRef(() => AuthTokenService))
    private readonly authTokenService: AuthTokenService,
  ) {
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
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
        'AuthPasswordService',
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
          'AuthPasswordService',
        );
      } catch (error) {
        // Log error but don't fail - we don't want to reveal if the email exists
        this.logger.error(
          `Failed to send password reset email: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : undefined,
          'AuthPasswordService',
        );
      }

      // In development, also log the token for testing
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(
          `Password reset token (DEV ONLY): ${resetToken}`,
          'AuthPasswordService',
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
    const pool = this.databaseService.ensurePool();

    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, userId],
    );

    // Invalidate the reset token
    await this.invalidatePasswordResetToken(token);

    // Revoke all refresh tokens for security
    await this.authTokenService.revokeAllRefreshTokens(userId);

    // Log password change
    await this.auditService.logPasswordChange(userId, request);

    this.logger.log(`Password reset completed for user ID: ${userId}`, 'AuthPasswordService');

    return { message: 'Password has been reset successfully' };
  }

  /**
   * Generate password reset token
   * Stores token in a temporary table or uses refresh_tokens with special flag
   */
  async generatePasswordResetToken(userId: number): Promise<string> {
    const pool = this.databaseService.ensurePool();

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
  async validatePasswordResetToken(token: string): Promise<number> {
    const pool = this.databaseService.ensurePool();

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
  async invalidatePasswordResetToken(token: string): Promise<void> {
    const pool = this.databaseService.ensurePool();

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`,
      [tokenHash],
    );
  }
}
