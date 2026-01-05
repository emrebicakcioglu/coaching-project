/**
 * Color Scheme DTOs
 * Design System: Color Schemes Management
 *
 * Data transfer objects for color scheme CRUD operations.
 */

import { IsString, IsBoolean, IsOptional, IsObject, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Button style configuration
 */
export interface ButtonStyle {
  background: string;
  text: string;
  border: string;
  hoverBackground: string;
  hoverText: string;
  hoverBorder: string;
}

/**
 * Typography style configuration
 */
export interface TypographyStyle {
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  color?: string;
  fontFamily?: string;
  textTransform?: string;
  letterSpacing?: string;
  background?: string;
}

/**
 * Color scheme colors structure
 */
export interface ColorSchemeColors {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  secondary: string;
  secondaryHover: string;
  secondaryLight: string;
  accent: string;
  accentHover: string;
  accentLight: string;
  background: {
    page: string;
    card: string;
    sidebar: string;
    modal: string;
    input: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
    link: string;
  };
  border: {
    light: string;
    default: string;
    dark: string;
  };
  status: {
    success: string;
    successLight: string;
    warning: string;
    warningLight: string;
    error: string;
    errorLight: string;
    info: string;
    infoLight: string;
  };
}

/**
 * Button styles structure
 */
export interface ColorSchemeButtons {
  normal: ButtonStyle;
  inactive: ButtonStyle;
  abort: ButtonStyle;
  special: ButtonStyle;
  danger: ButtonStyle;
  success: ButtonStyle;
}

/**
 * Typography structure
 */
export interface ColorSchemeTypography {
  fontFamily: {
    primary: string;
    mono: string;
  };
  heading: {
    h1: TypographyStyle;
    h2: TypographyStyle;
    h3: TypographyStyle;
    h4: TypographyStyle;
    h5: TypographyStyle;
    h6: TypographyStyle;
  };
  body: {
    large: TypographyStyle;
    normal: TypographyStyle;
    small: TypographyStyle;
  };
  label: {
    large: TypographyStyle;
    normal: TypographyStyle;
    small: TypographyStyle;
  };
  code: TypographyStyle;
}

/**
 * Input styles structure
 */
export interface ColorSchemeInputs {
  normal: {
    background: string;
    text: string;
    border: string;
    placeholder: string;
    focusBorder: string;
    focusRing: string;
  };
  error: {
    background: string;
    text: string;
    border: string;
    placeholder: string;
    focusBorder: string;
    focusRing: string;
  };
  disabled: {
    background: string;
    text: string;
    border: string;
    placeholder: string;
    focusBorder: string;
    focusRing: string;
  };
}

/**
 * Card styles structure
 */
export interface ColorSchemeCards {
  default: {
    background: string;
    border: string;
    shadow: string;
    borderRadius: string;
  };
  elevated: {
    background: string;
    border: string;
    shadow: string;
    borderRadius: string;
  };
  flat: {
    background: string;
    border: string;
    shadow: string;
    borderRadius: string;
  };
}

/**
 * Badge styles structure
 */
export interface ColorSchemeBadges {
  default: { background: string; text: string };
  primary: { background: string; text: string };
  secondary: { background: string; text: string };
  success: { background: string; text: string };
  warning: { background: string; text: string };
  error: { background: string; text: string };
  info: { background: string; text: string };
}

/**
 * Alert styles structure
 */
export interface ColorSchemeAlerts {
  success: { background: string; border: string; text: string; icon: string };
  warning: { background: string; border: string; text: string; icon: string };
  error: { background: string; border: string; text: string; icon: string };
  info: { background: string; border: string; text: string; icon: string };
}

/**
 * Create color scheme DTO
 */
export class CreateColorSchemeDto {
  @ApiProperty({ description: 'Name of the color scheme', example: 'Dark Mode' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Description of the color scheme' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Color definitions' })
  @IsObject()
  @IsOptional()
  colors?: Partial<ColorSchemeColors>;

  @ApiPropertyOptional({ description: 'Button style definitions' })
  @IsObject()
  @IsOptional()
  buttons?: Partial<ColorSchemeButtons>;

  @ApiPropertyOptional({ description: 'Typography definitions' })
  @IsObject()
  @IsOptional()
  typography?: Partial<ColorSchemeTypography>;

  @ApiPropertyOptional({ description: 'Input field style definitions' })
  @IsObject()
  @IsOptional()
  inputs?: Partial<ColorSchemeInputs>;

  @ApiPropertyOptional({ description: 'Card/panel style definitions' })
  @IsObject()
  @IsOptional()
  cards?: Partial<ColorSchemeCards>;

  @ApiPropertyOptional({ description: 'Badge style definitions' })
  @IsObject()
  @IsOptional()
  badges?: Partial<ColorSchemeBadges>;

  @ApiPropertyOptional({ description: 'Alert style definitions' })
  @IsObject()
  @IsOptional()
  alerts?: Partial<ColorSchemeAlerts>;

  @ApiPropertyOptional({ description: 'Whether this scheme is used as light mode' })
  @IsBoolean()
  @IsOptional()
  is_light_scheme?: boolean;

  @ApiPropertyOptional({ description: 'Whether this scheme is used as dark mode' })
  @IsBoolean()
  @IsOptional()
  is_dark_scheme?: boolean;
}

/**
 * Update color scheme DTO
 */
export class UpdateColorSchemeDto {
  @ApiPropertyOptional({ description: 'Name of the color scheme' })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Description of the color scheme' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Whether this scheme is active' })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'Color definitions' })
  @IsObject()
  @IsOptional()
  colors?: Partial<ColorSchemeColors>;

  @ApiPropertyOptional({ description: 'Button style definitions' })
  @IsObject()
  @IsOptional()
  buttons?: Partial<ColorSchemeButtons>;

  @ApiPropertyOptional({ description: 'Typography definitions' })
  @IsObject()
  @IsOptional()
  typography?: Partial<ColorSchemeTypography>;

  @ApiPropertyOptional({ description: 'Input field style definitions' })
  @IsObject()
  @IsOptional()
  inputs?: Partial<ColorSchemeInputs>;

  @ApiPropertyOptional({ description: 'Card/panel style definitions' })
  @IsObject()
  @IsOptional()
  cards?: Partial<ColorSchemeCards>;

  @ApiPropertyOptional({ description: 'Badge style definitions' })
  @IsObject()
  @IsOptional()
  badges?: Partial<ColorSchemeBadges>;

  @ApiPropertyOptional({ description: 'Alert style definitions' })
  @IsObject()
  @IsOptional()
  alerts?: Partial<ColorSchemeAlerts>;

  @ApiPropertyOptional({ description: 'Whether this scheme is used as light mode' })
  @IsBoolean()
  @IsOptional()
  is_light_scheme?: boolean;

  @ApiPropertyOptional({ description: 'Whether this scheme is used as dark mode' })
  @IsBoolean()
  @IsOptional()
  is_dark_scheme?: boolean;
}

/**
 * Database entity interface for color schemes
 * Represents the raw data structure from PostgreSQL
 */
export interface ColorSchemeEntity {
  id: number;
  name: string;
  description?: string;
  description_key?: string;
  is_active: boolean;
  is_default: boolean;
  is_light_scheme?: boolean;
  is_dark_scheme?: boolean;
  created_by?: number;
  created_at: Date;
  updated_at: Date;
  colors: ColorSchemeColors;
  buttons: ColorSchemeButtons;
  typography: ColorSchemeTypography;
  inputs: ColorSchemeInputs;
  cards: ColorSchemeCards;
  badges: ColorSchemeBadges;
  alerts: ColorSchemeAlerts;
}

/**
 * Color scheme response DTO
 */
export class ColorSchemeResponseDto {
  @ApiProperty({ description: 'Unique identifier' })
  id: number;

  @ApiProperty({ description: 'Name of the color scheme' })
  name: string;

  @ApiPropertyOptional({ description: 'Description of the color scheme' })
  description?: string;

  @ApiPropertyOptional({ description: 'i18n key for the description' })
  description_key?: string;

  @ApiProperty({ description: 'Whether this scheme is currently active' })
  is_active: boolean;

  @ApiProperty({ description: 'Whether this is the default scheme' })
  is_default: boolean;

  @ApiProperty({ description: 'Whether this scheme is used as light mode' })
  is_light_scheme: boolean;

  @ApiProperty({ description: 'Whether this scheme is used as dark mode' })
  is_dark_scheme: boolean;

  @ApiProperty({ description: 'User ID who created this scheme' })
  created_by?: number;

  @ApiProperty({ description: 'Creation timestamp' })
  created_at: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updated_at: Date;

  @ApiProperty({ description: 'Color definitions' })
  colors: ColorSchemeColors;

  @ApiProperty({ description: 'Button style definitions' })
  buttons: ColorSchemeButtons;

  @ApiProperty({ description: 'Typography definitions' })
  typography: ColorSchemeTypography;

  @ApiProperty({ description: 'Input field style definitions' })
  inputs: ColorSchemeInputs;

  @ApiProperty({ description: 'Card/panel style definitions' })
  cards: ColorSchemeCards;

  @ApiProperty({ description: 'Badge style definitions' })
  badges: ColorSchemeBadges;

  @ApiProperty({ description: 'Alert style definitions' })
  alerts: ColorSchemeAlerts;

  /**
   * Create response from database entity
   */
  static fromEntity(entity: ColorSchemeEntity): ColorSchemeResponseDto {
    const dto = new ColorSchemeResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.description = entity.description;
    dto.description_key = entity.description_key;
    dto.is_active = entity.is_active;
    dto.is_default = entity.is_default;
    dto.is_light_scheme = entity.is_light_scheme || false;
    dto.is_dark_scheme = entity.is_dark_scheme || false;
    dto.created_by = entity.created_by;
    dto.created_at = entity.created_at;
    dto.updated_at = entity.updated_at;
    dto.colors = entity.colors;
    dto.buttons = entity.buttons;
    dto.typography = entity.typography;
    dto.inputs = entity.inputs;
    dto.cards = entity.cards;
    dto.badges = entity.badges;
    dto.alerts = entity.alerts;
    return dto;
  }
}

/**
 * Active color scheme response (simplified for frontend application)
 */
export class ActiveColorSchemeResponseDto {
  @ApiProperty({ description: 'Scheme ID' })
  id: number;

  @ApiProperty({ description: 'Scheme name' })
  name: string;

  @ApiProperty({ description: 'All design tokens' })
  tokens: {
    colors: ColorSchemeColors;
    buttons: ColorSchemeButtons;
    typography: ColorSchemeTypography;
    inputs: ColorSchemeInputs;
    cards: ColorSchemeCards;
    badges: ColorSchemeBadges;
    alerts: ColorSchemeAlerts;
  };
}
