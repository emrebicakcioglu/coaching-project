/**
 * Language Settings DTOs
 * STORY-018A: Standard-Sprache Backend (i18n Setup)
 *
 * Data transfer objects for language/i18n settings.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsIn,
  MaxLength,
  Matches,
} from 'class-validator';

/**
 * Supported language codes
 */
export const SUPPORTED_LANGUAGE_CODES = ['en', 'de'] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

/**
 * DTO for updating user language preference
 */
export class UpdateUserLanguageDto {
  @ApiProperty({
    description: 'Preferred language code',
    example: 'en',
    enum: SUPPORTED_LANGUAGE_CODES,
  })
  @IsString()
  @IsIn(SUPPORTED_LANGUAGE_CODES, { message: 'Language must be one of: en, de' })
  language: LanguageCode;

  @ApiPropertyOptional({
    description: 'Preferred date format pattern',
    example: 'YYYY-MM-DD',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  date_format?: string;

  @ApiPropertyOptional({
    description: 'Preferred number format locale',
    example: 'en-US',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z]{2}(-[A-Z]{2})?$/, {
    message: 'Number format must be a valid locale (e.g., en-US, de-DE)',
  })
  number_format?: string;
}

/**
 * DTO for updating admin language settings
 */
export class UpdateAdminLanguageSettingsDto {
  @ApiPropertyOptional({
    description: 'Default language for new users',
    example: 'en',
    enum: SUPPORTED_LANGUAGE_CODES,
  })
  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_LANGUAGE_CODES, { message: 'Default language must be one of: en, de' })
  default_language?: LanguageCode;

  @ApiPropertyOptional({
    description: 'List of supported language codes',
    example: ['en', 'de'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supported_languages?: string[];

  @ApiPropertyOptional({
    description: 'Fallback language when requested language is unavailable',
    example: 'en',
    enum: SUPPORTED_LANGUAGE_CODES,
  })
  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_LANGUAGE_CODES, { message: 'Fallback language must be one of: en, de' })
  fallback_language?: LanguageCode;
}

/**
 * Response DTO for user language preference
 */
export class UserLanguageResponseDto {
  @ApiProperty({
    description: 'Current language code',
    example: 'en',
  })
  language: string;

  @ApiProperty({
    description: 'Current date format pattern',
    example: 'YYYY-MM-DD',
  })
  date_format: string;

  @ApiProperty({
    description: 'Current number format locale',
    example: 'en-US',
  })
  number_format: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-01-15T10:30:00.000Z',
  })
  updated_at: Date;
}

/**
 * Response DTO for admin language settings
 */
export class AdminLanguageSettingsResponseDto {
  @ApiProperty({
    description: 'Default language for new users',
    example: 'en',
  })
  default_language: string;

  @ApiProperty({
    description: 'List of supported language codes',
    example: ['en', 'de'],
  })
  supported_languages: string[];

  @ApiProperty({
    description: 'Fallback language when requested language is unavailable',
    example: 'en',
  })
  fallback_language: string;

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
  updated_by?: number | null;
}

/**
 * Response DTO for translation data
 */
export class TranslationResponseDto {
  @ApiProperty({
    description: 'Language code',
    example: 'en',
  })
  language: string;

  @ApiProperty({
    description: 'Namespace of translations',
    example: 'common',
  })
  namespace: string;

  @ApiProperty({
    description: 'Translation key-value pairs',
    example: { greeting: 'Hello', farewell: 'Goodbye' },
  })
  translations: Record<string, unknown>;
}

/**
 * Response DTO for all translations for a language
 */
export class LanguageTranslationsResponseDto {
  @ApiProperty({
    description: 'Language code',
    example: 'en',
  })
  language: string;

  @ApiProperty({
    description: 'All namespaces with their translations',
    example: {
      common: { greeting: 'Hello' },
      validation: { required: 'This field is required' },
    },
  })
  namespaces: Record<string, Record<string, unknown>>;
}

/**
 * Response DTO for supported languages list
 */
export class SupportedLanguagesResponseDto {
  @ApiProperty({
    description: 'List of supported language objects',
    example: [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'de', name: 'German', nativeName: 'Deutsch' },
    ],
  })
  languages: Array<{
    code: string;
    name: string;
    nativeName: string;
  }>;

  @ApiProperty({
    description: 'Default language code',
    example: 'en',
  })
  default_language: string;

  @ApiProperty({
    description: 'Fallback language code',
    example: 'en',
  })
  fallback_language: string;
}

/**
 * Language metadata
 */
export interface LanguageMetadata {
  code: string;
  name: string;
  nativeName: string;
  dateFormat: string;
  numberFormat: string;
}

/**
 * Predefined language metadata
 */
export const LANGUAGE_METADATA: Record<LanguageCode, LanguageMetadata> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    dateFormat: 'YYYY-MM-DD',
    numberFormat: 'en-US',
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    dateFormat: 'DD.MM.YYYY',
    numberFormat: 'de-DE',
  },
};
