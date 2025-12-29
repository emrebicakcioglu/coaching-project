/**
 * Jira Settings Controller Tests
 * STORY-041D: Jira Settings API
 *
 * Unit tests for JiraSettingsController including:
 * - GET /api/v1/settings/jira - Get Jira settings
 * - PUT /api/v1/settings/jira - Update Jira settings
 * - POST /api/v1/settings/jira/test - Test connection
 * - Admin role authorization
 * - Token masking in responses
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JiraSettingsController } from '../../src/jira/jira-settings.controller';
import { JiraSettingsService } from '../../src/jira/jira-settings.service';
import { AuthService } from '../../src/auth/auth.service';
import { UpdateJiraSettingsDto } from '../../src/jira/dto/jira-settings.dto';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/common/guards/roles.guard';
import { RateLimitGuard } from '../../src/common/guards/rate-limit.guard';

describe('JiraSettingsController', () => {
  let controller: JiraSettingsController;
  let jiraSettingsService: jest.Mocked<JiraSettingsService>;
  let authService: jest.Mocked<AuthService>;

  const mockJiraSettings = {
    enabled: true,
    url: 'company.atlassian.net',
    email: 'jira@company.com',
    apiToken: '********',
    projectKey: 'FEEDBACK',
    issueType: 'Bug',
    isConfigured: true,
    updatedAt: new Date('2025-01-15T10:30:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JiraSettingsController],
      providers: [
        {
          provide: JiraSettingsService,
          useValue: {
            getJiraSettings: jest.fn().mockResolvedValue(mockJiraSettings),
            updateJiraSettings: jest.fn().mockResolvedValue(mockJiraSettings),
            testConnection: jest.fn().mockResolvedValue({
              success: true,
              message: 'Connection successful',
              projectName: 'Feedback Project',
            }),
          },
        },
        {
          provide: AuthService,
          useValue: {
            decodeToken: jest.fn().mockReturnValue({ sub: 1 }),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<JiraSettingsController>(JiraSettingsController);
    jiraSettingsService = module.get(JiraSettingsService);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getJiraSettings', () => {
    it('should return Jira settings with masked token', async () => {
      const result = await controller.getJiraSettings();

      expect(result.enabled).toBe(true);
      expect(result.url).toBe('company.atlassian.net');
      expect(result.apiToken).toBe('********');
      expect(jiraSettingsService.getJiraSettings).toHaveBeenCalled();
    });

    it('should return isConfigured status', async () => {
      const result = await controller.getJiraSettings();

      expect(result.isConfigured).toBe(true);
    });
  });

  describe('updateJiraSettings', () => {
    const mockRequest = {
      ip: '127.0.0.1',
      headers: {},
    } as any;

    it('should update Jira settings', async () => {
      const updateDto: UpdateJiraSettingsDto = {
        url: 'new-company.atlassian.net',
        email: 'new@company.com',
      };

      const result = await controller.updateJiraSettings(
        updateDto,
        'Bearer valid-token',
        mockRequest,
      );

      expect(result.enabled).toBe(true);
      expect(jiraSettingsService.updateJiraSettings).toHaveBeenCalledWith(
        updateDto,
        1, // userId from decoded token
        mockRequest,
      );
    });

    it('should extract userId from authorization header', async () => {
      const updateDto: UpdateJiraSettingsDto = {
        enabled: false,
      };

      await controller.updateJiraSettings(
        updateDto,
        'Bearer valid-token',
        mockRequest,
      );

      expect(authService.decodeToken).toHaveBeenCalledWith('valid-token');
      expect(jiraSettingsService.updateJiraSettings).toHaveBeenCalledWith(
        updateDto,
        1,
        mockRequest,
      );
    });

    it('should handle missing authorization header', async () => {
      const updateDto: UpdateJiraSettingsDto = {
        enabled: true,
      };

      await controller.updateJiraSettings(
        updateDto,
        undefined as any,
        mockRequest,
      );

      expect(jiraSettingsService.updateJiraSettings).toHaveBeenCalledWith(
        updateDto,
        undefined,
        mockRequest,
      );
    });

    it('should handle invalid authorization header format', async () => {
      const updateDto: UpdateJiraSettingsDto = {
        enabled: true,
      };

      await controller.updateJiraSettings(
        updateDto,
        'InvalidFormat',
        mockRequest,
      );

      expect(jiraSettingsService.updateJiraSettings).toHaveBeenCalledWith(
        updateDto,
        undefined,
        mockRequest,
      );
    });

    it('should handle token decode errors gracefully', async () => {
      authService.decodeToken.mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      const updateDto: UpdateJiraSettingsDto = {
        enabled: true,
      };

      await controller.updateJiraSettings(
        updateDto,
        'Bearer invalid-token',
        mockRequest,
      );

      expect(jiraSettingsService.updateJiraSettings).toHaveBeenCalledWith(
        updateDto,
        undefined,
        mockRequest,
      );
    });
  });

  describe('testJiraConnection', () => {
    it('should return successful connection test result', async () => {
      const result = await controller.testJiraConnection();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection successful');
      expect(result.projectName).toBe('Feedback Project');
      expect(jiraSettingsService.testConnection).toHaveBeenCalledWith(true);
    });

    it('should return failed connection test result', async () => {
      jiraSettingsService.testConnection.mockResolvedValueOnce({
        success: false,
        message: 'Authentication failed',
        error: 'Invalid credentials',
      });

      const result = await controller.testJiraConnection();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Authentication failed');
      expect(result.error).toBe('Invalid credentials');
    });
  });

  describe('Guard decorators', () => {
    it('should have JwtAuthGuard applied', () => {
      const guards = Reflect.getMetadata('__guards__', JiraSettingsController);
      expect(guards).toBeDefined();
    });

    it('should have admin role required', () => {
      const roles = Reflect.getMetadata('roles', JiraSettingsController);
      expect(roles).toContain('admin');
    });
  });
});
