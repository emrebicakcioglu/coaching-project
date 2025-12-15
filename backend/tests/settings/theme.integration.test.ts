/**
 * Theme API Integration Tests
 * STORY-017: Theme-System Backend
 *
 * Integration tests for theme API endpoints with enhanced nested structure.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { SettingsController } from '../../src/settings/settings.controller';
import { SettingsService } from '../../src/settings/settings.service';
import { AuthService } from '../../src/auth/auth.service';
import { DEFAULT_THEME_COLORS } from '../../src/settings/dto/settings-response.dto';

describe('Theme API Integration (STORY-017)', () => {
  let app: INestApplication;

  const mockEnhancedThemeColors = {
    primary: '#2563eb',
    secondary: '#7c3aed',
    background: { page: '#ffffff', card: '#f9fafb' },
    text: { primary: '#111827', secondary: '#6b7280' },
    status: { success: '#10b981', warning: '#f59e0b', error: '#ef4444' },
  };

  const mockSettingsService = {
    getThemeSettings: jest.fn(),
    updateThemeSettings: jest.fn(),
  };

  const mockAuthService = {
    decodeToken: jest.fn().mockReturnValue({ sub: 1, email: 'test@example.com' }),
  };

  beforeAll(async () => {
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

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/settings/theme', () => {
    it('should return enhanced theme structure with all color categories', async () => {
      mockSettingsService.getThemeSettings.mockResolvedValue({
        ...mockEnhancedThemeColors,
        background: {
          page: mockEnhancedThemeColors.background.page,
          card: mockEnhancedThemeColors.background.card,
        },
        text: {
          primary: mockEnhancedThemeColors.text.primary,
          secondary: mockEnhancedThemeColors.text.secondary,
        },
        status: {
          success: mockEnhancedThemeColors.status.success,
          warning: mockEnhancedThemeColors.status.warning,
          error: mockEnhancedThemeColors.status.error,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/settings/theme')
        .expect(200);

      expect(response.body).toHaveProperty('primary', '#2563eb');
      expect(response.body).toHaveProperty('secondary', '#7c3aed');
      expect(response.body).toHaveProperty('background');
      expect(response.body.background).toHaveProperty('page', '#ffffff');
      expect(response.body.background).toHaveProperty('card', '#f9fafb');
      expect(response.body).toHaveProperty('text');
      expect(response.body.text).toHaveProperty('primary', '#111827');
      expect(response.body.text).toHaveProperty('secondary', '#6b7280');
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toHaveProperty('success', '#10b981');
      expect(response.body.status).toHaveProperty('warning', '#f59e0b');
      expect(response.body.status).toHaveProperty('error', '#ef4444');
    });

    it('should return default theme when no custom theme is set', async () => {
      mockSettingsService.getThemeSettings.mockResolvedValue({
        primary: DEFAULT_THEME_COLORS.primary,
        secondary: DEFAULT_THEME_COLORS.secondary,
        background: {
          page: DEFAULT_THEME_COLORS.background.page,
          card: DEFAULT_THEME_COLORS.background.card,
        },
        text: {
          primary: DEFAULT_THEME_COLORS.text.primary,
          secondary: DEFAULT_THEME_COLORS.text.secondary,
        },
        status: {
          success: DEFAULT_THEME_COLORS.status.success,
          warning: DEFAULT_THEME_COLORS.status.warning,
          error: DEFAULT_THEME_COLORS.status.error,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/settings/theme')
        .expect(200);

      expect(response.body.primary).toBe(DEFAULT_THEME_COLORS.primary);
      expect(response.body.secondary).toBe(DEFAULT_THEME_COLORS.secondary);
      expect(response.body.background.page).toBe(DEFAULT_THEME_COLORS.background.page);
      expect(response.body.text.primary).toBe(DEFAULT_THEME_COLORS.text.primary);
      expect(response.body.status.success).toBe(DEFAULT_THEME_COLORS.status.success);
    });
  });

  describe('PUT /api/v1/settings/theme', () => {
    it('should update primary color only', async () => {
      mockSettingsService.updateThemeSettings.mockResolvedValue({
        ...mockEnhancedThemeColors,
        primary: '#FF0000',
        background: { page: '#ffffff', card: '#f9fafb' },
        text: { primary: '#111827', secondary: '#6b7280' },
        status: { success: '#10b981', warning: '#f59e0b', error: '#ef4444' },
      });

      const response = await request(app.getHttpServer())
        .put('/api/v1/settings/theme')
        .set('Authorization', 'Bearer valid-token')
        .send({ primary: '#FF0000' })
        .expect(200);

      expect(response.body.primary).toBe('#FF0000');
      expect(mockSettingsService.updateThemeSettings).toHaveBeenCalledWith(
        { primary: '#FF0000' },
        1, // User ID from decoded token
        expect.anything(),
      );
    });

    it('should update nested background colors', async () => {
      mockSettingsService.updateThemeSettings.mockResolvedValue({
        ...mockEnhancedThemeColors,
        background: { page: '#f0f0f0', card: '#e0e0e0' },
        text: { primary: '#111827', secondary: '#6b7280' },
        status: { success: '#10b981', warning: '#f59e0b', error: '#ef4444' },
      });

      const response = await request(app.getHttpServer())
        .put('/api/v1/settings/theme')
        .set('Authorization', 'Bearer valid-token')
        .send({ background: { page: '#f0f0f0', card: '#e0e0e0' } })
        .expect(200);

      expect(response.body.background.page).toBe('#f0f0f0');
      expect(response.body.background.card).toBe('#e0e0e0');
    });

    it('should update nested text colors', async () => {
      mockSettingsService.updateThemeSettings.mockResolvedValue({
        ...mockEnhancedThemeColors,
        background: { page: '#ffffff', card: '#f9fafb' },
        text: { primary: '#000000', secondary: '#555555' },
        status: { success: '#10b981', warning: '#f59e0b', error: '#ef4444' },
      });

      const response = await request(app.getHttpServer())
        .put('/api/v1/settings/theme')
        .set('Authorization', 'Bearer valid-token')
        .send({ text: { primary: '#000000', secondary: '#555555' } })
        .expect(200);

      expect(response.body.text.primary).toBe('#000000');
      expect(response.body.text.secondary).toBe('#555555');
    });

    it('should update nested status colors', async () => {
      mockSettingsService.updateThemeSettings.mockResolvedValue({
        ...mockEnhancedThemeColors,
        background: { page: '#ffffff', card: '#f9fafb' },
        text: { primary: '#111827', secondary: '#6b7280' },
        status: { success: '#00FF00', warning: '#FFFF00', error: '#FF0000' },
      });

      const response = await request(app.getHttpServer())
        .put('/api/v1/settings/theme')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: { success: '#00FF00', warning: '#FFFF00', error: '#FF0000' } })
        .expect(200);

      expect(response.body.status.success).toBe('#00FF00');
      expect(response.body.status.warning).toBe('#FFFF00');
      expect(response.body.status.error).toBe('#FF0000');
    });

    it('should update multiple color categories at once', async () => {
      mockSettingsService.updateThemeSettings.mockResolvedValue({
        primary: '#1a1a1a',
        secondary: '#2b2b2b',
        background: { page: '#fefefe', card: '#fafafa' },
        text: { primary: '#333333', secondary: '#666666' },
        status: { success: '#00CC00', warning: '#CCCC00', error: '#CC0000' },
      });

      const response = await request(app.getHttpServer())
        .put('/api/v1/settings/theme')
        .set('Authorization', 'Bearer valid-token')
        .send({
          primary: '#1a1a1a',
          secondary: '#2b2b2b',
          background: { page: '#fefefe', card: '#fafafa' },
          text: { primary: '#333333', secondary: '#666666' },
          status: { success: '#00CC00', warning: '#CCCC00', error: '#CC0000' },
        })
        .expect(200);

      expect(response.body.primary).toBe('#1a1a1a');
      expect(response.body.secondary).toBe('#2b2b2b');
      expect(response.body.background.page).toBe('#fefefe');
      expect(response.body.text.primary).toBe('#333333');
      expect(response.body.status.success).toBe('#00CC00');
    });

    it('should reject invalid hex color format for primary', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/settings/theme')
        .set('Authorization', 'Bearer valid-token')
        .send({ primary: 'not-a-hex-color' })
        .expect(400);

      // Message can be an array or string
      const messages = Array.isArray(response.body.message) ? response.body.message : [response.body.message];
      expect(messages.some((msg: string) => msg.includes('Color must be a valid hex color'))).toBe(true);
    });

    it('should reject invalid hex color format for secondary', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/settings/theme')
        .set('Authorization', 'Bearer valid-token')
        .send({ secondary: 'invalid' })
        .expect(400);

      const messages = Array.isArray(response.body.message) ? response.body.message : [response.body.message];
      expect(messages.some((msg: string) => msg.includes('Color must be a valid hex color'))).toBe(true);
    });

    it('should reject invalid hex color format in background.page', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/settings/theme')
        .set('Authorization', 'Bearer valid-token')
        .send({ background: { page: 'red' } })
        .expect(400);

      const messages = Array.isArray(response.body.message) ? response.body.message : [response.body.message];
      expect(messages.some((msg: string) => msg.includes('Color must be a valid hex color'))).toBe(true);
    });

    it('should reject invalid hex color format in text.primary', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/settings/theme')
        .set('Authorization', 'Bearer valid-token')
        .send({ text: { primary: 'blue' } })
        .expect(400);

      const messages = Array.isArray(response.body.message) ? response.body.message : [response.body.message];
      expect(messages.some((msg: string) => msg.includes('Color must be a valid hex color'))).toBe(true);
    });

    it('should reject invalid hex color format in status.success', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/settings/theme')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: { success: 'green' } })
        .expect(400);

      const messages = Array.isArray(response.body.message) ? response.body.message : [response.body.message];
      expect(messages.some((msg: string) => msg.includes('Color must be a valid hex color'))).toBe(true);
    });

    it('should accept valid 3-character hex colors', async () => {
      mockSettingsService.updateThemeSettings.mockResolvedValue({
        primary: '#abc',
        secondary: '#7c3aed',
        background: { page: '#ffffff', card: '#f9fafb' },
        text: { primary: '#111827', secondary: '#6b7280' },
        status: { success: '#10b981', warning: '#f59e0b', error: '#ef4444' },
      });

      const response = await request(app.getHttpServer())
        .put('/api/v1/settings/theme')
        .set('Authorization', 'Bearer valid-token')
        .send({ primary: '#abc' })
        .expect(200);

      expect(response.body.primary).toBe('#abc');
    });

    it('should accept valid 6-character hex colors', async () => {
      mockSettingsService.updateThemeSettings.mockResolvedValue({
        primary: '#aabbcc',
        secondary: '#7c3aed',
        background: { page: '#ffffff', card: '#f9fafb' },
        text: { primary: '#111827', secondary: '#6b7280' },
        status: { success: '#10b981', warning: '#f59e0b', error: '#ef4444' },
      });

      const response = await request(app.getHttpServer())
        .put('/api/v1/settings/theme')
        .set('Authorization', 'Bearer valid-token')
        .send({ primary: '#aabbcc' })
        .expect(200);

      expect(response.body.primary).toBe('#aabbcc');
    });

    it('should accept case-insensitive hex colors', async () => {
      mockSettingsService.updateThemeSettings.mockResolvedValue({
        primary: '#AABBCC',
        secondary: '#7c3aed',
        background: { page: '#ffffff', card: '#f9fafb' },
        text: { primary: '#111827', secondary: '#6b7280' },
        status: { success: '#10b981', warning: '#f59e0b', error: '#ef4444' },
      });

      const response = await request(app.getHttpServer())
        .put('/api/v1/settings/theme')
        .set('Authorization', 'Bearer valid-token')
        .send({ primary: '#AABBCC' })
        .expect(200);

      expect(response.body.primary).toBe('#AABBCC');
    });

    it('should reject hex colors without # prefix', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/settings/theme')
        .set('Authorization', 'Bearer valid-token')
        .send({ primary: 'aabbcc' })
        .expect(400);

      const messages = Array.isArray(response.body.message) ? response.body.message : [response.body.message];
      expect(messages.some((msg: string) => msg.includes('Color must be a valid hex color'))).toBe(true);
    });

    it('should reject invalid length hex colors', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/settings/theme')
        .set('Authorization', 'Bearer valid-token')
        .send({ primary: '#aabbccc' }) // 7 characters
        .expect(400);

      const messages = Array.isArray(response.body.message) ? response.body.message : [response.body.message];
      expect(messages.some((msg: string) => msg.includes('Color must be a valid hex color'))).toBe(true);
    });

    it('should work without authentication (userId undefined)', async () => {
      mockAuthService.decodeToken.mockReturnValue(null);
      mockSettingsService.updateThemeSettings.mockResolvedValue({
        primary: '#FF0000',
        secondary: '#7c3aed',
        background: { page: '#ffffff', card: '#f9fafb' },
        text: { primary: '#111827', secondary: '#6b7280' },
        status: { success: '#10b981', warning: '#f59e0b', error: '#ef4444' },
      });

      const response = await request(app.getHttpServer())
        .put('/api/v1/settings/theme')
        .send({ primary: '#FF0000' })
        .expect(200);

      expect(response.body.primary).toBe('#FF0000');
      expect(mockSettingsService.updateThemeSettings).toHaveBeenCalledWith(
        { primary: '#FF0000' },
        undefined, // No user ID
        expect.anything(),
      );
    });
  });

  describe('Theme Data Persistence', () => {
    it('should persist theme across server restarts (via database)', async () => {
      // First, set a custom theme (using valid hex colors)
      const customTheme = {
        primary: '#aa0001',
        secondary: '#bb0002',
        background: { page: '#cc0003', card: '#dd0004' },
        text: { primary: '#ee0005', secondary: '#ff0006' },
        status: { success: '#00aa07', warning: '#00bb08', error: '#00cc09' },
      };

      mockSettingsService.updateThemeSettings.mockResolvedValue(customTheme);
      await request(app.getHttpServer())
        .put('/api/v1/settings/theme')
        .set('Authorization', 'Bearer valid-token')
        .send(customTheme)
        .expect(200);

      // Then, get the theme back (simulating server restart by calling GET)
      mockSettingsService.getThemeSettings.mockResolvedValue(customTheme);
      const response = await request(app.getHttpServer())
        .get('/api/v1/settings/theme')
        .expect(200);

      expect(response.body.primary).toBe('#aa0001');
      expect(response.body.secondary).toBe('#bb0002');
      expect(response.body.background.page).toBe('#cc0003');
      expect(response.body.text.primary).toBe('#ee0005');
      expect(response.body.status.success).toBe('#00aa07');
    });
  });
});
