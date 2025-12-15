/**
 * Email Service
 * STORY-023A: E-Mail Service Setup (Resend.com)
 *
 * Provides email sending functionality using Resend.com API.
 * Features:
 * - Resend.com SDK integration
 * - Handlebars template rendering
 * - Email logging with Resend message IDs
 * - Retry mechanism for failed sends
 * - Configurable sender details via environment variables
 *
 * Environment Variables Required:
 * - RESEND_API_KEY: Resend API key (starts with 're_')
 * - EMAIL_FROM_NAME: Sender display name
 * - EMAIL_FROM_ADDRESS: Sender email address (must be verified in Resend)
 */

import { Injectable, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { Resend } from 'resend';
import * as Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
import { WinstonLoggerService } from '../common/services/logger.service';
import { DatabaseService } from '../database/database.service';
import {
  SendPasswordResetEmailDto,
  SendWelcomeEmailDto,
  SendVerificationEmailDto,
  SendFeedbackConfirmationEmailDto,
  SendSupportRequestEmailDto,
  EmailSendResponseDto,
  EmailLogEntry,
} from './dto';

/**
 * Email template data interface
 */
interface TemplateData {
  name?: string;
  companyName?: string;
  resetLink?: string;
  verificationLink?: string;
  expiresIn?: string;
  feedbackSubject?: string;
  subject?: string;
  message?: string;
  userEmail?: string;
  userName?: string;
  userId?: number;
  supportEmail?: string;
  year?: number;
  [key: string]: unknown;
}

/**
 * Compiled template cache entry
 */
interface CompiledTemplate {
  html: HandlebarsTemplateDelegate<TemplateData>;
  text?: HandlebarsTemplateDelegate<TemplateData>;
  compiledAt: Date;
}

/**
 * Email Service
 * Singleton service for sending emails via Resend.com
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private resend: Resend;
  private readonly fromAddress: string;
  private readonly fromName: string;
  private readonly templateDir: string;
  private readonly supportEmail: string;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private templateCache: Map<string, CompiledTemplate> = new Map();

  constructor(
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
  ) {
    // Initialize Resend client with API key from environment
    const apiKey = process.env.RESEND_API_KEY || '';
    this.resend = new Resend(apiKey);

    // Configure sender details from environment
    this.fromName = process.env.EMAIL_FROM_NAME || 'Core Application';
    this.fromAddress = process.env.EMAIL_FROM_ADDRESS || 'noreply@example.com';
    this.supportEmail = process.env.SUPPORT_EMAIL || this.fromAddress;

    // Template directory relative to the app root
    this.templateDir = path.join(process.cwd(), 'templates', 'emails');

    // Retry configuration
    this.maxRetries = parseInt(process.env.EMAIL_MAX_RETRIES || '3', 10);
    this.retryDelayMs = parseInt(process.env.EMAIL_RETRY_DELAY_MS || '1000', 10);

    this.logger.log('EmailService initialized', 'EmailService');
  }

  /**
   * Module initialization - verify configuration
   */
  async onModuleInit(): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY || '';

    // Warn if API key is not properly configured
    if (!apiKey || !apiKey.startsWith('re_')) {
      this.logger.warn(
        'RESEND_API_KEY not configured or invalid. Email sending will fail.',
        'EmailService',
      );
    } else {
      this.logger.log('Resend API key configured successfully', 'EmailService');
    }

    // Register Handlebars helpers
    this.registerHandlebarsHelpers();

    // Pre-compile templates on startup (optional, for performance)
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
  }

  /**
   * Pre-compile all templates on startup
   * STORY-009: Added German password reset template
   * STORY-023: Added German verification template
   */
  private async precompileTemplates(): Promise<void> {
    const templates = [
      'welcome',
      'password-reset',
      'password-reset-de', // STORY-009: German password reset template
      'verification',
      'verification-de', // STORY-023: German verification template
      'feedback-confirmation',
      'support-request',
    ];

    for (const template of templates) {
      try {
        await this.loadAndCompileTemplate(template);
        this.logger.debug(`Template pre-compiled: ${template}`, 'EmailService');
      } catch (error) {
        // Don't fail startup if templates don't exist yet
        this.logger.debug(
          `Template not found (will be created): ${template}`,
          'EmailService',
        );
      }
    }
  }

  /**
   * Load and compile a Handlebars template
   */
  private async loadAndCompileTemplate(
    templateName: string,
  ): Promise<CompiledTemplate> {
    // Check cache first
    const cached = this.templateCache.get(templateName);
    if (cached) {
      return cached;
    }

    // Load HTML template
    const htmlPath = path.join(this.templateDir, `${templateName}.hbs`);
    const htmlSource = await fs.readFile(htmlPath, 'utf-8');
    const htmlTemplate = Handlebars.compile<TemplateData>(htmlSource);

    // Try to load text template (optional)
    let textTemplate: HandlebarsTemplateDelegate<TemplateData> | undefined;
    try {
      const textPath = path.join(this.templateDir, `${templateName}.txt.hbs`);
      const textSource = await fs.readFile(textPath, 'utf-8');
      textTemplate = Handlebars.compile<TemplateData>(textSource);
    } catch {
      // Text template is optional
    }

    const compiled: CompiledTemplate = {
      html: htmlTemplate,
      text: textTemplate,
      compiledAt: new Date(),
    };

    // Cache the compiled template
    this.templateCache.set(templateName, compiled);

    return compiled;
  }

  /**
   * Render a template with data
   */
  private async renderTemplate(
    templateName: string,
    data: TemplateData,
  ): Promise<{ html: string; text?: string }> {
    const compiled = await this.loadAndCompileTemplate(templateName);

    // Add default data
    const templateData: TemplateData = {
      ...data,
      companyName: data.companyName || this.fromName,
      supportEmail: data.supportEmail || this.supportEmail,
      year: new Date().getFullYear(),
    };

    const html = compiled.html(templateData);
    const text = compiled.text ? compiled.text(templateData) : undefined;

    return { html, text };
  }

  /**
   * Send an email using Resend
   * Includes retry mechanism for transient failures
   */
  async sendEmail(
    to: string,
    subject: string,
    templateName: string,
    data: TemplateData,
    retryCount = 0,
  ): Promise<EmailSendResponseDto> {
    try {
      // Render template
      const { html, text } = await this.renderTemplate(templateName, data);

      // Prepare email payload
      const emailPayload = {
        from: `${this.fromName} <${this.fromAddress}>`,
        to: [to],
        subject,
        html,
        text,
      };

      // Send via Resend
      const { data: result, error } = await this.resend.emails.send(emailPayload);

      if (error) {
        throw new Error(error.message);
      }

      // Log successful send
      await this.logEmail({
        to,
        subject,
        template: templateName,
        messageId: result?.id,
        status: 'sent',
        retryCount,
        sentAt: new Date(),
        createdAt: new Date(),
      });

      this.logger.log(
        `Email sent: ${subject} to ${to} (Resend ID: ${result?.id})`,
        'EmailService',
      );

      return {
        success: true,
        messageId: result?.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log the failure
      this.logger.error(
        `Failed to send email: ${subject} to ${to} - ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        'EmailService',
      );

      // Retry mechanism for transient failures
      if (retryCount < this.maxRetries) {
        this.logger.warn(
          `Retrying email send (${retryCount + 1}/${this.maxRetries}): ${subject} to ${to}`,
          'EmailService',
        );

        // Wait before retry
        await this.delay(this.retryDelayMs * (retryCount + 1));

        // Recursive retry
        return this.sendEmail(to, subject, templateName, data, retryCount + 1);
      }

      // Log final failure
      await this.logEmail({
        to,
        subject,
        template: templateName,
        status: 'failed',
        error: errorMessage,
        retryCount,
        createdAt: new Date(),
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(dto: SendWelcomeEmailDto): Promise<EmailSendResponseDto> {
    return this.sendEmail(dto.email, 'Welcome to Core App!', 'welcome', {
      name: dto.name,
      verificationLink: dto.verificationLink,
      companyName: this.fromName,
    });
  }

  /**
   * Send password reset email
   * STORY-009: Uses German language template
   */
  async sendPasswordResetEmail(dto: SendPasswordResetEmailDto): Promise<EmailSendResponseDto> {
    // Use German template (password-reset-de) by default
    // Falls back to English template (password-reset) if German not available
    const templateName = 'password-reset-de';

    return this.sendEmail(
      dto.email,
      `Passwort zurücksetzen - ${this.fromName}`,
      templateName,
      {
        name: dto.name,
        resetLink: dto.resetLink,
        expiresIn: '1 Stunde',
        companyName: this.fromName,
      },
    );
  }

  /**
   * Send email verification email
   * STORY-023: Uses German template by default (matching app locale)
   */
  async sendVerificationEmail(dto: SendVerificationEmailDto): Promise<EmailSendResponseDto> {
    // STORY-023: Use German template by default (similar to password reset)
    const template = 'verification-de';
    const subject = 'Bitte bestätigen Sie Ihre E-Mail-Adresse';

    return this.sendEmail(dto.email, subject, template, {
      name: dto.name,
      verificationLink: dto.verificationLink,
      companyName: this.fromName,
      year: new Date().getFullYear(),
    });
  }

  /**
   * Send feedback confirmation email
   */
  async sendFeedbackConfirmationEmail(
    dto: SendFeedbackConfirmationEmailDto,
  ): Promise<EmailSendResponseDto> {
    return this.sendEmail(
      dto.email,
      'We Received Your Feedback',
      'feedback-confirmation',
      {
        name: dto.name,
        feedbackSubject: dto.feedbackSubject,
        companyName: this.fromName,
      },
    );
  }

  /**
   * Send internal support request notification
   */
  async sendSupportRequestEmail(dto: SendSupportRequestEmailDto): Promise<EmailSendResponseDto> {
    // Send to support team (configured support email)
    return this.sendEmail(
      this.supportEmail,
      `Support Request: ${dto.subject}`,
      'support-request',
      {
        userName: dto.userName,
        userEmail: dto.userEmail,
        userId: dto.userId,
        subject: dto.subject,
        message: dto.message,
        companyName: this.fromName,
      },
    );
  }

  /**
   * Log email to database
   */
  private async logEmail(entry: EmailLogEntry): Promise<void> {
    try {
      const pool = this.databaseService.getPool();
      if (!pool) {
        // Fallback to console logging if database not available
        this.logger.warn(
          `Email log (DB unavailable): ${entry.status} - ${entry.subject} to ${entry.to}`,
          'EmailService',
        );
        return;
      }

      await pool.query(
        `INSERT INTO email_logs (recipient, subject, template, message_id, status, error, retry_count, sent_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          entry.to,
          entry.subject,
          entry.template,
          entry.messageId || null,
          entry.status,
          entry.error || null,
          entry.retryCount,
          entry.sentAt || null,
        ],
      );
    } catch (error) {
      // Don't fail email send if logging fails
      this.logger.error(
        `Failed to log email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'EmailService',
      );
    }
  }

  /**
   * Clear template cache (useful for development)
   */
  clearTemplateCache(): void {
    this.templateCache.clear();
    this.logger.log('Template cache cleared', 'EmailService');
  }

  /**
   * Utility: Delay function for retry mechanism
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if email service is properly configured
   */
  isConfigured(): boolean {
    const apiKey = process.env.RESEND_API_KEY || '';
    return apiKey.startsWith('re_') && this.fromAddress !== 'noreply@example.com';
  }
}
