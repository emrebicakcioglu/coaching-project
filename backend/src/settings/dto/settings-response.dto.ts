/**
 * Settings Response DTO
 * STORY-021B: Resource Endpoints
 * STORY-022: Swagger/OpenAPI Documentation
 * STORY-017: Theme-System Backend
 * STORY-013A: In-App Settings Backend
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AppSettings,
  ThemeColors,
  ThemeBackgroundColors,
  ThemeTextColors,
  ThemeStatusColors,
  EnhancedThemeColors,
  FeatureFlags,
  MaintenanceSettings,
  EmailSettings,
} from '../../database/types';

/**
 * Settings response DTO
 */
export class SettingsResponseDto {
  @ApiProperty({ description: 'Company name', example: 'Acme Corp' })
  company_name: string;

  @ApiProperty({ description: 'Application title', example: 'Core Application' })
  app_title: string;

  @ApiPropertyOptional({
    description: 'Logo URL',
    example: 'https://example.com/logo.png',
    nullable: true,
  })
  logo_url: string | null;

  @ApiPropertyOptional({
    description: 'Theme colors configuration',
    nullable: true,
    example: { primary: '#1976d2', secondary: '#dc004e', accent: '#9c27b0' },
  })
  theme_colors: ThemeColors | null;

  @ApiPropertyOptional({
    description: 'Feature flags configuration',
    nullable: true,
    example: { mfa_enabled: true, registration_enabled: true },
  })
  features: FeatureFlags | null;

  @ApiPropertyOptional({
    description: 'Maintenance settings',
    nullable: true,
    example: { enabled: false },
  })
  maintenance: MaintenanceSettings | null;

  @ApiPropertyOptional({
    description: 'Email settings (STORY-013A)',
    nullable: true,
    example: { signature: 'Best regards,\nYour Team' },
  })
  email_settings: EmailSettings | null;

  @ApiProperty({ description: 'Last update timestamp', example: '2024-01-15T12:00:00.000Z' })
  updated_at: Date;

  constructor(settings: AppSettings) {
    this.company_name = settings.company_name;
    this.app_title = settings.app_title;
    this.logo_url = settings.logo_url || null;
    this.theme_colors = settings.theme_colors || null;
    this.features = settings.features || null;
    this.maintenance = settings.maintenance || null;
    this.email_settings = settings.email_settings || null;
    this.updated_at = settings.updated_at;
  }

  static fromEntity(settings: AppSettings): SettingsResponseDto {
    return new SettingsResponseDto(settings);
  }
}

/**
 * Background colors response DTO
 * STORY-017: Theme-System Backend
 */
export class ThemeBackgroundColorsResponseDto {
  @ApiProperty({ description: 'Page background color', example: '#ffffff' })
  page: string;

  @ApiProperty({ description: 'Card background color', example: '#f9fafb' })
  card: string;

  constructor(colors?: ThemeBackgroundColors) {
    this.page = colors?.page ?? '#ffffff';
    this.card = colors?.card ?? '#f9fafb';
  }
}

/**
 * Text colors response DTO
 * STORY-017: Theme-System Backend
 */
export class ThemeTextColorsResponseDto {
  @ApiProperty({ description: 'Primary text color', example: '#111827' })
  primary: string;

  @ApiProperty({ description: 'Secondary text color', example: '#6b7280' })
  secondary: string;

  constructor(colors?: ThemeTextColors) {
    this.primary = colors?.primary ?? '#111827';
    this.secondary = colors?.secondary ?? '#6b7280';
  }
}

/**
 * Status colors response DTO
 * STORY-017: Theme-System Backend
 */
export class ThemeStatusColorsResponseDto {
  @ApiProperty({ description: 'Success status color', example: '#10b981' })
  success: string;

  @ApiProperty({ description: 'Warning status color', example: '#f59e0b' })
  warning: string;

  @ApiProperty({ description: 'Error status color', example: '#ef4444' })
  error: string;

  constructor(colors?: ThemeStatusColors) {
    this.success = colors?.success ?? '#10b981';
    this.warning = colors?.warning ?? '#f59e0b';
    this.error = colors?.error ?? '#ef4444';
  }
}

/**
 * Default theme colors
 * STORY-017: Theme-System Backend
 */
export const DEFAULT_THEME_COLORS: EnhancedThemeColors = {
  primary: '#2563eb',
  secondary: '#7c3aed',
  background: { page: '#ffffff', card: '#f9fafb' },
  text: { primary: '#111827', secondary: '#6b7280' },
  status: { success: '#10b981', warning: '#f59e0b', error: '#ef4444' },
};

/**
 * Theme settings response DTO (enhanced)
 * STORY-017: Theme-System Backend
 */
export class ThemeSettingsResponseDto {
  @ApiProperty({ description: 'Primary brand color', example: '#2563eb' })
  primary: string;

  @ApiProperty({ description: 'Secondary brand color', example: '#7c3aed' })
  secondary: string;

  @ApiProperty({
    description: 'Background colors',
    type: () => ThemeBackgroundColorsResponseDto,
    example: { page: '#ffffff', card: '#f9fafb' },
  })
  background: ThemeBackgroundColorsResponseDto;

  @ApiProperty({
    description: 'Text colors',
    type: () => ThemeTextColorsResponseDto,
    example: { primary: '#111827', secondary: '#6b7280' },
  })
  text: ThemeTextColorsResponseDto;

  @ApiProperty({
    description: 'Status colors',
    type: () => ThemeStatusColorsResponseDto,
    example: { success: '#10b981', warning: '#f59e0b', error: '#ef4444' },
  })
  status: ThemeStatusColorsResponseDto;

  constructor(themeColors: ThemeColors | EnhancedThemeColors | null) {
    // Handle the enhanced structure or apply defaults
    this.primary = themeColors?.primary ?? DEFAULT_THEME_COLORS.primary;
    this.secondary = themeColors?.secondary ?? DEFAULT_THEME_COLORS.secondary;

    // Handle background - could be string (old format) or object (new format)
    const bg = themeColors?.background;
    if (typeof bg === 'object' && bg !== null) {
      this.background = new ThemeBackgroundColorsResponseDto(bg as ThemeBackgroundColors);
    } else {
      this.background = new ThemeBackgroundColorsResponseDto();
    }

    // Handle text - could be string (old format) or object (new format)
    const txt = themeColors?.text;
    if (typeof txt === 'object' && txt !== null) {
      this.text = new ThemeTextColorsResponseDto(txt as ThemeTextColors);
    } else {
      this.text = new ThemeTextColorsResponseDto();
    }

    // Handle status colors
    this.status = new ThemeStatusColorsResponseDto(themeColors?.status);
  }

  static fromThemeColors(themeColors: ThemeColors | EnhancedThemeColors | null): ThemeSettingsResponseDto {
    return new ThemeSettingsResponseDto(themeColors);
  }
}
