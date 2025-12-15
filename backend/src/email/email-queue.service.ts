/**
 * Email Queue Service
 * STORY-023B: E-Mail Templates & Queue
 *
 * Manages email queue for async processing with Redis support.
 * Features:
 * - Queue-based email processing
 * - Priority queue support
 * - Exponential backoff retry mechanism
 * - Rate limiting protection
 * - Redis connection with graceful fallback
 * - Email logging for audit trail
 *
 * Environment Variables Required:
 * - REDIS_URL: Redis connection URL (optional, falls back to database queue)
 * - EMAIL_QUEUE_ENABLED: Enable/disable queue processing (default: true)
 * - EMAIL_QUEUE_PROCESS_INTERVAL: Queue processing interval in ms (default: 5000)
 * - EMAIL_RETRY_MAX: Maximum retry attempts (default: 3)
 * - EMAIL_RETRY_DELAY: Base retry delay in ms (default: 5000)
 * - EMAIL_RATE_LIMIT: Max emails per minute (default: 60)
 */

import { Injectable, Inject, forwardRef, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { WinstonLoggerService } from '../common/services/logger.service';
import { DatabaseService } from '../database/database.service';
import { EmailTemplateService, RenderedTemplate } from './email-template.service';
import {
  EmailQueueItem,
  EmailQueueItemInsert,
  EmailQueueStats,
  EmailQueueFilter,
} from '../database/types';
import { Resend } from 'resend';

/**
 * Email send result
 */
interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email Queue Service
 * Singleton service for managing email queue with Redis support
 */
@Injectable()
export class EmailQueueService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis | null = null;
  private resend: Resend;
  private readonly isQueueEnabled: boolean;
  private readonly processInterval: number;
  private readonly maxRetries: number;
  private readonly baseRetryDelay: number;
  private readonly rateLimit: number;
  private readonly fromAddress: string;
  private readonly fromName: string;
  private processingTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private emailsSentThisMinute = 0;
  private rateLimitResetTimer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => EmailTemplateService))
    private readonly templateService: EmailTemplateService,
  ) {
    // Configuration
    this.isQueueEnabled = process.env.EMAIL_QUEUE_ENABLED !== 'false';
    this.processInterval = parseInt(process.env.EMAIL_QUEUE_PROCESS_INTERVAL || '5000', 10);
    this.maxRetries = parseInt(process.env.EMAIL_RETRY_MAX || '3', 10);
    this.baseRetryDelay = parseInt(process.env.EMAIL_RETRY_DELAY || '5000', 10);
    this.rateLimit = parseInt(process.env.EMAIL_RATE_LIMIT || '60', 10);

    // Email configuration
    this.fromName = process.env.EMAIL_FROM_NAME || 'Core Application';
    this.fromAddress = process.env.EMAIL_FROM_ADDRESS || 'noreply@example.com';

    // Initialize Resend client
    const apiKey = process.env.RESEND_API_KEY || '';
    this.resend = new Resend(apiKey);

    this.logger.log('EmailQueueService initialized', 'EmailQueueService');
  }

  /**
   * Module initialization - connect to Redis and start queue processing
   */
  async onModuleInit(): Promise<void> {
    await this.initializeRedis();

    if (this.isQueueEnabled) {
      this.startProcessing();
      this.startRateLimitReset();
    }
  }

  /**
   * Module destruction - cleanup resources
   */
  async onModuleDestroy(): Promise<void> {
    this.stopProcessing();
    this.stopRateLimitReset();

    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      this.logger.warn(
        'REDIS_URL not configured. Email queue will use database-only mode.',
        'EmailQueueService',
      );
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.error('Redis connection failed after 3 attempts', undefined, 'EmailQueueService');
            return null;
          }
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      });

      await this.redis.connect();

      this.redis.on('error', (err) => {
        this.logger.error(`Redis error: ${err.message}`, err.stack, 'EmailQueueService');
      });

      this.redis.on('connect', () => {
        this.logger.log('Redis connected successfully', 'EmailQueueService');
      });

      this.redis.on('close', () => {
        this.logger.warn('Redis connection closed', 'EmailQueueService');
      });
    } catch (error) {
      this.logger.warn(
        `Failed to connect to Redis: ${error instanceof Error ? error.message : 'Unknown error'}. Using database-only mode.`,
        'EmailQueueService',
      );
      this.redis = null;
    }
  }

  /**
   * Start queue processing loop
   */
  private startProcessing(): void {
    if (this.processingTimer) {
      return;
    }

    this.logger.log(`Starting email queue processing (interval: ${this.processInterval}ms)`, 'EmailQueueService');

    this.processingTimer = setInterval(() => {
      this.processQueue().catch((err) => {
        this.logger.error(`Queue processing error: ${err.message}`, err.stack, 'EmailQueueService');
      });
    }, this.processInterval);
  }

  /**
   * Stop queue processing loop
   */
  private stopProcessing(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
      this.logger.log('Email queue processing stopped', 'EmailQueueService');
    }
  }

  /**
   * Start rate limit reset timer
   */
  private startRateLimitReset(): void {
    this.rateLimitResetTimer = setInterval(() => {
      this.emailsSentThisMinute = 0;
    }, 60000); // Reset every minute
  }

  /**
   * Stop rate limit reset timer
   */
  private stopRateLimitReset(): void {
    if (this.rateLimitResetTimer) {
      clearInterval(this.rateLimitResetTimer);
      this.rateLimitResetTimer = null;
    }
  }

  /**
   * Add email to queue
   */
  async enqueue(data: EmailQueueItemInsert): Promise<EmailQueueItem> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    // Render subject from template
    let subject: string;
    try {
      const rendered = await this.templateService.renderTemplate(data.template_name, data.variables || {});
      subject = rendered.subject;
    } catch (error) {
      // Use fallback subject if template rendering fails
      subject = data.subject || 'Email Notification';
    }

    const result = await pool.query(
      `INSERT INTO email_queue
       (template_name, recipient, subject, variables, priority, max_retries, scheduled_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [
        data.template_name,
        data.recipient,
        subject,
        JSON.stringify(data.variables || {}),
        data.priority ?? 0,
        data.max_retries ?? this.maxRetries,
        data.scheduled_at || new Date(),
      ],
    );

    const queueItem = result.rows[0];

    // Notify Redis if available (for faster processing)
    if (this.redis) {
      try {
        await this.redis.lpush('email:queue:notify', queueItem.id.toString());
      } catch (error) {
        // Non-fatal, will be picked up by database polling
        this.logger.debug('Failed to notify Redis of new queue item', 'EmailQueueService');
      }
    }

    this.logger.log(`Email queued: ${queueItem.id} to ${data.recipient}`, 'EmailQueueService');
    return queueItem;
  }

  /**
   * Process pending emails in the queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return; // Avoid concurrent processing
    }

    this.isProcessing = true;

    try {
      const pool = this.databaseService.getPool();
      if (!pool) {
        return;
      }

      // Get pending emails that are ready to process (scheduled time passed, not processing)
      const result = await pool.query(
        `SELECT * FROM email_queue
         WHERE status = 'pending'
           AND scheduled_at <= NOW()
           AND (next_retry_at IS NULL OR next_retry_at <= NOW())
         ORDER BY priority DESC, created_at ASC
         LIMIT 10
         FOR UPDATE SKIP LOCKED`,
      );

      const items: EmailQueueItem[] = result.rows;

      for (const item of items) {
        // Check rate limit
        if (this.emailsSentThisMinute >= this.rateLimit) {
          this.logger.warn('Rate limit reached, pausing queue processing', 'EmailQueueService');
          break;
        }

        await this.processQueueItem(item);
      }
    } catch (error) {
      this.logger.error(
        `Queue processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'EmailQueueService',
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single queue item
   */
  private async processQueueItem(item: EmailQueueItem): Promise<void> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      return;
    }

    // Mark as processing
    await pool.query(
      `UPDATE email_queue SET status = 'processing', processing_started_at = NOW() WHERE id = $1`,
      [item.id],
    );

    try {
      // Render template
      const rendered = await this.templateService.renderTemplate(
        item.template_name,
        item.variables,
      );

      // Send email
      const result = await this.sendEmail(item.recipient, rendered);

      if (result.success) {
        // Mark as sent
        await pool.query(
          `UPDATE email_queue
           SET status = 'sent', message_id = $1, completed_at = NOW()
           WHERE id = $2`,
          [result.messageId, item.id],
        );

        // Log success
        await this.logEmail(item, 'sent', result.messageId);

        this.emailsSentThisMinute++;
        this.logger.log(`Email sent: ${item.id} to ${item.recipient}`, 'EmailQueueService');
      } else {
        await this.handleFailure(item, result.error || 'Unknown error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.handleFailure(item, errorMessage);
    }
  }

  /**
   * Handle failed email send with exponential backoff
   */
  private async handleFailure(item: EmailQueueItem, errorMessage: string): Promise<void> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      return;
    }

    const newRetryCount = item.retry_count + 1;

    if (newRetryCount >= item.max_retries) {
      // Max retries reached, mark as failed
      await pool.query(
        `UPDATE email_queue
         SET status = 'failed', error = $1, retry_count = $2, completed_at = NOW()
         WHERE id = $3`,
        [errorMessage, newRetryCount, item.id],
      );

      // Log failure
      await this.logEmail(item, 'failed', undefined, errorMessage);

      this.logger.error(
        `Email failed permanently: ${item.id} to ${item.recipient} - ${errorMessage}`,
        undefined,
        'EmailQueueService',
      );
    } else {
      // Calculate next retry time with exponential backoff
      const nextRetryDelay = this.calculateExponentialBackoff(newRetryCount);
      const nextRetryAt = new Date(Date.now() + nextRetryDelay);

      await pool.query(
        `UPDATE email_queue
         SET status = 'pending', error = $1, retry_count = $2, next_retry_at = $3, processing_started_at = NULL
         WHERE id = $4`,
        [errorMessage, newRetryCount, nextRetryAt, item.id],
      );

      this.logger.warn(
        `Email retry scheduled: ${item.id} (attempt ${newRetryCount}/${item.max_retries}) at ${nextRetryAt.toISOString()}`,
        'EmailQueueService',
      );
    }
  }

  /**
   * Calculate exponential backoff delay
   * Formula: baseDelay * 2^(retryCount - 1) with jitter
   */
  private calculateExponentialBackoff(retryCount: number): number {
    const baseDelay = this.baseRetryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, retryCount - 1);
    // Add random jitter (0-25% of delay)
    const jitter = Math.random() * 0.25 * exponentialDelay;
    return Math.min(exponentialDelay + jitter, 3600000); // Cap at 1 hour
  }

  /**
   * Send email via Resend
   */
  private async sendEmail(recipient: string, rendered: RenderedTemplate): Promise<EmailSendResult> {
    try {
      const emailPayload = {
        from: `${this.fromName} <${this.fromAddress}>`,
        to: [recipient],
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      };

      const { data: result, error } = await this.resend.emails.send(emailPayload);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, messageId: result?.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Log email to email_logs table
   */
  private async logEmail(
    item: EmailQueueItem,
    status: 'sent' | 'failed',
    messageId?: string,
    error?: string,
  ): Promise<void> {
    try {
      const pool = this.databaseService.getPool();
      if (!pool) {
        return;
      }

      await pool.query(
        `INSERT INTO email_logs (recipient, subject, template, message_id, status, error, retry_count, sent_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          item.recipient,
          item.subject,
          item.template_name,
          messageId || null,
          status,
          error || null,
          item.retry_count,
          status === 'sent' ? new Date() : null,
        ],
      );
    } catch (err) {
      this.logger.error(
        `Failed to log email: ${err instanceof Error ? err.message : 'Unknown error'}`,
        err instanceof Error ? err.stack : undefined,
        'EmailQueueService',
      );
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<EmailQueueStats> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'processing') as processing,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) as total
      FROM email_queue
    `);

    const row = result.rows[0];
    return {
      pending: parseInt(row.pending, 10),
      processing: parseInt(row.processing, 10),
      sent: parseInt(row.sent, 10),
      failed: parseInt(row.failed, 10),
      total: parseInt(row.total, 10),
    };
  }

  /**
   * Get queue items with filtering
   */
  async getQueueItems(filter: EmailQueueFilter = {}): Promise<EmailQueueItem[]> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filter.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filter.status);
    }
    if (filter.template_name) {
      conditions.push(`template_name = $${paramIndex++}`);
      params.push(filter.template_name);
    }
    if (filter.recipient) {
      conditions.push(`recipient ILIKE $${paramIndex++}`);
      params.push(`%${filter.recipient}%`);
    }
    if (filter.start_date) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(filter.start_date);
    }
    if (filter.end_date) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(filter.end_date);
    }

    let query = 'SELECT * FROM email_queue';
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY priority DESC, created_at DESC';

    const limit = filter.limit || 50;
    const offset = filter.offset || 0;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get queue item by ID
   */
  async getQueueItem(id: number): Promise<EmailQueueItem | null> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const result = await pool.query('SELECT * FROM email_queue WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Cancel a pending queue item
   */
  async cancelQueueItem(id: number): Promise<boolean> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const result = await pool.query(
      `UPDATE email_queue SET status = 'cancelled', completed_at = NOW() WHERE id = $1 AND status = 'pending' RETURNING id`,
      [id],
    );

    if (result.rows.length > 0) {
      this.logger.log(`Queue item cancelled: ${id}`, 'EmailQueueService');
      return true;
    }
    return false;
  }

  /**
   * Retry a failed queue item
   */
  async retryQueueItem(id: number): Promise<boolean> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const result = await pool.query(
      `UPDATE email_queue
       SET status = 'pending', retry_count = 0, error = NULL, next_retry_at = NULL, completed_at = NULL
       WHERE id = $1 AND status = 'failed'
       RETURNING id`,
      [id],
    );

    if (result.rows.length > 0) {
      this.logger.log(`Queue item retry requested: ${id}`, 'EmailQueueService');
      return true;
    }
    return false;
  }

  /**
   * Clean up old queue items
   */
  async cleanupOldItems(daysOld = 30): Promise<number> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const result = await pool.query(
      `DELETE FROM email_queue
       WHERE status IN ('sent', 'failed', 'cancelled')
         AND completed_at < NOW() - INTERVAL '${daysOld} days'`,
    );

    const count = result.rowCount || 0;
    if (count > 0) {
      this.logger.log(`Cleaned up ${count} old queue items`, 'EmailQueueService');
    }
    return count;
  }

  /**
   * Check if Redis is connected
   */
  isRedisConnected(): boolean {
    return this.redis?.status === 'ready';
  }

  /**
   * Get queue service status
   */
  getStatus(): {
    enabled: boolean;
    processing: boolean;
    redisConnected: boolean;
    rateLimit: number;
    emailsSentThisMinute: number;
  } {
    return {
      enabled: this.isQueueEnabled,
      processing: this.isProcessing,
      redisConnected: this.isRedisConnected(),
      rateLimit: this.rateLimit,
      emailsSentThisMinute: this.emailsSentThisMinute,
    };
  }
}
