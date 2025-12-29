/**
 * Jira Settings Service Tests
 * STORY-041D: Jira Settings API
 *
 * Unit tests for JiraSettingsService including:
 * - Get Jira settings (with token masking)
 * - Update Jira settings (with token encryption)
 * - Get decrypted settings for internal use
 * - Connection testing
 * - isJiraEnabled check
 */

import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { JiraSettingsService } from '../../src/jira/jira-settings.service';
import { DatabaseService } from '../../src/database/database.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';
import { AuditService } from '../../src/common/services/audit.service';
import { UpdateJiraSettingsDto } from '../../src/jira/dto/jira-settings.dto';
import * as encryptionUtil from '../../src/common/utils/encryption.util';

// Mock the encryption utility
jest.mock('../../src/common/utils/encryption.util', () => ({
  encrypt: jest.fn((text: string) => `encrypted:mock:${text}`),
  decrypt: jest.fn((text: string) => {
    if (text.startsWith('encrypted:mock:')) {
      return text.replace('encrypted:mock:', '');
    }
    return text;
  }),
  isEncrypted: jest.fn((text: string) => text?.startsWith('encrypted:mock:')),
}));

// Mock fetch for connection testing
global.fetch = jest.fn();

describe('JiraSettingsService', () => {
  let service: JiraSettingsService;
  let mockPool: {
    query: jest.Mock;
  };

  const mockJiraSettings = {
    integrations: {
      jira: {
        enabled: true,
        url: 'company.atlassian.net',
        email: 'jira@company.com',
        apiToken: 'encrypted:mock:test-token',
        projectKey: 'FEEDBACK',
        issueType: 'Bug',
      },
    },
    updated_at: new Date('2025-01-15T10:30:00Z'),
  };

  beforeEach(async () => {
    mockPool = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JiraSettingsService,
        {
          provide: DatabaseService,
          useValue: {
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

    service = module.get<JiraSettingsService>(JiraSettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getJiraSettings', () => {
    it('should return Jira settings with masked token', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockJiraSettings] });

      const result = await service.getJiraSettings();

      expect(result.enabled).toBe(true);
      expect(result.url).toBe('company.atlassian.net');
      expect(result.email).toBe('jira@company.com');
      expect(result.apiToken).toBe('********');
      expect(result.projectKey).toBe('FEEDBACK');
      expect(result.issueType).toBe('Bug');
      expect(result.isConfigured).toBe(true);
    });

    it('should return default values when no settings exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getJiraSettings();

      expect(result.enabled).toBe(false);
      expect(result.url).toBe('');
      expect(result.email).toBe('');
      expect(result.apiToken).toBe('');
      expect(result.projectKey).toBe('');
      expect(result.issueType).toBe('Bug');
      expect(result.isConfigured).toBe(false);
    });

    it('should return default values when jira key is missing from integrations', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ integrations: {}, updated_at: new Date() }],
      });

      const result = await service.getJiraSettings();

      expect(result.enabled).toBe(false);
      expect(result.isConfigured).toBe(false);
    });

    it('should handle partial settings gracefully', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          integrations: {
            jira: {
              enabled: true,
              url: 'test.atlassian.net',
              // Missing email, apiToken, projectKey
            },
          },
          updated_at: new Date(),
        }],
      });

      const result = await service.getJiraSettings();

      expect(result.enabled).toBe(true);
      expect(result.url).toBe('test.atlassian.net');
      expect(result.email).toBe('');
      expect(result.apiToken).toBe('');
      expect(result.isConfigured).toBe(false);
    });
  });

  describe('getJiraSettingsDecrypted', () => {
    it('should return settings with decrypted token', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockJiraSettings] });

      const result = await service.getJiraSettingsDecrypted();

      expect(result).not.toBeNull();
      expect(result!.apiToken).toBe('test-token');
      expect(encryptionUtil.decrypt).toHaveBeenCalled();
    });

    it('should return null when no settings exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getJiraSettingsDecrypted();

      expect(result).toBeNull();
    });

    it('should handle decryption errors', async () => {
      (encryptionUtil.decrypt as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Decryption failed');
      });
      mockPool.query.mockResolvedValueOnce({ rows: [mockJiraSettings] });

      await expect(service.getJiraSettingsDecrypted()).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should return unencrypted token as-is (migration case)', async () => {
      (encryptionUtil.isEncrypted as jest.Mock).mockReturnValueOnce(false);
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          integrations: {
            jira: {
              ...mockJiraSettings.integrations.jira,
              apiToken: 'plain-token',
            },
          },
        }],
      });

      const result = await service.getJiraSettingsDecrypted();

      expect(result!.apiToken).toBe('plain-token');
    });
  });

  describe('updateJiraSettings', () => {
    const mockRequest = {
      ip: '127.0.0.1',
      headers: {},
    } as any;

    beforeEach(() => {
      // First query returns current settings for audit
      mockPool.query.mockResolvedValueOnce({ rows: [mockJiraSettings] });
      // Second query returns existing integrations
      mockPool.query.mockResolvedValueOnce({ rows: [mockJiraSettings] });
    });

    it('should update Jira settings and encrypt new token', async () => {
      // Update query
      mockPool.query.mockResolvedValueOnce({ rows: [{ updated_at: new Date() }] });
      // Get updated settings
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          integrations: {
            jira: {
              ...mockJiraSettings.integrations.jira,
              apiToken: 'encrypted:mock:new-token',
            },
          },
          updated_at: new Date(),
        }],
      });

      const updateDto: UpdateJiraSettingsDto = {
        apiToken: 'new-token',
      };

      const result = await service.updateJiraSettings(updateDto, 1, mockRequest);

      expect(encryptionUtil.encrypt).toHaveBeenCalledWith('new-token');
      expect(result.apiToken).toBe('********');
    });

    it('should update URL without changing token', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ updated_at: new Date() }] });
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          integrations: {
            jira: {
              ...mockJiraSettings.integrations.jira,
              url: 'new-company.atlassian.net',
            },
          },
          updated_at: new Date(),
        }],
      });

      const updateDto: UpdateJiraSettingsDto = {
        url: 'new-company.atlassian.net',
      };

      const result = await service.updateJiraSettings(updateDto, 1, mockRequest);

      expect(result.url).toBe('new-company.atlassian.net');
      // Token should not be encrypted again (not updated)
      expect(encryptionUtil.encrypt).not.toHaveBeenCalled();
    });

    it('should enable/disable Jira integration', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ updated_at: new Date() }] });
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          integrations: {
            jira: {
              ...mockJiraSettings.integrations.jira,
              enabled: false,
            },
          },
          updated_at: new Date(),
        }],
      });

      const updateDto: UpdateJiraSettingsDto = {
        enabled: false,
      };

      const result = await service.updateJiraSettings(updateDto, 1, mockRequest);

      expect(result.enabled).toBe(false);
    });

    it('should not update token when empty string is provided', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ updated_at: new Date() }] });
      mockPool.query.mockResolvedValueOnce({ rows: [mockJiraSettings] });

      const updateDto: UpdateJiraSettingsDto = {
        apiToken: '',
        email: 'new@email.com',
      };

      await service.updateJiraSettings(updateDto, 1, mockRequest);

      // Should not encrypt empty string
      expect(encryptionUtil.encrypt).not.toHaveBeenCalled();
    });

    it('should handle encryption errors gracefully', async () => {
      (encryptionUtil.encrypt as jest.Mock).mockImplementationOnce(() => {
        throw new Error('ENCRYPTION_KEY not set');
      });

      const updateDto: UpdateJiraSettingsDto = {
        apiToken: 'new-token',
      };

      await expect(
        service.updateJiraSettings(updateDto, 1, mockRequest),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('testConnection', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockReset();
    });

    it('should return success when connection is valid', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockJiraSettings] });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ version: '1001.0.0', serverTitle: 'Jira' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            name: 'Feedback Project',
            issueTypes: [{ name: 'Bug' }, { name: 'Task' }],
          }),
        });

      const result = await service.testConnection(true);

      expect(result.success).toBe(true);
      expect(result.projectName).toBe('Feedback Project');
      expect(result.issueTypes).toEqual(['Bug', 'Task']);
    });

    it('should return error when credentials are invalid', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockJiraSettings] });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const result = await service.testConnection(true);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Authentication failed');
    });

    it('should return error when project not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockJiraSettings] });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ version: '1001.0.0' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        });

      const result = await service.testConnection(true);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Project not found');
    });

    it('should return error when Jira is not configured', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.testConnection(true);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Jira is not configured');
    });

    it('should return error for incomplete configuration', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          integrations: {
            jira: {
              enabled: true,
              url: 'test.atlassian.net',
              // Missing email, apiToken, projectKey
            },
          },
        }],
      });

      const result = await service.testConnection(true);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Jira configuration is incomplete');
    });

    it('should test with provided credentials', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ version: '1001.0.0' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            name: 'Test Project',
            issueTypes: [{ name: 'Task' }],
          }),
        });

      const result = await service.testConnection(false, {
        url: 'test.atlassian.net',
        email: 'test@test.com',
        apiToken: 'test-token',
        projectKey: 'TEST',
      });

      expect(result.success).toBe(true);
      expect(result.projectName).toBe('Test Project');
    });

    it('should handle network errors', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockJiraSettings] });

      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new TypeError('Failed to fetch'),
      );

      const result = await service.testConnection(true);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Network error');
    });

    it('should return error when access is denied (403)', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockJiraSettings] });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      });

      const result = await service.testConnection(true);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Access denied');
    });

    it('should return error when no credentials provided for non-current test', async () => {
      const result = await service.testConnection(false);

      expect(result.success).toBe(false);
      expect(result.message).toBe('No credentials provided');
    });
  });

  describe('isJiraEnabled', () => {
    it('should return true when Jira is enabled and configured', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockJiraSettings] });

      const result = await service.isJiraEnabled();

      expect(result).toBe(true);
    });

    it('should return false when Jira is disabled', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          integrations: {
            jira: {
              ...mockJiraSettings.integrations.jira,
              enabled: false,
            },
          },
          updated_at: new Date(),
        }],
      });

      const result = await service.isJiraEnabled();

      expect(result).toBe(false);
    });

    it('should return false when Jira is not configured', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          integrations: {
            jira: {
              enabled: true,
              url: '',
              email: '',
              apiToken: '',
              projectKey: '',
              issueType: 'Bug',
            },
          },
          updated_at: new Date(),
        }],
      });

      const result = await service.isJiraEnabled();

      expect(result).toBe(false);
    });
  });
});
