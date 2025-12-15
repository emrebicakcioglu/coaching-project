/**
 * MFA Controller
 * STORY-005A: MFA Setup (Backend)
 * STORY-005B: MFA Login-Flow (Backend)
 *
 * REST API controller for Multi-Factor Authentication operations.
 * Provides endpoints for MFA setup, verification, and login verification.
 *
 * Routes:
 * - POST /api/auth/mfa/setup             - Initiate MFA setup (requires JWT)
 * - POST /api/auth/mfa/verify-setup      - Verify and enable MFA (requires JWT)
 * - POST /api/auth/mfa/verify-login      - Verify TOTP code during login (requires temp token)
 * - POST /api/auth/mfa/verify-backup-code - Verify backup code during login (requires temp token)
 *
 * Setup endpoints require a valid JWT token for authentication.
 * Login verification endpoints require a temporary token from the login flow.
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
  Req,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { Request } from 'express';
import { MFAService } from './mfa.service';
import { AuthService } from '../auth/auth.service';
import { MFASetupResponseDto } from './dto/mfa-setup.dto';
import { MFAVerifySetupDto, MFAVerifyResponseDto } from './dto/mfa-verify.dto';
import {
  MFAVerifyLoginDto,
  MFAVerifyBackupCodeDto,
  MFALoginSuccessResponseDto,
} from './dto/mfa-login.dto';
import { RateLimit } from '../common/guards/rate-limit.guard';

/**
 * Extended Request interface with user info
 */
interface AuthRequest extends Request {
  user?: { id?: number; email?: string };
  requestId?: string;
}

/**
 * MFA Controller
 * Handles all MFA-related HTTP requests
 */
@ApiTags('MFA')
@Controller('api/auth/mfa')
export class MFAController {
  constructor(
    @Inject(forwardRef(() => MFAService))
    private readonly mfaService: MFAService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  /**
   * Initiate MFA setup
   * Generates TOTP secret, QR code URL, and backup codes
   */
  @Post('setup')
  @HttpCode(HttpStatus.OK)
  @RateLimit(10, 60) // 10 requests per minute
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Initiate MFA setup',
    description: 'Generate TOTP secret, QR code URL, and backup codes for MFA setup. Requires JWT authentication.',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer JWT access token',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiResponse({
    status: 200,
    description: 'MFA setup initiated successfully',
    type: MFASetupResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or expired token' })
  @ApiResponse({ status: 409, description: 'Conflict - MFA is already enabled' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async setupMFA(
    @Headers('authorization') authHeader: string,
    @Req() request: AuthRequest,
  ): Promise<MFASetupResponseDto> {
    const { userId, email } = this.extractUserFromAuthHeader(authHeader);
    return this.mfaService.setupMFA(userId, email, request);
  }

  /**
   * Verify MFA setup and enable MFA
   * User submits a 6-digit TOTP code to verify and enable MFA
   */
  @Post('verify-setup')
  @HttpCode(HttpStatus.OK)
  @RateLimit(5, 60) // 5 attempts per minute (strict to prevent brute force)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Verify and enable MFA',
    description: 'Verify TOTP code from authenticator app to enable MFA. Requires JWT authentication.',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer JWT access token',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiResponse({
    status: 200,
    description: 'MFA enabled successfully',
    type: MFAVerifyResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid verification code or MFA not initiated' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or expired token' })
  @ApiResponse({ status: 409, description: 'Conflict - MFA is already enabled' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async verifySetup(
    @Body() verifyDto: MFAVerifySetupDto,
    @Headers('authorization') authHeader: string,
    @Req() request: AuthRequest,
  ): Promise<MFAVerifyResponseDto> {
    const { userId } = this.extractUserFromAuthHeader(authHeader);
    return this.mfaService.verifySetup(userId, verifyDto.code, request);
  }

  // ===========================================
  // STORY-005B: MFA Login Verification Endpoints
  // ===========================================

  /**
   * Verify TOTP code during login
   * Called after receiving tempToken from login endpoint
   * Does NOT require JWT - uses temporary MFA token instead
   */
  @Post('verify-login')
  @HttpCode(HttpStatus.OK)
  @RateLimit(5, 60) // 5 attempts per minute (strict to prevent brute force)
  @ApiOperation({
    summary: 'Verify MFA code during login',
    description: 'Complete MFA login by verifying the 6-digit TOTP code. Requires the temporary token from the initial login response.',
  })
  @ApiResponse({
    status: 200,
    description: 'MFA verification successful, returns final JWT tokens',
    type: MFALoginSuccessResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid code format' })
  @ApiResponse({ status: 401, description: 'Invalid or expired temporary token, or invalid MFA code' })
  @ApiResponse({ status: 403, description: 'Account locked due to too many failed attempts' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async verifyLogin(
    @Body() verifyDto: MFAVerifyLoginDto,
    @Req() request: AuthRequest,
  ): Promise<MFALoginSuccessResponseDto> {
    return this.authService.completeMFALogin(
      verifyDto.tempToken,
      verifyDto.code,
      request,
    );
  }

  /**
   * Verify backup code during login
   * Called after receiving tempToken from login endpoint
   * Does NOT require JWT - uses temporary MFA token instead
   */
  @Post('verify-backup-code')
  @HttpCode(HttpStatus.OK)
  @RateLimit(5, 60) // 5 attempts per minute (strict to prevent brute force)
  @ApiOperation({
    summary: 'Verify backup code during login',
    description: 'Complete MFA login using a backup code. The backup code will be marked as used and cannot be reused. Returns the count of remaining backup codes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Backup code verification successful, returns final JWT tokens and remaining codes count',
    type: MFALoginSuccessResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid backup code format' })
  @ApiResponse({ status: 401, description: 'Invalid or expired temporary token, or invalid backup code' })
  @ApiResponse({ status: 403, description: 'Account locked due to too many failed attempts' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async verifyBackupCode(
    @Body() verifyDto: MFAVerifyBackupCodeDto,
    @Req() request: AuthRequest,
  ): Promise<MFALoginSuccessResponseDto> {
    return this.authService.completeMFALoginWithBackupCode(
      verifyDto.tempToken,
      verifyDto.backupCode,
      request,
    );
  }

  // ===========================================
  // Private Helper Methods
  // ===========================================

  /**
   * Extract user ID and email from Authorization header
   * Decodes the JWT token to get user information
   *
   * @param authHeader - Authorization header value
   * @returns User ID and email
   * @throws UnauthorizedException if token is invalid
   */
  private extractUserFromAuthHeader(authHeader: string): { userId: number; email: string } {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authHeader.slice(7);
    const payload = this.authService.decodeToken(token);

    if (!payload || !payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return {
      userId: payload.sub,
      email: payload.email,
    };
  }
}
