/**
 * General Settings DTOs
 * STORY-035: Support-E-Mail & Session-Timeout
 * STORY-041: Feedback Feature Flag
 *
 * Data transfer objects for general settings (support email, session timeout, feedback feature).
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { GeneralSettings } from '../../database/types';

/**
 * Extended GeneralSettings interface with feedback_enabled
 * STORY-041: Feedback Feature Flag
 */
export interface GeneralSettingsWithFeedback extends GeneralSettings {
  feedback_enabled?: boolean;
}

/**
 * DTO for updating general settings
 */
export class UpdateGeneralSettingsDto {
  @ApiPropertyOptional({
    description: 'Support email address displayed in footer and used for feedback',
    example: 'support@example.com',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.support_email !== null && o.support_email !== '')
  @IsEmail({}, { message: 'Invalid email format' })
  support_email?: string | null;

  @ApiPropertyOptional({
    description: 'Session timeout in minutes (1-1440, i.e., 1 minute to 24 hours)',
    example: 30,
    minimum: 1,
    maximum: 1440,
  })
  @IsOptional()
  @IsInt({ message: 'Session timeout must be an integer' })
  @Min(1, { message: 'Session timeout must be at least 1 minute' })
  @Max(1440, { message: 'Session timeout cannot exceed 24 hours (1440 minutes)' })
  session_timeout_minutes?: number;

  @ApiPropertyOptional({
    description: 'Whether to show a warning before session expires',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'show_timeout_warning must be a boolean' })
  show_timeout_warning?: boolean;

  @ApiPropertyOptional({
    description: 'Minutes before timeout to show warning (1-60)',
    example: 5,
    minimum: 1,
    maximum: 60,
  })
  @IsOptional()
  @IsInt({ message: 'Warning time must be an integer' })
  @Min(1, { message: 'Warning time must be at least 1 minute' })
  @Max(60, { message: 'Warning time cannot exceed 60 minutes' })
  warning_before_timeout_minutes?: number;

  @ApiPropertyOptional({
    description: 'Enable or disable the feedback feature (STORY-041)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'feedback_enabled must be a boolean' })
  feedback_enabled?: boolean;
}

/**
 * Response DTO for general settings
 */
export class GeneralSettingsResponseDto {
  @ApiProperty({
    description: 'Support email address',
    example: 'support@example.com',
    nullable: true,
  })
  support_email: string | null;

  @ApiProperty({
    description: 'Session timeout in minutes',
    example: 30,
  })
  session_timeout_minutes: number;

  @ApiProperty({
    description: 'Whether to show warning before session expires',
    example: true,
  })
  show_timeout_warning: boolean;

  @ApiProperty({
    description: 'Minutes before timeout to show warning',
    example: 5,
  })
  warning_before_timeout_minutes: number;

  @ApiProperty({
    description: 'Whether the feedback feature is enabled (STORY-041)',
    example: false,
    default: false,
  })
  feedback_enabled: boolean;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-01-15T10:30:00.000Z',
  })
  updated_at: Date;

  @ApiPropertyOptional({
    description: 'User ID who last updated the settings',
    example: 1,
    nullable: true,
  })
  updated_by: number | null;

  /**
   * Create response DTO from database entity
   */
  static fromEntity(entity: GeneralSettingsWithFeedback): GeneralSettingsResponseDto {
    const dto = new GeneralSettingsResponseDto();
    dto.support_email = entity.support_email;
    dto.session_timeout_minutes = entity.session_timeout_minutes;
    dto.show_timeout_warning = entity.show_timeout_warning;
    dto.warning_before_timeout_minutes = entity.warning_before_timeout_minutes;
    dto.feedback_enabled = entity.feedback_enabled ?? false;
    dto.updated_at = entity.updated_at;
    dto.updated_by = entity.updated_by;
    return dto;
  }
}

/**
 * Session timeout configuration returned to clients
 * Minimal response for session timeout enforcement on frontend
 */
export class SessionTimeoutConfigDto {
  @ApiProperty({
    description: 'Session timeout in minutes',
    example: 30,
  })
  timeout_minutes: number;

  @ApiProperty({
    description: 'Session timeout in milliseconds (for client-side timers)',
    example: 1800000,
  })
  timeout_ms: number;

  @ApiProperty({
    description: 'Whether to show warning before session expires',
    example: true,
  })
  show_warning: boolean;

  @ApiProperty({
    description: 'Milliseconds before timeout to show warning',
    example: 300000,
  })
  warning_ms: number;

  /**
   * Create session timeout config from general settings
   */
  static fromGeneralSettings(settings: GeneralSettings): SessionTimeoutConfigDto {
    const dto = new SessionTimeoutConfigDto();
    dto.timeout_minutes = settings.session_timeout_minutes;
    dto.timeout_ms = settings.session_timeout_minutes * 60 * 1000;
    dto.show_warning = settings.show_timeout_warning;
    dto.warning_ms = settings.warning_before_timeout_minutes * 60 * 1000;
    return dto;
  }
}

/**
 * Public settings response DTO
 * STORY-041: Feedback Feature Flag
 *
 * Minimal settings exposed to unauthenticated clients.
 * Contains only feature flags needed for public UI decisions.
 */
export class PublicSettingsResponseDto {
  @ApiProperty({
    description: 'Whether the feedback feature is enabled',
    example: false,
  })
  feedback_enabled: boolean;

  @ApiProperty({
    description: 'Whether user registration is enabled',
    example: true,
  })
  registration_enabled: boolean;

  @ApiProperty({
    description: 'Whether dark mode is enabled',
    example: false,
  })
  dark_mode_enabled: boolean;

  /**
   * Create public settings from features data
   */
  static fromFeatures(features: {
    feedback?: { enabled: boolean };
    'user-registration'?: { enabled: boolean };
    'dark-mode'?: { enabled: boolean };
  }): PublicSettingsResponseDto {
    const dto = new PublicSettingsResponseDto();
    dto.feedback_enabled = features.feedback?.enabled ?? false;
    dto.registration_enabled = features['user-registration']?.enabled ?? true;
    dto.dark_mode_enabled = features['dark-mode']?.enabled ?? false;
    return dto;
  }
}
