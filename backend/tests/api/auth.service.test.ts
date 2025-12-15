/**
 * Auth Service Unit Tests
 * STORY-021B: Resource Endpoints
 *
 * Tests for authentication operations.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from '../../src/auth/auth.service';
import { DatabaseService } from '../../src/database/database.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';
import { AuditService } from '../../src/common/services/audit.service';
import { UsersService } from '../../src/users/users.service';
import { EmailService } from '../../src/email/email.service';
import { LoginDto } from '../../src/auth/dto/login.dto';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockPool = {
    query: jest.fn(),
  };

  const mockDatabaseService = {
    getPool: jest.fn().mockReturnValue(mockPool),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockAuditService = {
    logLogin: jest.fn().mockResolvedValue(null),
    logLogout: jest.fn().mockResolvedValue(null),
    logLoginFailed: jest.fn().mockResolvedValue(null),
    logPasswordChange: jest.fn().mockResolvedValue(null),
  };

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    password_hash: 'hashed_password',
    name: 'Test User',
    status: 'active',
    mfa_enabled: false,
    mfa_secret: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    last_login: null,
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    updateLastLogin: jest.fn(),
  };

  // STORY-009: Mock EmailService for password reset
  const mockEmailService = {
    sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
    sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
    sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
  };

  const mockRequest: any = {
    headers: {
      'user-agent': 'Test Agent',
      'x-forwarded-for': '127.0.0.1',
    },
    ip: '127.0.0.1',
    requestId: 'test-request-id',
  };

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-chars-long';
    process.env.JWT_EXPIRES_IN = '24h';
    process.env.JWT_REFRESH_EXPIRES_IN = '30d';
    process.env.BCRYPT_ROUNDS = '12';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: WinstonLoggerService,
          useValue: mockLogger,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        // STORY-009: Add EmailService mock
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login a user', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPool.query.mockResolvedValue({ rows: [{ id: 1 }] }); // For refresh token insert

      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'Password123',
      };

      const result = await service.login(loginDto, mockRequest);

      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
      expect(result.token_type).toBe('Bearer');
      expect(result.user.email).toBe('test@example.com');
      expect(mockAuditService.logLogin).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const loginDto: LoginDto = {
        email: 'notfound@example.com',
        password: 'Password123',
      };

      await expect(service.login(loginDto, mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockAuditService.logLoginFailed).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      await expect(service.login(loginDto, mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockAuditService.logLoginFailed).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const inactiveUser = { ...mockUser, status: 'inactive' };
      mockUsersService.findByEmail.mockResolvedValue(inactiveUser);

      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'Password123',
      };

      await expect(service.login(loginDto, mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for suspended user', async () => {
      const suspendedUser = { ...mockUser, status: 'suspended' };
      mockUsersService.findByEmail.mockResolvedValue(suspendedUser);

      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'Password123',
      };

      await expect(service.login(loginDto, mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should successfully logout a user', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.logout(
        { refresh_token: 'test-refresh-token' },
        1,
        mockRequest,
      );

      expect(result.message).toBe('Logged out successfully');
      expect(mockAuditService.logLogout).toHaveBeenCalledWith(1, mockRequest);
    });
  });

  describe('refresh', () => {
    it('should successfully refresh tokens', async () => {
      const mockRefreshToken = {
        id: 1,
        user_id: 1,
        token_hash: 'hashed_token',
        expires_at: new Date(Date.now() + 86400000),
        revoked_at: null,
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockRefreshToken] }) // Validate token
        .mockResolvedValueOnce({ rows: [] }) // Revoke old token
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }); // Insert new token

      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await service.refresh(
        { refresh_token: 'test-refresh-token' },
        mockRequest,
      );

      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
      expect(result.token_type).toBe('Bearer');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.refresh({ refresh_token: 'invalid-token' }, mockRequest),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired refresh token', async () => {
      // Expired tokens are filtered out by the database query (expires_at > NOW())
      // so the query returns empty rows, triggering UnauthorizedException
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.refresh({ refresh_token: 'expired-token' }, mockRequest),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const mockRefreshToken = {
        id: 1,
        user_id: 999,
        token_hash: 'hashed_token',
        expires_at: new Date(Date.now() + 86400000),
        revoked_at: null,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockRefreshToken] });
      mockUsersService.findById.mockResolvedValue(null);

      await expect(
        service.refresh({ refresh_token: 'test-token' }, mockRequest),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('should return success message regardless of email existence', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword(
        { email: 'notfound@example.com' },
        mockRequest,
      );

      expect(result.message).toBe(
        'If the email exists, a password reset link has been sent',
      );
    });

    it('should generate reset token when email exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockPool.query.mockResolvedValue({ rows: [{ id: 1 }] });

      const result = await service.forgotPassword(
        { email: 'test@example.com' },
        mockRequest,
      );

      expect(result.message).toBe(
        'If the email exists, a password reset link has been sent',
      );
      expect(mockPool.query).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset password', async () => {
      const mockResetToken = {
        id: 1,
        user_id: 1,
        token_hash: 'hashed_token',
        device_info: 'PASSWORD_RESET',
        expires_at: new Date(Date.now() + 3600000),
        revoked_at: null,
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockResetToken] }) // Validate token
        .mockResolvedValueOnce({ rows: [] }) // Update password
        .mockResolvedValueOnce({ rows: [] }) // Invalidate token
        .mockResolvedValueOnce({ rows: [] }); // Revoke all refresh tokens

      const result = await service.resetPassword(
        { token: 'valid-reset-token', new_password: 'NewPassword123' },
        mockRequest,
      );

      expect(result.message).toBe('Password has been reset successfully');
      expect(mockAuditService.logPasswordChange).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid reset token', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.resetPassword(
          { token: 'invalid-token', new_password: 'NewPassword123' },
          mockRequest,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('decodeToken', () => {
    it('should decode a valid token', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPool.query.mockResolvedValue({ rows: [{ id: 1 }] });

      const loginResult = await service.login(
        { email: 'test@example.com', password: 'Password123' },
        mockRequest,
      );

      const payload = service.decodeToken(loginResult.access_token);

      expect(payload).toBeDefined();
      expect(payload?.sub).toBe(1);
      expect(payload?.email).toBe('test@example.com');
    });

    it('should return null for invalid token format', () => {
      const payload = service.decodeToken('invalid-token');
      expect(payload).toBeNull();
    });

    it('should return null for expired token', () => {
      // Create a mock expired token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwMDAxfQ.invalid';

      const payload = service.decodeToken(expiredToken);
      expect(payload).toBeNull();
    });

    it('should return null for token with invalid signature', () => {
      const tokenWithBadSignature = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6OTk5OTk5OTk5OSwiZXhwIjo5OTk5OTk5OTk5OX0.wrong-signature';

      const payload = service.decodeToken(tokenWithBadSignature);
      expect(payload).toBeNull();
    });
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'Password123');

      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('notfound@example.com', 'Password123');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'WrongPassword');

      expect(result).toBeNull();
    });
  });
});
