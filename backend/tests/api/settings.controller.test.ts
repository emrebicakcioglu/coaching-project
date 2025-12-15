/**
 * Settings Controller Unit Tests
 * STORY-021B: Resource Endpoints
 *
 * Tests for settings endpoints.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SettingsController } from '../../src/settings/settings.controller';
import { SettingsService } from '../../src/settings/settings.service';
import { AuthService } from '../../src/auth/auth.service';
import { UpdateSettingsDto, UpdateThemeSettingsDto } from '../../src/settings/dto/update-settings.dto';

describe('SettingsController', () => {
  let controller: SettingsController;
  let service: SettingsService;

  const mockSettingsResponse = {
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
    },
    updated_at: new Date('2024-01-01'),
  };

  const mockThemeResponse = {
    primary: '#3B82F6',
    secondary: '#6B7280',
    accent: undefined,
    background: undefined,
    text: undefined,
  };

  const mockRequest: any = {
    headers: {
      'user-agent': 'Test Agent',
      'x-forwarded-for': '127.0.0.1',
    },
    ip: '127.0.0.1',
    requestId: 'test-request-id',
  };

  const mockSettingsService = {
    findAll: jest.fn(),
    update: jest.fn(),
    getThemeSettings: jest.fn(),
    updateThemeSettings: jest.fn(),
  };

  const mockAuthService = {
    decodeToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<SettingsController>(SettingsController);
    service = module.get<SettingsService>(SettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all settings', async () => {
      mockSettingsService.findAll.mockResolvedValue(mockSettingsResponse);

      const result = await controller.findAll();

      expect(result).toEqual(mockSettingsResponse);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update settings with authenticated user', async () => {
      mockSettingsService.update.mockResolvedValue(mockSettingsResponse);
      mockAuthService.decodeToken.mockReturnValue({ sub: 1, email: 'test@example.com' });

      const updateDto: UpdateSettingsDto = { company_name: 'New Company' };
      const result = await controller.update(
        updateDto,
        'Bearer valid-token',
        mockRequest,
      );

      expect(result).toEqual(mockSettingsResponse);
      expect(service.update).toHaveBeenCalledWith(updateDto, 1, mockRequest);
    });

    it('should update settings without authentication', async () => {
      mockSettingsService.update.mockResolvedValue(mockSettingsResponse);

      const updateDto: UpdateSettingsDto = { company_name: 'New Company' };
      const result = await controller.update(updateDto, '', mockRequest);

      expect(result).toEqual(mockSettingsResponse);
      expect(service.update).toHaveBeenCalledWith(updateDto, undefined, mockRequest);
    });

    it('should handle invalid token gracefully', async () => {
      mockSettingsService.update.mockResolvedValue(mockSettingsResponse);
      mockAuthService.decodeToken.mockReturnValue(null);

      const updateDto: UpdateSettingsDto = { company_name: 'New Company' };
      const result = await controller.update(
        updateDto,
        'Bearer invalid-token',
        mockRequest,
      );

      expect(result).toEqual(mockSettingsResponse);
      expect(service.update).toHaveBeenCalledWith(updateDto, undefined, mockRequest);
    });
  });

  describe('getThemeSettings', () => {
    it('should return theme settings', async () => {
      mockSettingsService.getThemeSettings.mockResolvedValue(mockThemeResponse);

      const result = await controller.getThemeSettings();

      expect(result).toEqual(mockThemeResponse);
      expect(service.getThemeSettings).toHaveBeenCalled();
    });
  });

  describe('updateThemeSettings', () => {
    it('should update theme settings with authenticated user', async () => {
      mockSettingsService.updateThemeSettings.mockResolvedValue(mockThemeResponse);
      mockAuthService.decodeToken.mockReturnValue({ sub: 1, email: 'test@example.com' });

      const updateDto: UpdateThemeSettingsDto = { primary: '#FF0000' };
      const result = await controller.updateThemeSettings(
        updateDto,
        'Bearer valid-token',
        mockRequest,
      );

      expect(result).toEqual(mockThemeResponse);
      expect(service.updateThemeSettings).toHaveBeenCalledWith(
        updateDto,
        1,
        mockRequest,
      );
    });

    it('should update theme settings without authentication', async () => {
      mockSettingsService.updateThemeSettings.mockResolvedValue(mockThemeResponse);

      const updateDto: UpdateThemeSettingsDto = { primary: '#FF0000' };
      const result = await controller.updateThemeSettings(updateDto, '', mockRequest);

      expect(result).toEqual(mockThemeResponse);
      expect(service.updateThemeSettings).toHaveBeenCalledWith(
        updateDto,
        undefined,
        mockRequest,
      );
    });
  });
});
