/**
 * Feedback Feature Flag Tests
 * STORY-041: Feedback Feature Flag
 *
 * Unit tests for Feedback Feature Flag functionality including:
 * - Get feedback_enabled from general settings
 * - Update feedback_enabled via general settings
 * - Get public settings including feedback_enabled
 * - Check isFeedbackEnabled
 * - Feature toggle integration
 */

import { Test, TestingModule } from '@nestjs/testing';
import { GeneralSettingsService } from '../../src/settings/general-settings.service';
import { FeatureTogglesService, DEFAULT_FEATURES } from '../../src/settings/feature-toggles.service';
import { DatabaseService } from '../../src/database/database.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';
import { AuditService } from '../../src/common/services/audit.service';
import { UpdateGeneralSettingsDto } from '../../src/settings/dto/general-settings.dto';

describe('Feedback Feature Flag (STORY-041)', () => {
  let generalSettingsService: GeneralSettingsService;
  let featureTogglesService: FeatureTogglesService;
  let mockPool: {
    query: jest.Mock;
  };

  const mockSettingsWithFeedbackDisabled = {
    support_email: 'support@example.com',
    session_timeout_minutes: 30,
    show_timeout_warning: true,
    warning_before_timeout_minutes: 5,
    updated_at: new Date('2025-01-15T10:30:00Z'),
    last_updated_by: 1,
    features: {
      'user-registration': {
        enabled: true,
        name: 'User Registration',
        description: 'Allow users to self-register',
        category: 'authentication',
      },
      feedback: {
        enabled: false,
        name: 'Feedback System',
        description: 'Allow users to submit feedback with screenshots',
        category: 'support',
      },
      'dark-mode': {
        enabled: false,
        name: 'Dark Mode',
        description: 'Allow users to switch to dark theme',
        category: 'ui',
      },
    },
  };

  const mockSettingsWithFeedbackEnabled = {
    ...mockSettingsWithFeedbackDisabled,
    features: {
      ...mockSettingsWithFeedbackDisabled.features,
      feedback: {
        enabled: true,
        name: 'Feedback System',
        description: 'Allow users to submit feedback with screenshots',
        category: 'support',
      },
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
        GeneralSettingsService,
        FeatureTogglesService,
        {
          provide: DatabaseService,
          useValue: {
            getPool: jest.fn(() => mockPool),
            ensurePool: jest.fn(() => mockPool),
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

    generalSettingsService = module.get<GeneralSettingsService>(GeneralSettingsService);
    featureTogglesService = module.get<FeatureTogglesService>(FeatureTogglesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    generalSettingsService.invalidateCache();
    featureTogglesService.clearCache();
  });

  describe('DEFAULT_FEATURES', () => {
    it('should include feedback feature with default disabled state', () => {
      expect(DEFAULT_FEATURES['feedback']).toBeDefined();
      expect(DEFAULT_FEATURES['feedback'].enabled).toBe(false);
      expect(DEFAULT_FEATURES['feedback'].name).toBe('Feedback System');
      expect(DEFAULT_FEATURES['feedback'].description).toBe(
        'Allow users to submit feedback with screenshots',
      );
      expect(DEFAULT_FEATURES['feedback'].category).toBe('support');
    });
  });

  describe('getGeneralSettings', () => {
    it('should return feedback_enabled from features JSONB', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [mockSettingsWithFeedbackDisabled],
      });

      const result = await generalSettingsService.getGeneralSettings();

      expect(result.feedback_enabled).toBe(false);
    });

    it('should return feedback_enabled as true when enabled in database', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [mockSettingsWithFeedbackEnabled],
      });

      const result = await generalSettingsService.getGeneralSettings();

      expect(result.feedback_enabled).toBe(true);
    });

    it('should return feedback_enabled as false when features is null', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          ...mockSettingsWithFeedbackDisabled,
          features: null,
        }],
      });

      const result = await generalSettingsService.getGeneralSettings();

      expect(result.feedback_enabled).toBe(false);
    });

    it('should return feedback_enabled as false when feedback key is missing', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          ...mockSettingsWithFeedbackDisabled,
          features: {
            'user-registration': { enabled: true },
          },
        }],
      });

      const result = await generalSettingsService.getGeneralSettings();

      expect(result.feedback_enabled).toBe(false);
    });

    it('should return default feedback_enabled when no settings exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await generalSettingsService.getGeneralSettings();

      expect(result.feedback_enabled).toBe(false);
    });
  });

  describe('updateGeneralSettings with feedback_enabled', () => {
    beforeEach(() => {
      // First query returns current settings
      mockPool.query.mockResolvedValueOnce({
        rows: [mockSettingsWithFeedbackDisabled],
      });
    });

    it('should update feedback_enabled to true', async () => {
      // Update for last_updated_by (since userId is provided)
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      // JSONB update query for feedback
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      // Get updated settings (called after update)
      mockPool.query.mockResolvedValueOnce({
        rows: [mockSettingsWithFeedbackEnabled],
      });

      const updateDto: UpdateGeneralSettingsDto = {
        feedback_enabled: true,
      };

      const result = await generalSettingsService.updateGeneralSettings(
        updateDto,
        1,
        mockRequest,
      );

      expect(result.feedback_enabled).toBe(true);
      // Verify jsonb_set was called
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('jsonb_set'),
        expect.arrayContaining([JSON.stringify({ enabled: true })]),
      );
    });

    it('should update feedback_enabled to false', async () => {
      // Reset mocks for enabled state
      mockPool.query.mockReset();
      // getGeneralSettings initial call
      mockPool.query.mockResolvedValueOnce({
        rows: [mockSettingsWithFeedbackEnabled],
      });
      // Update for last_updated_by
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      // JSONB update query
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      // Get updated settings
      mockPool.query.mockResolvedValueOnce({
        rows: [mockSettingsWithFeedbackDisabled],
      });

      const updateDto: UpdateGeneralSettingsDto = {
        feedback_enabled: false,
      };

      const result = await generalSettingsService.updateGeneralSettings(
        updateDto,
        1,
        mockRequest,
      );

      expect(result.feedback_enabled).toBe(false);
    });

    it('should update feedback_enabled along with other settings', async () => {
      // Regular fields update query
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      // JSONB update query for feedback
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      // Get updated settings
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          ...mockSettingsWithFeedbackEnabled,
          session_timeout_minutes: 60,
        }],
      });

      const updateDto: UpdateGeneralSettingsDto = {
        session_timeout_minutes: 60,
        feedback_enabled: true,
      };

      const result = await generalSettingsService.updateGeneralSettings(
        updateDto,
        1,
        mockRequest,
      );

      expect(result.session_timeout_minutes).toBe(60);
      expect(result.feedback_enabled).toBe(true);
    });

    it('should return current settings when no updates provided', async () => {
      const updateDto: UpdateGeneralSettingsDto = {};

      const result = await generalSettingsService.updateGeneralSettings(
        updateDto,
        1,
        mockRequest,
      );

      expect(result.feedback_enabled).toBe(false);
      // Only one query for getting current settings
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPublicSettings', () => {
    it('should return feedback_enabled in public settings', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ features: mockSettingsWithFeedbackDisabled.features }],
      });

      const result = await generalSettingsService.getPublicSettings();

      expect(result.feedback_enabled).toBe(false);
      expect(result.registration_enabled).toBe(true);
      expect(result.dark_mode_enabled).toBe(false);
    });

    it('should return feedback_enabled as true when enabled', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ features: mockSettingsWithFeedbackEnabled.features }],
      });

      const result = await generalSettingsService.getPublicSettings();

      expect(result.feedback_enabled).toBe(true);
    });

    it('should return defaults when features is null', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ features: null }],
      });

      const result = await generalSettingsService.getPublicSettings();

      expect(result.feedback_enabled).toBe(false);
      expect(result.registration_enabled).toBe(true);
      expect(result.dark_mode_enabled).toBe(false);
    });

    it('should return defaults when no settings exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await generalSettingsService.getPublicSettings();

      expect(result.feedback_enabled).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await generalSettingsService.getPublicSettings();

      expect(result.feedback_enabled).toBe(false);
    });
  });

  describe('isFeedbackEnabled', () => {
    it('should return true when feedback is enabled', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ features: mockSettingsWithFeedbackEnabled.features }],
      });

      const result = await generalSettingsService.isFeedbackEnabled();

      expect(result).toBe(true);
    });

    it('should return false when feedback is disabled', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ features: mockSettingsWithFeedbackDisabled.features }],
      });

      const result = await generalSettingsService.isFeedbackEnabled();

      expect(result).toBe(false);
    });

    it('should return false when features is null', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ features: null }],
      });

      const result = await generalSettingsService.isFeedbackEnabled();

      expect(result).toBe(false);
    });

    it('should return false when feedback key is missing', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ features: { 'user-registration': { enabled: true } } }],
      });

      const result = await generalSettingsService.isFeedbackEnabled();

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await generalSettingsService.isFeedbackEnabled();

      expect(result).toBe(false);
    });
  });

  describe('FeatureTogglesService with feedback', () => {
    it('should include feedback in features list', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ features: mockSettingsWithFeedbackEnabled.features }],
      });

      const features = await featureTogglesService.getFeatures();

      expect(features['feedback']).toBeDefined();
      expect(features['feedback'].enabled).toBe(true);
    });

    it('should check if feedback is enabled via isEnabled', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ features: mockSettingsWithFeedbackEnabled.features }],
      });

      const isEnabled = await featureTogglesService.isEnabled('feedback');

      expect(isEnabled).toBe(true);
    });

    it('should toggle feedback feature', async () => {
      // First query returns current features
      mockPool.query.mockResolvedValueOnce({
        rows: [{ features: mockSettingsWithFeedbackDisabled.features }],
      });
      // Update query
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      // Settings history insert
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await featureTogglesService.toggleFeature(
        'feedback',
        true,
        1,
        mockRequest,
      );

      expect(result.key).toBe('feedback');
      expect(result.enabled).toBe(true);
    });
  });
});
