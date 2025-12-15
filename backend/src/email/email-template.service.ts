/**
 * Email Template Service
 * STORY-023B: E-Mail Templates & Queue
 *
 * Manages email templates stored in the database.
 * Features:
 * - CRUD operations for email templates
 * - Handlebars template compilation and caching
 * - Variable substitution with safe escaping
 * - HTML and text variant support
 * - Default values for optional variables
 *
 * Environment Variables Required:
 * - None (uses database connection from DatabaseService)
 */

import { Injectable, Inject, forwardRef, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { WinstonLoggerService } from '../common/services/logger.service';
import { DatabaseService } from '../database/database.service';
import {
  EmailTemplate,
  EmailTemplateInsert,
  EmailTemplateUpdate,
} from '../database/types';

/**
 * Compiled template cache entry
 */
interface CompiledTemplate {
  html: HandlebarsTemplateDelegate;
  text?: HandlebarsTemplateDelegate;
  subject: HandlebarsTemplateDelegate;
  compiledAt: Date;
}

/**
 * Template rendering result
 */
export interface RenderedTemplate {
  subject: string;
  html: string;
  text?: string;
}

/**
 * Email Template Service
 * Singleton service for managing database-stored email templates
 */
@Injectable()
export class EmailTemplateService implements OnModuleInit {
  private templateCache: Map<string, CompiledTemplate> = new Map();
  private readonly companyName: string;
  private readonly supportEmail: string;

  constructor(
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
  ) {
    this.companyName = process.env.EMAIL_FROM_NAME || 'Core Application';
    this.supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM_ADDRESS || 'support@example.com';
    this.logger.log('EmailTemplateService initialized', 'EmailTemplateService');
  }

  /**
   * Module initialization - register Handlebars helpers and precompile templates
   */
  async onModuleInit(): Promise<void> {
    this.registerHandlebarsHelpers();
    await this.precompileTemplates();
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHandlebarsHelpers(): void {
    // Helper for current year
    Handlebars.registerHelper('currentYear', () => new Date().getFullYear());

    // Helper for date formatting
    Handlebars.registerHelper('formatDate', (date: Date | string) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    // Helper for conditional blocks
    Handlebars.registerHelper('ifEquals', function (
      this: unknown,
      arg1: unknown,
      arg2: unknown,
      options: Handlebars.HelperOptions,
    ) {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this);
    });

    // Helper for default values
    Handlebars.registerHelper('default', function (value: unknown, defaultValue: unknown) {
      return value ?? defaultValue;
    });

    this.logger.debug('Handlebars helpers registered', 'EmailTemplateService');
  }

  /**
   * Pre-compile all active templates from database on startup
   */
  private async precompileTemplates(): Promise<void> {
    try {
      const templates = await this.findAll(true); // Only active templates
      for (const template of templates) {
        try {
          this.compileAndCacheTemplate(template);
          this.logger.debug(`Template pre-compiled: ${template.name}`, 'EmailTemplateService');
        } catch (error) {
          this.logger.warn(
            `Failed to pre-compile template ${template.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'EmailTemplateService',
          );
        }
      }
      this.logger.log(`Pre-compiled ${templates.length} email templates`, 'EmailTemplateService');
    } catch (error) {
      // Don't fail startup if templates can't be loaded
      this.logger.warn(
        `Failed to pre-compile templates: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EmailTemplateService',
      );
    }
  }

  /**
   * Compile and cache a template
   */
  private compileAndCacheTemplate(template: EmailTemplate): CompiledTemplate {
    const compiled: CompiledTemplate = {
      html: Handlebars.compile(template.html_content),
      subject: Handlebars.compile(template.subject),
      text: template.text_content ? Handlebars.compile(template.text_content) : undefined,
      compiledAt: new Date(),
    };

    this.templateCache.set(template.name, compiled);
    return compiled;
  }

  /**
   * Get compiled template from cache or database
   */
  private async getCompiledTemplate(name: string): Promise<CompiledTemplate> {
    // Check cache first
    const cached = this.templateCache.get(name);
    if (cached) {
      return cached;
    }

    // Load from database
    const template = await this.findByName(name);
    if (!template) {
      throw new NotFoundException(`Email template '${name}' not found`);
    }

    if (!template.is_active) {
      throw new BadRequestException(`Email template '${name}' is inactive`);
    }

    return this.compileAndCacheTemplate(template);
  }

  /**
   * Render a template with data
   */
  async renderTemplate(
    templateName: string,
    data: Record<string, unknown>,
  ): Promise<RenderedTemplate> {
    const compiled = await this.getCompiledTemplate(templateName);

    // Add default data
    const templateData: Record<string, unknown> = {
      ...data,
      companyName: data.companyName ?? this.companyName,
      supportEmail: data.supportEmail ?? this.supportEmail,
      year: new Date().getFullYear(),
    };

    return {
      subject: compiled.subject(templateData),
      html: compiled.html(templateData),
      text: compiled.text ? compiled.text(templateData) : undefined,
    };
  }

  /**
   * Find all templates
   */
  async findAll(activeOnly = false): Promise<EmailTemplate[]> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    let query = 'SELECT * FROM email_templates';
    const params: unknown[] = [];

    if (activeOnly) {
      query += ' WHERE is_active = $1';
      params.push(true);
    }

    query += ' ORDER BY name ASC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Find template by ID
   */
  async findById(id: number): Promise<EmailTemplate | null> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const result = await pool.query(
      'SELECT * FROM email_templates WHERE id = $1',
      [id],
    );

    return result.rows[0] || null;
  }

  /**
   * Find template by name
   */
  async findByName(name: string): Promise<EmailTemplate | null> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const result = await pool.query(
      'SELECT * FROM email_templates WHERE name = $1',
      [name],
    );

    return result.rows[0] || null;
  }

  /**
   * Create a new template
   */
  async create(data: EmailTemplateInsert): Promise<EmailTemplate> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    // Check if template with same name exists
    const existing = await this.findByName(data.name);
    if (existing) {
      throw new BadRequestException(`Template with name '${data.name}' already exists`);
    }

    // Validate Handlebars syntax
    try {
      Handlebars.compile(data.html_content);
      Handlebars.compile(data.subject);
      if (data.text_content) {
        Handlebars.compile(data.text_content);
      }
    } catch (error) {
      throw new BadRequestException(
        `Invalid Handlebars template: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    const result = await pool.query(
      `INSERT INTO email_templates (name, subject, html_content, text_content, variables, description, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.name,
        data.subject,
        data.html_content,
        data.text_content || null,
        data.variables || [],
        data.description || null,
        data.is_active !== false,
      ],
    );

    const template = result.rows[0];

    // Clear cache and recompile
    this.templateCache.delete(template.name);
    if (template.is_active) {
      this.compileAndCacheTemplate(template);
    }

    this.logger.log(`Email template created: ${template.name}`, 'EmailTemplateService');
    return template;
  }

  /**
   * Update a template
   */
  async update(id: number, data: EmailTemplateUpdate): Promise<EmailTemplate> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    // Check if template exists
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    // If name is changing, check for conflicts
    if (data.name && data.name !== existing.name) {
      const conflicting = await this.findByName(data.name);
      if (conflicting) {
        throw new BadRequestException(`Template with name '${data.name}' already exists`);
      }
    }

    // Validate Handlebars syntax for updated fields
    try {
      if (data.html_content) {
        Handlebars.compile(data.html_content);
      }
      if (data.subject) {
        Handlebars.compile(data.subject);
      }
      if (data.text_content) {
        Handlebars.compile(data.text_content);
      }
    } catch (error) {
      throw new BadRequestException(
        `Invalid Handlebars template: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.subject !== undefined) {
      updates.push(`subject = $${paramIndex++}`);
      values.push(data.subject);
    }
    if (data.html_content !== undefined) {
      updates.push(`html_content = $${paramIndex++}`);
      values.push(data.html_content);
    }
    if (data.text_content !== undefined) {
      updates.push(`text_content = $${paramIndex++}`);
      values.push(data.text_content);
    }
    if (data.variables !== undefined) {
      updates.push(`variables = $${paramIndex++}`);
      values.push(data.variables);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(data.is_active);
    }

    // Always update the updated_at timestamp
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      // Only updated_at, no actual changes
      return existing;
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE email_templates SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    const template = result.rows[0];

    // Clear old cache entry
    this.templateCache.delete(existing.name);

    // Recompile if active
    if (template.is_active) {
      this.compileAndCacheTemplate(template);
    }

    this.logger.log(`Email template updated: ${template.name}`, 'EmailTemplateService');
    return template;
  }

  /**
   * Delete a template (hard delete)
   */
  async delete(id: number): Promise<boolean> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    await pool.query('DELETE FROM email_templates WHERE id = $1', [id]);

    // Remove from cache
    this.templateCache.delete(existing.name);

    this.logger.log(`Email template deleted: ${existing.name}`, 'EmailTemplateService');
    return true;
  }

  /**
   * Clear template cache (useful for development)
   */
  clearTemplateCache(): void {
    this.templateCache.clear();
    this.logger.log('Template cache cleared', 'EmailTemplateService');
  }

  /**
   * Invalidate a specific template from cache
   */
  invalidateCache(templateName: string): void {
    this.templateCache.delete(templateName);
    this.logger.debug(`Template cache invalidated: ${templateName}`, 'EmailTemplateService');
  }

  /**
   * Get template cache statistics
   */
  getCacheStats(): { size: number; templates: string[] } {
    return {
      size: this.templateCache.size,
      templates: Array.from(this.templateCache.keys()),
    };
  }

  /**
   * Get list of available template variables for a template
   */
  async getTemplateVariables(templateName: string): Promise<string[]> {
    const template = await this.findByName(templateName);
    if (!template) {
      throw new NotFoundException(`Template '${templateName}' not found`);
    }
    return template.variables || [];
  }

  /**
   * Preview a template with sample data
   */
  async previewTemplate(
    templateName: string,
    sampleData?: Record<string, unknown>,
  ): Promise<RenderedTemplate> {
    const template = await this.findByName(templateName);
    if (!template) {
      throw new NotFoundException(`Template '${templateName}' not found`);
    }

    // Generate sample data based on variables
    const defaultSampleData: Record<string, unknown> = {
      name: 'John Doe',
      email: 'john@example.com',
      companyName: this.companyName,
      supportEmail: this.supportEmail,
      verificationLink: 'https://example.com/verify?token=sample-token',
      resetLink: 'https://example.com/reset?token=sample-token',
      expiresIn: '1 hour',
      feedbackSubject: 'Sample Feedback Subject',
      ticketNumber: 'TKT-12345',
      userName: 'John Doe',
      userEmail: 'john@example.com',
      userId: 123,
      subject: 'Sample Support Subject',
      message: 'This is a sample support message.',
      year: new Date().getFullYear(),
    };

    const mergedData = { ...defaultSampleData, ...sampleData };
    return this.renderTemplate(templateName, mergedData);
  }
}
