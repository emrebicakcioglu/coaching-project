/**
 * Auth Controller Unit Tests
 * STORY-021B: Resource Endpoints
 *
 * Tests for authentication endpoints.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { LoginDto } from '../../src/auth/dto/login.dto';
import { RefreshTokenDto } from '../../src/auth/dto/refresh-token.dto';
import { ForgotPasswordDto, ResetPasswordDto } from '../../src/auth/dto/password-reset.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthResponse = {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    token_type: 'Bearer',
    expires_in: 86400,
    user: {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      status: 'active',
      mfa_enabled: false,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
      last_login: null,
    },
  };

  const mockRefreshResponse = {
    access_token: 'new-access-token',
    refresh_token: 'new-refresh-token',
    token_type: 'Bearer',
    expires_in: 86400,
  };

  const mockRequest: any = {
    headers: {
      'user-agent': 'Test Agent',
      'x-forwarded-for': '127.0.0.1',
    },
    ip: '127.0.0.1',
    requestId: 'test-request-id',
  };

  const mockAuthService = {
    login: jest.fn(),
    logout: jest.fn(),
    refresh: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    decodeToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login a user', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'Password123',
      };

      const result = await controller.login(loginDto, mockRequest);

      expect(result).toEqual(mockAuthResponse);
      expect(service.login).toHaveBeenCalledWith(loginDto, mockRequest);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid email or password'),
      );

      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      await expect(controller.login(loginDto, mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should successfully logout a user', async () => {
      mockAuthService.logout.mockResolvedValue({ message: 'Logged out successfully' });
      mockAuthService.decodeToken.mockReturnValue({ sub: 1, email: 'test@example.com' });

      const refreshTokenDto: RefreshTokenDto = {
        refresh_token: 'test-refresh-token',
      };

      const result = await controller.logout(
        refreshTokenDto,
        'Bearer valid-access-token',
        mockRequest,
      );

      expect(result.message).toBe('Logged out successfully');
      expect(service.logout).toHaveBeenCalledWith(refreshTokenDto, 1, mockRequest);
    });

    it('should throw UnauthorizedException when no auth header', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refresh_token: 'test-refresh-token',
      };

      await expect(
        controller.logout(refreshTokenDto, '', mockRequest),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockAuthService.decodeToken.mockReturnValue(null);

      const refreshTokenDto: RefreshTokenDto = {
        refresh_token: 'test-refresh-token',
      };

      await expect(
        controller.logout(refreshTokenDto, 'Bearer invalid-token', mockRequest),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should successfully refresh tokens', async () => {
      mockAuthService.refresh.mockResolvedValue(mockRefreshResponse);

      const refreshTokenDto: RefreshTokenDto = {
        refresh_token: 'test-refresh-token',
      };

      const result = await controller.refresh(refreshTokenDto, mockRequest);

      expect(result).toEqual(mockRefreshResponse);
      expect(service.refresh).toHaveBeenCalledWith(refreshTokenDto, mockRequest);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockAuthService.refresh.mockRejectedValue(
        new UnauthorizedException('Invalid or expired refresh token'),
      );

      const refreshTokenDto: RefreshTokenDto = {
        refresh_token: 'invalid-token',
      };

      await expect(controller.refresh(refreshTokenDto, mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('forgotPassword', () => {
    it('should return success message', async () => {
      mockAuthService.forgotPassword.mockResolvedValue({
        message: 'If the email exists, a password reset link has been sent',
      });

      const forgotPasswordDto: ForgotPasswordDto = {
        email: 'test@example.com',
      };

      const result = await controller.forgotPassword(forgotPasswordDto, mockRequest);

      expect(result.message).toBe(
        'If the email exists, a password reset link has been sent',
      );
      expect(service.forgotPassword).toHaveBeenCalledWith(
        forgotPasswordDto,
        mockRequest,
      );
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset password', async () => {
      mockAuthService.resetPassword.mockResolvedValue({
        message: 'Password has been reset successfully',
      });

      const resetPasswordDto: ResetPasswordDto = {
        token: 'valid-reset-token',
        new_password: 'NewPassword123',
      };

      const result = await controller.resetPassword(resetPasswordDto, mockRequest);

      expect(result.message).toBe('Password has been reset successfully');
      expect(service.resetPassword).toHaveBeenCalledWith(
        resetPasswordDto,
        mockRequest,
      );
    });

    it('should throw BadRequestException for invalid reset token', async () => {
      mockAuthService.resetPassword.mockRejectedValue(
        new BadRequestException('Invalid or expired reset token'),
      );

      const resetPasswordDto: ResetPasswordDto = {
        token: 'invalid-token',
        new_password: 'NewPassword123',
      };

      await expect(
        controller.resetPassword(resetPasswordDto, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
