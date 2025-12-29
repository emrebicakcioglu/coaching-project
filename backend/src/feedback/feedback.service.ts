/**
 * Feedback Service
 * STORY-038A: Feedback-Backend API
 * STORY-038B: Feedback Rate Limiting & Email Queue
 * STORY-041B: Feedback Screenshot Storage in MinIO
 * STORY-002-REWORK-003: Fixed HTTP 500 error - improved error handling
 *
 * Handles feedback submission with screenshot processing and email sending.
 * Features:
 * - Base64 to Buffer conversion for screenshots (optional)
 * - Screenshot storage in MinIO (STORY-041B)
 * - Email notification without attachment (STORY-041B)
 * - Async email queue processing (STORY-038B)
 * - Enhanced browser info and route capture (STORY-038B)
 * - User context from JWT authentication
 * - Graceful handling of email failures (STORY-002-REWORK-003)
 *
 * Environment Variables Required:
 * - SUPPORT_EMAIL: Email address to receive feedback
 * - FEEDBACK_USE_QUEUE: Enable async email queue (default: true)
 * - FEEDBACK_QUEUE_PRIORITY: Priority for feedback emails in queue (default: 5)
 * - ADMIN_URL: Base URL for admin panel (for email links)
 */

import { Injectable, Inject, forwardRef, BadRequestException, Optional } from '@nestjs/common';
import { Resend } from 'resend';
import * as Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Request } from 'express';
import { WinstonLoggerService } from '../common/services/logger.service';
import { DatabaseService } from '../database/database.service';
import { EmailQueueService } from '../email/email-queue.service';
import { StorageService } from '../storage/storage.service';
import { BucketName } from '../storage/dto';
import { SubmitFeedbackDto, FeedbackResponseDto, FeedbackMetadata } from './dto/feedback.dto';

/**
 * User context from JWT authentication
 */
interface UserContext {
  id: number;
  email: string;
  name?: string;
}

/**
 * Template data for feedback email
 * STORY-041B: Added feedbackId and adminUrl for linking to admin page
 */
interface FeedbackTemplateData {
  userName: string;
  userEmail: string;
  userId: number;
  comment: string;
  url?: string;
  browserInfo?: string;
  companyName: string;
  year: number;
  // STORY-041B: New fields for notification-only emails
  feedbackId?: number;
  adminUrl?: string;
  hasScreenshot?: boolean;
  route?: string;
}

/**
 * Parsed browser information from User-Agent
 */
interface ParsedBrowserInfo {
  browserName?: string;
  browserVersion?: string;
  osName?: string;
  osVersion?: string;
  deviceType?: string;
}

/**
 * Feedback Service
 * Singleton service for processing feedback submissions
 */
@Injectable()
export class FeedbackService {
  private resend: Resend;
  private readonly supportEmail: string;
  private readonly fromAddress: string;
  private readonly fromName: string;
  private readonly templateDir: string;
  private readonly useQueue: boolean;
  private readonly adminUrl: string;
  private templateCache: Map<string, HandlebarsTemplateDelegate<FeedbackTemplateData>> = new Map();

  constructor(
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
    @Optional()
    @Inject(forwardRef(() => EmailQueueService))
    private readonly emailQueueService: EmailQueueService,
    @Optional()
    @Inject(forwardRef(() => StorageService))
    private readonly storageService: StorageService,
  ) {
    // Initialize Resend client with API key from environment
    const apiKey = process.env.RESEND_API_KEY || '';
    this.resend = new Resend(apiKey);

    // Configure email settings from environment
    this.supportEmail = process.env.SUPPORT_EMAIL || 'support@example.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'Core Application';
    this.fromAddress = process.env.EMAIL_FROM_ADDRESS || 'noreply@example.com';

    // STORY-041B: Admin URL for email links
    this.adminUrl = process.env.ADMIN_URL || 'http://localhost:3000';

    // STORY-038B: Queue configuration
    // STORY-041B: Now emails are sent without attachments (screenshots in MinIO)
    this.useQueue = process.env.FEEDBACK_USE_QUEUE !== 'false';

    // Template directory relative to the app root
    this.templateDir = path.join(process.cwd(), 'templates', 'emails');

    this.logger.log(
      `FeedbackService initialized (queue: ${this.useQueue ? 'enabled' : 'disabled'}, storage: ${this.storageService ? 'available' : 'unavailable'})`,
      'FeedbackService',
    );
  }

  /**
   * Submit feedback with optional screenshot
   * STORY-041B: Store screenshot in MinIO, send notification email without attachment
   * STORY-002-REWORK-003: Made screenshot optional, improved error handling
   *
   * @param feedbackDto - Feedback submission data
   * @param user - Authenticated user context from JWT
   * @param req - Optional Express request for metadata extraction
   * @returns Response with feedback ID and storage confirmation
   */
  async submitFeedback(
    feedbackDto: SubmitFeedbackDto,
    user: UserContext,
    req?: Request,
  ): Promise<FeedbackResponseDto> {
    // Extract fields from DTO (browserInfo is accessed via feedbackDto in extractFeedbackMetadata)
    const { screenshot, comment, url } = feedbackDto;

    this.logger.log(
      `Processing feedback submission from user ${user.email} (ID: ${user.id})`,
      'FeedbackService',
    );

    try {
      // STORY-002-REWORK-003: Screenshot is now optional
      let imageBuffer: Buffer | null = null;
      if (screenshot) {
        try {
          imageBuffer = this.convertBase64ToBuffer(screenshot);
        } catch (screenshotError) {
          // Log error but continue - feedback can be submitted without screenshot
          this.logger.warn(
            `Failed to process screenshot: ${screenshotError instanceof Error ? screenshotError.message : 'Unknown error'}`,
            'FeedbackService',
          );
        }
      }

      // Get user name from database if not provided
      const userName = user.name || await this.getUserName(user.id) || user.email;

      // STORY-038B: Extract metadata from request
      const metadata = this.extractFeedbackMetadata(feedbackDto, req);

      // STORY-041B: Upload screenshot to MinIO (only if we have a valid image buffer)
      let screenshotPath: string | null = null;
      let screenshotStored = false;

      if (imageBuffer && this.storageService && this.storageService.isConfigured()) {
        try {
          // Generate filename: feedback-{timestamp}.png
          const filename = `feedback-${Date.now()}.png`;

          const uploadResult = await this.storageService.uploadBuffer(
            imageBuffer,
            filename,
            'image/png',
            BucketName.FEEDBACK,
          );

          screenshotPath = uploadResult.fileName;
          screenshotStored = true;

          this.logger.log(
            `Screenshot uploaded to MinIO: ${screenshotPath}`,
            'FeedbackService',
          );
        } catch (storageError) {
          // Log error but continue - feedback should still be submitted
          this.logger.error(
            `Failed to upload screenshot to MinIO: ${storageError instanceof Error ? storageError.message : 'Unknown error'}`,
            storageError instanceof Error ? storageError.stack : undefined,
            'FeedbackService',
          );
        }
      } else if (screenshot && !imageBuffer) {
        this.logger.warn(
          'Screenshot provided but could not be processed',
          'FeedbackService',
        );
      } else if (!screenshot) {
        this.logger.debug(
          'Feedback submitted without screenshot',
          'FeedbackService',
        );
      } else if (!this.storageService || !this.storageService.isConfigured()) {
        this.logger.warn(
          'StorageService not available - screenshot will not be stored in MinIO',
          'FeedbackService',
        );
      }

      // STORY-041B: Store feedback record with screenshot_path
      const feedbackId = await this.storeFeedbackRecordWithScreenshot(
        user,
        feedbackDto,
        metadata,
        screenshotPath,
      );

      // STORY-041B: Send notification email WITHOUT attachment
      if (this.useQueue && this.emailQueueService) {
        await this.sendFeedbackNotification(
          {
            userName,
            userEmail: user.email,
            userId: user.id,
            comment,
            url,
            route: metadata.route,
            metadata,
            feedbackId,
            hasScreenshot: screenshotStored,
          },
        );

        this.logger.log(
          `Feedback ${feedbackId} submitted and notification sent from user ${user.email}`,
          'FeedbackService',
        );

        return {
          message: 'Feedback submitted successfully. Our team will review it shortly.',
          id: feedbackId,
          queued: true,
          screenshotStored,
        };
      } else {
        // Synchronous notification email
        await this.sendFeedbackNotification(
          {
            userName,
            userEmail: user.email,
            userId: user.id,
            comment,
            url,
            route: metadata.route,
            metadata,
            feedbackId,
            hasScreenshot: screenshotStored,
          },
        );

        this.logger.log(
          `Feedback ${feedbackId} submitted successfully from user ${user.email}`,
          'FeedbackService',
        );

        return {
          message: 'Feedback submitted successfully',
          id: feedbackId,
          screenshotStored,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to submit feedback: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        'FeedbackService',
      );
      throw error;
    }
  }

  /**
   * Extract feedback metadata from request and DTO
   * STORY-038B: Enhanced browser info and route capture
   *
   * @param feedbackDto - Feedback submission data
   * @param req - Express request object
   * @returns Extracted metadata
   */
  private extractFeedbackMetadata(feedbackDto: SubmitFeedbackDto, req?: Request): FeedbackMetadata {
    const userAgent = req?.headers['user-agent'] || feedbackDto.browserInfo || '';
    const parsedBrowser = this.parseUserAgent(userAgent);

    // Extract route from referer or URL
    let route = '';
    if (feedbackDto.url) {
      try {
        const urlObj = new URL(feedbackDto.url);
        route = urlObj.pathname;
      } catch {
        route = feedbackDto.url;
      }
    } else if (req?.headers.referer) {
      try {
        const refererUrl = new URL(req.headers.referer as string);
        route = refererUrl.pathname;
      } catch {
        // Ignore parsing errors
      }
    }

    return {
      browserInfo: feedbackDto.browserInfo || userAgent,
      userAgent,
      route,
      url: feedbackDto.url || req?.headers.referer as string || '',
      timestamp: new Date(),
      // Parsed browser details
      browserName: parsedBrowser.browserName,
      browserVersion: parsedBrowser.browserVersion,
      osName: parsedBrowser.osName,
      osVersion: parsedBrowser.osVersion,
      deviceType: parsedBrowser.deviceType,
      // Additional metadata from DTO
      screenResolution: feedbackDto.screenResolution,
      language: feedbackDto.language || req?.headers['accept-language']?.split(',')[0],
      timezone: feedbackDto.timezone,
    };
  }

  /**
   * Parse User-Agent string to extract browser and OS information
   *
   * @param userAgent - User-Agent header string
   * @returns Parsed browser information
   */
  private parseUserAgent(userAgent: string): ParsedBrowserInfo {
    const result: ParsedBrowserInfo = {};

    if (!userAgent) {
      return result;
    }

    // Detect browser
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      result.browserName = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+)/);
      if (match) result.browserVersion = match[1];
    } else if (userAgent.includes('Firefox')) {
      result.browserName = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+)/);
      if (match) result.browserVersion = match[1];
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      result.browserName = 'Safari';
      const match = userAgent.match(/Version\/(\d+)/);
      if (match) result.browserVersion = match[1];
    } else if (userAgent.includes('Edg')) {
      result.browserName = 'Edge';
      const match = userAgent.match(/Edg\/(\d+)/);
      if (match) result.browserVersion = match[1];
    } else if (userAgent.includes('MSIE') || userAgent.includes('Trident')) {
      result.browserName = 'Internet Explorer';
    }

    // Detect OS
    if (userAgent.includes('Windows NT 10')) {
      result.osName = 'Windows';
      result.osVersion = '10/11';
    } else if (userAgent.includes('Windows NT 6.3')) {
      result.osName = 'Windows';
      result.osVersion = '8.1';
    } else if (userAgent.includes('Windows NT 6.1')) {
      result.osName = 'Windows';
      result.osVersion = '7';
    } else if (userAgent.includes('Mac OS X')) {
      result.osName = 'macOS';
      const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
      if (match) result.osVersion = match[1].replace('_', '.');
    } else if (userAgent.includes('Linux')) {
      result.osName = 'Linux';
    } else if (userAgent.includes('Android')) {
      result.osName = 'Android';
      const match = userAgent.match(/Android (\d+)/);
      if (match) result.osVersion = match[1];
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      result.osName = 'iOS';
      const match = userAgent.match(/OS (\d+)/);
      if (match) result.osVersion = match[1];
    }

    // Detect device type
    if (userAgent.includes('Mobile') || userAgent.includes('iPhone') || userAgent.includes('Android')) {
      result.deviceType = 'Mobile';
    } else if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
      result.deviceType = 'Tablet';
    } else {
      result.deviceType = 'Desktop';
    }

    return result;
  }

  /**
   * Store feedback record with screenshot path
   * STORY-041B: Enhanced feedback persistence with MinIO screenshot path
   *
   * @param user - User context
   * @param feedbackDto - Feedback data
   * @param metadata - Extracted metadata
   * @param screenshotPath - Path to screenshot in MinIO (null if not stored)
   * @returns Feedback ID from database
   */
  private async storeFeedbackRecordWithScreenshot(
    user: UserContext,
    feedbackDto: SubmitFeedbackDto,
    metadata: FeedbackMetadata,
    screenshotPath: string | null,
  ): Promise<number> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      this.logger.warn('Database not available for feedback storage', 'FeedbackService');
      throw new Error('Database not available');
    }

    try {
      // Check if feedback_submissions table exists
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'feedback_submissions'
        )
      `);

      if (!tableExists.rows[0].exists) {
        throw new Error('feedback_submissions table not yet created');
      }

      // Check if screenshot_path column exists
      const columnExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'feedback_submissions'
          AND column_name = 'screenshot_path'
        )
      `);

      let result;
      if (columnExists.rows[0].exists) {
        // STORY-041B: Insert with screenshot_path
        result = await pool.query<{ id: number }>(
          `INSERT INTO feedback_submissions
           (user_id, user_email, comment, url, route, browser_info, user_agent,
            browser_name, browser_version, os_name, os_version, device_type,
            screen_resolution, language, timezone, has_screenshot, screenshot_path, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
           RETURNING id`,
          [
            user.id,
            user.email,
            feedbackDto.comment,
            metadata.url,
            metadata.route,
            metadata.browserInfo,
            metadata.userAgent,
            metadata.browserName,
            metadata.browserVersion,
            metadata.osName,
            metadata.osVersion,
            metadata.deviceType,
            metadata.screenResolution,
            metadata.language,
            metadata.timezone,
            !!feedbackDto.screenshot,
            screenshotPath,
          ],
        );
      } else {
        // Fallback: Insert without screenshot_path (migration not yet applied)
        this.logger.warn('screenshot_path column not found, storing without path', 'FeedbackService');
        result = await pool.query<{ id: number }>(
          `INSERT INTO feedback_submissions
           (user_id, user_email, comment, url, route, browser_info, user_agent,
            browser_name, browser_version, os_name, os_version, device_type,
            screen_resolution, language, timezone, has_screenshot, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
           RETURNING id`,
          [
            user.id,
            user.email,
            feedbackDto.comment,
            metadata.url,
            metadata.route,
            metadata.browserInfo,
            metadata.userAgent,
            metadata.browserName,
            metadata.browserVersion,
            metadata.osName,
            metadata.osVersion,
            metadata.deviceType,
            metadata.screenResolution,
            metadata.language,
            metadata.timezone,
            !!feedbackDto.screenshot,
          ],
        );
      }

      const feedbackId = result.rows[0].id;
      this.logger.debug(`Feedback record ${feedbackId} stored in database`, 'FeedbackService');
      return feedbackId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to store feedback record: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        'FeedbackService',
      );
      throw error;
    }
  }

  /**
   * Send feedback notification email WITHOUT attachment
   * STORY-041B: Email notification only - screenshots are stored in MinIO
   *
   * @param data - Feedback data for notification
   */
  private async sendFeedbackNotification(
    data: {
      userName: string;
      userEmail: string;
      userId: number;
      comment: string;
      url?: string;
      route?: string;
      metadata: FeedbackMetadata;
      feedbackId: number;
      hasScreenshot: boolean;
    },
  ): Promise<void> {
    try {
      // Render notification template
      const html = await this.renderFeedbackNotificationTemplate({
        userName: data.userName,
        userEmail: data.userEmail,
        userId: data.userId,
        comment: data.comment,
        url: data.url,
        browserInfo: data.metadata.browserInfo,
        companyName: this.fromName,
        year: new Date().getFullYear(),
        // STORY-041B: New fields for notification
        feedbackId: data.feedbackId,
        adminUrl: this.adminUrl,
        hasScreenshot: data.hasScreenshot,
        route: data.route,
      });

      // STORY-041B: New subject format
      const emailPayload = {
        from: `${this.fromName} <${this.fromAddress}>`,
        to: [this.supportEmail],
        subject: `Neues Feedback von ${data.userName}`,
        html,
        // No attachments - screenshots are in MinIO
      };

      const { data: result, error } = await this.resend.emails.send(emailPayload);

      if (error) {
        throw new Error(`Resend API error: ${error.message}`);
      }

      // Log to email_logs table
      await this.logFeedbackEmail(
        {
          userName: data.userName,
          userEmail: data.userEmail,
          userId: data.userId,
          comment: data.comment,
        },
        result?.id || null,
        'sent',
      );

      // Update feedback record with email status
      await this.updateFeedbackEmailStatus(data.feedbackId, 'sent');

      this.logger.log(
        `Feedback notification email sent (Resend ID: ${result?.id})`,
        'FeedbackService',
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log failed send
      await this.logFeedbackEmail(
        {
          userName: data.userName,
          userEmail: data.userEmail,
          userId: data.userId,
          comment: data.comment,
        },
        null,
        'failed',
        errorMessage,
      );

      // Update feedback record with failed email status
      await this.updateFeedbackEmailStatus(data.feedbackId, 'failed');

      this.logger.error(
        `Failed to send feedback notification: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        'FeedbackService',
      );

      // Don't throw - feedback was stored, email failure is logged
      this.logger.warn(
        `Feedback ${data.feedbackId} stored but notification email failed`,
        'FeedbackService',
      );
    }
  }

  /**
   * Update feedback record email status
   * STORY-041B: Track email notification status
   *
   * @param feedbackId - Feedback record ID
   * @param status - Email status ('sent' or 'failed')
   */
  private async updateFeedbackEmailStatus(
    feedbackId: number,
    status: 'sent' | 'failed',
  ): Promise<void> {
    try {
      const pool = this.databaseService.getPool();
      if (!pool) {
        return;
      }

      await pool.query(
        `UPDATE feedback_submissions
         SET email_status = $1, email_sent_at = CASE WHEN $1 = 'sent' THEN NOW() ELSE email_sent_at END
         WHERE id = $2`,
        [status, feedbackId],
      );
    } catch (error) {
      this.logger.warn(
        `Failed to update feedback email status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FeedbackService',
      );
    }
  }

  /**
   * Render the feedback notification template
   * STORY-041B: Notification-only template without attachment notice
   *
   * @param data - Template data
   * @returns Rendered HTML string
   */
  private async renderFeedbackNotificationTemplate(data: FeedbackTemplateData): Promise<string> {
    const templateName = 'feedback-notification';

    // Check cache first
    let template = this.templateCache.get(templateName);

    if (!template) {
      try {
        const templatePath = path.join(this.templateDir, `${templateName}.hbs`);
        const templateSource = await fs.readFile(templatePath, 'utf-8');
        template = Handlebars.compile<FeedbackTemplateData>(templateSource);
        this.templateCache.set(templateName, template);
      } catch (error) {
        // Fallback to inline template if file not found
        this.logger.warn(
          'Feedback notification template not found, using inline template',
          'FeedbackService',
        );
        template = this.getInlineFeedbackNotificationTemplate();
        this.templateCache.set(templateName, template);
      }
    }

    return template(data);
  }

  /**
   * Get inline feedback notification template as fallback
   * STORY-041B: Notification template with admin link
   */
  private getInlineFeedbackNotificationTemplate(): HandlebarsTemplateDelegate<FeedbackTemplateData> {
    const templateSource = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Neues Feedback - {{companyName}}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
    .container { background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
    .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
    .badge { display: inline-block; background-color: #dbeafe; color: #1d4ed8; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 10px; }
    h1 { color: #1f2937; font-size: 22px; margin-bottom: 20px; }
    p { margin-bottom: 16px; color: #4b5563; }
    .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .info-table th { text-align: left; padding: 10px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-weight: 500; width: 30%; }
    .info-table td { padding: 10px; border-bottom: 1px solid #e5e7eb; color: #1f2937; }
    .message-box { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0; }
    .message-box h3 { color: #374151; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px; }
    .message-content { white-space: pre-wrap; color: #1f2937; font-size: 14px; line-height: 1.6; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 20px; }
    .btn:hover { background-color: #1d4ed8; }
    .screenshot-notice { background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px 16px; margin: 20px 0; color: #166534; font-size: 14px; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">{{companyName}}</div>
      <div class="badge">NEUES FEEDBACK</div>
    </div>
    <h1>Neues Feedback eingegangen</h1>
    <p>Ein Benutzer hat Feedback mit einem Screenshot eingereicht.</p>
    <table class="info-table">
      <tr><th>Von</th><td>{{userName}} (<a href="mailto:{{userEmail}}">{{userEmail}}</a>)</td></tr>
      <tr><th>Benutzer-ID</th><td>{{userId}}</td></tr>
      <tr><th>Feedback-ID</th><td>{{feedbackId}}</td></tr>
      {{#if route}}<tr><th>Route</th><td>{{route}}</td></tr>{{/if}}
      {{#if url}}<tr><th>Seiten-URL</th><td><a href="{{url}}">{{url}}</a></td></tr>{{/if}}
      {{#if browserInfo}}<tr><th>Browser</th><td>{{browserInfo}}</td></tr>{{/if}}
    </table>
    <div class="message-box">
      <h3>Kommentar</h3>
      <div class="message-content">{{comment}}</div>
    </div>
    {{#if hasScreenshot}}
    <div class="screenshot-notice">
      <strong>Screenshot vorhanden</strong> - Der Screenshot wurde gespeichert und kann im Admin-Bereich eingesehen werden.
    </div>
    {{/if}}
    <p style="text-align: center;">
      <a href="{{adminUrl}}/admin/feedback/{{feedbackId}}" class="btn">Feedback im Admin-Bereich ansehen</a>
    </p>
    <div class="footer">
      <p>&copy; {{year}} {{companyName}} - Internes Feedback-System</p>
      <p>Dies ist eine automatische Benachrichtigung aus dem Feedback-System.</p>
    </div>
  </div>
</body>
</html>`;

    return Handlebars.compile<FeedbackTemplateData>(templateSource);
  }

  /**
   * Convert Base64 encoded image to Buffer
   *
   * Handles both data URL format (data:image/png;base64,...) and raw Base64.
   *
   * @param base64String - Base64 encoded image string
   * @returns Image Buffer
   * @throws BadRequestException if Base64 is invalid
   */
  convertBase64ToBuffer(base64String: string): Buffer {
    if (!base64String || typeof base64String !== 'string') {
      throw new BadRequestException('Invalid screenshot: Base64 string is required');
    }

    try {
      // Handle data URL format (e.g., 'data:image/png;base64,iVBORw...')
      let base64Data = base64String;
      if (base64String.includes(',')) {
        const parts = base64String.split(',');
        if (parts.length !== 2) {
          throw new BadRequestException('Invalid screenshot: Malformed data URL');
        }
        base64Data = parts[1];
      }

      // Validate Base64 format
      if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
        throw new BadRequestException('Invalid screenshot: Contains invalid Base64 characters');
      }

      // Convert to Buffer
      const buffer = Buffer.from(base64Data, 'base64');

      // Verify buffer is not empty
      if (buffer.length === 0) {
        throw new BadRequestException('Invalid screenshot: Empty image data');
      }

      // Optional: Verify PNG magic bytes (89 50 4E 47)
      if (buffer.length >= 4) {
        const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
        const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;

        if (!isPng && !isJpeg) {
          this.logger.warn(
            'Screenshot may not be a valid PNG or JPEG image',
            'FeedbackService',
          );
        }
      }

      return buffer;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid screenshot: Failed to decode Base64 data');
    }
  }

  /**
   * Get user name from database
   *
   * @param userId - User ID
   * @returns User name or null if not found
   */
  private async getUserName(userId: number): Promise<string | null> {
    try {
      const pool = this.databaseService.getPool();
      if (!pool) {
        return null;
      }

      const result = await pool.query<{ name: string }>(
        'SELECT name FROM users WHERE id = $1',
        [userId],
      );

      return result.rows[0]?.name || null;
    } catch (error) {
      this.logger.warn(
        `Could not fetch user name for ID ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FeedbackService',
      );
      return null;
    }
  }

  /**
   * Log feedback email to database
   */
  private async logFeedbackEmail(
    data: {
      userName: string;
      userEmail: string;
      userId: number;
      comment: string;
    },
    messageId: string | null,
    status: 'sent' | 'failed',
    error?: string,
  ): Promise<void> {
    try {
      const pool = this.databaseService.getPool();
      if (!pool) {
        return;
      }

      await pool.query(
        `INSERT INTO email_logs (recipient, subject, template, message_id, status, error, retry_count, sent_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          this.supportEmail,
          `Feedback from ${data.userName}`,
          'feedback',
          messageId,
          status,
          error || null,
          0,
          status === 'sent' ? new Date() : null,
        ],
      );
    } catch (err) {
      // Don't fail feedback submission if logging fails
      this.logger.error(
        `Failed to log feedback email: ${err instanceof Error ? err.message : 'Unknown error'}`,
        err instanceof Error ? err.stack : undefined,
        'FeedbackService',
      );
    }
  }

  /**
   * Clear template cache (useful for development/testing)
   */
  clearTemplateCache(): void {
    this.templateCache.clear();
    this.logger.log('Feedback template cache cleared', 'FeedbackService');
  }
}
