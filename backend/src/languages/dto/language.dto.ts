/**
 * Language DTOs
 * Multi-Language Management System
 *
 * Data transfer objects for language and translation management.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  MaxLength,
  MinLength,
  Matches,
  IsObject,
} from 'class-validator';

/**
 * DTO for creating a new language
 */
export class CreateLanguageDto {
  @ApiProperty({
    description: 'ISO 639-1 language code',
    example: 'fr',
    minLength: 2,
    maxLength: 10,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  @Matches(/^[a-z]{2}(-[A-Z]{2})?$/, {
    message: 'Language code must be a valid ISO 639-1 code (e.g., en, de, fr, en-US)',
  })
  code: string;

  @ApiProperty({
    description: 'English name of the language',
    example: 'French',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Native name of the language',
    example: 'Francais',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  native_name: string;

  @ApiProperty({
    description: 'Emoji flag for the language',
    example: '🇫🇷',
    maxLength: 10,
  })
  @IsString()
  @MaxLength(10)
  emoji_flag: string;

  @ApiPropertyOptional({
    description: 'Display order in language selectors',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  sort_order?: number;
}

/**
 * DTO for updating a language
 */
export class UpdateLanguageDto {
  @ApiPropertyOptional({
    description: 'English name of the language',
    example: 'French',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Native name of the language',
    example: 'Francais',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  native_name?: string;

  @ApiPropertyOptional({
    description: 'Emoji flag for the language',
    example: '🇫🇷',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  emoji_flag?: string;

  @ApiPropertyOptional({
    description: 'Whether the language is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Display order in language selectors',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  sort_order?: number;
}

/**
 * Response DTO for language
 */
export class LanguageResponseDto {
  @ApiProperty({
    description: 'Language ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'ISO 639-1 language code',
    example: 'de',
  })
  code: string;

  @ApiProperty({
    description: 'English name of the language',
    example: 'German',
  })
  name: string;

  @ApiProperty({
    description: 'Native name of the language',
    example: 'Deutsch',
  })
  native_name: string;

  @ApiProperty({
    description: 'Emoji flag for the language',
    example: '🇩🇪',
  })
  emoji_flag: string;

  @ApiProperty({
    description: 'Whether this is the default language',
    example: true,
  })
  is_default: boolean;

  @ApiProperty({
    description: 'Whether the language is active',
    example: true,
  })
  is_active: boolean;

  @ApiProperty({
    description: 'Display order',
    example: 0,
  })
  sort_order: number;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-15T10:30:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-01-15T10:30:00.000Z',
  })
  updated_at: Date;
}

/**
 * DTO for updating translations
 */
export class UpdateTranslationsDto {
  @ApiProperty({
    description: 'Translation namespace',
    example: 'common',
  })
  @IsString()
  namespace: string;

  @ApiProperty({
    description: 'Translation key-value pairs',
    example: { save: 'Speichern', cancel: 'Abbrechen' },
  })
  @IsObject()
  translations: Record<string, unknown>;
}

/**
 * DTO for importing translations
 */
export class ImportTranslationsDto {
  @ApiPropertyOptional({
    description: 'Translation namespace (if importing single namespace)',
    example: 'common',
  })
  @IsOptional()
  @IsString()
  namespace?: string;

  @ApiProperty({
    description: 'JSON content to import',
    example: { save: 'Speichern', cancel: 'Abbrechen' },
  })
  @IsObject()
  content: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Whether to merge with existing translations (default: true)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  merge?: boolean;
}

/**
 * Response DTO for translations
 */
export class TranslationsResponseDto {
  @ApiProperty({
    description: 'Language code',
    example: 'de',
  })
  language: string;

  @ApiProperty({
    description: 'Translation namespace',
    example: 'common',
  })
  namespace: string;

  @ApiProperty({
    description: 'Translation key-value pairs',
    example: { save: 'Speichern', cancel: 'Abbrechen' },
  })
  translations: Record<string, unknown>;
}

/**
 * Response DTO for all translations
 */
export class AllTranslationsResponseDto {
  @ApiProperty({
    description: 'Language code',
    example: 'de',
  })
  language: string;

  @ApiProperty({
    description: 'All namespaces with translations',
    example: {
      common: { save: 'Speichern' },
      navigation: { dashboard: 'Dashboard' },
    },
  })
  namespaces: Record<string, Record<string, unknown>>;
}

/**
 * DTO for flat translations (for table view)
 */
export class FlatTranslationsResponseDto {
  @ApiProperty({
    description: 'Flat key-value pairs with namespace prefix',
    example: {
      'common.save': 'Speichern',
      'navigation.dashboard': 'Dashboard',
    },
  })
  translations: Record<string, string>;
}
