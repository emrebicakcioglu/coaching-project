/**
 * Jira Ticket DTOs
 * STORY-041E: Jira Ticket Creation
 *
 * Data Transfer Objects for Jira ticket creation from feedback.
 * Handles request/response formatting for the ticket creation endpoint.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Request DTO for creating a Jira ticket from feedback
 */
export class CreateJiraTicketDto {
  @ApiPropertyOptional({
    description: 'Delete the feedback after successfully creating the Jira ticket',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  deleteAfterCreation?: boolean;
}

/**
 * Response DTO for successful Jira ticket creation
 */
export class JiraTicketResponseDto {
  @ApiProperty({
    description: 'Indicates successful ticket creation',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'The Jira issue key',
    example: 'PROJ-123',
  })
  issueKey: string;

  @ApiProperty({
    description: 'Direct URL to the Jira issue',
    example: 'https://company.atlassian.net/browse/PROJ-123',
  })
  issueUrl: string;

  @ApiProperty({
    description: 'Indicates if the feedback was deleted after ticket creation',
    example: false,
  })
  feedbackDeleted: boolean;

  @ApiPropertyOptional({
    description: 'The feedback ID that was used to create the ticket',
    example: 123,
  })
  feedbackId?: number;
}

/**
 * Error response DTO for Jira ticket creation failures
 */
export class JiraTicketErrorDto {
  @ApiProperty({
    description: 'Indicates failed ticket creation',
    example: false,
  })
  success: boolean;

  @ApiProperty({
    description: 'Error message',
    example: 'Failed to create Jira ticket: Project not found',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Detailed error information',
    example: 'Jira API returned status 404',
  })
  error?: string;

  @ApiPropertyOptional({
    description: 'HTTP status code from Jira API',
    example: 404,
  })
  statusCode?: number;
}

/**
 * Jira Issue Creation payload (internal use)
 * Follows Jira Cloud REST API v3 format with ADF (Atlassian Document Format)
 */
export interface JiraIssuePayload {
  fields: {
    project: { key: string };
    summary: string;
    description: {
      type: 'doc';
      version: 1;
      content: JiraADFContent[];
    };
    issuetype: { name: string };
  };
}

/**
 * ADF Content node types
 */
export interface JiraADFContent {
  type: 'paragraph' | 'heading' | 'table' | 'tableRow' | 'tableHeader' | 'tableCell' | 'rule' | 'text';
  content?: JiraADFContent[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

/**
 * Jira API response for issue creation
 */
export interface JiraCreateIssueResponse {
  id: string;
  key: string;
  self: string;
}

/**
 * Feedback data required for Jira ticket creation
 */
export interface FeedbackForJira {
  id: number;
  userId: number;
  userEmail: string;
  userName: string;
  comment: string;
  route: string;
  url?: string;
  hasScreenshot: boolean;
  screenshotPath?: string;
  createdAt: Date;
  browserName?: string;
  browserVersion?: string;
  osName?: string;
  osVersion?: string;
  deviceType?: string;
  screenResolution?: string;
  language?: string;
  timezone?: string;
}
