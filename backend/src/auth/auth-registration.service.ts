/**
 * Auth Registration Service
 * Handles user registration and email verification.
 *
 * Extracted from AuthService during refactoring.
 * Contains:
 * - register
 * - verifyEmail
 * - resendVerificationEmail
 * - resendVerificationInternal
 */

import {
  Injectable,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { WinstonLoggerService } from '../common/services/logger.service';
import { AuditService } from '../common/services/audit.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { UserRepository } from '../users/user.repository';
import { User } from '../database/types';
import {
  RegisterDto,
  RegisterResponseDto,
  VerifyEmailResponseDto,
  ResendVerificationDto,
  ResendVerificationResponseDto,
} from './dto/register.dto';
import { AuthRequest } from './auth.types';
import { AuthTokenService } from './auth-token.service';

@Injectable()
export class AuthRegistrationService {
  private readonly bcryptRounds: number;

  constructor(
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => EmailService))
    private readonly emailService: EmailService,
    @Inject(forwardRef(() => UserRepository))
    private readonly userRepository: UserRepository,
    @Inject(forwardRef(() => AuthTokenService))
    private readonly authTokenService: AuthTokenService,
  ) {
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  }

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
    const expiresInSeconds = this.authTokenService.parseExpiresIn(tokenExpiry);
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
        'AuthRegistrationService',
      );
    } catch (error) {
      this.logger.error(
        `Failed to send verification email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'AuthRegistrationService',
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

    this.logger.log(`User registered: ${newUser.email}`, 'AuthRegistrationService');

    // In development, log the token for testing
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(
        `Verification token (DEV ONLY): ${verificationToken}`,
        'AuthRegistrationService',
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
      'AuthRegistrationService',
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
  async resendVerificationInternal(
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
    const expiresInSeconds = this.authTokenService.parseExpiresIn(tokenExpiry);
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
        'AuthRegistrationService',
      );
    } catch (error) {
      this.logger.error(
        `Failed to resend verification email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'AuthRegistrationService',
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
        'AuthRegistrationService',
      );
    }

    return {
      message:
        'Registration successful. Please check your email to verify your account.',
      userId: user.id,
    };
  }
}
