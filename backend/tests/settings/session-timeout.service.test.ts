/**
 * Session Timeout Service Tests
 * STORY-035: Support-E-Mail & Session-Timeout
 *
 * Unit tests for SessionTimeoutService including:
 * - Recording and retrieving activity
 * - Session status checks
 * - Timeout validation
 * - Session cleanup
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SessionTimeoutService } from '../../src/settings/session-timeout.service';
import { GeneralSettingsService } from '../../src/settings/general-settings.service';
import { DatabaseService } from '../../src/database/database.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';

describe('SessionTimeoutService', () => {
  let service: SessionTimeoutService;
  let generalSettingsService: jest.Mocked<GeneralSettingsService>;

  const mockSettings = {
    support_email: 'support@example.com',
    session_timeout_minutes: 30,
    show_timeout_warning: true,
    warning_before_timeout_minutes: 5,
    updated_at: new Date(),
    updated_by: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionTimeoutService,
        {
          provide: DatabaseService,
          useValue: {
            getPool: jest.fn(),
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
          provide: GeneralSettingsService,
          useValue: {
            getSessionTimeoutMinutes: jest.fn().mockResolvedValue(30),
            getGeneralSettings: jest.fn().mockResolvedValue(mockSettings),
          },
        },
      ],
    }).compile();

    service = module.get<SessionTimeoutService>(SessionTimeoutService);
    generalSettingsService = module.get(GeneralSettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up all sessions
    service.removeAllUserSessions(1);
    service.removeAllUserSessions(2);
  });

  afterAll(() => {
    // Stop the cleanup interval to prevent test leaks
    service.onModuleDestroy();
  });

  describe('recordActivity', () => {
    it('should record activity for a session', () => {
      const userId = 1;
      const tokenHash = 'test-token-hash';

      service.recordActivity(userId, tokenHash);

      const lastActivity = service.getLastActivity(userId, tokenHash);
      expect(lastActivity).toBeInstanceOf(Date);
      expect(lastActivity!.getTime()).toBeCloseTo(Date.now(), -2);
    });

    it('should update activity timestamp on subsequent calls', async () => {
      const userId = 1;
      const tokenHash = 'test-token-hash';

      service.recordActivity(userId, tokenHash);
      const firstActivity = service.getLastActivity(userId, tokenHash);

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      service.recordActivity(userId, tokenHash);
      const secondActivity = service.getLastActivity(userId, tokenHash);

      expect(secondActivity!.getTime()).toBeGreaterThan(firstActivity!.getTime());
    });
  });

  describe('getLastActivity', () => {
    it('should return null for non-existent session', () => {
      const result = service.getLastActivity(999, 'non-existent-hash');
      expect(result).toBeNull();
    });

    it('should return activity timestamp for existing session', () => {
      service.recordActivity(1, 'test-hash');

      const result = service.getLastActivity(1, 'test-hash');

      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('checkSessionStatus', () => {
    it('should return valid status for new session (no activity recorded)', async () => {
      const status = await service.checkSessionStatus(1, 'new-session');

      expect(status.isValid).toBe(true);
      expect(status.remainingMs).toBe(30 * 60 * 1000);
      expect(status.shouldWarn).toBe(false);
    });

    it('should return valid status for active session', async () => {
      service.recordActivity(1, 'active-session');

      const status = await service.checkSessionStatus(1, 'active-session');

      expect(status.isValid).toBe(true);
      expect(status.remainingMs).toBeGreaterThan(0);
      expect(status.shouldWarn).toBe(false);
    });

    it('should return invalid status for timed out session', async () => {
      // Set timeout to 1 minute for testing
      generalSettingsService.getSessionTimeoutMinutes.mockResolvedValue(1);

      // Record activity 2 minutes ago
      const userId = 1;
      const tokenHash = 'timed-out-session';
      service.recordActivity(userId, tokenHash);

      // Manually set old activity time using internal access
      // We'll simulate by setting a very short timeout
      generalSettingsService.getSessionTimeoutMinutes.mockResolvedValue(0.001); // ~60ms

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 100));

      const status = await service.checkSessionStatus(userId, tokenHash);

      expect(status.isValid).toBe(false);
      expect(status.remainingMs).toBe(0);
      expect(status.warningMessage).toBe('Session has expired due to inactivity');
    });

    it('should set shouldWarn when within warning threshold', async () => {
      // Set timeout to 5 minutes
      generalSettingsService.getSessionTimeoutMinutes.mockResolvedValue(5);
      // Warning at 5 minutes before timeout means always warn for 5 min session
      generalSettingsService.getGeneralSettings.mockResolvedValue({
        ...mockSettings,
        session_timeout_minutes: 5,
        warning_before_timeout_minutes: 10, // More than timeout for testing
      });

      service.recordActivity(1, 'warn-session');

      const status = await service.checkSessionStatus(1, 'warn-session');

      expect(status.isValid).toBe(true);
      expect(status.shouldWarn).toBe(true);
      expect(status.warningMessage).toBeDefined();
    });

    it('should not warn when warning is disabled', async () => {
      generalSettingsService.getGeneralSettings.mockResolvedValue({
        ...mockSettings,
        show_timeout_warning: false,
        warning_before_timeout_minutes: 25,
      });

      service.recordActivity(1, 'no-warn-session');

      const status = await service.checkSessionStatus(1, 'no-warn-session');

      expect(status.shouldWarn).toBe(false);
    });
  });

  describe('validateAndUpdateSession', () => {
    it('should return true and update activity for valid session', async () => {
      const userId = 1;
      const tokenHash = 'valid-session';

      service.recordActivity(userId, tokenHash);
      const initialActivity = service.getLastActivity(userId, tokenHash);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const isValid = await service.validateAndUpdateSession(userId, tokenHash);
      const updatedActivity = service.getLastActivity(userId, tokenHash);

      expect(isValid).toBe(true);
      expect(updatedActivity!.getTime()).toBeGreaterThan(initialActivity!.getTime());
    });

    it('should return true for new session with no activity', async () => {
      const isValid = await service.validateAndUpdateSession(1, 'new-session');

      expect(isValid).toBe(true);
      // Activity should now be recorded
      expect(service.getLastActivity(1, 'new-session')).toBeInstanceOf(Date);
    });
  });

  describe('removeSession', () => {
    it('should remove session from tracking', () => {
      service.recordActivity(1, 'remove-test');
      expect(service.getLastActivity(1, 'remove-test')).toBeInstanceOf(Date);

      service.removeSession(1, 'remove-test');

      expect(service.getLastActivity(1, 'remove-test')).toBeNull();
    });
  });

  describe('removeAllUserSessions', () => {
    it('should remove all sessions for a user', () => {
      service.recordActivity(1, 'session-1');
      service.recordActivity(1, 'session-2');
      service.recordActivity(1, 'session-3');
      service.recordActivity(2, 'other-user-session');

      service.removeAllUserSessions(1);

      expect(service.getLastActivity(1, 'session-1')).toBeNull();
      expect(service.getLastActivity(1, 'session-2')).toBeNull();
      expect(service.getLastActivity(1, 'session-3')).toBeNull();
      // Other user's session should remain
      expect(service.getLastActivity(2, 'other-user-session')).toBeInstanceOf(Date);
    });
  });

  describe('getActiveSessionCount', () => {
    it('should return correct count of tracked sessions', () => {
      expect(service.getActiveSessionCount()).toBe(0);

      service.recordActivity(1, 'session-1');
      service.recordActivity(1, 'session-2');
      service.recordActivity(2, 'session-3');

      expect(service.getActiveSessionCount()).toBe(3);

      service.removeSession(1, 'session-1');

      expect(service.getActiveSessionCount()).toBe(2);
    });
  });
});
