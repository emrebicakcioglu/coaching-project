/**
 * Theme Service Unit Tests
 * STORY-017: Theme-System Backend
 *
 * Tests for enhanced theme color management with nested structure.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from '../../src/settings/settings.service';
import { DatabaseService } from '../../src/database/database.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';
import { AuditService } from '../../src/common/services/audit.service';
import { UpdateThemeSettingsDto } from '../../src/settings/dto/update-settings.dto';
import { DEFAULT_THEME_COLORS } from '../../src/settings/dto/settings-response.dto';

describe('SettingsService - Theme (STORY-017)', () => {
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

  // Mock settings with enhanced theme structure
  const mockEnhancedThemeColors = {
    primary: '#2563eb',
    secondary: '#7c3aed',
    background: { page: '#ffffff', card: '#f9fafb' },
    text: { primary: '#111827', secondary: '#6b7280' },
    status: { success: '#10b981', warning: '#f59e0b', error: '#ef4444' },
  };

  const mockSettings = {
    id: 1,
    company_name: 'Core App',
    app_title: 'Core Application',
    logo_url: 'https://example.com/logo.png',
    theme_colors: mockEnhancedThemeColors,
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

  describe('Default Theme Colors', () => {
    it('should have all required default color categories', () => {
      expect(DEFAULT_THEME_COLORS.primary).toBeDefined();
      expect(DEFAULT_THEME_COLORS.secondary).toBeDefined();
      expect(DEFAULT_THEME_COLORS.background).toBeDefined();
      expect(DEFAULT_THEME_COLORS.text).toBeDefined();
      expect(DEFAULT_THEME_COLORS.status).toBeDefined();
    });

    it('should have valid hex colors for default primary and secondary', () => {
      const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      expect(DEFAULT_THEME_COLORS.primary).toMatch(hexRegex);
      expect(DEFAULT_THEME_COLORS.secondary).toMatch(hexRegex);
    });

    it('should have valid background colors with page and card', () => {
      const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      expect(DEFAULT_THEME_COLORS.background.page).toMatch(hexRegex);
      expect(DEFAULT_THEME_COLORS.background.card).toMatch(hexRegex);
    });

    it('should have valid text colors with primary and secondary', () => {
      const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      expect(DEFAULT_THEME_COLORS.text.primary).toMatch(hexRegex);
      expect(DEFAULT_THEME_COLORS.text.secondary).toMatch(hexRegex);
    });

    it('should have valid status colors for success, warning, and error', () => {
      const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      expect(DEFAULT_THEME_COLORS.status.success).toMatch(hexRegex);
      expect(DEFAULT_THEME_COLORS.status.warning).toMatch(hexRegex);
      expect(DEFAULT_THEME_COLORS.status.error).toMatch(hexRegex);
    });
  });

  describe('getThemeSettings', () => {
    it('should return enhanced theme structure', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockSettings] });

      const result = await service.getThemeSettings();

      expect(result.primary).toBe('#2563eb');
      expect(result.secondary).toBe('#7c3aed');
      expect(result.background.page).toBe('#ffffff');
      expect(result.background.card).toBe('#f9fafb');
      expect(result.text.primary).toBe('#111827');
      expect(result.text.secondary).toBe('#6b7280');
      expect(result.status.success).toBe('#10b981');
      expect(result.status.warning).toBe('#f59e0b');
      expect(result.status.error).toBe('#ef4444');
    });

    it('should return default colors when no theme is set', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getThemeSettings();

      // Should apply defaults
      expect(result.primary).toBe(DEFAULT_THEME_COLORS.primary);
      expect(result.secondary).toBe(DEFAULT_THEME_COLORS.secondary);
      expect(result.background.page).toBe(DEFAULT_THEME_COLORS.background.page);
      expect(result.background.card).toBe(DEFAULT_THEME_COLORS.background.card);
    });

    it('should return default colors when theme_colors is null', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...mockSettings, theme_colors: null }],
      });

      const result = await service.getThemeSettings();

      expect(result.primary).toBe(DEFAULT_THEME_COLORS.primary);
      expect(result.secondary).toBe(DEFAULT_THEME_COLORS.secondary);
    });

    it('should handle partial theme data and apply defaults', async () => {
      // Theme with only primary color set
      const partialTheme = {
        primary: '#custom00',
        // Missing: secondary, background, text, status
      };
      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...mockSettings, theme_colors: partialTheme }],
      });

      const result = await service.getThemeSettings();

      expect(result.primary).toBe('#custom00');
      expect(result.secondary).toBe(DEFAULT_THEME_COLORS.secondary); // Default
      expect(result.background.page).toBe(DEFAULT_THEME_COLORS.background.page); // Default
    });

    it('should throw error when database pool is not available', async () => {
      mockDatabaseService.getPool.mockReturnValueOnce(null);

      await expect(service.getThemeSettings()).rejects.toThrow('Database pool not available');
    });
  });

  describe('updateThemeSettings', () => {
    it('should update primary color only', async () => {
      const updatedSettings = {
        ...mockSettings,
        theme_colors: {
          ...mockEnhancedThemeColors,
          primary: '#FF0000',
        },
      };
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSettings] }) // getThemeSettings
        .mockResolvedValueOnce({ rows: [updatedSettings] }); // UPDATE

      const updateDto: UpdateThemeSettingsDto = { primary: '#FF0000' };
      const result = await service.updateThemeSettings(updateDto, 1, mockRequest);

      expect(result.primary).toBe('#FF0000');
      expect(result.secondary).toBe('#7c3aed'); // Unchanged
    });

    it('should update nested background colors', async () => {
      const newBackground = { page: '#f0f0f0', card: '#e0e0e0' };
      const updatedSettings = {
        ...mockSettings,
        theme_colors: {
          ...mockEnhancedThemeColors,
          background: newBackground,
        },
      };
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSettings] })
        .mockResolvedValueOnce({ rows: [updatedSettings] });

      const updateDto: UpdateThemeSettingsDto = { background: newBackground };
      const result = await service.updateThemeSettings(updateDto, 1, mockRequest);

      expect(result.background.page).toBe('#f0f0f0');
      expect(result.background.card).toBe('#e0e0e0');
    });

    it('should update partial nested background colors', async () => {
      const updatedSettings = {
        ...mockSettings,
        theme_colors: {
          ...mockEnhancedThemeColors,
          background: { page: '#f0f0f0', card: '#f9fafb' }, // card unchanged
        },
      };
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSettings] })
        .mockResolvedValueOnce({ rows: [updatedSettings] });

      const updateDto: UpdateThemeSettingsDto = { background: { page: '#f0f0f0' } };
      const result = await service.updateThemeSettings(updateDto, 1, mockRequest);

      expect(result.background.page).toBe('#f0f0f0');
      expect(result.background.card).toBe('#f9fafb'); // Preserved
    });

    it('should update nested text colors', async () => {
      const newText = { primary: '#000000', secondary: '#555555' };
      const updatedSettings = {
        ...mockSettings,
        theme_colors: {
          ...mockEnhancedThemeColors,
          text: newText,
        },
      };
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSettings] })
        .mockResolvedValueOnce({ rows: [updatedSettings] });

      const updateDto: UpdateThemeSettingsDto = { text: newText };
      const result = await service.updateThemeSettings(updateDto, 1, mockRequest);

      expect(result.text.primary).toBe('#000000');
      expect(result.text.secondary).toBe('#555555');
    });

    it('should update nested status colors', async () => {
      const newStatus = { success: '#00FF00', warning: '#FFFF00', error: '#FF0000' };
      const updatedSettings = {
        ...mockSettings,
        theme_colors: {
          ...mockEnhancedThemeColors,
          status: newStatus,
        },
      };
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSettings] })
        .mockResolvedValueOnce({ rows: [updatedSettings] });

      const updateDto: UpdateThemeSettingsDto = { status: newStatus };
      const result = await service.updateThemeSettings(updateDto, 1, mockRequest);

      expect(result.status.success).toBe('#00FF00');
      expect(result.status.warning).toBe('#FFFF00');
      expect(result.status.error).toBe('#FF0000');
    });

    it('should update partial status colors', async () => {
      const updatedSettings = {
        ...mockSettings,
        theme_colors: {
          ...mockEnhancedThemeColors,
          status: { success: '#00FF00', warning: '#f59e0b', error: '#ef4444' },
        },
      };
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSettings] })
        .mockResolvedValueOnce({ rows: [updatedSettings] });

      const updateDto: UpdateThemeSettingsDto = { status: { success: '#00FF00' } };
      const result = await service.updateThemeSettings(updateDto, 1, mockRequest);

      expect(result.status.success).toBe('#00FF00');
      expect(result.status.warning).toBe('#f59e0b'); // Preserved
      expect(result.status.error).toBe('#ef4444'); // Preserved
    });

    it('should update multiple color categories at once', async () => {
      const updatedSettings = {
        ...mockSettings,
        theme_colors: {
          primary: '#1a1a1a',
          secondary: '#2b2b2b',
          background: { page: '#ffffff', card: '#fafafa' },
          text: { primary: '#333333', secondary: '#666666' },
          status: { success: '#00FF00', warning: '#FFFF00', error: '#FF0000' },
        },
      };
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSettings] })
        .mockResolvedValueOnce({ rows: [updatedSettings] });

      const updateDto: UpdateThemeSettingsDto = {
        primary: '#1a1a1a',
        secondary: '#2b2b2b',
        text: { primary: '#333333', secondary: '#666666' },
        status: { success: '#00FF00', warning: '#FFFF00', error: '#FF0000' },
      };
      const result = await service.updateThemeSettings(updateDto, 1, mockRequest);

      expect(result.primary).toBe('#1a1a1a');
      expect(result.secondary).toBe('#2b2b2b');
      expect(result.text.primary).toBe('#333333');
      expect(result.status.success).toBe('#00FF00');
    });

    it('should log audit when userId is provided', async () => {
      const updatedSettings = {
        ...mockSettings,
        theme_colors: { ...mockEnhancedThemeColors, primary: '#FF0000' },
      };
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSettings] })
        .mockResolvedValueOnce({ rows: [updatedSettings] });

      const updateDto: UpdateThemeSettingsDto = { primary: '#FF0000' };
      await service.updateThemeSettings(updateDto, 1, mockRequest);

      expect(mockAuditService.logSettingsChange).toHaveBeenCalledWith(
        1,
        mockRequest,
        'theme_colors',
        expect.anything(), // currentTheme
        expect.anything(), // updatedTheme
      );
    });

    it('should not log audit when userId is undefined', async () => {
      const updatedSettings = {
        ...mockSettings,
        theme_colors: { ...mockEnhancedThemeColors, primary: '#FF0000' },
      };
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSettings] })
        .mockResolvedValueOnce({ rows: [updatedSettings] });

      const updateDto: UpdateThemeSettingsDto = { primary: '#FF0000' };
      await service.updateThemeSettings(updateDto, undefined, mockRequest);

      expect(mockAuditService.logSettingsChange).not.toHaveBeenCalled();
    });

    it('should log theme update message', async () => {
      const updatedSettings = {
        ...mockSettings,
        theme_colors: { ...mockEnhancedThemeColors, primary: '#FF0000' },
      };
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSettings] })
        .mockResolvedValueOnce({ rows: [updatedSettings] });

      const updateDto: UpdateThemeSettingsDto = { primary: '#FF0000' };
      await service.updateThemeSettings(updateDto, 1, mockRequest);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Theme settings updated',
        'SettingsService',
      );
    });

    it('should throw error when database pool is not available', async () => {
      mockDatabaseService.getPool.mockReturnValueOnce(null);

      const updateDto: UpdateThemeSettingsDto = { primary: '#FF0000' };
      await expect(service.updateThemeSettings(updateDto, 1, mockRequest))
        .rejects.toThrow('Database pool not available');
    });
  });

  describe('Theme Color Merging', () => {
    it('should preserve existing values when not provided in update', async () => {
      const updatedSettings = {
        ...mockSettings,
        theme_colors: {
          ...mockEnhancedThemeColors,
          primary: '#NewPrimary',
        },
      };
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSettings] })
        .mockResolvedValueOnce({ rows: [updatedSettings] });

      // Update only primary, everything else should be preserved
      const updateDto: UpdateThemeSettingsDto = { primary: '#NewPrimary' };
      const result = await service.updateThemeSettings(updateDto, 1, mockRequest);

      // Updated
      expect(result.primary).toBe('#NewPrimary');
      // Preserved from existing
      expect(result.secondary).toBe(mockEnhancedThemeColors.secondary);
      expect(result.background.page).toBe(mockEnhancedThemeColors.background.page);
      expect(result.background.card).toBe(mockEnhancedThemeColors.background.card);
      expect(result.text.primary).toBe(mockEnhancedThemeColors.text.primary);
      expect(result.text.secondary).toBe(mockEnhancedThemeColors.text.secondary);
      expect(result.status.success).toBe(mockEnhancedThemeColors.status.success);
      expect(result.status.warning).toBe(mockEnhancedThemeColors.status.warning);
      expect(result.status.error).toBe(mockEnhancedThemeColors.status.error);
    });

    it('should apply defaults for missing nested values', async () => {
      // Settings with only primary color (no nested objects)
      const minimalSettings = {
        ...mockSettings,
        theme_colors: {
          primary: '#custom00',
          secondary: '#custom11',
        },
      };
      const updatedSettings = {
        ...mockSettings,
        theme_colors: {
          primary: '#custom00',
          secondary: '#custom11',
          background: DEFAULT_THEME_COLORS.background,
          text: DEFAULT_THEME_COLORS.text,
          status: DEFAULT_THEME_COLORS.status,
        },
      };
      mockPool.query
        .mockResolvedValueOnce({ rows: [minimalSettings] })
        .mockResolvedValueOnce({ rows: [updatedSettings] });

      const updateDto: UpdateThemeSettingsDto = {}; // Empty update
      const result = await service.updateThemeSettings(updateDto, 1, mockRequest);

      // Should get defaults for missing nested objects
      expect(result.background.page).toBe(DEFAULT_THEME_COLORS.background.page);
      expect(result.background.card).toBe(DEFAULT_THEME_COLORS.background.card);
      expect(result.text.primary).toBe(DEFAULT_THEME_COLORS.text.primary);
      expect(result.status.success).toBe(DEFAULT_THEME_COLORS.status.success);
    });
  });
});
