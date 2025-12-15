/**
 * General Settings Service Tests
 * STORY-035: Support-E-Mail & Session-Timeout
 *
 * Unit tests for GeneralSettingsService including:
 * - Get general settings
 * - Update general settings
 * - Session timeout configuration
 * - Support email retrieval
 * - Caching behavior
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { GeneralSettingsService } from '../../src/settings/general-settings.service';
import { DatabaseService } from '../../src/database/database.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';
import { AuditService } from '../../src/common/services/audit.service';
import { UpdateGeneralSettingsDto } from '../../src/settings/dto/general-settings.dto';

describe('GeneralSettingsService', () => {
  let service: GeneralSettingsService;
  let databaseService: jest.Mocked<DatabaseService>;
  let mockPool: {
    query: jest.Mock;
  };

  const mockSettings = {
    support_email: 'support@example.com',
    session_timeout_minutes: 30,
    show_timeout_warning: true,
    warning_before_timeout_minutes: 5,
    updated_at: new Date('2025-01-15T10:30:00Z'),
    last_updated_by: 1,
  };

  beforeEach(async () => {
    mockPool = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeneralSettingsService,
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

    service = module.get<GeneralSettingsService>(GeneralSettingsService);
    databaseService = module.get(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Invalidate cache between tests
    service.invalidateCache();
  });

  describe('getGeneralSettings', () => {
    it('should return general settings from database', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockSettings] });

      const result = await service.getGeneralSettings();

      expect(result.support_email).toBe('support@example.com');
      expect(result.session_timeout_minutes).toBe(30);
      expect(result.show_timeout_warning).toBe(true);
      expect(result.warning_before_timeout_minutes).toBe(5);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT support_email'),
      );
    });

    it('should return default values when no settings exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getGeneralSettings();

      expect(result.support_email).toBeNull();
      expect(result.session_timeout_minutes).toBe(30);
      expect(result.show_timeout_warning).toBe(true);
      expect(result.warning_before_timeout_minutes).toBe(5);
    });

    it('should handle null values from database', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          support_email: null,
          session_timeout_minutes: null,
          show_timeout_warning: null,
          warning_before_timeout_minutes: null,
          updated_at: new Date(),
          last_updated_by: null,
        }],
      });

      const result = await service.getGeneralSettings();

      expect(result.support_email).toBeNull();
      expect(result.session_timeout_minutes).toBe(30); // Default
      expect(result.show_timeout_warning).toBe(true); // Default
      expect(result.warning_before_timeout_minutes).toBe(5); // Default
    });

    it('should throw error when database pool is not available', async () => {
      (databaseService.getPool as jest.Mock).mockReturnValueOnce(null);

      await expect(service.getGeneralSettings()).rejects.toThrow(
        'Database pool not available',
      );
    });
  });

  describe('updateGeneralSettings', () => {
    const mockRequest = {
      ip: '127.0.0.1',
      headers: {},
    } as any;

    beforeEach(() => {
      // First query returns current settings
      mockPool.query.mockResolvedValueOnce({ rows: [mockSettings] });
    });

    it('should update support email', async () => {
      // Second query for update
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      // Third query for getting updated settings
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          ...mockSettings,
          support_email: 'new-support@example.com',
        }],
      });

      const updateDto: UpdateGeneralSettingsDto = {
        support_email: 'new-support@example.com',
      };

      const result = await service.updateGeneralSettings(updateDto, 1, mockRequest);

      expect(result.support_email).toBe('new-support@example.com');
      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });

    it('should update session timeout', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          ...mockSettings,
          session_timeout_minutes: 60,
        }],
      });

      const updateDto: UpdateGeneralSettingsDto = {
        session_timeout_minutes: 60,
      };

      const result = await service.updateGeneralSettings(updateDto, 1, mockRequest);

      expect(result.session_timeout_minutes).toBe(60);
    });

    it('should reject warning time greater than or equal to timeout', async () => {
      const updateDto: UpdateGeneralSettingsDto = {
        session_timeout_minutes: 10,
        warning_before_timeout_minutes: 15,
      };

      await expect(
        service.updateGeneralSettings(updateDto, 1, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update multiple fields at once', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          support_email: 'new@example.com',
          session_timeout_minutes: 45,
          show_timeout_warning: false,
          warning_before_timeout_minutes: 10,
          updated_at: new Date(),
          last_updated_by: 1,
        }],
      });

      const updateDto: UpdateGeneralSettingsDto = {
        support_email: 'new@example.com',
        session_timeout_minutes: 45,
        show_timeout_warning: false,
        warning_before_timeout_minutes: 10,
      };

      const result = await service.updateGeneralSettings(updateDto, 1, mockRequest);

      expect(result.support_email).toBe('new@example.com');
      expect(result.session_timeout_minutes).toBe(45);
      expect(result.show_timeout_warning).toBe(false);
      expect(result.warning_before_timeout_minutes).toBe(10);
    });

    it('should return current settings if no updates provided', async () => {
      const updateDto: UpdateGeneralSettingsDto = {};

      const result = await service.updateGeneralSettings(updateDto, 1, mockRequest);

      expect(result.support_email).toBe('support@example.com');
      // Only one query for getting current settings
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should allow clearing support email with null', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          ...mockSettings,
          support_email: null,
        }],
      });

      const updateDto: UpdateGeneralSettingsDto = {
        support_email: null,
      };

      const result = await service.updateGeneralSettings(updateDto, 1, mockRequest);

      expect(result.support_email).toBeNull();
    });
  });

  describe('getSessionTimeoutConfig', () => {
    it('should return session timeout configuration for clients', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockSettings] });

      const result = await service.getSessionTimeoutConfig();

      expect(result.timeout_minutes).toBe(30);
      expect(result.timeout_ms).toBe(30 * 60 * 1000);
      expect(result.show_warning).toBe(true);
      expect(result.warning_ms).toBe(5 * 60 * 1000);
    });
  });

  describe('getSessionTimeoutMinutes', () => {
    it('should return session timeout from database', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ session_timeout_minutes: 45 }],
      });

      const result = await service.getSessionTimeoutMinutes();

      expect(result).toBe(45);
    });

    it('should return default value when database returns no rows', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getSessionTimeoutMinutes();

      expect(result).toBe(30); // Default
    });

    it('should cache the session timeout value', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ session_timeout_minutes: 45 }],
      });

      // First call - hits database
      const result1 = await service.getSessionTimeoutMinutes();
      // Second call - should use cache
      const result2 = await service.getSessionTimeoutMinutes();

      expect(result1).toBe(45);
      expect(result2).toBe(45);
      // Should only query database once
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should return default when database pool is unavailable', async () => {
      (databaseService.getPool as jest.Mock).mockReturnValueOnce(null);

      const result = await service.getSessionTimeoutMinutes();

      expect(result).toBe(30); // Default
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.getSessionTimeoutMinutes();

      expect(result).toBe(30); // Default
    });
  });

  describe('getSupportEmail', () => {
    it('should return support email from database', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ support_email: 'help@example.com' }],
      });

      const result = await service.getSupportEmail();

      expect(result).toBe('help@example.com');
    });

    it('should return null when not configured', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ support_email: null }],
      });

      const result = await service.getSupportEmail();

      expect(result).toBeNull();
    });

    it('should return null when database pool is unavailable', async () => {
      (databaseService.getPool as jest.Mock).mockReturnValueOnce(null);

      const result = await service.getSupportEmail();

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.getSupportEmail();

      expect(result).toBeNull();
    });
  });

  describe('invalidateCache', () => {
    it('should clear cached session timeout', async () => {
      // First call populates cache
      mockPool.query.mockResolvedValueOnce({
        rows: [{ session_timeout_minutes: 45 }],
      });
      await service.getSessionTimeoutMinutes();

      // Invalidate cache
      service.invalidateCache();

      // Second call should hit database again
      mockPool.query.mockResolvedValueOnce({
        rows: [{ session_timeout_minutes: 60 }],
      });
      const result = await service.getSessionTimeoutMinutes();

      expect(result).toBe(60);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });
  });
});
