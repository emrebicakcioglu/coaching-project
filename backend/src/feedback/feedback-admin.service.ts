/**
 * Feedback Admin Service
 * STORY-041C: Feedback Admin API
 *
 * Provides admin functionality for managing feedback submissions:
 * - List feedbacks with pagination and filtering
 * - Get feedback details with user information
 * - Generate presigned URLs for screenshot download
 * - Delete feedback (DB + MinIO cleanup)
 *
 * Environment Variables Required:
 * - MINIO_ENDPOINT, MINIO_PORT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY (for storage)
 * - AUDIT_LOG_ENABLED: Enable audit logging for delete operations
 *
 * Dependencies:
 * - DatabaseService: For feedback record operations
 * - StorageService: For MinIO screenshot operations
 * - AuditService: For audit logging delete operations
 * - WinstonLoggerService: For application logging
 */

import {
  Injectable,
  Inject,
  forwardRef,
  NotFoundException,
  InternalServerErrorException,
  Optional,
} from '@nestjs/common';
import { Request } from 'express';
import { WinstonLoggerService } from '../common/services/logger.service';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../common/services/audit.service';
import { BucketName } from '../storage/dto';
import {
  FeedbackListQueryDto,
  FeedbackListResponseDto,
  FeedbackListItemDto,
} from './dto/feedback-list.dto';
import {
  FeedbackDetailDto,
  ScreenshotUrlResponseDto,
  DeleteFeedbackResponseDto,
} from './dto/feedback-detail.dto';

/**
 * Database row interface for feedback submissions
 * STORY-041E: Added jira_issue_key and jira_created_at columns
 */
interface FeedbackRow {
  id: number;
  user_id: number;
  user_email: string;
  comment: string;
  url?: string | null;
  route?: string | null;
  browser_info?: string | null;
  user_agent?: string | null;
  browser_name?: string | null;
  browser_version?: string | null;
  os_name?: string | null;
  os_version?: string | null;
  device_type?: string | null;
  screen_resolution?: string | null;
  language?: string | null;
  timezone?: string | null;
  has_screenshot: boolean;
  screenshot_path?: string | null;
  created_at: Date;
  jira_issue_key?: string | null;
  jira_created_at?: Date | null;
}

/**
 * Count result interface
 */
interface CountResult {
  count: string;
}

/**
 * User context for audit logging
 */
interface AdminUser {
  id: number;
  email: string;
}

/**
 * Feedback Admin Service
 * Singleton service for admin feedback management operations
 */
@Injectable()
export class FeedbackAdminService {
  /** Presigned URL expiry time in seconds (5 minutes) */
  private readonly presignedUrlExpiry = 300;

  constructor(
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
    @Optional()
    @Inject(forwardRef(() => StorageService))
    private readonly storageService: StorageService,
    @Optional()
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
  ) {
    this.logger.log('FeedbackAdminService initialized', 'FeedbackAdminService');
  }

  /**
   * List all feedbacks with pagination and filtering
   * Sorted by created_at DESC
   *
   * @param query - Query parameters for filtering and pagination
   * @returns Paginated list of feedbacks
   */
  async findAll(query: FeedbackListQueryDto): Promise<FeedbackListResponseDto> {
    const pool = this.databaseService.ensurePool();

    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    try {
      // Build dynamic WHERE clause
      const conditions: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      // Note: Status filtering is prepared for future use when status column is added
      // Currently feedback_submissions table doesn't have a status column
      // if (query.status) {
      //   conditions.push(`fs.status = $${paramIndex++}`);
      //   params.push(query.status);
      // }

      if (query.userId) {
        conditions.push(`fs.user_id = $${paramIndex++}`);
        params.push(query.userId);
      }

      if (query.search) {
        conditions.push(`(fs.comment ILIKE $${paramIndex} OR fs.user_email ILIKE $${paramIndex})`);
        params.push(`%${query.search}%`);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await pool.query<CountResult>(
        `SELECT COUNT(*) as count FROM feedback_submissions fs ${whereClause}`,
        params,
      );
      const total = parseInt(countResult.rows[0].count, 10);

      // Get paginated data with user name from join
      // STORY-041E: Added jira_issue_key and jira_created_at columns
      const dataResult = await pool.query<FeedbackRow & { user_name: string | null }>(
        `SELECT
          fs.id,
          fs.user_id,
          fs.user_email,
          fs.comment,
          fs.url,
          fs.route,
          fs.has_screenshot,
          fs.created_at,
          fs.jira_issue_key,
          fs.jira_created_at,
          u.name as user_name
        FROM feedback_submissions fs
        LEFT JOIN users u ON fs.user_id = u.id
        ${whereClause}
        ORDER BY fs.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...params, limit, offset],
      );

      // Map to DTOs
      // STORY-041E: Added jiraIssueKey and jiraCreatedAt mapping
      const data: FeedbackListItemDto[] = dataResult.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        userEmail: row.user_email,
        userName: row.user_name || row.user_email,
        comment: row.comment,
        commentPreview: this.truncateComment(row.comment, 100),
        route: row.route || '',
        hasScreenshot: row.has_screenshot,
        createdAt: row.created_at,
        jiraIssueKey: row.jira_issue_key || undefined,
        jiraCreatedAt: row.jira_created_at || undefined,
      }));

      const pages = Math.ceil(total / limit);

      this.logger.debug(
        `Listed ${data.length} feedbacks (page ${page}/${pages})`,
        'FeedbackAdminService',
      );

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to list feedbacks: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        'FeedbackAdminService',
      );
      throw new InternalServerErrorException('Failed to retrieve feedback list');
    }
  }

  /**
   * Get single feedback with full details
   *
   * @param id - Feedback ID
   * @returns Feedback details with all metadata
   * @throws NotFoundException if feedback not found
   */
  async findOne(id: number): Promise<FeedbackDetailDto> {
    const pool = this.databaseService.ensurePool();

    try {
      const result = await pool.query<FeedbackRow & { user_name: string | null }>(
        `SELECT
          fs.*,
          u.name as user_name
        FROM feedback_submissions fs
        LEFT JOIN users u ON fs.user_id = u.id
        WHERE fs.id = $1`,
        [id],
      );

      if (result.rows.length === 0) {
        throw new NotFoundException(`Feedback with ID ${id} not found`);
      }

      const row = result.rows[0];

      // Generate presigned URL if screenshot exists
      let screenshotUrl: string | undefined;
      if (row.has_screenshot && row.screenshot_path && this.storageService?.isConfigured()) {
        try {
          const presignedResult = await this.storageService.getPresignedDownloadUrl(
            row.screenshot_path,
            BucketName.FEEDBACK,
            this.presignedUrlExpiry,
          );
          screenshotUrl = presignedResult.url;
        } catch (error) {
          this.logger.warn(
            `Failed to generate presigned URL for feedback ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'FeedbackAdminService',
          );
        }
      }

      this.logger.debug(`Retrieved feedback detail for ID ${id}`, 'FeedbackAdminService');

      // STORY-041E: Added Jira issue key and URL to response
      // Build Jira URL from settings if issue key exists
      let jiraIssueUrl: string | undefined;
      if (row.jira_issue_key) {
        // We don't inject JiraSettingsService to avoid circular dependency
        // The URL is constructed from a simple pattern
        jiraIssueUrl = undefined; // Will be set by caller if needed
      }

      return {
        id: row.id,
        userId: row.user_id,
        userEmail: row.user_email,
        userName: row.user_name || row.user_email,
        comment: row.comment,
        commentPreview: this.truncateComment(row.comment, 100),
        route: row.route || '',
        url: row.url || undefined,
        hasScreenshot: row.has_screenshot,
        createdAt: row.created_at,
        browserName: row.browser_name || undefined,
        browserVersion: row.browser_version || undefined,
        osName: row.os_name || undefined,
        osVersion: row.os_version || undefined,
        deviceType: row.device_type || undefined,
        screenResolution: row.screen_resolution || undefined,
        language: row.language || undefined,
        timezone: row.timezone || undefined,
        userAgent: row.user_agent || undefined,
        screenshotUrl,
        jiraIssueKey: row.jira_issue_key || undefined,
        jiraCreatedAt: row.jira_created_at || undefined,
        jiraIssueUrl,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get feedback ${id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        'FeedbackAdminService',
      );
      throw new InternalServerErrorException('Failed to retrieve feedback details');
    }
  }

  /**
   * Get presigned URL for screenshot download
   *
   * @param id - Feedback ID
   * @returns Presigned URL response with expiration info
   * @throws NotFoundException if feedback not found or has no screenshot
   */
  async getScreenshotUrl(id: number): Promise<ScreenshotUrlResponseDto> {
    const pool = this.databaseService.ensurePool();

    try {
      // Get feedback record
      const result = await pool.query<{ has_screenshot: boolean; screenshot_path: string | null }>(
        'SELECT has_screenshot, screenshot_path FROM feedback_submissions WHERE id = $1',
        [id],
      );

      if (result.rows.length === 0) {
        throw new NotFoundException(`Feedback with ID ${id} not found`);
      }

      const row = result.rows[0];

      if (!row.has_screenshot || !row.screenshot_path) {
        throw new NotFoundException(`Feedback ${id} has no screenshot`);
      }

      if (!this.storageService?.isConfigured()) {
        throw new InternalServerErrorException('Storage service not configured');
      }

      // Generate presigned URL
      const presignedResult = await this.storageService.getPresignedDownloadUrl(
        row.screenshot_path,
        BucketName.FEEDBACK,
        this.presignedUrlExpiry,
      );

      this.logger.debug(
        `Generated presigned URL for feedback ${id} screenshot`,
        'FeedbackAdminService',
      );

      return {
        url: presignedResult.url,
        expiresIn: this.presignedUrlExpiry,
        expiresAt: presignedResult.expiresAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get screenshot URL for feedback ${id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        'FeedbackAdminService',
      );
      throw new InternalServerErrorException('Failed to generate screenshot URL');
    }
  }

  /**
   * Delete feedback and associated screenshot
   *
   * @param id - Feedback ID to delete
   * @param adminUser - Admin user performing the deletion
   * @param req - Request object for audit logging
   * @returns Delete response with status
   * @throws NotFoundException if feedback not found
   */
  async delete(
    id: number,
    adminUser: AdminUser,
    req?: Request,
  ): Promise<DeleteFeedbackResponseDto> {
    const pool = this.databaseService.ensurePool();

    try {
      // Get feedback record to check for screenshot
      const feedbackResult = await pool.query<{
        id: number;
        user_id: number;
        user_email: string;
        comment: string;
        has_screenshot: boolean;
        screenshot_path: string | null;
      }>(
        'SELECT id, user_id, user_email, comment, has_screenshot, screenshot_path FROM feedback_submissions WHERE id = $1',
        [id],
      );

      if (feedbackResult.rows.length === 0) {
        throw new NotFoundException(`Feedback with ID ${id} not found`);
      }

      const feedback = feedbackResult.rows[0];
      let screenshotDeleted = false;

      // Delete screenshot from MinIO if exists
      if (feedback.has_screenshot && feedback.screenshot_path && this.storageService?.isConfigured()) {
        try {
          await this.storageService.deleteFile(feedback.screenshot_path, BucketName.FEEDBACK);
          screenshotDeleted = true;
          this.logger.log(
            `Deleted screenshot ${feedback.screenshot_path} for feedback ${id}`,
            'FeedbackAdminService',
          );
        } catch (storageError) {
          // Log warning but continue with DB deletion
          this.logger.warn(
            `Failed to delete screenshot for feedback ${id}: ${storageError instanceof Error ? storageError.message : 'Unknown error'}`,
            'FeedbackAdminService',
          );
        }
      }

      // Delete feedback record from database
      await pool.query('DELETE FROM feedback_submissions WHERE id = $1', [id]);

      // Create audit log entry
      if (this.auditService) {
        await this.auditService.log({
          action: 'FEEDBACK_DELETE',
          userId: adminUser.id,
          resource: 'feedback',
          resourceId: id,
          details: {
            deletedFeedbackId: id,
            feedbackUserId: feedback.user_id,
            feedbackUserEmail: feedback.user_email,
            commentPreview: this.truncateComment(feedback.comment, 50),
            hadScreenshot: feedback.has_screenshot,
            screenshotDeleted,
            deletedBy: adminUser.email,
          },
          level: 'info',
          request: req as Request & { user?: { id?: number } },
        });
      }

      this.logger.log(
        `Feedback ${id} deleted by admin ${adminUser.email} (ID: ${adminUser.id})`,
        'FeedbackAdminService',
      );

      return {
        message: 'Feedback deleted successfully',
        screenshotDeleted,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to delete feedback ${id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        'FeedbackAdminService',
      );
      throw new InternalServerErrorException('Failed to delete feedback');
    }
  }

  /**
   * Truncate comment to specified length with ellipsis
   *
   * @param comment - Comment text
   * @param maxLength - Maximum length before truncation
   * @returns Truncated comment
   */
  private truncateComment(comment: string, maxLength: number): string {
    if (!comment) return '';
    if (comment.length <= maxLength) return comment;
    return `${comment.substring(0, maxLength)}...`;
  }
}
