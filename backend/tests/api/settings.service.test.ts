/**
 * Settings Service Unit Tests
 * STORY-021B: Resource Endpoints
 *
 * Tests for application settings management.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from '../../src/settings/settings.service';
import { DatabaseService } from '../../src/database/database.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';
import { AuditService } from '../../src/common/services/audit.service';
import { UpdateSettingsDto, UpdateThemeSettingsDto } from '../../src/settings/dto/update-settings.dto';

describe('SettingsService', () => {
  let service: SettingsService;

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
    logSettingsChange: jest.fn().mockResolvedValue(null),
  };

  const mockSettings = {
    id: 1,
    company_name: 'Core App',
    app_title: 'Core Application',
    logo_url: 'https://example.com/logo.png',
    theme_colors: {
      primary: '#3B82F6',
      secondary: '#6B7280',
    },
    features: {
      mfa_enabled: true,
      registration_enabled: true,
    },
    maintenance: {
      enabled: false,
      message: null,
    },
    updated_at: new Date('2024-01-01'),
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
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

    service = module.get<SettingsService>(SettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return settings when they exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockSettings] });

      const result = await service.findAll();

      expect(result.company_name).toBe('Core App');
      expect(result.app_title).toBe('Core Application');
      expect(result.theme_colors?.primary).toBe('#3B82F6');
    });

    it('should create default settings if none exist', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // No existing settings
        .mockResolvedValueOnce({ rows: [mockSettings] }); // After insert

      const result = await service.findAll();

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(result).toBeDefined();
    });

    it('should throw error when database pool is not available', async () => {
      mockDatabaseService.getPool.mockReturnValueOnce(null);

      await expect(service.findAll()).rejects.toThrow('Database pool not available');
    });
  });

  describe('update', () => {
    it('should update settings', async () => {
      const updatedSettings = { ...mockSettings, company_name: 'New Company' };
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSettings] }) // findAll
        .mockResolvedValueOnce({ rows: [updatedSettings] }); // UPDATE

      const updateDto: UpdateSettingsDto = { company_name: 'New Company' };
      const result = await service.update(updateDto, 1, mockRequest);

      expect(result.company_name).toBe('New Company');
      expect(mockAuditService.logSettingsChange).toHaveBeenCalled();
    });

    it('should merge theme colors with existing values', async () => {
      const updatedSettings = {
        ...mockSettings,
        theme_colors: {
          primary: '#FF0000',
          secondary: '#6B7280',
        },
      };
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSettings] })
        .mockResolvedValueOnce({ rows: [updatedSettings] });

      const updateDto: UpdateSettingsDto = {
        theme_colors: { primary: '#FF0000' },
      };
      const result = await service.update(updateDto, 1, mockRequest);

      expect(result.theme_colors?.primary).toBe('#FF0000');
      expect(result.theme_colors?.secondary).toBe('#6B7280');
    });

    it('should merge features with existing values', async () => {
      const updatedSettings = {
        ...mockSettings,
        features: {
          mfa_enabled: false,
          registration_enabled: true,
        },
      };
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSettings] })
        .mockResolvedValueOnce({ rows: [updatedSettings] });

      const updateDto: UpdateSettingsDto = {
        features: { mfa_enabled: false },
      };
      const result = await service.update(updateDto, 1, mockRequest);

      expect(result.features?.mfa_enabled).toBe(false);
      expect(result.features?.registration_enabled).toBe(true);
    });

    it('should return current settings if no updates provided', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockSettings] });

      const updateDto: UpdateSettingsDto = {};
      const result = await service.update(updateDto, 1, mockRequest);

      expect(result.company_name).toBe('Core App');
      // Should only call findAll, not UPDATE
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should not log audit when userId is undefined', async () => {
      const updatedSettings = { ...mockSettings, company_name: 'New Company' };
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSettings] })
        .mockResolvedValueOnce({ rows: [updatedSettings] });

      const updateDto: UpdateSettingsDto = { company_name: 'New Company' };
      await service.update(updateDto, undefined, mockRequest);

      expect(mockAuditService.logSettingsChange).not.toHaveBeenCalled();
    });
  });

  describe('getThemeSettings', () => {
    it('should return theme settings', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockSettings] });

      const result = await service.getThemeSettings();

      expect(result.primary).toBe('#3B82F6');
      expect(result.secondary).toBe('#6B7280');
    });

    it('should return null theme when no settings exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getThemeSettings();

      expect(result.primary).toBeUndefined();
    });

    it('should return null theme when theme_colors is null', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...mockSettings, theme_colors: null }],
      });

      const result = await service.getThemeSettings();

      expect(result.primary).toBeUndefined();
    });
  });

  describe('updateThemeSettings', () => {
    it('should update theme settings', async () => {
      const updatedSettings = {
        ...mockSettings,
        theme_colors: {
          primary: '#FF0000',
          secondary: '#6B7280',
        },
      };
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSettings] }) // getThemeSettings
        .mockResolvedValueOnce({ rows: [updatedSettings] }); // UPDATE

      const updateDto: UpdateThemeSettingsDto = { primary: '#FF0000' };
      const result = await service.updateThemeSettings(updateDto, 1, mockRequest);

      expect(result.primary).toBe('#FF0000');
      expect(result.secondary).toBe('#6B7280');
      expect(mockAuditService.logSettingsChange).toHaveBeenCalled();
    });

    it('should not log audit when userId is undefined', async () => {
      const updatedSettings = {
        ...mockSettings,
        theme_colors: { primary: '#FF0000', secondary: '#6B7280' },
      };
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSettings] })
        .mockResolvedValueOnce({ rows: [updatedSettings] });

      const updateDto: UpdateThemeSettingsDto = { primary: '#FF0000' };
      await service.updateThemeSettings(updateDto, undefined, mockRequest);

      expect(mockAuditService.logSettingsChange).not.toHaveBeenCalled();
    });
  });
});
