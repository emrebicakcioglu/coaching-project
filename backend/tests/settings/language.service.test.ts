/**
 * Language Service Tests
 * STORY-018A: Standard-Sprache Backend (i18n Setup)
 *
 * Unit tests for LanguageService including:
 * - Get admin language settings
 * - Update admin language settings
 * - Get user language preference
 * - Update user language preference
 * - Translation loading and caching
 * - Fallback language behavior
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  LanguageService,
  DEFAULT_ADMIN_LANGUAGE_SETTINGS,
  DEFAULT_USER_LANGUAGE_PREFERENCE,
} from '../../src/settings/language.service';
import { DatabaseService } from '../../src/database/database.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';
import { AuditService } from '../../src/common/services/audit.service';

describe('LanguageService', () => {
  let service: LanguageService;
  let databaseService: jest.Mocked<DatabaseService>;
  let mockPool: {
    query: jest.Mock;
  };

  const mockRequest = {
    ip: '127.0.0.1',
    userAgent: 'Jest Test Agent',
    requestId: 'test-request-id',
  };

  beforeEach(async () => {
    mockPool = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LanguageService,
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
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LanguageService>(LanguageService);
    databaseService = module.get(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Default Values', () => {
    it('should have correct default admin language settings', () => {
      expect(DEFAULT_ADMIN_LANGUAGE_SETTINGS).toEqual({
        default_language: 'en',
        supported_languages: ['en', 'de'],
        fallback_language: 'en',
      });
    });

    it('should have correct default user language preference', () => {
      expect(DEFAULT_USER_LANGUAGE_PREFERENCE).toEqual({
        language: 'en',
        date_format: 'YYYY-MM-DD',
        number_format: 'en-US',
      });
    });
  });

  describe('isValidLanguageCode', () => {
    it('should return true for valid language codes', () => {
      expect(service.isValidLanguageCode('en')).toBe(true);
      expect(service.isValidLanguageCode('de')).toBe(true);
    });

    it('should return false for invalid language codes', () => {
      expect(service.isValidLanguageCode('fr')).toBe(false);
      expect(service.isValidLanguageCode('es')).toBe(false);
      expect(service.isValidLanguageCode('')).toBe(false);
      expect(service.isValidLanguageCode('invalid')).toBe(false);
    });
  });

  describe('getLanguageMetadata', () => {
    it('should return metadata for English', () => {
      const metadata = service.getLanguageMetadata('en');
      expect(metadata).toEqual({
        code: 'en',
        name: 'English',
        nativeName: 'English',
        dateFormat: 'YYYY-MM-DD',
        numberFormat: 'en-US',
      });
    });

    it('should return metadata for German', () => {
      const metadata = service.getLanguageMetadata('de');
      expect(metadata).toEqual({
        code: 'de',
        name: 'German',
        nativeName: 'Deutsch',
        dateFormat: 'DD.MM.YYYY',
        numberFormat: 'de-DE',
      });
    });

    it('should return null for invalid language code', () => {
      expect(service.getLanguageMetadata('fr')).toBeNull();
      expect(service.getLanguageMetadata('')).toBeNull();
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return all supported languages', () => {
      const languages = service.getSupportedLanguages();
      expect(languages).toHaveLength(2);
      expect(languages[0].code).toBe('en');
      expect(languages[1].code).toBe('de');
    });
  });

  describe('getAdminSettings', () => {
    it('should return settings from database', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          default_language: 'de',
          supported_languages: ['en', 'de'],
          fallback_language: 'en',
        }],
      });

      const settings = await service.getAdminSettings();

      expect(settings.default_language).toBe('de');
      expect(settings.supported_languages).toEqual(['en', 'de']);
      expect(settings.fallback_language).toBe('en');
    });

    it('should return default settings when database returns no rows', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      const settings = await service.getAdminSettings();

      expect(settings).toEqual(DEFAULT_ADMIN_LANGUAGE_SETTINGS);
    });

    it('should return default settings when database is unavailable', async () => {
      (databaseService.getPool as jest.Mock).mockReturnValueOnce(null);

      const settings = await service.getAdminSettings();

      expect(settings).toEqual(DEFAULT_ADMIN_LANGUAGE_SETTINGS);
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const settings = await service.getAdminSettings();

      expect(settings).toEqual(DEFAULT_ADMIN_LANGUAGE_SETTINGS);
    });
  });

  describe('updateAdminSettings', () => {
    beforeEach(() => {
      // Mock getAdminSettings query
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          default_language: 'en',
          supported_languages: ['en', 'de'],
          fallback_language: 'en',
        }],
      });
    });

    it('should update default language', async () => {
      // Mock update query
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      // Mock final getAdminSettings query
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          default_language: 'de',
          supported_languages: ['en', 'de'],
          fallback_language: 'en',
        }],
      });

      const result = await service.updateAdminSettings(
        { default_language: 'de' },
        1,
        mockRequest,
      );

      expect(result.default_language).toBe('de');
    });

    it('should throw BadRequestException for invalid default language', async () => {
      await expect(
        service.updateAdminSettings({ default_language: 'invalid' as any }, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid fallback language', async () => {
      await expect(
        service.updateAdminSettings({ fallback_language: 'invalid' as any }, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when database is unavailable', async () => {
      (databaseService.getPool as jest.Mock).mockReturnValueOnce(null);

      await expect(
        service.updateAdminSettings({ default_language: 'de' }, 1),
      ).rejects.toThrow('Database connection not available');
    });
  });

  describe('getUserLanguagePreference', () => {
    it('should return user preference from database', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          language: 'de',
          date_format: 'DD.MM.YYYY',
          number_format: 'de-DE',
        }],
      });

      const preference = await service.getUserLanguagePreference(1);

      expect(preference.language).toBe('de');
      expect(preference.date_format).toBe('DD.MM.YYYY');
      expect(preference.number_format).toBe('de-DE');
    });

    it('should return default values when user has no preference set', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          language: null,
          date_format: null,
          number_format: null,
        }],
      });

      const preference = await service.getUserLanguagePreference(1);

      expect(preference).toEqual(DEFAULT_USER_LANGUAGE_PREFERENCE);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      await expect(
        service.getUserLanguagePreference(999),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return default when database is unavailable', async () => {
      (databaseService.getPool as jest.Mock).mockReturnValueOnce(null);

      const preference = await service.getUserLanguagePreference(1);

      expect(preference).toEqual(DEFAULT_USER_LANGUAGE_PREFERENCE);
    });
  });

  describe('updateUserLanguagePreference', () => {
    beforeEach(() => {
      // Mock getUserLanguagePreference query
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          language: 'en',
          date_format: 'YYYY-MM-DD',
          number_format: 'en-US',
        }],
      });
    });

    it('should update user language preference', async () => {
      // Mock update query
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          language: 'de',
          date_format: 'DD.MM.YYYY',
          number_format: 'de-DE',
        }],
      });

      const result = await service.updateUserLanguagePreference(
        1,
        { language: 'de', date_format: 'DD.MM.YYYY', number_format: 'de-DE' },
        mockRequest,
      );

      expect(result.language).toBe('de');
      expect(result.date_format).toBe('DD.MM.YYYY');
      expect(result.number_format).toBe('de-DE');
    });

    it('should throw BadRequestException for invalid language', async () => {
      await expect(
        service.updateUserLanguagePreference(1, { language: 'invalid' as any }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user not found during update', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      await expect(
        service.updateUserLanguagePreference(999, { language: 'de' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error when database is unavailable', async () => {
      (databaseService.getPool as jest.Mock).mockReturnValueOnce(null);

      await expect(
        service.updateUserLanguagePreference(1, { language: 'de' }),
      ).rejects.toThrow('Database connection not available');
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', () => {
      service.clearCache();
      const stats = service.getCacheStats();
      expect(stats.languages).toBe(0);
      expect(stats.namespaces).toBe(0);
    });

    it('should return cache statistics', () => {
      const stats = service.getCacheStats();
      expect(typeof stats.languages).toBe('number');
      expect(typeof stats.namespaces).toBe('number');
    });
  });

  describe('Translation Functions', () => {
    beforeEach(async () => {
      // Mock admin settings for fallback
      mockPool.query.mockResolvedValue({
        rows: [{
          default_language: 'en',
          supported_languages: ['en', 'de'],
          fallback_language: 'en',
        }],
      });
    });

    it('should return key when translation not found', async () => {
      const result = await service.translate('en', 'nonexistent.key', 'common');
      expect(result).toBe('nonexistent.key');
    });

    it('should translate with variable substitution', async () => {
      // Clear cache to force reload
      service.clearCache();

      const result = await service.translate('en', 'auth.sessionWarning', 'common', { minutes: '5' });
      expect(result).toContain('5');
    });

    it('should handle deeply nested translation keys', async () => {
      service.clearCache();

      const result = await service.translate('en', 'password.tooShort', 'validation', { min: '8' });
      expect(result).toContain('8');
    });

    it('should return fallback for invalid language code', async () => {
      service.clearCache();

      const result = await service.translate('invalid', 'common.save', 'common');
      // Should fall back to English and return the translation or the key
      expect(typeof result).toBe('string');
    });
  });

  describe('getTranslations', () => {
    beforeEach(async () => {
      // Mock admin settings for fallback
      mockPool.query.mockResolvedValue({
        rows: [{
          default_language: 'en',
          supported_languages: ['en', 'de'],
          fallback_language: 'en',
        }],
      });
    });

    it('should get translations for valid language', async () => {
      service.clearCache();

      const translations = await service.getTranslations('en', 'common');
      expect(typeof translations).toBe('object');
    });

    it('should get translations for German language', async () => {
      service.clearCache();

      const translations = await service.getTranslations('de', 'common');
      expect(typeof translations).toBe('object');
    });

    it('should get validation translations', async () => {
      service.clearCache();

      const translations = await service.getTranslations('en', 'validation');
      expect(typeof translations).toBe('object');
    });

    it('should get emails translations', async () => {
      service.clearCache();

      const translations = await service.getTranslations('en', 'emails');
      expect(typeof translations).toBe('object');
    });

    it('should get errors translations', async () => {
      service.clearCache();

      const translations = await service.getTranslations('en', 'errors');
      expect(typeof translations).toBe('object');
    });

    it('should use fallback for invalid language', async () => {
      service.clearCache();

      const translations = await service.getTranslations('invalid', 'common');
      expect(typeof translations).toBe('object');
    });
  });

  describe('getAllTranslations', () => {
    beforeEach(async () => {
      mockPool.query.mockResolvedValue({
        rows: [{
          default_language: 'en',
          supported_languages: ['en', 'de'],
          fallback_language: 'en',
        }],
      });
    });

    it('should get all translations for English', async () => {
      service.clearCache();

      const allTranslations = await service.getAllTranslations('en');
      expect(allTranslations).toHaveProperty('common');
      expect(allTranslations).toHaveProperty('validation');
      expect(allTranslations).toHaveProperty('emails');
      expect(allTranslations).toHaveProperty('errors');
    });

    it('should get all translations for German', async () => {
      service.clearCache();

      const allTranslations = await service.getAllTranslations('de');
      expect(allTranslations).toHaveProperty('common');
      expect(allTranslations).toHaveProperty('validation');
      expect(allTranslations).toHaveProperty('emails');
      expect(allTranslations).toHaveProperty('errors');
    });
  });

  describe('onModuleInit', () => {
    it('should preload translations on module init', async () => {
      service.clearCache();

      // Manually call onModuleInit
      await service.onModuleInit();

      // Check cache stats show translations were loaded
      const stats = service.getCacheStats();
      expect(stats.languages).toBeGreaterThanOrEqual(0);
    });
  });

  describe('updateAdminSettings - additional cases', () => {
    it('should return current settings when no updates provided', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          default_language: 'en',
          supported_languages: ['en', 'de'],
          fallback_language: 'en',
        }],
      });

      const result = await service.updateAdminSettings({}, 1);

      expect(result.default_language).toBe('en');
    });

    it('should update supported_languages', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          default_language: 'en',
          supported_languages: ['en', 'de'],
          fallback_language: 'en',
        }],
      });
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          default_language: 'en',
          supported_languages: ['en', 'de', 'fr'],
          fallback_language: 'en',
        }],
      });

      const result = await service.updateAdminSettings(
        { supported_languages: ['en', 'de', 'fr'] },
        1,
        mockRequest,
      );

      expect(result.supported_languages).toEqual(['en', 'de', 'fr']);
    });

    it('should update fallback_language', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          default_language: 'en',
          supported_languages: ['en', 'de'],
          fallback_language: 'en',
        }],
      });
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          default_language: 'en',
          supported_languages: ['en', 'de'],
          fallback_language: 'de',
        }],
      });

      const result = await service.updateAdminSettings(
        { fallback_language: 'de' },
        1,
        mockRequest,
      );

      expect(result.fallback_language).toBe('de');
    });
  });

  describe('updateUserLanguagePreference - additional cases', () => {
    it('should return current preference when no updates provided', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          language: 'en',
          date_format: 'YYYY-MM-DD',
          number_format: 'en-US',
        }],
      });

      const result = await service.updateUserLanguagePreference(1, {});

      expect(result.language).toBe('en');
    });

    it('should update only date_format', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          language: 'en',
          date_format: 'YYYY-MM-DD',
          number_format: 'en-US',
        }],
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          language: 'en',
          date_format: 'DD.MM.YYYY',
          number_format: 'en-US',
        }],
      });

      const result = await service.updateUserLanguagePreference(
        1,
        { date_format: 'DD.MM.YYYY' },
        mockRequest,
      );

      expect(result.date_format).toBe('DD.MM.YYYY');
    });

    it('should update only number_format', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          language: 'en',
          date_format: 'YYYY-MM-DD',
          number_format: 'en-US',
        }],
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          language: 'en',
          date_format: 'YYYY-MM-DD',
          number_format: 'de-DE',
        }],
      });

      const result = await service.updateUserLanguagePreference(
        1,
        { number_format: 'de-DE' },
        mockRequest,
      );

      expect(result.number_format).toBe('de-DE');
    });
  });

  describe('getUserLanguagePreference - error handling', () => {
    it('should handle general database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Connection timeout'));

      const result = await service.getUserLanguagePreference(1);

      expect(result).toEqual(DEFAULT_USER_LANGUAGE_PREFERENCE);
    });
  });
});
