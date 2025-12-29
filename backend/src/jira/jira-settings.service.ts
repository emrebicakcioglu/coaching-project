/**
 * Jira Settings Service
 * STORY-041D: Jira Settings API
 *
 * Business logic for Jira Cloud integration settings management.
 * Handles CRUD operations, encryption/decryption of API tokens,
 * and connection testing.
 *
 * Settings are stored in app_settings.integrations JSONB column.
 */

import {
  Injectable,
  Inject,
  forwardRef,
  InternalServerErrorException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { WinstonLoggerService } from '../common/services/logger.service';
import { AuditService } from '../common/services/audit.service';
import { encrypt, decrypt, isEncrypted } from '../common/utils/encryption.util';
import {
  UpdateJiraSettingsDto,
  JiraSettingsResponseDto,
  JiraTestConnectionResponseDto,
  JiraSettingsInternal,
  DEFAULT_JIRA_SETTINGS,
} from './dto/jira-settings.dto';
import { Request } from 'express';

/**
 * Extended Request interface with user
 */
interface AuthRequest extends Request {
  user?: { id?: number; email?: string };
  requestId?: string;
}

/**
 * Structure of the integrations JSONB column
 */
interface IntegrationsData {
  jira?: JiraSettingsInternal;
  [key: string]: unknown;
}

@Injectable()
export class JiraSettingsService {
  constructor(
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get Jira settings (with token masked for response)
   *
   * @returns Jira settings with masked API token
   */
  async getJiraSettings(): Promise<JiraSettingsResponseDto> {
    const pool = this.databaseService.ensurePool();

    const result = await pool.query<{ integrations: IntegrationsData; updated_at: Date }>(
      'SELECT integrations, updated_at FROM app_settings WHERE id = 1',
    );

    if (result.rows.length === 0 || !result.rows[0].integrations?.jira) {
      // Return defaults if no settings exist
      return JiraSettingsResponseDto.fromEntity({
        ...DEFAULT_JIRA_SETTINGS,
        apiToken: null,
        updatedAt: new Date(),
      });
    }

    const jiraSettings = result.rows[0].integrations.jira;
    const updatedAt = result.rows[0].updated_at;

    return JiraSettingsResponseDto.fromEntity({
      enabled: jiraSettings.enabled ?? false,
      url: jiraSettings.url ?? '',
      email: jiraSettings.email ?? '',
      apiToken: jiraSettings.apiToken || null,
      projectKey: jiraSettings.projectKey ?? '',
      issueType: jiraSettings.issueType ?? 'Bug',
      updatedAt,
    });
  }

  /**
   * Get Jira settings with decrypted token (internal use only)
   * Used by other services that need to make Jira API calls
   *
   * @returns Jira settings with decrypted API token
   */
  async getJiraSettingsDecrypted(): Promise<JiraSettingsInternal | null> {
    const pool = this.databaseService.ensurePool();

    const result = await pool.query<{ integrations: IntegrationsData }>(
      'SELECT integrations FROM app_settings WHERE id = 1',
    );

    if (result.rows.length === 0 || !result.rows[0].integrations?.jira) {
      return null;
    }

    const jiraSettings = result.rows[0].integrations.jira;

    // Decrypt the API token if it's encrypted
    let decryptedToken = jiraSettings.apiToken || '';
    if (isEncrypted(decryptedToken)) {
      try {
        decryptedToken = decrypt(decryptedToken);
      } catch (error) {
        this.logger.error(
          `Failed to decrypt Jira API token: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : undefined,
          'JiraSettingsService',
        );
        throw new InternalServerErrorException('Failed to decrypt Jira API token');
      }
    }

    return {
      enabled: jiraSettings.enabled ?? false,
      url: jiraSettings.url ?? '',
      email: jiraSettings.email ?? '',
      apiToken: decryptedToken,
      projectKey: jiraSettings.projectKey ?? '',
      issueType: jiraSettings.issueType ?? 'Bug',
    };
  }

  /**
   * Update Jira settings
   *
   * @param updateDto - Settings to update
   * @param userId - User ID making the change (for audit)
   * @param request - Express request for audit logging
   * @returns Updated settings with masked token
   */
  async updateJiraSettings(
    updateDto: UpdateJiraSettingsDto,
    userId: number | undefined,
    request: AuthRequest,
  ): Promise<JiraSettingsResponseDto> {
    const pool = this.databaseService.ensurePool();

    // Get current settings for audit
    const currentSettings = await this.getJiraSettings();

    // Get existing integrations JSONB
    const existingResult = await pool.query<{ integrations: IntegrationsData }>(
      'SELECT integrations FROM app_settings WHERE id = 1',
    );

    const existingIntegrations = existingResult.rows[0]?.integrations || {};
    const existingJira = existingIntegrations.jira || { ...DEFAULT_JIRA_SETTINGS };

    // Build updated Jira settings
    const updatedJira: JiraSettingsInternal = {
      enabled: updateDto.enabled !== undefined ? updateDto.enabled : existingJira.enabled,
      url: updateDto.url !== undefined ? updateDto.url : existingJira.url,
      email: updateDto.email !== undefined ? updateDto.email : existingJira.email,
      apiToken: existingJira.apiToken, // Keep existing by default
      projectKey: updateDto.projectKey !== undefined ? updateDto.projectKey : existingJira.projectKey,
      issueType: updateDto.issueType !== undefined ? updateDto.issueType : existingJira.issueType,
    };

    // Only update and encrypt token if a new one is provided
    if (updateDto.apiToken !== undefined && updateDto.apiToken !== '') {
      try {
        updatedJira.apiToken = encrypt(updateDto.apiToken);
      } catch (error) {
        this.logger.error(
          `Failed to encrypt Jira API token: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : undefined,
          'JiraSettingsService',
        );
        throw new InternalServerErrorException(
          'Failed to encrypt API token. Please ensure ENCRYPTION_KEY is properly configured.',
        );
      }
    }

    // Update integrations JSONB
    const updatedIntegrations: IntegrationsData = {
      ...existingIntegrations,
      jira: updatedJira,
    };

    // Execute update
    await pool.query<{ updated_at: Date }>(
      `UPDATE app_settings
       SET integrations = $1::jsonb,
           updated_at = NOW(),
           last_updated_by = $2
       WHERE id = 1
       RETURNING updated_at`,
      [JSON.stringify(updatedIntegrations), userId || null],
    );

    // Get updated settings for response
    const updatedSettings = await this.getJiraSettings();

    // Log audit trail
    if (userId) {
      // Mask tokens in audit log
      const auditBefore = { ...currentSettings, apiToken: currentSettings.apiToken ? '********' : '' };
      const auditAfter = { ...updatedSettings, apiToken: updatedSettings.apiToken ? '********' : '' };

      await this.auditService.logSettingsChange(
        userId,
        request,
        'jira_settings',
        auditBefore,
        auditAfter,
      );
    }

    this.logger.log('Jira settings updated', 'JiraSettingsService');

    return updatedSettings;
  }

  /**
   * Test Jira connection with current or provided settings
   *
   * @param testWithCurrent - If true, test with stored settings; if false, use provided credentials
   * @param credentials - Optional credentials to test (used during initial setup)
   * @returns Connection test result
   */
  async testConnection(
    testWithCurrent = true,
    credentials?: { url: string; email: string; apiToken: string; projectKey: string },
  ): Promise<JiraTestConnectionResponseDto> {
    let url: string;
    let email: string;
    let apiToken: string;
    let projectKey: string;

    if (testWithCurrent) {
      // Get decrypted settings from database
      const settings = await this.getJiraSettingsDecrypted();
      if (!settings) {
        return {
          success: false,
          message: 'Jira is not configured',
          error: 'No Jira settings found',
        };
      }

      if (!settings.url || !settings.email || !settings.apiToken || !settings.projectKey) {
        return {
          success: false,
          message: 'Jira configuration is incomplete',
          error: 'Missing required fields: URL, email, API token, or project key',
        };
      }

      url = settings.url;
      email = settings.email;
      apiToken = settings.apiToken;
      projectKey = settings.projectKey;
    } else if (credentials) {
      url = credentials.url;
      email = credentials.email;
      apiToken = credentials.apiToken;
      projectKey = credentials.projectKey;
    } else {
      return {
        success: false,
        message: 'No credentials provided',
        error: 'Either use stored settings or provide credentials',
      };
    }

    try {
      // Create Basic Auth header (Jira Cloud uses email:apiToken)
      const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
      const baseUrl = `https://${url}`;

      // First, verify server info (basic connectivity test)
      const serverInfoResponse = await fetch(`${baseUrl}/rest/api/3/serverInfo`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json',
        },
      });

      if (!serverInfoResponse.ok) {
        const errorText = await serverInfoResponse.text();
        this.logger.warn(
          `Jira connection test failed: ${serverInfoResponse.status} - ${errorText}`,
          'JiraSettingsService',
        );

        if (serverInfoResponse.status === 401) {
          return {
            success: false,
            message: 'Authentication failed',
            error: 'Invalid email or API token. Please verify your credentials.',
          };
        }

        if (serverInfoResponse.status === 403) {
          return {
            success: false,
            message: 'Access denied',
            error: 'The API token does not have permission to access this Jira instance.',
          };
        }

        return {
          success: false,
          message: 'Connection failed',
          error: `Jira API returned status ${serverInfoResponse.status}`,
        };
      }

      const serverInfo = (await serverInfoResponse.json()) as {
        version?: string;
        serverTitle?: string;
      };

      // Now verify project access
      const projectResponse = await fetch(`${baseUrl}/rest/api/3/project/${projectKey}`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json',
        },
      });

      if (!projectResponse.ok) {
        if (projectResponse.status === 404) {
          return {
            success: false,
            message: 'Project not found',
            error: `Project '${projectKey}' does not exist or you don't have access to it.`,
            serverVersion: serverInfo.version,
          };
        }

        return {
          success: false,
          message: 'Failed to access project',
          error: `Could not verify access to project '${projectKey}'`,
          serverVersion: serverInfo.version,
        };
      }

      const projectData = (await projectResponse.json()) as {
        name?: string;
        issueTypes?: Array<{ name: string }>;
      };

      // Get available issue types
      const issueTypes = projectData.issueTypes?.map((t) => t.name) || [];

      this.logger.log(
        `Jira connection test successful. Project: ${projectData.name}, Issue types: ${issueTypes.join(', ')}`,
        'JiraSettingsService',
      );

      return {
        success: true,
        message: 'Connection successful',
        projectName: projectData.name,
        serverVersion: serverInfo.version,
        issueTypes,
      };
    } catch (error) {
      this.logger.error(
        `Jira connection test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'JiraSettingsService',
      );

      // Check for network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          success: false,
          message: 'Network error',
          error: `Could not reach Jira at ${url}. Please verify the URL is correct.`,
        };
      }

      return {
        success: false,
        message: 'Connection test failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Check if Jira integration is enabled and configured
   *
   * @returns true if Jira is enabled and fully configured
   */
  async isJiraEnabled(): Promise<boolean> {
    const settings = await this.getJiraSettings();
    return settings.enabled && settings.isConfigured;
  }
}
