/**
 * MFA Service Unit Tests
 * STORY-005A: MFA Setup (Backend)
 *
 * Tests for MFA setup, verification, and backup code operations.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
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

describe('MFAService', () => {
  let service: MFAService;

  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
  };

  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
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
    process.env.MFA_ISSUER = 'CoreApp';
    process.env.BCRYPT_ROUNDS = '12';

    mockPool.connect.mockResolvedValue(mockClient);

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
    mockPool.connect.mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setupMFA', () => {
    it('should generate TOTP secret and backup codes', async () => {
      // Mock user without MFA enabled
      mockPool.query.mockResolvedValueOnce({
        rows: [{ mfa_enabled: false, mfa_secret: null }],
      });

      // Setup client mock for transaction
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // UPDATE users
        .mockResolvedValueOnce({}) // DELETE backup codes
        .mockResolvedValue({}) // INSERT backup codes (10 times)
        .mockResolvedValueOnce({}); // COMMIT

      const result = await service.setupMFA(1, 'test@example.com', mockRequest);

      expect(result.secret).toBeDefined();
      expect(result.secret).toBe('TESTBASE32SECRETKEY123456789012');
      expect(result.qrCodeUrl).toBeDefined();
      expect(result.qrCodeUrl).toContain('otpauth://totp/');
      expect(result.backupCodes).toBeDefined();
      expect(result.backupCodes).toHaveLength(10);
      expect(authenticator.generateSecret).toHaveBeenCalledWith(32);
    });

    it('should throw ConflictException if MFA is already enabled', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ mfa_enabled: true, mfa_secret: 'existing_secret' }],
      });

      await expect(
        service.setupMFA(1, 'test@example.com', mockRequest),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if user not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      await expect(
        service.setupMFA(1, 'test@example.com', mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should generate unique backup codes', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ mfa_enabled: false, mfa_secret: null }],
      });

      mockClient.query.mockResolvedValue({});

      const result = await service.setupMFA(1, 'test@example.com', mockRequest);

      // Check backup codes are unique
      const uniqueCodes = new Set(result.backupCodes);
      expect(uniqueCodes.size).toBe(10);

      // Check backup codes are 8 characters
      result.backupCodes.forEach((code) => {
        expect(code).toHaveLength(8);
        // Should only contain allowed characters (no 0, O, 1, I)
        expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
      });
    });

    it('should log audit event on setup initiation', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ mfa_enabled: false, mfa_secret: null }],
      });

      mockClient.query.mockResolvedValue({});

      await service.setupMFA(1, 'test@example.com', mockRequest);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MFA_SETUP_INITIATED',
          userId: 1,
          resource: 'mfa',
        }),
      );
    });
  });

  describe('verifySetup', () => {
    it('should enable MFA on valid code verification', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ mfa_enabled: false, mfa_secret: 'TESTSECRET' }],
        })
        .mockResolvedValueOnce({}); // UPDATE users

      (authenticator.verify as jest.Mock).mockReturnValue(true);

      const result = await service.verifySetup(1, '123456', mockRequest);

      expect(result.enabled).toBe(true);
      expect(result.message).toBe('MFA enabled successfully');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET mfa_enabled = TRUE'),
        [1],
      );
    });

    it('should throw BadRequestException on invalid code', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ mfa_enabled: false, mfa_secret: 'TESTSECRET' }],
      });

      (authenticator.verify as jest.Mock).mockReturnValue(false);

      await expect(service.verifySetup(1, '000000', mockRequest)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException if MFA already enabled', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ mfa_enabled: true, mfa_secret: 'TESTSECRET' }],
      });

      await expect(service.verifySetup(1, '123456', mockRequest)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException if setup not initiated', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ mfa_enabled: false, mfa_secret: null }],
      });

      await expect(service.verifySetup(1, '123456', mockRequest)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should log audit event on successful verification', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ mfa_enabled: false, mfa_secret: 'TESTSECRET' }],
        })
        .mockResolvedValueOnce({});

      (authenticator.verify as jest.Mock).mockReturnValue(true);

      await service.verifySetup(1, '123456', mockRequest);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MFA_ENABLED',
          userId: 1,
          resource: 'mfa',
        }),
      );
    });

    it('should log audit event on failed verification', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ mfa_enabled: false, mfa_secret: 'TESTSECRET' }],
      });

      (authenticator.verify as jest.Mock).mockReturnValue(false);

      await expect(service.verifySetup(1, '000000', mockRequest)).rejects.toThrow();

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MFA_VERIFY_FAILED',
          userId: 1,
          level: 'warn',
        }),
      );
    });
  });

  describe('verifyToken', () => {
    it('should return true for valid TOTP code', () => {
      (authenticator.verify as jest.Mock).mockReturnValue(true);

      const result = service.verifyToken('TESTSECRET', '123456');

      expect(result).toBe(true);
      expect(authenticator.verify).toHaveBeenCalledWith({
        token: '123456',
        secret: 'TESTSECRET',
      });
    });

    it('should return false for invalid TOTP code', () => {
      (authenticator.verify as jest.Mock).mockReturnValue(false);

      const result = service.verifyToken('TESTSECRET', '000000');

      expect(result).toBe(false);
    });

    it('should return false when verification throws', () => {
      (authenticator.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Verification error');
      });

      const result = service.verifyToken('INVALID', '123456');

      expect(result).toBe(false);
    });
  });

  describe('verifyBackupCode', () => {
    it('should return true and mark code as used for valid backup code', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            { id: 1, code_hash: 'hash1' },
            { id: 2, code_hash: 'hash2' },
          ],
        })
        .mockResolvedValueOnce({}); // UPDATE

      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true);

      const result = await service.verifyBackupCode(1, 'TESTCODE');

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_backup_codes SET used = TRUE'),
        [1],
      );
    });

    it('should return false for invalid backup code', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 1, code_hash: 'hash1' },
          { id: 2, code_hash: 'hash2' },
        ],
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.verifyBackupCode(1, 'INVALIDCODE');

      expect(result).toBe(false);
    });

    it('should return false when no unused codes exist', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await service.verifyBackupCode(1, 'ANYCODE');

      expect(result).toBe(false);
    });
  });

  describe('getRemainingBackupCodesCount', () => {
    it('should return count of unused backup codes', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: '7' }],
      });

      const result = await service.getRemainingBackupCodesCount(1);

      expect(result).toBe(7);
    });
  });

  describe('isMFAEnabled', () => {
    it('should return true when MFA is enabled', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ mfa_enabled: true }],
      });

      const result = await service.isMFAEnabled(1);

      expect(result).toBe(true);
    });

    it('should return false when MFA is not enabled', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ mfa_enabled: false }],
      });

      const result = await service.isMFAEnabled(1);

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await service.isMFAEnabled(999);

      expect(result).toBe(false);
    });
  });

  describe('getMFASecret', () => {
    it('should return MFA secret when set', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ mfa_secret: 'TESTSECRET' }],
      });

      const result = await service.getMFASecret(1);

      expect(result).toBe('TESTSECRET');
    });

    it('should return null when MFA secret not set', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ mfa_secret: null }],
      });

      const result = await service.getMFASecret(1);

      expect(result).toBeNull();
    });

    it('should return null when user not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await service.getMFASecret(999);

      expect(result).toBeNull();
    });
  });
});
