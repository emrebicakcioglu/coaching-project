/**
 * Language Settings Controller
 * STORY-018A: Standard-Sprache Backend (i18n Setup)
 *
 * REST API endpoints for language/i18n management.
 * Features:
 * - Get/set user language preferences
 * - Get/set admin language settings
 * - Retrieve translations for languages
 * - Get list of supported languages
 */

import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { LanguageService } from './language.service';
import {
  UpdateUserLanguageDto,
  UpdateAdminLanguageSettingsDto,
  UserLanguageResponseDto,
  AdminLanguageSettingsResponseDto,
  TranslationResponseDto,
  LanguageTranslationsResponseDto,
  SupportedLanguagesResponseDto,
  SUPPORTED_LANGUAGE_CODES,
} from './dto/language-settings.dto';

/**
 * Extended Request interface with user data
 */
interface AuthenticatedRequest {
  user: {
    id: number;
    email: string;
    roles: string[];
  };
  ip?: string;
  headers: {
    'user-agent'?: string;
    'x-request-id'?: string;
  };
}

@ApiTags('Language')
@Controller('api/v1/language')
export class LanguageController {
  constructor(private readonly languageService: LanguageService) {}

  // =====================================
  // Public Endpoints
  // =====================================

  /**
   * Get list of supported languages
   */
  @Get('supported')
  @ApiOperation({
    summary: 'Get supported languages',
    description: 'Returns list of all supported languages with metadata',
  })
  @ApiResponse({
    status: 200,
    description: 'List of supported languages',
    type: SupportedLanguagesResponseDto,
  })
  async getSupportedLanguages(): Promise<SupportedLanguagesResponseDto> {
    const adminSettings = await this.languageService.getAdminSettings();
    const languages = this.languageService.getSupportedLanguages();

    return {
      languages: languages.map((lang) => ({
        code: lang.code,
        name: lang.name,
        nativeName: lang.nativeName,
      })),
      default_language: adminSettings.default_language,
      fallback_language: adminSettings.fallback_language,
    };
  }

  /**
   * Get translations for a specific language
   */
  @Get('translations/:language')
  @ApiOperation({
    summary: 'Get translations for a language',
    description: 'Returns all translations for a specific language',
  })
  @ApiParam({
    name: 'language',
    description: 'Language code',
    enum: SUPPORTED_LANGUAGE_CODES,
    example: 'en',
  })
  @ApiResponse({
    status: 200,
    description: 'Translations for the specified language',
    type: LanguageTranslationsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Language not found' })
  async getLanguageTranslations(
    @Param('language') language: string,
  ): Promise<LanguageTranslationsResponseDto> {
    const namespaces = await this.languageService.getAllTranslations(language);

    return {
      language,
      namespaces,
    };
  }

  /**
   * Get translations for a specific namespace
   */
  @Get('translations/:language/:namespace')
  @ApiOperation({
    summary: 'Get translations for a namespace',
    description: 'Returns translations for a specific language and namespace',
  })
  @ApiParam({
    name: 'language',
    description: 'Language code',
    enum: SUPPORTED_LANGUAGE_CODES,
    example: 'en',
  })
  @ApiParam({
    name: 'namespace',
    description: 'Translation namespace',
    enum: ['common', 'validation', 'emails', 'errors'],
    example: 'common',
  })
  @ApiResponse({
    status: 200,
    description: 'Translations for the specified namespace',
    type: TranslationResponseDto,
  })
  async getNamespaceTranslations(
    @Param('language') language: string,
    @Param('namespace') namespace: 'common' | 'validation' | 'emails' | 'errors',
  ): Promise<TranslationResponseDto> {
    const translations = await this.languageService.getTranslations(language, namespace);

    return {
      language,
      namespace,
      translations,
    };
  }

  /**
   * Translate a single key
   */
  @Get('translate')
  @ApiOperation({
    summary: 'Translate a key',
    description: 'Translates a single key with optional variable substitution',
  })
  @ApiQuery({ name: 'language', required: true, description: 'Language code' })
  @ApiQuery({ name: 'key', required: true, description: 'Translation key (dot notation)' })
  @ApiQuery({ name: 'namespace', required: false, description: 'Namespace (default: common)' })
  @ApiResponse({ status: 200, description: 'Translated text' })
  async translateKey(
    @Query('language') language: string,
    @Query('key') key: string,
    @Query('namespace') namespace?: string,
  ): Promise<{ text: string }> {
    const text = await this.languageService.translate(
      language,
      key,
      (namespace as 'common' | 'validation' | 'emails' | 'errors') || 'common',
    );

    return { text };
  }

  // =====================================
  // User Language Preference Endpoints
  // =====================================

  /**
   * Get current user's language preference
   */
  @Get('user/preference')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user language preference',
    description: "Returns the current user's language settings",
  })
  @ApiResponse({
    status: 200,
    description: 'User language preference',
    type: UserLanguageResponseDto,
  })
  async getUserLanguagePreference(
    @Req() req: AuthenticatedRequest,
  ): Promise<UserLanguageResponseDto> {
    const preference = await this.languageService.getUserLanguagePreference(req.user.id);

    return {
      language: preference.language,
      date_format: preference.date_format,
      number_format: preference.number_format,
      updated_at: new Date(),
    };
  }

  /**
   * Update current user's language preference
   */
  @Put('user/preference')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update user language preference',
    description: "Updates the current user's language settings",
  })
  @ApiResponse({
    status: 200,
    description: 'Updated language preference',
    type: UserLanguageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid language code' })
  async updateUserLanguagePreference(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateUserLanguageDto,
  ): Promise<UserLanguageResponseDto> {
    const preference = await this.languageService.updateUserLanguagePreference(
      req.user.id,
      {
        language: dto.language,
        date_format: dto.date_format,
        number_format: dto.number_format,
      },
      {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.headers['x-request-id'],
      },
    );

    return {
      language: preference.language,
      date_format: preference.date_format,
      number_format: preference.number_format,
      updated_at: new Date(),
    };
  }

  // =====================================
  // Admin Language Settings Endpoints
  // =====================================

  /**
   * Get admin language settings
   */
  @Get('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get admin language settings',
    description: 'Returns the global language configuration (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin language settings',
    type: AdminLanguageSettingsResponseDto,
  })
  async getAdminLanguageSettings(): Promise<AdminLanguageSettingsResponseDto> {
    const settings = await this.languageService.getAdminSettings();

    return {
      default_language: settings.default_language,
      supported_languages: settings.supported_languages,
      fallback_language: settings.fallback_language,
      updated_at: new Date(),
    };
  }

  /**
   * Update admin language settings
   */
  @Put('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update admin language settings',
    description: 'Updates the global language configuration (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated admin language settings',
    type: AdminLanguageSettingsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid language settings' })
  async updateAdminLanguageSettings(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateAdminLanguageSettingsDto,
  ): Promise<AdminLanguageSettingsResponseDto> {
    const settings = await this.languageService.updateAdminSettings(
      {
        default_language: dto.default_language,
        supported_languages: dto.supported_languages,
        fallback_language: dto.fallback_language,
      },
      req.user.id,
      {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.headers['x-request-id'],
      },
    );

    return {
      default_language: settings.default_language,
      supported_languages: settings.supported_languages,
      fallback_language: settings.fallback_language,
      updated_at: new Date(),
      updated_by: req.user.id,
    };
  }

  // =====================================
  // Cache Management (Admin Only)
  // =====================================

  /**
   * Clear translation cache
   */
  @Put('admin/cache/clear')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clear translation cache',
    description: 'Clears the translation cache to reload translations from files',
  })
  @ApiResponse({ status: 200, description: 'Cache cleared successfully' })
  async clearCache(): Promise<{ message: string; stats: { languages: number; namespaces: number } }> {
    const beforeStats = this.languageService.getCacheStats();
    this.languageService.clearCache();

    return {
      message: 'Translation cache cleared successfully',
      stats: beforeStats,
    };
  }

  /**
   * Get cache statistics
   */
  @Get('admin/cache/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get cache statistics',
    description: 'Returns translation cache statistics',
  })
  @ApiResponse({ status: 200, description: 'Cache statistics' })
  async getCacheStats(): Promise<{ languages: number; namespaces: number }> {
    return this.languageService.getCacheStats();
  }
}
