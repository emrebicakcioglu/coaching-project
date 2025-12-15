/**
 * Auth Controller
 * STORY-021B: Resource Endpoints
 * STORY-022: Swagger/OpenAPI Documentation
 * STORY-008: Session Management mit "Remember Me"
 * STORY-023: User Registration
 * STORY-CAPTCHA: Login Security with CAPTCHA
 *
 * REST API controller for authentication operations.
 * Provides endpoints for login, logout, token refresh, password reset,
 * session management, user registration, and login security features.
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  Headers,
  UnauthorizedException,
  BadRequestException,
  ParseIntPipe,
  Inject,
  forwardRef,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,

  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginSecurityService } from './login-security.service';
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
import {
  RegisterDto,
  RegisterResponseDto,
  VerifyEmailQueryDto,
  VerifyEmailResponseDto,
  RegisterErrorResponseDto,
  ResendVerificationDto,
  ResendVerificationResponseDto,
} from './dto/register.dto';
import {
  LoginSecurityStatusDto,
  CaptchaResponseDto,
} from './dto/login-security.dto';
import { RateLimit } from '../common/guards/rate-limit.guard';

interface AuthRequest extends Request {
  user?: { id?: number; email?: string };
  requestId?: string;
}

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    @Inject(forwardRef(() => LoginSecurityService))
    private readonly loginSecurityService: LoginSecurityService,
  ) {}

  @Get('login-status')
  @RateLimit(30, 60)
  @ApiOperation({
    summary: 'Get login security status',
    description: 'Check if CAPTCHA is required and get delay information.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login security status',
    type: LoginSecurityStatusDto,
  })
  async getLoginStatus(
    @Req() request: AuthRequest,
  ): Promise<LoginSecurityStatusDto> {
    const clientIp = this.getClientIp(request);
    return this.loginSecurityService.getStatus(clientIp);
  }

  @Get('captcha')
  @RateLimit(30, 60)
  @ApiOperation({
    summary: 'Get CAPTCHA challenge',
    description: 'Generate a new CAPTCHA challenge for login verification.',
  })
  @ApiResponse({
    status: 200,
    description: 'CAPTCHA challenge generated',
    type: CaptchaResponseDto,
  })
  async getCaptcha(): Promise<CaptchaResponseDto> {
    return this.loginSecurityService.generateCaptcha();
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit(5, 60)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate with email and password. After 2 failed attempts, CAPTCHA is required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or CAPTCHA required' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: AuthRequest,
  ): Promise<AuthResponseDto> {
    const clientIp = this.getClientIp(request);
    const securityStatus = this.loginSecurityService.getStatus(clientIp);

    if (securityStatus.requiresCaptcha) {
      if (!loginDto.captchaId || !loginDto.captchaAnswer) {
        const captcha = this.loginSecurityService.generateCaptcha();
        throw new BadRequestException({
          message: 'CAPTCHA erforderlich',
          requiresCaptcha: true,
          captcha,
          delaySeconds: securityStatus.delaySeconds,
        });
      }

      const captchaValid = this.loginSecurityService.verifyCaptcha(
        loginDto.captchaId,
        loginDto.captchaAnswer,
      );

      if (!captchaValid) {
        const captcha = this.loginSecurityService.generateCaptcha();
        throw new BadRequestException({
          message: 'Falsche CAPTCHA-Antwort',
          requiresCaptcha: true,
          captcha,
          delaySeconds: securityStatus.delaySeconds,
        });
      }

      await this.loginSecurityService.applyDelay(clientIp);
    }

    try {
      const result = await this.authService.login(loginDto, request);
      this.loginSecurityService.clearAttempts(clientIp);
      return result;
    } catch (error) {
      this.loginSecurityService.recordFailedAttempt(clientIp);
      const updatedStatus = this.loginSecurityService.getStatus(clientIp);

      if (updatedStatus.requiresCaptcha) {
        const captcha = this.loginSecurityService.generateCaptcha();
        if (error instanceof UnauthorizedException) {
          throw new UnauthorizedException({
            message: error.message || 'Invalid email or password',
            requiresCaptcha: true,
            captcha,
            delaySeconds: updatedStatus.delaySeconds,
            failedAttempts: updatedStatus.failedAttempts,
          });
        }
      }
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @RateLimit(30, 60)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'User logout',
    description: 'Invalidate the refresh token and end the user session.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    type: LogoutResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Headers('authorization') authHeader: string,
    @Req() request: AuthRequest,
  ): Promise<LogoutResponseDto> {
    const userId = this.extractUserIdFromAuthHeader(authHeader);
    return this.authService.logout(refreshTokenDto, userId, request);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @RateLimit(30, 60)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Exchange a valid refresh token for a new access token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: TokenRefreshResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() request: AuthRequest,
  ): Promise<TokenRefreshResponseDto> {
    return this.authService.refresh(refreshTokenDto, request);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @RateLimit(5, 60)
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Send a password reset link to the user email address.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (if email exists)',
    type: ForgotPasswordResponseDto,
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Req() request: AuthRequest,
  ): Promise<ForgotPasswordResponseDto> {
    return this.authService.forgotPassword(forgotPasswordDto, request);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @RateLimit(10, 60)
  @ApiOperation({
    summary: 'Reset password',
    description: 'Reset user password using a valid reset token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
    type: ResetPasswordResponseDto,
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Req() request: AuthRequest,
  ): Promise<ResetPasswordResponseDto> {
    return this.authService.resetPassword(resetPasswordDto, request);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @RateLimit(3, 3600)
  @ApiOperation({
    summary: 'Register new user',
    description: 'Create a new user account.',
  })
  @ApiResponse({
    status: 201,
    description: 'Registration successful',
    type: RegisterResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
    type: RegisterErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
    type: RegisterErrorResponseDto,
  })
  async register(
    @Body() registerDto: RegisterDto,
    @Req() request: AuthRequest,
  ): Promise<RegisterResponseDto> {
    return this.authService.register(registerDto, request);
  }

  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @RateLimit(10, 60)
  @ApiOperation({
    summary: 'Verify email address',
    description: 'Verify user email address using the token from the verification email.',
  })
  @ApiQuery({
    name: 'token',
    description: 'Email verification token',
    required: true,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    type: VerifyEmailResponseDto,
  })
  async verifyEmail(
    @Query() query: VerifyEmailQueryDto,
    @Req() request: AuthRequest,
  ): Promise<VerifyEmailResponseDto> {
    return this.authService.verifyEmail(query.token, request);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @RateLimit(3, 3600)
  @ApiOperation({
    summary: 'Resend verification email',
    description: 'Resend the verification email to the provided email address.',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent',
    type: ResendVerificationResponseDto,
  })
  async resendVerification(
    @Body() resendDto: ResendVerificationDto,
    @Req() request: AuthRequest,
  ): Promise<ResendVerificationResponseDto> {
    return this.authService.resendVerificationEmail(resendDto, request);
  }

  @Get('sessions')
  @RateLimit(30, 60)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Get active sessions',
    description: 'Retrieve a list of all active sessions for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active sessions',
    type: SessionsListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSessions(
    @Headers('authorization') authHeader: string,
    @Body() body?: { refresh_token?: string },
  ): Promise<SessionsListResponseDto> {
    const userId = this.extractUserIdFromAuthHeader(authHeader);
    let currentTokenHash: string | undefined;
    if (body?.refresh_token) {
      currentTokenHash = this.authService.getTokenHash(body.refresh_token);
    }
    return this.authService.getSessions(userId, currentTokenHash);
  }

  @Delete('sessions/all')
  @HttpCode(HttpStatus.OK)
  @RateLimit(10, 60)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Terminate all sessions',
    description: 'Terminate all active sessions for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'All sessions terminated successfully',
    type: AllSessionsTerminatedResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async terminateAllSessions(
    @Headers('authorization') authHeader: string,
    @Req() request: AuthRequest,
    @Body() body?: { refresh_token?: string; keepCurrent?: boolean },
  ): Promise<AllSessionsTerminatedResponseDto> {
    const userId = this.extractUserIdFromAuthHeader(authHeader);
    let currentTokenHash: string | null = null;
    if (body?.keepCurrent && body?.refresh_token) {
      currentTokenHash = this.authService.getTokenHash(body.refresh_token);
    }
    return this.authService.terminateAllSessions(userId, currentTokenHash, request);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  @RateLimit(30, 60)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Terminate a session',
    description: 'Terminate a specific session by ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Session ID to terminate',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Session terminated successfully',
    type: SessionTerminatedResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async terminateSession(
    @Param('id', ParseIntPipe) sessionId: number,
    @Headers('authorization') authHeader: string,
    @Req() request: AuthRequest,
  ): Promise<SessionTerminatedResponseDto> {
    const userId = this.extractUserIdFromAuthHeader(authHeader);
    return this.authService.terminateSession(sessionId, userId, request);
  }

  private extractUserIdFromAuthHeader(authHeader: string): number {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header is required');
    }
    const token = authHeader.slice(7);
    const payload = this.authService.decodeToken(token);
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return payload.sub;
  }

  private getClientIp(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips.trim();
    }
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }
    return request.ip || request.socket?.remoteAddress || 'unknown';
  }
}
