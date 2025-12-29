/**
 * Jira Ticket Service
 * STORY-041E: Jira Ticket Creation
 *
 * Business logic for creating Jira tickets from feedback submissions.
 * Uses Jira Cloud REST API v3 with ADF (Atlassian Document Format).
 *
 * Features:
 * - Create Jira issue from feedback with proper ADF formatting
 * - Upload screenshot as attachment
 * - Update feedback record with Jira issue key
 * - Optional feedback deletion after ticket creation
 *
 * Environment Variables Required:
 * - All variables from JiraSettingsService (STORY-041D)
 * - ENCRYPTION_KEY: For decrypting Jira API token
 *
 * Dependencies:
 * - JiraSettingsService: For Jira configuration
 * - FeedbackAdminService: For feedback retrieval
 * - StorageService: For screenshot retrieval
 * - DatabaseService: For updating feedback with Jira key
 */

import {
  Injectable,
  Inject,
  forwardRef,
  BadRequestException,
  NotFoundException,
  BadGatewayException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { WinstonLoggerService } from '../common/services/logger.service';
import { JiraSettingsService } from './jira-settings.service';
import { FeedbackAdminService } from '../feedback/feedback-admin.service';
import { StorageService } from '../storage/storage.service';
import { BucketName } from '../storage/dto';
import { AuditService } from '../common/services/audit.service';
import { Request } from 'express';
import {
  JiraTicketResponseDto,
  JiraIssuePayload,
  JiraADFContent,
  JiraCreateIssueResponse,
  FeedbackForJira,
} from './dto/jira-ticket.dto';
import { JiraSettingsInternal } from './dto/jira-settings.dto';
import { Readable } from 'stream';

/**
 * Extended Request interface with user
 */
interface AuthRequest extends Request {
  user?: { id?: number; email?: string };
  requestId?: string;
}

/**
 * Internal feedback row interface from database
 */
interface FeedbackRow {
  id: number;
  user_id: number;
  user_email: string;
  comment: string;
  url?: string | null;
  route?: string | null;
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
  user_name: string | null;
}

@Injectable()
export class JiraTicketService {
  constructor(
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
    @Inject(forwardRef(() => JiraSettingsService))
    private readonly jiraSettingsService: JiraSettingsService,
    @Inject(forwardRef(() => FeedbackAdminService))
    private readonly feedbackAdminService: FeedbackAdminService,
    @Inject(forwardRef(() => StorageService))
    private readonly storageService: StorageService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
  ) {
    this.logger.log('JiraTicketService initialized', 'JiraTicketService');
  }

  /**
   * Create a Jira ticket from a feedback submission
   *
   * @param feedbackId - ID of the feedback to create ticket from
   * @param deleteAfterCreation - Whether to delete feedback after successful creation
   * @param adminUser - Admin user creating the ticket (for audit)
   * @param request - Request object for audit logging
   * @returns Jira ticket response with issue key and URL
   */
  async createTicketFromFeedback(
    feedbackId: number,
    deleteAfterCreation: boolean = false,
    adminUser: { id: number; email: string },
    request?: AuthRequest,
  ): Promise<JiraTicketResponseDto> {
    // 1. Get and validate Jira settings
    const settings = await this.jiraSettingsService.getJiraSettingsDecrypted();
    if (!settings) {
      throw new BadRequestException('Jira integration is not configured');
    }

    if (!settings.enabled) {
      throw new BadRequestException('Jira integration is not enabled');
    }

    if (!settings.url || !settings.email || !settings.apiToken || !settings.projectKey) {
      throw new BadRequestException('Jira configuration is incomplete');
    }

    // 2. Get feedback
    const feedback = await this.getFeedbackForJira(feedbackId);

    // Check if ticket already exists
    if (feedback.jiraIssueKey) {
      throw new BadRequestException(
        `Feedback already has a Jira ticket: ${feedback.jiraIssueKey}`,
      );
    }

    try {
      // 3. Create Jira issue
      const issue = await this.createJiraIssue(settings, feedback);

      this.logger.log(
        `Created Jira issue ${issue.key} from feedback ${feedbackId}`,
        'JiraTicketService',
      );

      // 4. Upload screenshot as attachment if exists
      if (feedback.hasScreenshot && feedback.screenshotPath) {
        try {
          await this.addScreenshotAttachment(settings, issue.key, feedback.screenshotPath);
          this.logger.log(
            `Added screenshot attachment to Jira issue ${issue.key}`,
            'JiraTicketService',
          );
        } catch (attachmentError) {
          // Log warning but don't fail the whole operation
          this.logger.warn(
            `Failed to add screenshot attachment to ${issue.key}: ${attachmentError instanceof Error ? attachmentError.message : 'Unknown error'}`,
            'JiraTicketService',
          );
        }
      }

      // 5. Update feedback with Jira key
      await this.updateFeedbackJiraKey(feedbackId, issue.key);

      // 6. Optionally delete feedback
      let feedbackDeleted = false;
      if (deleteAfterCreation) {
        try {
          await this.feedbackAdminService.delete(feedbackId, adminUser, request);
          feedbackDeleted = true;
          this.logger.log(
            `Deleted feedback ${feedbackId} after creating Jira issue ${issue.key}`,
            'JiraTicketService',
          );
        } catch (deleteError) {
          this.logger.warn(
            `Failed to delete feedback ${feedbackId} after Jira creation: ${deleteError instanceof Error ? deleteError.message : 'Unknown error'}`,
            'JiraTicketService',
          );
        }
      }

      // 7. Audit log
      if (this.auditService) {
        await this.auditService.log({
          action: 'JIRA_TICKET_CREATE',
          userId: adminUser.id,
          resource: 'jira_ticket',
          resourceId: feedbackId,
          details: {
            feedbackId,
            jiraIssueKey: issue.key,
            jiraIssueId: issue.id,
            feedbackDeleted,
            deletedAfterCreation: deleteAfterCreation,
            createdBy: adminUser.email,
          },
          level: 'info',
          request: request as Request & { user?: { id?: number } },
        });
      }

      const issueUrl = `https://${settings.url}/browse/${issue.key}`;

      return {
        success: true,
        issueKey: issue.key,
        issueUrl,
        feedbackDeleted,
        feedbackId,
      };
    } catch (error) {
      // Handle specific error types
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof NotFoundException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to create Jira ticket from feedback ${feedbackId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        'JiraTicketService',
      );

      throw new BadGatewayException(`Failed to create Jira ticket: ${errorMessage}`);
    }
  }

  /**
   * Get feedback data formatted for Jira ticket creation
   */
  private async getFeedbackForJira(feedbackId: number): Promise<FeedbackForJira & { jiraIssueKey?: string }> {
    const pool = this.databaseService.ensurePool();

    const result = await pool.query<FeedbackRow>(
      `SELECT
        fs.*,
        u.name as user_name
      FROM feedback_submissions fs
      LEFT JOIN users u ON fs.user_id = u.id
      WHERE fs.id = $1`,
      [feedbackId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Feedback with ID ${feedbackId} not found`);
    }

    const row = result.rows[0];

    return {
      id: row.id,
      userId: row.user_id,
      userEmail: row.user_email,
      userName: row.user_name || row.user_email,
      comment: row.comment,
      route: row.route || '',
      url: row.url || undefined,
      hasScreenshot: row.has_screenshot,
      screenshotPath: row.screenshot_path || undefined,
      createdAt: row.created_at,
      browserName: row.browser_name || undefined,
      browserVersion: row.browser_version || undefined,
      osName: row.os_name || undefined,
      osVersion: row.os_version || undefined,
      deviceType: row.device_type || undefined,
      screenResolution: row.screen_resolution || undefined,
      language: row.language || undefined,
      timezone: row.timezone || undefined,
      jiraIssueKey: row.jira_issue_key || undefined,
    };
  }

  /**
   * Create a Jira issue using the REST API v3
   */
  private async createJiraIssue(
    settings: JiraSettingsInternal,
    feedback: FeedbackForJira,
  ): Promise<JiraCreateIssueResponse> {
    const auth = Buffer.from(`${settings.email}:${settings.apiToken}`).toString('base64');
    const baseUrl = `https://${settings.url}`;

    // Build summary (first 50 chars of comment)
    const summaryText = feedback.comment.length > 50
      ? feedback.comment.substring(0, 47) + '...'
      : feedback.comment;
    const summary = `Feedback: ${summaryText}`;

    // Build description in ADF format
    const description = this.buildADFDescription(feedback);

    const payload: JiraIssuePayload = {
      fields: {
        project: { key: settings.projectKey },
        summary,
        description,
        issuetype: { name: settings.issueType || 'Bug' },
      },
    };

    const response = await fetch(`${baseUrl}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetails = errorText;

      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.errors) {
          errorDetails = Object.entries(errorJson.errors)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
        } else if (errorJson.errorMessages) {
          errorDetails = errorJson.errorMessages.join(', ');
        }
      } catch {
        // Use raw error text
      }

      this.logger.error(
        `Jira API error (${response.status}): ${errorDetails}`,
        undefined,
        'JiraTicketService',
      );

      if (response.status === 401) {
        throw new BadRequestException('Jira authentication failed. Check API token.');
      }
      if (response.status === 403) {
        throw new BadRequestException('Jira access denied. Check permissions.');
      }
      if (response.status === 404) {
        throw new BadRequestException(`Jira project ${settings.projectKey} not found.`);
      }

      throw new BadGatewayException(`Jira API error (${response.status}): ${errorDetails}`);
    }

    return (await response.json()) as JiraCreateIssueResponse;
  }

  /**
   * Build Atlassian Document Format (ADF) description from feedback
   */
  private buildADFDescription(feedback: FeedbackForJira): {
    type: 'doc';
    version: 1;
    content: JiraADFContent[];
  } {
    const content: JiraADFContent[] = [];

    // Header: Feedback Details
    content.push({
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Feedback Details' }],
    });

    // User info paragraph
    content.push({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'From: ', marks: [{ type: 'strong' }] },
        { type: 'text', text: `${feedback.userName} (${feedback.userEmail})` },
      ],
    });

    content.push({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Submitted: ', marks: [{ type: 'strong' }] },
        { type: 'text', text: feedback.createdAt.toISOString() },
      ],
    });

    if (feedback.route) {
      content.push({
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Route: ', marks: [{ type: 'strong' }] },
          { type: 'text', text: feedback.route },
        ],
      });
    }

    if (feedback.url) {
      content.push({
        type: 'paragraph',
        content: [
          { type: 'text', text: 'URL: ', marks: [{ type: 'strong' }] },
          { type: 'text', text: feedback.url, marks: [{ type: 'link', attrs: { href: feedback.url } }] },
        ],
      });
    }

    // Horizontal rule
    content.push({ type: 'rule' });

    // Comment section
    content.push({
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Comment' }],
    });

    content.push({
      type: 'paragraph',
      content: [{ type: 'text', text: feedback.comment }],
    });

    // Horizontal rule
    content.push({ type: 'rule' });

    // Environment section
    content.push({
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Environment' }],
    });

    // Build environment table
    const envRows: JiraADFContent[] = [];

    // Header row
    envRows.push({
      type: 'tableRow',
      content: [
        {
          type: 'tableHeader',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Property' }] }],
        },
        {
          type: 'tableHeader',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Value' }] }],
        },
      ],
    });

    // Add environment data rows
    const envData: Array<[string, string | undefined]> = [
      ['Browser', feedback.browserName ? `${feedback.browserName} ${feedback.browserVersion || ''}`.trim() : undefined],
      ['OS', feedback.osName ? `${feedback.osName} ${feedback.osVersion || ''}`.trim() : undefined],
      ['Device', feedback.deviceType],
      ['Resolution', feedback.screenResolution],
      ['Language', feedback.language],
      ['Timezone', feedback.timezone],
    ];

    for (const [label, value] of envData) {
      if (value) {
        envRows.push({
          type: 'tableRow',
          content: [
            {
              type: 'tableCell',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: label }] }],
            },
            {
              type: 'tableCell',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }],
            },
          ],
        });
      }
    }

    content.push({
      type: 'table',
      attrs: { isNumberColumnEnabled: false, layout: 'default' },
      content: envRows,
    });

    // Footer
    content.push({ type: 'rule' });
    content.push({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Created from Core App Feedback System',
          marks: [{ type: 'em' }],
        },
      ],
    });

    return {
      type: 'doc',
      version: 1,
      content,
    };
  }

  /**
   * Add screenshot as attachment to Jira issue
   */
  private async addScreenshotAttachment(
    settings: JiraSettingsInternal,
    issueKey: string,
    screenshotPath: string,
  ): Promise<void> {
    if (!this.storageService?.isConfigured()) {
      this.logger.warn('Storage service not configured, skipping attachment', 'JiraTicketService');
      return;
    }

    // Get file from MinIO
    let fileData: { stream: Readable; stat: { size: number; metaData: Record<string, string> } };
    try {
      fileData = await this.storageService.getFile(screenshotPath, BucketName.FEEDBACK);
    } catch (error) {
      this.logger.warn(
        `Failed to get screenshot from storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'JiraTicketService',
      );
      return;
    }

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of fileData.stream) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    // Determine content type
    const contentType = fileData.stat.metaData?.['content-type'] || 'image/png';

    // Prepare multipart form data
    const auth = Buffer.from(`${settings.email}:${settings.apiToken}`).toString('base64');
    const baseUrl = `https://${settings.url}`;
    const boundary = `----FormBoundary${Date.now()}`;

    // Build multipart body
    const filename = screenshotPath.split('/').pop() || 'screenshot.png';
    const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;

    const headerBuffer = Buffer.from(header, 'utf-8');
    const footerBuffer = Buffer.from(footer, 'utf-8');
    const body = Buffer.concat([headerBuffer, buffer, footerBuffer]);

    const response = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}/attachments`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'X-Atlassian-Token': 'no-check',
        Accept: 'application/json',
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload attachment: ${response.status} - ${errorText}`);
    }

    this.logger.debug(
      `Successfully attached screenshot to Jira issue ${issueKey}`,
      'JiraTicketService',
    );
  }

  /**
   * Update feedback record with Jira issue key
   */
  private async updateFeedbackJiraKey(feedbackId: number, issueKey: string): Promise<void> {
    const pool = this.databaseService.ensurePool();

    try {
      await pool.query(
        `UPDATE feedback_submissions
         SET jira_issue_key = $1,
             jira_created_at = NOW()
         WHERE id = $2`,
        [issueKey, feedbackId],
      );

      this.logger.debug(
        `Updated feedback ${feedbackId} with Jira key ${issueKey}`,
        'JiraTicketService',
      );
    } catch (error) {
      this.logger.error(
        `Failed to update feedback with Jira key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'JiraTicketService',
      );
      throw new InternalServerErrorException('Failed to update feedback with Jira issue key');
    }
  }
}
