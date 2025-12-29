/**
 * Feature Toggles Service Tests
 * STORY-014A: Feature Toggles Backend
 * STORY-041: Feedback Feature Flag
 *
 * Unit tests for FeatureTogglesService including:
 * - Get all features
 * - Check if feature is enabled
 * - Toggle feature on/off
 * - Caching behavior
 * - Error handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import {
  FeatureTogglesService,
  DEFAULT_FEATURES,
} from '../../src/settings/feature-toggles.service';
import { DatabaseService } from '../../src/database/database.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';
import { AuditService } from '../../src/common/services/audit.service';

describe('FeatureTogglesService', () => {
  let service: FeatureTogglesService;
  let databaseService: jest.Mocked<DatabaseService>;
  let mockPool: {
    query: jest.Mock;
  };

  const mockFeatures = {
    'user-registration': {
      enabled: true,
      name: 'User Registration',
      description: 'Allow users to self-register',
      category: 'authentication',
    },
    'mfa': {
      enabled: false,
      name: 'Multi-Factor Authentication',
      description: 'Enable 2FA for users',
      category: 'security',
    },
    'feedback-button': {
      enabled: true,
      name: 'Feedback Button',
      description: 'Show feedback button with screenshot',
      category: 'support',
    },
    'dark-mode': {
      enabled: false,
      name: 'Dark Mode',
      description: 'Allow users to switch to dark theme',
      category: 'ui',
    },
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
        FeatureTogglesService,
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

    service = module.get<FeatureTogglesService>(FeatureTogglesService);
    databaseService = module.get(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Invalidate cache between tests
    service.clearCache();
  });

  describe('getFeatures', () => {
    it('should return features from database', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ features: mockFeatures }],
      });

      const result = await service.getFeatures();

      expect(result['user-registration'].enabled).toBe(true);
      expect(result['mfa'].enabled).toBe(false);
      expect(result['feedback-button'].enabled).toBe(true);
      expect(result['dark-mode'].enabled).toBe(false);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT features'),
      );
    });

    it('should return default features when no features exist in database', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getFeatures();

      expect(result).toEqual(DEFAULT_FEATURES);
    });

    it('should return default when database pool is not available', async () => {
      (databaseService.getPool as jest.Mock).mockReturnValueOnce(null);

      const result = await service.getFeatures();

      expect(result).toEqual(DEFAULT_FEATURES);
    });

    it('should cache features after first query', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ features: mockFeatures }],
      });

      // First call - hits database
      const result1 = await service.getFeatures();
      // Second call - should use cache
      const result2 = await service.getFeatures();

      expect(result1).toEqual(result2);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.getFeatures();

      expect(result).toEqual(DEFAULT_FEATURES);
    });

    it('should convert legacy features format', async () => {
      const legacyFeatures = {
        mfa_enabled: true,
        registration_enabled: false,
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ features: legacyFeatures }],
      });

      const result = await service.getFeatures();

      expect(result['mfa'].enabled).toBe(true);
      expect(result['user-registration'].enabled).toBe(false);
    });
  });

  describe('isEnabled', () => {
    it('should return true for enabled feature', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ features: mockFeatures }],
      });

      const result = await service.isEnabled('user-registration');

      expect(result).toBe(true);
    });

    it('should return false for disabled feature', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ features: mockFeatures }],
      });

      const result = await service.isEnabled('mfa');

      expect(result).toBe(false);
    });

    it('should return false for non-existent feature', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ features: mockFeatures }],
      });

      const result = await service.isEnabled('non-existent-feature');

      expect(result).toBe(false);
    });

    it('should use cached features', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ features: mockFeatures }],
      });

      // Multiple calls should only hit database once
      await service.isEnabled('user-registration');
      await service.isEnabled('mfa');
      await service.isEnabled('feedback-button');

      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('getFeature', () => {
    it('should return feature details for existing feature', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ features: mockFeatures }],
      });

      const result = await service.getFeature('user-registration');

      expect(result.key).toBe('user-registration');
      expect(result.name).toBe('User Registration');
      expect(result.description).toBe('Allow users to self-register');
      expect(result.enabled).toBe(true);
      expect(result.category).toBe('authentication');
    });

    it('should throw NotFoundException for non-existent feature', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ features: mockFeatures }],
      });

      await expect(service.getFeature('non-existent-feature')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggleFeature', () => {
    beforeEach(() => {
      // First query returns current features
      mockPool.query.mockResolvedValueOnce({
        rows: [{ features: mockFeatures }],
      });
    });

    it('should toggle feature from enabled to disabled', async () => {
      // Update query
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      // Settings history insert
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.toggleFeature(
        'user-registration',
        false,
        1,
        mockRequest,
      );

      expect(result.key).toBe('user-registration');
      expect(result.enabled).toBe(false);
    });

    it('should toggle feature from disabled to enabled', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.toggleFeature('mfa', true, 1, mockRequest);

      expect(result.key).toBe('mfa');
      expect(result.enabled).toBe(true);
    });

    it('should return unchanged feature if toggle matches current state', async () => {
      const result = await service.toggleFeature(
        'user-registration',
        true, // Already enabled
        1,
        mockRequest,
      );

      expect(result.enabled).toBe(true);
      // Should not make update query
      expect(mockPool.query).toHaveBeenCalledTimes(1); // Only the initial getFeatures call
    });

    it('should throw NotFoundException for non-existent feature', async () => {
      await expect(
        service.toggleFeature('non-existent-feature', true, 1, mockRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it('should invalidate cache after toggle', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      await service.toggleFeature('user-registration', false, 1, mockRequest);

      // Clear mocks for subsequent calls
      mockPool.query.mockClear();
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            features: {
              ...mockFeatures,
              'user-registration': { ...mockFeatures['user-registration'], enabled: false },
            },
          },
        ],
      });

      // Next getFeatures should hit database again
      await service.getFeatures();

      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error when database pool is not available', async () => {
      // Clear initial setup mock
      mockPool.query.mockReset();
      (databaseService.getPool as jest.Mock).mockReturnValue(null);

      await expect(
        service.toggleFeature('user-registration', false, 1, mockRequest),
      ).rejects.toThrow('Database pool not available');
    });
  });

  describe('updateFeature', () => {
    beforeEach(() => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ features: mockFeatures }],
      });
    });

    it('should update feature name', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.updateFeature(
        'user-registration',
        { enabled: true, name: 'Self Registration' },
        1,
        mockRequest,
      );

      expect(result.name).toBe('Self Registration');
      expect(result.enabled).toBe(true);
    });

    it('should update feature description', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.updateFeature(
        'mfa',
        { enabled: true, description: 'Updated MFA description' },
        1,
        mockRequest,
      );

      expect(result.description).toBe('Updated MFA description');
    });

    it('should update feature category', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.updateFeature(
        'feedback-button',
        { enabled: true, category: 'feedback' },
        1,
        mockRequest,
      );

      expect(result.category).toBe('feedback');
    });

    it('should throw NotFoundException for non-existent feature', async () => {
      await expect(
        service.updateFeature(
          'non-existent-feature',
          { enabled: true },
          1,
          mockRequest,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('clearCache', () => {
    it('should invalidate cache', async () => {
      // First call populates cache
      mockPool.query.mockResolvedValueOnce({
        rows: [{ features: mockFeatures }],
      });
      await service.getFeatures();

      // Clear cache
      service.clearCache();

      // Second call should hit database again
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            features: {
              ...mockFeatures,
              'mfa': { ...mockFeatures['mfa'], enabled: true },
            },
          },
        ],
      });
      const result = await service.getFeatures();

      expect(result['mfa'].enabled).toBe(true);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('DEFAULT_FEATURES', () => {
    it('should have correct default feature structure', () => {
      expect(DEFAULT_FEATURES['user-registration']).toBeDefined();
      expect(DEFAULT_FEATURES['user-registration'].enabled).toBe(true);
      expect(DEFAULT_FEATURES['user-registration'].name).toBe('User Registration');
      expect(DEFAULT_FEATURES['user-registration'].category).toBe('authentication');

      expect(DEFAULT_FEATURES['mfa']).toBeDefined();
      expect(DEFAULT_FEATURES['mfa'].enabled).toBe(false);
      expect(DEFAULT_FEATURES['mfa'].name).toBe('Multi-Factor Authentication');
      expect(DEFAULT_FEATURES['mfa'].category).toBe('security');

      expect(DEFAULT_FEATURES['feedback-button']).toBeDefined();
      expect(DEFAULT_FEATURES['feedback-button'].enabled).toBe(true);
      expect(DEFAULT_FEATURES['feedback-button'].category).toBe('support');

      expect(DEFAULT_FEATURES['dark-mode']).toBeDefined();
      expect(DEFAULT_FEATURES['dark-mode'].enabled).toBe(false);
      expect(DEFAULT_FEATURES['dark-mode'].category).toBe('ui');

      // STORY-041: Feedback Feature Flag
      expect(DEFAULT_FEATURES['feedback']).toBeDefined();
      expect(DEFAULT_FEATURES['feedback'].enabled).toBe(false);
      expect(DEFAULT_FEATURES['feedback'].name).toBe('Feedback System');
      expect(DEFAULT_FEATURES['feedback'].category).toBe('support');
    });
  });
});
