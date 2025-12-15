/**
 * Security Settings Service Tests
 * STORY-013A: In-App Settings Backend
 *
 * Unit tests for SecuritySettingsService including:
 * - Get security settings
 * - Update security settings
 * - Reset to defaults
 * - Validation logic
 * - Caching behavior
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import {
  SecuritySettingsService,
  DEFAULT_SECURITY_SETTINGS,
} from '../../src/settings/security-settings.service';
import { DatabaseService } from '../../src/database/database.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';
import { AuditService } from '../../src/common/services/audit.service';

describe('SecuritySettingsService', () => {
  let service: SecuritySettingsService;
  let databaseService: jest.Mocked<DatabaseService>;
  let mockPool: {
    query: jest.Mock;
  };

  const mockSettings = {
    max_login_attempts: 5,
    password_min_length: 8,
    password_require_uppercase: true,
    password_require_lowercase: true,
    password_require_numbers: true,
    password_require_special_chars: true,
    session_inactivity_timeout: 15,
  };

  const mockRequest = {
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'Jest Test Agent',
    },
    requestId: 'test-request-id',
  } as any;

  beforeEach(async () => {
    mockPool = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecuritySettingsService,
        {
          provide: DatabaseService,
          useValue: {
            getPool: jest.fn(() => mockPool),
          },
        },
        {
          provide: WinstonLoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logSettingsChange: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SecuritySettingsService>(SecuritySettingsService);
    databaseService = module.get(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Invalidate cache between tests
    service.invalidateCache();
  });

  describe('getSecuritySettings', () => {
    it('should return security settings from database', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockSettings] });

      const result = await service.getSecuritySettings();

      expect(result.max_login_attempts).toBe(5);
      expect(result.password_min_length).toBe(8);
      expect(result.password_require_uppercase).toBe(true);
      expect(result.password_require_lowercase).toBe(true);
      expect(result.password_require_numbers).toBe(true);
      expect(result.password_require_special_chars).toBe(true);
      expect(result.session_inactivity_timeout).toBe(15);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT max_login_attempts'),
      );
    });

    it('should return default values when no settings exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getSecuritySettings();

      expect(result).toEqual(DEFAULT_SECURITY_SETTINGS);
    });

    it('should handle null values from database with defaults', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          max_login_attempts: null,
          password_min_length: null,
          password_require_uppercase: null,
          password_require_lowercase: null,
          password_require_numbers: null,
          password_require_special_chars: null,
          session_inactivity_timeout: null,
        }],
      });

      const result = await service.getSecuritySettings();

      expect(result).toEqual(DEFAULT_SECURITY_SETTINGS);
    });

    it('should return default when database pool is not available', async () => {
      (databaseService.getPool as jest.Mock).mockReturnValueOnce(null);

      const result = await service.getSecuritySettings();

      expect(result).toEqual(DEFAULT_SECURITY_SETTINGS);
    });

    it('should cache settings after first query', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockSettings] });

      // First call - hits database
      const result1 = await service.getSecuritySettings();
      // Second call - should use cache
      const result2 = await service.getSecuritySettings();

      expect(result1).toEqual(result2);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.getSecuritySettings();

      expect(result).toEqual(DEFAULT_SECURITY_SETTINGS);
    });
  });

  describe('updateSecuritySettings', () => {
    beforeEach(() => {
      // First query returns current settings
      mockPool.query.mockResolvedValueOnce({ rows: [mockSettings] });
    });

    it('should update max login attempts', async () => {
      // Update query
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      // Settings history insert
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.updateSecuritySettings(
        { max_login_attempts: 10 },
        1,
        mockRequest,
      );

      expect(result.max_login_attempts).toBe(10);
      expect(result.password_min_length).toBe(8); // Unchanged
    });

    it('should update password min length', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.updateSecuritySettings(
        { password_min_length: 12 },
        1,
        mockRequest,
      );

      expect(result.password_min_length).toBe(12);
    });

    it('should update password policy flags', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.updateSecuritySettings(
        {
          password_require_uppercase: false,
          password_require_special_chars: false,
        },
        1,
        mockRequest,
      );

      expect(result.password_require_uppercase).toBe(false);
      expect(result.password_require_special_chars).toBe(false);
      expect(result.password_require_lowercase).toBe(true); // Unchanged
    });

    it('should update session inactivity timeout', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.updateSecuritySettings(
        { session_inactivity_timeout: 30 },
        1,
        mockRequest,
      );

      expect(result.session_inactivity_timeout).toBe(30);
    });

    it('should update multiple fields at once', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.updateSecuritySettings(
        {
          max_login_attempts: 3,
          password_min_length: 10,
          session_inactivity_timeout: 20,
        },
        1,
        mockRequest,
      );

      expect(result.max_login_attempts).toBe(3);
      expect(result.password_min_length).toBe(10);
      expect(result.session_inactivity_timeout).toBe(20);
    });

    it('should invalidate cache after update', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      await service.updateSecuritySettings(
        { max_login_attempts: 10 },
        1,
        mockRequest,
      );

      // Reset mock to track new queries
      mockPool.query.mockClear();
      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...mockSettings, max_login_attempts: 10 }],
      });

      // Next getSecuritySettings should hit database again
      await service.getSecuritySettings();

      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateSecuritySettings - Validation', () => {
    beforeEach(() => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockSettings] });
    });

    it('should reject max login attempts less than 1', async () => {
      await expect(
        service.updateSecuritySettings(
          { max_login_attempts: 0 },
          1,
          mockRequest,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateSecuritySettings(
          { max_login_attempts: 0 },
          1,
          mockRequest,
        ),
      ).rejects.toThrow('Max login attempts must be at least 1');
    });

    it('should reject max login attempts greater than 100', async () => {
      // Reset for new test
      mockPool.query.mockResolvedValueOnce({ rows: [mockSettings] });

      await expect(
        service.updateSecuritySettings(
          { max_login_attempts: 101 },
          1,
          mockRequest,
        ),
      ).rejects.toThrow('Max login attempts cannot exceed 100');
    });

    it('should reject password min length less than 6', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockSettings] });

      await expect(
        service.updateSecuritySettings(
          { password_min_length: 5 },
          1,
          mockRequest,
        ),
      ).rejects.toThrow('Password min length must be at least 6');
    });

    it('should reject password min length greater than 128', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockSettings] });

      await expect(
        service.updateSecuritySettings(
          { password_min_length: 129 },
          1,
          mockRequest,
        ),
      ).rejects.toThrow('Password min length cannot exceed 128');
    });

    it('should reject session inactivity timeout less than 1', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockSettings] });

      await expect(
        service.updateSecuritySettings(
          { session_inactivity_timeout: 0 },
          1,
          mockRequest,
        ),
      ).rejects.toThrow('Session inactivity timeout must be at least 1 minute');
    });

    it('should reject session inactivity timeout greater than 1440', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockSettings] });

      await expect(
        service.updateSecuritySettings(
          { session_inactivity_timeout: 1441 },
          1,
          mockRequest,
        ),
      ).rejects.toThrow('Session inactivity timeout cannot exceed 1440 minutes');
    });

    it('should accept boundary values for max login attempts', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockSettings] });
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.updateSecuritySettings(
        { max_login_attempts: 1 },
        1,
        mockRequest,
      );

      expect(result.max_login_attempts).toBe(1);
    });

    it('should accept boundary values for password min length', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockSettings] });
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.updateSecuritySettings(
        { password_min_length: 6 },
        1,
        mockRequest,
      );

      expect(result.password_min_length).toBe(6);
    });
  });

  describe('resetSecuritySettings', () => {
    beforeEach(() => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockSettings] });
    });

    it('should reset all settings to defaults', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.resetSecuritySettings(1, mockRequest);

      expect(result).toEqual(DEFAULT_SECURITY_SETTINGS);
    });

    it('should invalidate cache after reset', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      await service.resetSecuritySettings(1, mockRequest);

      // Reset mock to track new queries
      mockPool.query.mockClear();
      mockPool.query.mockResolvedValueOnce({
        rows: [DEFAULT_SECURITY_SETTINGS],
      });

      // Next getSecuritySettings should hit database again
      await service.getSecuritySettings();

      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error when database pool is not available', async () => {
      (databaseService.getPool as jest.Mock).mockReturnValueOnce(null);

      await expect(
        service.resetSecuritySettings(1, mockRequest),
      ).rejects.toThrow('Database pool not available');
    });
  });

  describe('getMaxLoginAttempts', () => {
    it('should return max login attempts value', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockSettings] });

      const result = await service.getMaxLoginAttempts();

      expect(result).toBe(5);
    });
  });

  describe('getPasswordPolicy', () => {
    it('should return password policy settings', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockSettings] });

      const result = await service.getPasswordPolicy();

      expect(result.minLength).toBe(8);
      expect(result.requireUppercase).toBe(true);
      expect(result.requireLowercase).toBe(true);
      expect(result.requireNumbers).toBe(true);
      expect(result.requireSpecialChars).toBe(true);
    });
  });

  describe('invalidateCache', () => {
    it('should clear cached security settings', async () => {
      // First call populates cache
      mockPool.query.mockResolvedValueOnce({ rows: [mockSettings] });
      await service.getSecuritySettings();

      // Invalidate cache
      service.invalidateCache();

      // Second call should hit database again
      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...mockSettings, max_login_attempts: 10 }],
      });
      const result = await service.getSecuritySettings();

      expect(result.max_login_attempts).toBe(10);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('DEFAULT_SECURITY_SETTINGS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_SECURITY_SETTINGS.max_login_attempts).toBe(5);
      expect(DEFAULT_SECURITY_SETTINGS.password_min_length).toBe(8);
      expect(DEFAULT_SECURITY_SETTINGS.password_require_uppercase).toBe(true);
      expect(DEFAULT_SECURITY_SETTINGS.password_require_lowercase).toBe(true);
      expect(DEFAULT_SECURITY_SETTINGS.password_require_numbers).toBe(true);
      expect(DEFAULT_SECURITY_SETTINGS.password_require_special_chars).toBe(true);
      expect(DEFAULT_SECURITY_SETTINGS.session_inactivity_timeout).toBe(15);
    });
  });
});
