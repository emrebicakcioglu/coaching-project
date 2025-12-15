/**
 * MFA Login Flow Unit Tests
 * STORY-005B: MFA Login-Flow (Backend)
 *
 * Tests for MFA login verification, temporary tokens, and rate limiting.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { MFAService } from '../../src/mfa/mfa.service';
import { DatabaseService } from '../../src/database/database.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';
import { AuditService } from '../../src/common/services/audit.service';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_code'),
  compare: jest.fn(),
}));

// Mock otplib
jest.mock('otplib', () => ({
  authenticator: {
    options: {},
    generateSecret: jest.fn().mockReturnValue('TESTBASE32SECRETKEY123456789012'),
    keyuri: jest.fn().mockReturnValue('otpauth://totp/CoreApp:test@example.com?secret=TESTBASE32SECRETKEY123456789012&issuer=CoreApp'),
    verify: jest.fn(),
  },
}));

import { authenticator } from 'otplib';

describe('MFAService - Login Flow (STORY-005B)', () => {
  let service: MFAService;

  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
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
    log: jest.fn().mockResolvedValue(null),
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
    process.env.JWT_SECRET = 'test_jwt_secret_minimum_32_characters_long';
    process.env.MFA_TEMP_TOKEN_SECRET = 'test_mfa_temp_secret_minimum_32_characters';
    process.env.MFA_TEMP_TOKEN_EXPIRY = '300';
    process.env.MFA_LOCKOUT_DURATION = '900';
    process.env.MFA_ISSUER = 'CoreApp';
    process.env.BCRYPT_ROUNDS = '12';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MFAService,
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
      ],
    }).compile();

    service = module.get<MFAService>(MFAService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTempToken', () => {
    it('should generate a valid temporary token with mfa_ prefix', () => {
      const token = service.generateTempToken(1, 'test@example.com');

      expect(token).toBeDefined();
      expect(token).toMatch(/^mfa_/);
      expect(token.split('.').length).toBe(3);
    });

    it('should generate tokens with different signatures for different users', () => {
      const token1 = service.generateTempToken(1, 'user1@example.com');
      const token2 = service.generateTempToken(2, 'user2@example.com');

      expect(token1).not.toBe(token2);
    });

    it('should include user ID and email in the token payload', () => {
      const token = service.generateTempToken(123, 'test@example.com');
      const { userId, email } = service.validateTempToken(token);

      expect(userId).toBe(123);
      expect(email).toBe('test@example.com');
    });
  });

  describe('validateTempToken', () => {
    it('should return user info for valid token', () => {
      const token = service.generateTempToken(1, 'test@example.com');
      const result = service.validateTempToken(token);

      expect(result.userId).toBe(1);
      expect(result.email).toBe('test@example.com');
    });

    it('should work with or without mfa_ prefix', () => {
      const token = service.generateTempToken(1, 'test@example.com');
      const tokenWithoutPrefix = token.replace('mfa_', '');

      const result1 = service.validateTempToken(token);
      const result2 = service.validateTempToken(tokenWithoutPrefix);

      expect(result1.userId).toBe(result2.userId);
      expect(result1.email).toBe(result2.email);
    });

    it('should throw UnauthorizedException for invalid token format', () => {
      expect(() => {
        service.validateTempToken('invalid_token');
      }).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for tampered token', () => {
      const token = service.generateTempToken(1, 'test@example.com');
      const tamperedToken = token.slice(0, -5) + 'xxxxx';

      expect(() => {
        service.validateTempToken(tamperedToken);
      }).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired token', () => {
      // Create a token with immediate expiry
      const originalExpiry = process.env.MFA_TEMP_TOKEN_EXPIRY;
      process.env.MFA_TEMP_TOKEN_EXPIRY = '-1'; // Expired immediately

      // Need to recreate service with new expiry
      const expiredService = new MFAService(
        mockDatabaseService as any,
        mockLogger as any,
        mockAuditService as any,
      );

      const token = expiredService.generateTempToken(1, 'test@example.com');

      process.env.MFA_TEMP_TOKEN_EXPIRY = originalExpiry;

      expect(() => {
        expiredService.validateTempToken(token);
      }).toThrow(UnauthorizedException);
    });
  });

  describe('Rate Limiting', () => {
    it('should not be locked out initially', () => {
      expect(service.isLockedOut(1)).toBe(false);
    });

    it('should return max attempts when no failures', () => {
      expect(service.getRemainingAttempts(1)).toBe(5);
    });

    it('should decrease remaining attempts after failures', async () => {
      await service.recordFailedAttempt(1, mockRequest);
      expect(service.getRemainingAttempts(1)).toBe(4);

      await service.recordFailedAttempt(1, mockRequest);
      expect(service.getRemainingAttempts(1)).toBe(3);
    });

    it('should lock user after max attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await service.recordFailedAttempt(1, mockRequest);
      }

      expect(service.isLockedOut(1)).toBe(true);
      expect(service.getRemainingAttempts(1)).toBe(0);
    });

    it('should log audit event on lockout', async () => {
      for (let i = 0; i < 5; i++) {
        await service.recordFailedAttempt(1, mockRequest);
      }

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MFA_LOCKOUT',
          userId: 1,
          level: 'warn',
        }),
      );
    });

    it('should clear attempts on success', async () => {
      await service.recordFailedAttempt(1, mockRequest);
      await service.recordFailedAttempt(1, mockRequest);

      expect(service.getRemainingAttempts(1)).toBe(3);

      service.clearAttempts(1);

      expect(service.getRemainingAttempts(1)).toBe(5);
      expect(service.isLockedOut(1)).toBe(false);
    });

    it('should track attempts per user separately', async () => {
      await service.recordFailedAttempt(1, mockRequest);
      await service.recordFailedAttempt(1, mockRequest);
      await service.recordFailedAttempt(2, mockRequest);

      expect(service.getRemainingAttempts(1)).toBe(3);
      expect(service.getRemainingAttempts(2)).toBe(4);
    });
  });

  describe('verifyMFALogin', () => {
    beforeEach(() => {
      // Reset attempts between tests
      service.clearAttempts(1);
    });

    it('should return user info on valid TOTP code', async () => {
      const tempToken = service.generateTempToken(1, 'test@example.com');

      mockPool.query.mockResolvedValueOnce({
        rows: [{ mfa_secret: 'TESTSECRET' }],
      });

      (authenticator.verify as jest.Mock).mockReturnValue(true);

      const result = await service.verifyMFALogin(tempToken, '123456', mockRequest);

      expect(result.userId).toBe(1);
      expect(result.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException on invalid TOTP code', async () => {
      const tempToken = service.generateTempToken(1, 'test@example.com');

      mockPool.query.mockResolvedValueOnce({
        rows: [{ mfa_secret: 'TESTSECRET' }],
      });

      (authenticator.verify as jest.Mock).mockReturnValue(false);

      await expect(
        service.verifyMFALogin(tempToken, '000000', mockRequest),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should include remaining attempts in error message', async () => {
      const tempToken = service.generateTempToken(1, 'test@example.com');

      mockPool.query.mockResolvedValue({
        rows: [{ mfa_secret: 'TESTSECRET' }],
      });

      (authenticator.verify as jest.Mock).mockReturnValue(false);

      try {
        await service.verifyMFALogin(tempToken, '000000', mockRequest);
      } catch (error: any) {
        expect(error.message).toContain('attempts remaining');
      }
    });

    it('should throw ForbiddenException when locked out', async () => {
      // Lock out the user first
      for (let i = 0; i < 5; i++) {
        await service.recordFailedAttempt(1, mockRequest);
      }

      const tempToken = service.generateTempToken(1, 'test@example.com');

      await expect(
        service.verifyMFALogin(tempToken, '123456', mockRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when MFA not configured', async () => {
      const tempToken = service.generateTempToken(1, 'test@example.com');

      mockPool.query.mockResolvedValueOnce({
        rows: [{ mfa_secret: null }],
      });

      await expect(
        service.verifyMFALogin(tempToken, '123456', mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should clear attempts after successful verification', async () => {
      // Record some failed attempts first
      await service.recordFailedAttempt(1, mockRequest);
      await service.recordFailedAttempt(1, mockRequest);

      const tempToken = service.generateTempToken(1, 'test@example.com');

      mockPool.query.mockResolvedValueOnce({
        rows: [{ mfa_secret: 'TESTSECRET' }],
      });

      (authenticator.verify as jest.Mock).mockReturnValue(true);

      await service.verifyMFALogin(tempToken, '123456', mockRequest);

      expect(service.getRemainingAttempts(1)).toBe(5);
    });

    it('should log audit event on successful MFA login', async () => {
      const tempToken = service.generateTempToken(1, 'test@example.com');

      mockPool.query.mockResolvedValueOnce({
        rows: [{ mfa_secret: 'TESTSECRET' }],
      });

      (authenticator.verify as jest.Mock).mockReturnValue(true);

      await service.verifyMFALogin(tempToken, '123456', mockRequest);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MFA_LOGIN_SUCCESS',
          userId: 1,
          details: expect.objectContaining({ method: 'TOTP' }),
        }),
      );
    });

    it('should log audit event on failed MFA login', async () => {
      const tempToken = service.generateTempToken(1, 'test@example.com');

      mockPool.query.mockResolvedValueOnce({
        rows: [{ mfa_secret: 'TESTSECRET' }],
      });

      (authenticator.verify as jest.Mock).mockReturnValue(false);

      await expect(
        service.verifyMFALogin(tempToken, '000000', mockRequest),
      ).rejects.toThrow();

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MFA_LOGIN_FAILED',
          userId: 1,
          level: 'warn',
        }),
      );
    });
  });

  describe('verifyBackupCodeLogin', () => {
    beforeEach(() => {
      service.clearAttempts(1);
    });

    it('should return user info and remaining count on valid backup code', async () => {
      const tempToken = service.generateTempToken(1, 'test@example.com');

      mockPool.query
        .mockResolvedValueOnce({
          // verifyBackupCode query
          rows: [{ id: 1, code_hash: 'hash1' }],
        })
        .mockResolvedValueOnce({}) // UPDATE backup code as used
        .mockResolvedValueOnce({
          // getRemainingBackupCodesCount
          rows: [{ count: '9' }],
        });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.verifyBackupCodeLogin(tempToken, 'TESTCODE', mockRequest);

      expect(result.userId).toBe(1);
      expect(result.email).toBe('test@example.com');
      expect(result.remainingBackupCodes).toBe(9);
    });

    it('should throw UnauthorizedException on invalid backup code', async () => {
      const tempToken = service.generateTempToken(1, 'test@example.com');

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, code_hash: 'hash1' }],
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.verifyBackupCodeLogin(tempToken, 'WRONGCODE', mockRequest),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when locked out', async () => {
      for (let i = 0; i < 5; i++) {
        await service.recordFailedAttempt(1, mockRequest);
      }

      const tempToken = service.generateTempToken(1, 'test@example.com');

      await expect(
        service.verifyBackupCodeLogin(tempToken, 'TESTCODE', mockRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should clear attempts after successful backup code verification', async () => {
      await service.recordFailedAttempt(1, mockRequest);
      await service.recordFailedAttempt(1, mockRequest);

      const tempToken = service.generateTempToken(1, 'test@example.com');

      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, code_hash: 'hash1' }],
        })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rows: [{ count: '9' }],
        });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.verifyBackupCodeLogin(tempToken, 'TESTCODE', mockRequest);

      expect(service.getRemainingAttempts(1)).toBe(5);
    });

    it('should log audit event with backup code method', async () => {
      const tempToken = service.generateTempToken(1, 'test@example.com');

      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, code_hash: 'hash1' }],
        })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rows: [{ count: '9' }],
        });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.verifyBackupCodeLogin(tempToken, 'TESTCODE', mockRequest);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MFA_LOGIN_SUCCESS',
          userId: 1,
          details: expect.objectContaining({
            method: 'BACKUP_CODE',
            remainingBackupCodes: 9,
          }),
        }),
      );
    });
  });
});
