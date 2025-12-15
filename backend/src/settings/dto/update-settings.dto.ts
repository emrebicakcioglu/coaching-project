/**
 * Update Settings DTO
 * STORY-021B: Resource Endpoints
 * STORY-022: Swagger/OpenAPI Documentation
 * STORY-017: Theme-System Backend
 */

import {
  IsOptional,
  IsString,
  IsObject,
  MaxLength,
  ValidateNested,
  IsBoolean,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Hex color format validation regex
 * Matches: #RGB, #RRGGBB (case insensitive)
 */
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const HEX_COLOR_MESSAGE = 'Color must be a valid hex color (e.g., #2563eb or #fff)';

/**
 * Background colors configuration
 * STORY-017: Theme-System Backend
 */
export class ThemeBackgroundColorsDto {
  @ApiPropertyOptional({ description: 'Page background color', example: '#ffffff' })
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, { message: HEX_COLOR_MESSAGE })
  page?: string;

  @ApiPropertyOptional({ description: 'Card background color', example: '#f9fafb' })
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, { message: HEX_COLOR_MESSAGE })
  card?: string;
}

/**
 * Text colors configuration
 * STORY-017: Theme-System Backend
 */
export class ThemeTextColorsDto {
  @ApiPropertyOptional({ description: 'Primary text color', example: '#111827' })
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, { message: HEX_COLOR_MESSAGE })
  primary?: string;

  @ApiPropertyOptional({ description: 'Secondary text color', example: '#6b7280' })
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, { message: HEX_COLOR_MESSAGE })
  secondary?: string;
}

/**
 * Status colors configuration
 * STORY-017: Theme-System Backend
 */
export class ThemeStatusColorsDto {
  @ApiPropertyOptional({ description: 'Success status color', example: '#10b981' })
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, { message: HEX_COLOR_MESSAGE })
  success?: string;

  @ApiPropertyOptional({ description: 'Warning status color', example: '#f59e0b' })
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, { message: HEX_COLOR_MESSAGE })
  warning?: string;

  @ApiPropertyOptional({ description: 'Error status color', example: '#ef4444' })
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, { message: HEX_COLOR_MESSAGE })
  error?: string;
}

/**
 * Theme colors configuration (enhanced)
 * STORY-017: Theme-System Backend
 */
export class ThemeColorsDto {
  @ApiPropertyOptional({ description: 'Primary brand color', example: '#2563eb' })
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, { message: HEX_COLOR_MESSAGE })
  primary?: string;

  @ApiPropertyOptional({ description: 'Secondary brand color', example: '#7c3aed' })
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, { message: HEX_COLOR_MESSAGE })
  secondary?: string;

  @ApiPropertyOptional({ description: 'Accent color (deprecated)', example: '#9c27b0' })
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, { message: HEX_COLOR_MESSAGE })
  accent?: string;

  @ApiPropertyOptional({
    description: 'Background colors',
    type: () => ThemeBackgroundColorsDto,
    example: { page: '#ffffff', card: '#f9fafb' },
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ThemeBackgroundColorsDto)
  background?: ThemeBackgroundColorsDto;

  @ApiPropertyOptional({
    description: 'Text colors',
    type: () => ThemeTextColorsDto,
    example: { primary: '#111827', secondary: '#6b7280' },
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ThemeTextColorsDto)
  text?: ThemeTextColorsDto;

  @ApiPropertyOptional({
    description: 'Status colors',
    type: () => ThemeStatusColorsDto,
    example: { success: '#10b981', warning: '#f59e0b', error: '#ef4444' },
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ThemeStatusColorsDto)
  status?: ThemeStatusColorsDto;
}

/**
 * Feature flags configuration
 */
export class FeatureFlagsDto {
  @ApiPropertyOptional({ description: 'Enable MFA feature', example: true })
  @IsOptional()
  @IsBoolean()
  mfa_enabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable user registration', example: true })
  @IsOptional()
  @IsBoolean()
  registration_enabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable password reset feature', example: true })
  @IsOptional()
  @IsBoolean()
  password_reset_enabled?: boolean;
}

/**
 * Maintenance settings configuration
 */
export class MaintenanceSettingsDto {
  @ApiPropertyOptional({ description: 'Enable maintenance mode', example: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Maintenance message to display', example: 'System maintenance in progress' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Scheduled start time (ISO format)', example: '2024-01-20T02:00:00Z' })
  @IsOptional()
  @IsString()
  scheduled_start?: string;

  @ApiPropertyOptional({ description: 'Scheduled end time (ISO format)', example: '2024-01-20T04:00:00Z' })
  @IsOptional()
  @IsString()
  scheduled_end?: string;
}

/**
 * DTO for updating app settings
 */
export class UpdateSettingsDto {
  /**
   * Company name
   */
  @ApiPropertyOptional({
    description: 'Company name',
    example: 'Acme Corp',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Company name must be at most 100 characters' })
  company_name?: string;

  /**
   * Application title
   */
  @ApiPropertyOptional({
    description: 'Application title',
    example: 'Core Application',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'App title must be at most 100 characters' })
  app_title?: string;

  /**
   * Logo URL
   */
  @ApiPropertyOptional({
    description: 'Logo URL',
    example: 'https://example.com/logo.png',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Logo URL must be at most 255 characters' })
  logo_url?: string;

  /**
   * Theme colors configuration
   */
  @ApiPropertyOptional({
    description: 'Theme colors configuration',
    type: () => ThemeColorsDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ThemeColorsDto)
  theme_colors?: ThemeColorsDto;

  /**
   * Feature flags
   */
  @ApiPropertyOptional({
    description: 'Feature flags configuration',
    type: () => FeatureFlagsDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => FeatureFlagsDto)
  features?: FeatureFlagsDto;

  /**
   * Maintenance settings
   */
  @ApiPropertyOptional({
    description: 'Maintenance settings configuration',
    type: () => MaintenanceSettingsDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => MaintenanceSettingsDto)
  maintenance?: MaintenanceSettingsDto;
}

/**
 * DTO for updating theme settings only (enhanced)
 * STORY-017: Theme-System Backend
 */
export class UpdateThemeSettingsDto {
  /**
   * Primary brand color
   */
  @ApiPropertyOptional({ description: 'Primary brand color', example: '#2563eb' })
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, { message: HEX_COLOR_MESSAGE })
  primary?: string;

  /**
   * Secondary brand color
   */
  @ApiPropertyOptional({ description: 'Secondary brand color', example: '#7c3aed' })
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, { message: HEX_COLOR_MESSAGE })
  secondary?: string;

  /**
   * Background colors
   */
  @ApiPropertyOptional({
    description: 'Background colors',
    type: () => ThemeBackgroundColorsDto,
    example: { page: '#ffffff', card: '#f9fafb' },
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ThemeBackgroundColorsDto)
  background?: ThemeBackgroundColorsDto;

  /**
   * Text colors
   */
  @ApiPropertyOptional({
    description: 'Text colors',
    type: () => ThemeTextColorsDto,
    example: { primary: '#111827', secondary: '#6b7280' },
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ThemeTextColorsDto)
  text?: ThemeTextColorsDto;

  /**
   * Status colors
   */
  @ApiPropertyOptional({
    description: 'Status colors',
    type: () => ThemeStatusColorsDto,
    example: { success: '#10b981', warning: '#f59e0b', error: '#ef4444' },
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ThemeStatusColorsDto)
  status?: ThemeStatusColorsDto;
}
