/**
 * Design Service
 * Design System: Color Schemes Management
 *
 * Business logic for managing color schemes and design tokens.
 */

import { Injectable, Inject, forwardRef, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { WinstonLoggerService } from '../common/services/logger.service';
import { AuditService } from '../common/services/audit.service';

/**
 * Deep merge helper for nested objects
 * Recursively merges source into target
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target } as T;
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      const sourceValue = source[key];
      const targetValue = result[key];
      if (
        typeof sourceValue === 'object' &&
        sourceValue !== null &&
        !Array.isArray(sourceValue) &&
        typeof targetValue === 'object' &&
        targetValue !== null &&
        !Array.isArray(targetValue)
      ) {
        (result as Record<string, unknown>)[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Partial<Record<string, unknown>>,
        );
      } else {
        (result as Record<string, unknown>)[key] = sourceValue;
      }
    }
  }
  return result;
}
import {
  CreateColorSchemeDto,
  UpdateColorSchemeDto,
  ColorSchemeResponseDto,
  ActiveColorSchemeResponseDto,
  ColorSchemeExportDto,
  ImportColorSchemeDto,
} from './dto/color-scheme.dto';
import { Request } from 'express';

/**
 * Extended Request interface with user
 */
interface AuthRequest extends Request {
  user?: { id?: number; email?: string };
  requestId?: string;
}

/**
 * Design Service
 * Handles all design system related business logic
 */
@Injectable()
export class DesignService {
  constructor(
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get all color schemes
   */
  async findAll(): Promise<ColorSchemeResponseDto[]> {
    const pool = this.databaseService.ensurePool();

    const result = await pool.query(
      'SELECT * FROM color_schemes ORDER BY is_default DESC, name ASC',
    );

    return result.rows.map((row) => ColorSchemeResponseDto.fromEntity(row));
  }

  /**
   * Get a single color scheme by ID
   */
  async findOne(id: number): Promise<ColorSchemeResponseDto> {
    const pool = this.databaseService.ensurePool();

    const result = await pool.query(
      'SELECT * FROM color_schemes WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Color scheme with ID ${id} not found`);
    }

    return ColorSchemeResponseDto.fromEntity(result.rows[0]);
  }

  /**
   * Get the active color scheme
   */
  async getActiveScheme(): Promise<ActiveColorSchemeResponseDto> {
    const pool = this.databaseService.ensurePool();

    // First try to get the active scheme
    let result = await pool.query(
      'SELECT * FROM color_schemes WHERE is_active = true LIMIT 1',
    );

    // If no active scheme, get the default
    if (result.rows.length === 0) {
      result = await pool.query(
        'SELECT * FROM color_schemes WHERE is_default = true LIMIT 1',
      );
    }

    // If still no scheme, get the first one
    if (result.rows.length === 0) {
      result = await pool.query(
        'SELECT * FROM color_schemes ORDER BY id ASC LIMIT 1',
      );
    }

    if (result.rows.length === 0) {
      throw new NotFoundException('No color scheme available');
    }

    const scheme = result.rows[0];
    return {
      id: scheme.id,
      name: scheme.name,
      tokens: {
        colors: scheme.colors,
        buttons: scheme.buttons,
        typography: scheme.typography,
        inputs: scheme.inputs,
        cards: scheme.cards,
        badges: scheme.badges,
        alerts: scheme.alerts,
      },
    };
  }

  /**
   * Create a new color scheme
   * If no tokens are provided, copies from the default scheme
   */
  async create(
    createDto: CreateColorSchemeDto,
    userId: number | undefined,
    request: AuthRequest,
  ): Promise<ColorSchemeResponseDto> {
    const pool = this.databaseService.ensurePool();

    // Get default scheme to use as base for missing tokens
    const defaultScheme = await pool.query(
      'SELECT * FROM color_schemes WHERE is_default = true LIMIT 1',
    );
    const baseTokens = defaultScheme.rows[0] || {};

    const result = await pool.query(
      `INSERT INTO color_schemes (name, description, created_by, colors, buttons, typography, inputs, cards, badges, alerts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        createDto.name,
        createDto.description || null,
        userId || null,
        JSON.stringify(createDto.colors || baseTokens.colors || {}),
        JSON.stringify(createDto.buttons || baseTokens.buttons || {}),
        JSON.stringify(createDto.typography || baseTokens.typography || {}),
        JSON.stringify(createDto.inputs || baseTokens.inputs || {}),
        JSON.stringify(createDto.cards || baseTokens.cards || {}),
        JSON.stringify(createDto.badges || baseTokens.badges || {}),
        JSON.stringify(createDto.alerts || baseTokens.alerts || {}),
      ],
    );

    // Log audit event
    await this.auditService.log({
      action: 'design.scheme.create',
      resource: 'color_scheme',
      resourceId: result.rows[0].id,
      userId: userId,
      details: { name: createDto.name },
      request,
    });

    this.logger.log(
      `Color scheme created: ${createDto.name} (ID: ${result.rows[0].id})`,
      'DesignService',
    );

    return ColorSchemeResponseDto.fromEntity(result.rows[0]);
  }

  /**
   * Update an existing color scheme
   */
  async update(
    id: number,
    updateDto: UpdateColorSchemeDto,
    userId: number | undefined,
    request: AuthRequest,
  ): Promise<ColorSchemeResponseDto> {
    const pool = this.databaseService.ensurePool();

    // Check if scheme exists
    const existing = await pool.query(
      'SELECT * FROM color_schemes WHERE id = $1',
      [id],
    );

    if (existing.rows.length === 0) {
      throw new NotFoundException(`Color scheme with ID ${id} not found`);
    }

    // Build update query dynamically
    // Values can be strings, booleans, numbers, or JSON strings
    type QueryValue = string | boolean | number | null;
    const updates: string[] = [];
    const values: QueryValue[] = [];
    let paramIndex = 1;

    if (updateDto.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(updateDto.name);
    }
    if (updateDto.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(updateDto.description);
    }
    if (updateDto.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(updateDto.is_active);
    }
    if (updateDto.colors !== undefined) {
      // Deep merge with existing colors to preserve nested properties
      const mergedColors = deepMerge(existing.rows[0].colors || {}, updateDto.colors);
      updates.push(`colors = $${paramIndex++}`);
      values.push(JSON.stringify(mergedColors));
    }
    if (updateDto.buttons !== undefined) {
      const mergedButtons = deepMerge(existing.rows[0].buttons || {}, updateDto.buttons);
      updates.push(`buttons = $${paramIndex++}`);
      values.push(JSON.stringify(mergedButtons));
    }
    if (updateDto.typography !== undefined) {
      const mergedTypography = deepMerge(existing.rows[0].typography || {}, updateDto.typography);
      updates.push(`typography = $${paramIndex++}`);
      values.push(JSON.stringify(mergedTypography));
    }
    if (updateDto.inputs !== undefined) {
      const mergedInputs = deepMerge(existing.rows[0].inputs || {}, updateDto.inputs);
      updates.push(`inputs = $${paramIndex++}`);
      values.push(JSON.stringify(mergedInputs));
    }
    if (updateDto.cards !== undefined) {
      const mergedCards = deepMerge(existing.rows[0].cards || {}, updateDto.cards);
      updates.push(`cards = $${paramIndex++}`);
      values.push(JSON.stringify(mergedCards));
    }
    if (updateDto.badges !== undefined) {
      const mergedBadges = deepMerge(existing.rows[0].badges || {}, updateDto.badges);
      updates.push(`badges = $${paramIndex++}`);
      values.push(JSON.stringify(mergedBadges));
    }
    if (updateDto.alerts !== undefined) {
      const mergedAlerts = deepMerge(existing.rows[0].alerts || {}, updateDto.alerts);
      updates.push(`alerts = $${paramIndex++}`);
      values.push(JSON.stringify(mergedAlerts));
    }

    if (updates.length === 0) {
      return ColorSchemeResponseDto.fromEntity(existing.rows[0]);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE color_schemes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    // Log audit event
    await this.auditService.log({
      action: 'design.scheme.update',
      resource: 'color_scheme',
      resourceId: id,
      userId: userId,
      details: { updates: Object.keys(updateDto) },
      request,
    });

    this.logger.log(
      `Color scheme updated: ID ${id}`,
      'DesignService',
    );

    return ColorSchemeResponseDto.fromEntity(result.rows[0]);
  }

  /**
   * Delete a color scheme
   */
  async delete(
    id: number,
    userId: number | undefined,
    request: AuthRequest,
  ): Promise<void> {
    const pool = this.databaseService.ensurePool();

    // Check if scheme exists and is not default
    const existing = await pool.query(
      'SELECT * FROM color_schemes WHERE id = $1',
      [id],
    );

    if (existing.rows.length === 0) {
      throw new NotFoundException(`Color scheme with ID ${id} not found`);
    }

    if (existing.rows[0].is_default) {
      throw new BadRequestException('Cannot delete the default color scheme');
    }

    await pool.query('DELETE FROM color_schemes WHERE id = $1', [id]);

    // Log audit event
    await this.auditService.log({
      action: 'design.scheme.delete',
      resource: 'color_scheme',
      resourceId: id,
      userId: userId,
      details: { name: existing.rows[0].name },
      request,
    });

    this.logger.log(
      `Color scheme deleted: ${existing.rows[0].name} (ID: ${id})`,
      'DesignService',
    );
  }

  /**
   * Apply a color scheme (make it active)
   */
  async applyScheme(
    id: number,
    userId: number | undefined,
    request: AuthRequest,
  ): Promise<ColorSchemeResponseDto> {
    const pool = this.databaseService.ensurePool();

    // Check if scheme exists
    const existing = await pool.query(
      'SELECT * FROM color_schemes WHERE id = $1',
      [id],
    );

    if (existing.rows.length === 0) {
      throw new NotFoundException(`Color scheme with ID ${id} not found`);
    }

    // Deactivate all schemes and activate the selected one
    await pool.query('UPDATE color_schemes SET is_active = false');
    const result = await pool.query(
      'UPDATE color_schemes SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id],
    );

    // Log audit event
    await this.auditService.log({
      action: 'design.scheme.apply',
      resource: 'color_scheme',
      resourceId: id,
      userId: userId,
      details: { name: existing.rows[0].name },
      request,
    });

    this.logger.log(
      `Color scheme applied: ${existing.rows[0].name} (ID: ${id})`,
      'DesignService',
    );

    return ColorSchemeResponseDto.fromEntity(result.rows[0]);
  }

  /**
   * Duplicate a color scheme
   */
  async duplicate(
    id: number,
    newName: string,
    userId: number | undefined,
    request: AuthRequest,
  ): Promise<ColorSchemeResponseDto> {
    const pool = this.databaseService.ensurePool();

    // Get the original scheme
    const original = await pool.query(
      'SELECT * FROM color_schemes WHERE id = $1',
      [id],
    );

    if (original.rows.length === 0) {
      throw new NotFoundException(`Color scheme with ID ${id} not found`);
    }

    const scheme = original.rows[0];

    // Create the duplicate
    const result = await pool.query(
      `INSERT INTO color_schemes (name, description, created_by, colors, buttons, typography, inputs, cards, badges, alerts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        newName,
        `Copy of ${scheme.name}`,
        userId || null,
        JSON.stringify(scheme.colors),
        JSON.stringify(scheme.buttons),
        JSON.stringify(scheme.typography),
        JSON.stringify(scheme.inputs),
        JSON.stringify(scheme.cards),
        JSON.stringify(scheme.badges),
        JSON.stringify(scheme.alerts),
      ],
    );

    // Log audit event
    await this.auditService.log({
      action: 'design.scheme.duplicate',
      resource: 'color_scheme',
      resourceId: result.rows[0].id,
      userId: userId,
      details: { originalId: id, newName },
      request,
    });

    this.logger.log(
      `Color scheme duplicated: ${scheme.name} -> ${newName} (ID: ${result.rows[0].id})`,
      'DesignService',
    );

    return ColorSchemeResponseDto.fromEntity(result.rows[0]);
  }

  /**
   * Get schemes assigned to light and dark modes
   * Public endpoint for dark mode toggle functionality
   */
  async getSchemeModes(): Promise<{ lightSchemeId: number | null; darkSchemeId: number | null }> {
    const pool = this.databaseService.ensurePool();

    const lightResult = await pool.query(
      'SELECT id FROM color_schemes WHERE is_light_scheme = true LIMIT 1',
    );

    const darkResult = await pool.query(
      'SELECT id FROM color_schemes WHERE is_dark_scheme = true LIMIT 1',
    );

    return {
      lightSchemeId: lightResult.rows.length > 0 ? lightResult.rows[0].id : null,
      darkSchemeId: darkResult.rows.length > 0 ? darkResult.rows[0].id : null,
    };
  }

  /**
   * Set a scheme as the light mode scheme
   * Clears the flag from any other scheme first
   */
  async setAsLightScheme(
    id: number,
    userId: number | undefined,
    request: AuthRequest,
  ): Promise<ColorSchemeResponseDto> {
    const pool = this.databaseService.ensurePool();

    // Check if scheme exists
    const existing = await pool.query(
      'SELECT * FROM color_schemes WHERE id = $1',
      [id],
    );

    if (existing.rows.length === 0) {
      throw new NotFoundException(`Color scheme with ID ${id} not found`);
    }

    // Clear light scheme flag from all schemes
    await pool.query('UPDATE color_schemes SET is_light_scheme = false');

    // Set this scheme as light mode
    const result = await pool.query(
      'UPDATE color_schemes SET is_light_scheme = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id],
    );

    // Log audit event
    await this.auditService.log({
      action: 'design.scheme.set_light_mode',
      resource: 'color_scheme',
      resourceId: id,
      userId: userId,
      details: { name: existing.rows[0].name },
      request,
    });

    this.logger.log(
      `Color scheme set as light mode: ${existing.rows[0].name} (ID: ${id})`,
      'DesignService',
    );

    return ColorSchemeResponseDto.fromEntity(result.rows[0]);
  }

  /**
   * Set a scheme as the dark mode scheme
   * Clears the flag from any other scheme first
   */
  async setAsDarkScheme(
    id: number,
    userId: number | undefined,
    request: AuthRequest,
  ): Promise<ColorSchemeResponseDto> {
    const pool = this.databaseService.ensurePool();

    // Check if scheme exists
    const existing = await pool.query(
      'SELECT * FROM color_schemes WHERE id = $1',
      [id],
    );

    if (existing.rows.length === 0) {
      throw new NotFoundException(`Color scheme with ID ${id} not found`);
    }

    // Clear dark scheme flag from all schemes
    await pool.query('UPDATE color_schemes SET is_dark_scheme = false');

    // Set this scheme as dark mode
    const result = await pool.query(
      'UPDATE color_schemes SET is_dark_scheme = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id],
    );

    // Log audit event
    await this.auditService.log({
      action: 'design.scheme.set_dark_mode',
      resource: 'color_scheme',
      resourceId: id,
      userId: userId,
      details: { name: existing.rows[0].name },
      request,
    });

    this.logger.log(
      `Color scheme set as dark mode: ${existing.rows[0].name} (ID: ${id})`,
      'DesignService',
    );

    return ColorSchemeResponseDto.fromEntity(result.rows[0]);
  }

  /**
   * Clear light mode flag from a scheme
   */
  async clearLightScheme(
    id: number,
    _userId: number | undefined,
    _request: AuthRequest,
  ): Promise<ColorSchemeResponseDto> {
    const pool = this.databaseService.ensurePool();

    const result = await pool.query(
      'UPDATE color_schemes SET is_light_scheme = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Color scheme with ID ${id} not found`);
    }

    return ColorSchemeResponseDto.fromEntity(result.rows[0]);
  }

  /**
   * Clear dark mode flag from a scheme
   */
  async clearDarkScheme(
    id: number,
    _userId: number | undefined,
    _request: AuthRequest,
  ): Promise<ColorSchemeResponseDto> {
    const pool = this.databaseService.ensurePool();

    const result = await pool.query(
      'UPDATE color_schemes SET is_dark_scheme = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Color scheme with ID ${id} not found`);
    }

    return ColorSchemeResponseDto.fromEntity(result.rows[0]);
  }

  /**
   * Export a color scheme to JSON format
   */
  async exportScheme(id: number): Promise<ColorSchemeExportDto> {
    const pool = this.databaseService.ensurePool();

    const result = await pool.query(
      'SELECT * FROM color_schemes WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Color scheme with ID ${id} not found`);
    }

    const scheme = result.rows[0];

    return {
      name: scheme.name,
      description: scheme.description,
      colors: scheme.colors,
      buttons: scheme.buttons,
      typography: scheme.typography,
      inputs: scheme.inputs,
      cards: scheme.cards,
      badges: scheme.badges,
      alerts: scheme.alerts,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
  }

  /**
   * Import a color scheme from JSON format
   */
  async importScheme(
    importDto: ImportColorSchemeDto,
    userId: number | undefined,
    request: AuthRequest,
  ): Promise<ColorSchemeResponseDto> {
    const pool = this.databaseService.ensurePool();

    const result = await pool.query(
      `INSERT INTO color_schemes (name, description, created_by, colors, buttons, typography, inputs, cards, badges, alerts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        importDto.name,
        importDto.description || null,
        userId || null,
        JSON.stringify(importDto.colors),
        JSON.stringify(importDto.buttons),
        JSON.stringify(importDto.typography),
        JSON.stringify(importDto.inputs),
        JSON.stringify(importDto.cards),
        JSON.stringify(importDto.badges),
        JSON.stringify(importDto.alerts),
      ],
    );

    // Log audit event
    await this.auditService.log({
      action: 'design.scheme.import',
      resource: 'color_scheme',
      resourceId: result.rows[0].id,
      userId: userId,
      details: { name: importDto.name },
      request,
    });

    this.logger.log(
      `Color scheme imported: ${importDto.name} (ID: ${result.rows[0].id})`,
      'DesignService',
    );

    return ColorSchemeResponseDto.fromEntity(result.rows[0]);
  }
}
