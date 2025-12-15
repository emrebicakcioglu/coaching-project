/**
 * Languages Controller
 * Multi-Language Management System
 *
 * REST API controller for language and translation management.
 *
 * Routes:
 * - GET    /api/v1/languages                    - List all languages (public)
 * - GET    /api/v1/languages/namespaces         - List available namespaces (public)
 * - GET    /api/v1/languages/:code              - Get language by code (public)
 * - POST   /api/v1/languages                    - Create language (requires languages.manage)
 * - PUT    /api/v1/languages/:code              - Update language (requires languages.manage)
 * - DELETE /api/v1/languages/:code              - Delete language (requires languages.manage)
 * - GET    /api/v1/languages/:code/translations - Get all translations (public)
 * - GET    /api/v1/languages/:code/translations/:namespace - Get namespace translations (public)
 * - PUT    /api/v1/languages/:code/translations - Update translations (requires languages.manage)
 * - POST   /api/v1/languages/:code/translations/import - Import translations (requires languages.manage)
 * - GET    /api/v1/languages/:code/translations/export - Export translations (requires languages.manage)
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
  forwardRef,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { LanguagesService } from './languages.service';
import {
  CreateLanguageDto,
  UpdateLanguageDto,
  LanguageResponseDto,
  UpdateTranslationsDto,
  ImportTranslationsDto,
  TranslationsResponseDto,
  AllTranslationsResponseDto,
} from './dto/language.dto';
import { RateLimit } from '../common/guards/rate-limit.guard';
import { JwtAuthGuard, AuthenticatedRequest, Public } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../common/guards/permissions.guard';

@ApiTags('Languages')
@Controller('api/v1/languages')
export class LanguagesController {
  constructor(
    @Inject(forwardRef(() => LanguagesService))
    private readonly languagesService: LanguagesService,
  ) {}

  // =====================================
  // Public Endpoints (no auth required)
  // =====================================

  /**
   * List all active languages
   */
  @Get()
  @Public()
  @RateLimit(100, 60)
  @ApiOperation({
    summary: 'List all languages',
    description: 'Retrieve a list of all active languages. No authentication required.',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Include inactive languages (requires authentication)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of languages',
    type: [LanguageResponseDto],
  })
  async findAll(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<LanguageResponseDto[]> {
    return this.languagesService.findAll(includeInactive === 'true');
  }

  /**
   * Get available namespaces
   */
  @Get('namespaces')
  @Public()
  @RateLimit(100, 60)
  @ApiOperation({
    summary: 'List available namespaces',
    description: 'Get a list of all translation namespaces.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of namespaces',
    schema: {
      type: 'array',
      items: { type: 'string' },
      example: ['common', 'navigation', 'validation', 'emails', 'errors'],
    },
  })
  getNamespaces(): string[] {
    return this.languagesService.getNamespaces();
  }

  /**
   * Get language by code
   */
  @Get(':code')
  @Public()
  @RateLimit(100, 60)
  @ApiOperation({
    summary: 'Get language by code',
    description: 'Retrieve a language by its ISO 639-1 code.',
  })
  @ApiParam({
    name: 'code',
    description: 'ISO 639-1 language code',
    example: 'de',
  })
  @ApiResponse({
    status: 200,
    description: 'Language details',
    type: LanguageResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Language not found' })
  async findByCode(@Param('code') code: string): Promise<LanguageResponseDto> {
    return this.languagesService.findByCode(code);
  }

  /**
   * Get all translations for a language
   */
  @Get(':code/translations')
  @Public()
  @RateLimit(200, 60)
  @ApiOperation({
    summary: 'Get all translations',
    description: 'Get all translations for a language across all namespaces.',
  })
  @ApiParam({
    name: 'code',
    description: 'ISO 639-1 language code',
    example: 'de',
  })
  @ApiResponse({
    status: 200,
    description: 'All translations for the language',
    type: AllTranslationsResponseDto,
  })
  async getAllTranslations(
    @Param('code') code: string,
  ): Promise<AllTranslationsResponseDto> {
    return this.languagesService.getAllTranslations(code);
  }

  /**
   * Export translations
   * NOTE: Must be before /:namespace route to avoid being caught by wildcard
   */
  @Get(':code/translations/export')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('languages.manage')
  @ApiBearerAuth('bearerAuth')
  @RateLimit(50, 60)
  @ApiOperation({
    summary: 'Export translations',
    description: 'Export translations as JSON. Requires languages.manage permission.',
  })
  @ApiParam({
    name: 'code',
    description: 'ISO 639-1 language code',
    example: 'de',
  })
  @ApiQuery({
    name: 'namespace',
    required: false,
    description: 'Export only specific namespace',
    example: 'common',
  })
  @ApiQuery({
    name: 'download',
    required: false,
    type: Boolean,
    description: 'Download as file',
  })
  @ApiResponse({
    status: 200,
    description: 'Translations exported',
    schema: {
      type: 'object',
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async exportTranslations(
    @Param('code') code: string,
    @Query('namespace') namespace?: string,
    @Query('download') download?: string,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<Record<string, unknown>> {
    const translations = await this.languagesService.exportTranslations(code, namespace);

    if (download === 'true' && res) {
      const filename = namespace
        ? `${code}-${namespace}.json`
        : `${code}-all.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }

    return translations;
  }

  /**
   * Get flat translations (for table view)
   * NOTE: Must be before /:namespace route to avoid being caught by wildcard
   */
  @Get(':code/translations/flat')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('languages.manage')
  @ApiBearerAuth('bearerAuth')
  @RateLimit(50, 60)
  @ApiOperation({
    summary: 'Get flat translations',
    description: 'Get translations in flat format (namespace.key = value) for table editing.',
  })
  @ApiParam({
    name: 'code',
    description: 'ISO 639-1 language code',
    example: 'de',
  })
  @ApiResponse({
    status: 200,
    description: 'Flat translations',
    schema: {
      type: 'object',
      additionalProperties: { type: 'string' },
      example: {
        'common.save': 'Speichern',
        'navigation.dashboard': 'Dashboard',
      },
    },
  })
  async getFlatTranslations(
    @Param('code') code: string,
  ): Promise<Record<string, string>> {
    return this.languagesService.getFlatTranslations(code);
  }

  /**
   * Get translations for a specific namespace
   * NOTE: Must be AFTER /export and /flat routes due to wildcard matching
   */
  @Get(':code/translations/:namespace')
  @Public()
  @RateLimit(200, 60)
  @ApiOperation({
    summary: 'Get namespace translations',
    description: 'Get translations for a specific namespace.',
  })
  @ApiParam({
    name: 'code',
    description: 'ISO 639-1 language code',
    example: 'de',
  })
  @ApiParam({
    name: 'namespace',
    description: 'Translation namespace',
    example: 'common',
  })
  @ApiResponse({
    status: 200,
    description: 'Translations for the namespace',
    type: TranslationsResponseDto,
  })
  async getTranslations(
    @Param('code') code: string,
    @Param('namespace') namespace: string,
  ): Promise<TranslationsResponseDto> {
    return this.languagesService.getTranslations(code, namespace);
  }

  // =====================================
  // Protected Endpoints (require auth)
  // =====================================

  /**
   * Create a new language
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('languages.manage')
  @ApiBearerAuth('bearerAuth')
  @RateLimit(20, 60)
  @ApiOperation({
    summary: 'Create language',
    description: 'Create a new language. Requires languages.manage permission.',
  })
  @ApiResponse({
    status: 201,
    description: 'Language created successfully',
    type: LanguageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Language already exists' })
  async create(
    @Body() dto: CreateLanguageDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<LanguageResponseDto> {
    return this.languagesService.create(dto, request.user?.id, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      requestId: request.requestId,
    });
  }

  /**
   * Update a language
   */
  @Put(':code')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('languages.manage')
  @ApiBearerAuth('bearerAuth')
  @RateLimit(50, 60)
  @ApiOperation({
    summary: 'Update language',
    description: 'Update an existing language. Requires languages.manage permission.',
  })
  @ApiParam({
    name: 'code',
    description: 'ISO 639-1 language code',
    example: 'en',
  })
  @ApiResponse({
    status: 200,
    description: 'Language updated successfully',
    type: LanguageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Language not found' })
  async update(
    @Param('code') code: string,
    @Body() dto: UpdateLanguageDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<LanguageResponseDto> {
    return this.languagesService.update(code, dto, request.user?.id, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      requestId: request.requestId,
    });
  }

  /**
   * Delete a language
   */
  @Delete(':code')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('languages.manage')
  @ApiBearerAuth('bearerAuth')
  @RateLimit(20, 60)
  @ApiOperation({
    summary: 'Delete language',
    description: 'Delete a language. Cannot delete the default language. Requires languages.manage permission.',
  })
  @ApiParam({
    name: 'code',
    description: 'ISO 639-1 language code',
    example: 'fr',
  })
  @ApiResponse({
    status: 200,
    description: 'Language deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        language: { $ref: '#/components/schemas/LanguageResponseDto' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot delete default language' })
  @ApiResponse({ status: 404, description: 'Language not found' })
  async delete(
    @Param('code') code: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ message: string; language: LanguageResponseDto }> {
    return this.languagesService.delete(code, request.user?.id, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      requestId: request.requestId,
    });
  }

  /**
   * Update translations
   */
  @Put(':code/translations')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('languages.manage')
  @ApiBearerAuth('bearerAuth')
  @RateLimit(50, 60)
  @ApiOperation({
    summary: 'Update translations',
    description: 'Update translations for a language. Requires languages.manage permission.',
  })
  @ApiParam({
    name: 'code',
    description: 'ISO 639-1 language code',
    example: 'de',
  })
  @ApiResponse({
    status: 200,
    description: 'Translations updated successfully',
    type: TranslationsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Language not found' })
  async updateTranslations(
    @Param('code') code: string,
    @Body() dto: UpdateTranslationsDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<TranslationsResponseDto> {
    return this.languagesService.updateTranslations(code, dto, request.user?.id, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      requestId: request.requestId,
    });
  }

  /**
   * Import translations
   */
  @Post(':code/translations/import')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('languages.manage')
  @ApiBearerAuth('bearerAuth')
  @RateLimit(20, 60)
  @ApiOperation({
    summary: 'Import translations',
    description: 'Import translations from JSON. Requires languages.manage permission.',
  })
  @ApiParam({
    name: 'code',
    description: 'ISO 639-1 language code',
    example: 'de',
  })
  @ApiResponse({
    status: 200,
    description: 'Translations imported successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        imported: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Language not found' })
  async importTranslations(
    @Param('code') code: string,
    @Body() dto: ImportTranslationsDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ message: string; imported: number }> {
    return this.languagesService.importTranslations(code, dto, request.user?.id, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      requestId: request.requestId,
    });
  }

}
