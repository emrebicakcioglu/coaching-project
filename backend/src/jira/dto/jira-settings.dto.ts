/**
 * Jira Settings DTOs
 * STORY-041D: Jira Settings API
 *
 * Data Transfer Objects for Jira Cloud integration settings.
 * Used for configuring connection to Jira for feedback-to-ticket conversion.
 */

import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

/**
 * DTO for updating Jira settings
 * Used with PUT /api/v1/settings/jira
 */
export class UpdateJiraSettingsDto {
  @ApiPropertyOptional({
    description: 'Enable or disable Jira integration',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Jira Cloud URL (without https://)',
    example: 'company.atlassian.net',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.atlassian\.net$/, {
    message: 'URL must be a valid Atlassian domain (e.g., company.atlassian.net)',
  })
  url?: string;

  @ApiPropertyOptional({
    description: 'Email address of the Jira API user',
    example: 'jira-api@company.com',
    maxLength: 255,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    description: 'Jira API token (only sent when updating)',
    example: 'ATATTx3ZFf...',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  apiToken?: string;

  @ApiPropertyOptional({
    description: 'Default Jira project key for new issues',
    example: 'FEEDBACK',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(/^[A-Z][A-Z0-9]*$/, {
    message: 'Project key must be uppercase letters and numbers, starting with a letter',
  })
  projectKey?: string;

  @ApiPropertyOptional({
    description: 'Default issue type for new issues',
    example: 'Bug',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  issueType?: string;
}

/**
 * DTO for creating Jira settings (all required fields)
 * Used for initial setup validation
 */
export class CreateJiraSettingsDto {
  @ApiProperty({
    description: 'Enable or disable Jira integration',
    example: true,
  })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({
    description: 'Jira Cloud URL (without https://)',
    example: 'company.atlassian.net',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  @Matches(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.atlassian\.net$/, {
    message: 'URL must be a valid Atlassian domain (e.g., company.atlassian.net)',
  })
  url: string;

  @ApiProperty({
    description: 'Email address of the Jira API user',
    example: 'jira-api@company.com',
  })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    description: 'Jira API token',
    example: 'ATATTx3ZFf...',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  apiToken: string;

  @ApiProperty({
    description: 'Default Jira project key for new issues',
    example: 'FEEDBACK',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  @Matches(/^[A-Z][A-Z0-9]*$/, {
    message: 'Project key must be uppercase letters and numbers, starting with a letter',
  })
  projectKey: string;

  @ApiProperty({
    description: 'Default issue type for new issues',
    example: 'Bug',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  issueType: string;
}

/**
 * Response DTO for Jira settings
 * Token is always masked in responses
 */
export class JiraSettingsResponseDto {
  @ApiProperty({
    description: 'Whether Jira integration is enabled',
    example: true,
  })
  enabled: boolean;

  @ApiProperty({
    description: 'Jira Cloud URL',
    example: 'company.atlassian.net',
  })
  url: string;

  @ApiProperty({
    description: 'Jira API user email',
    example: 'jira-api@company.com',
  })
  email: string;

  @ApiProperty({
    description: 'Masked API token (always shows ********)',
    example: '********',
  })
  apiToken: string;

  @ApiProperty({
    description: 'Default Jira project key',
    example: 'FEEDBACK',
  })
  projectKey: string;

  @ApiProperty({
    description: 'Default issue type',
    example: 'Bug',
  })
  issueType: string;

  @ApiProperty({
    description: 'Whether Jira is fully configured (all required fields set)',
    example: true,
  })
  isConfigured: boolean;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-12-27T10:30:00.000Z',
  })
  updatedAt: Date;

  /**
   * Create response DTO from entity data
   *
   * @param data - Raw settings data
   * @returns JiraSettingsResponseDto with masked token
   */
  static fromEntity(data: {
    enabled: boolean;
    url: string;
    email: string;
    apiToken: string | null;
    projectKey: string;
    issueType: string;
    updatedAt: Date;
  }): JiraSettingsResponseDto {
    const dto = new JiraSettingsResponseDto();
    dto.enabled = data.enabled;
    dto.url = data.url || '';
    dto.email = data.email || '';
    dto.apiToken = data.apiToken ? '********' : '';
    dto.projectKey = data.projectKey || '';
    dto.issueType = data.issueType || '';
    dto.isConfigured = !!(data.url && data.email && data.apiToken && data.projectKey && data.issueType);
    dto.updatedAt = data.updatedAt;
    return dto;
  }
}

/**
 * Response DTO for Jira connection test
 */
export class JiraTestConnectionResponseDto {
  @ApiProperty({
    description: 'Whether the connection test was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Human-readable message about the test result',
    example: 'Connection successful',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Name of the Jira project (if connection successful)',
    example: 'Feedback Project',
  })
  projectName?: string;

  @ApiPropertyOptional({
    description: 'Jira server version',
    example: '1001.0.0-SNAPSHOT',
  })
  serverVersion?: string;

  @ApiPropertyOptional({
    description: 'Available issue types for the project',
    example: ['Bug', 'Task', 'Story'],
    type: [String],
  })
  issueTypes?: string[];

  @ApiPropertyOptional({
    description: 'Error details if connection failed',
    example: 'Invalid credentials',
  })
  error?: string;
}

/**
 * Internal Jira settings interface (stored in database)
 * Matches the structure stored in app_settings.integrations JSONB
 */
export interface JiraSettingsInternal {
  enabled: boolean;
  url: string;
  email: string;
  apiToken: string; // Encrypted
  projectKey: string;
  issueType: string;
}

/**
 * Default Jira settings when none are configured
 */
export const DEFAULT_JIRA_SETTINGS: JiraSettingsInternal = {
  enabled: false,
  url: '',
  email: '',
  apiToken: '',
  projectKey: '',
  issueType: 'Bug',
};
