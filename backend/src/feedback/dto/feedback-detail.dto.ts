/**
 * Feedback Detail DTOs
 * STORY-041C: Feedback Admin API
 *
 * Data Transfer Objects for detailed feedback view and operations.
 * Used by the admin API for single feedback retrieval and operations.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Detailed feedback DTO
 * Extends list item with full device and browser information
 */
export class FeedbackDetailDto {
  @ApiProperty({
    description: 'Unique feedback ID',
    example: 123,
  })
  id: number;

  @ApiProperty({
    description: 'User ID who submitted the feedback',
    example: 1,
  })
  userId: number;

  @ApiProperty({
    description: 'Email of the user who submitted the feedback',
    example: 'user@example.com',
  })
  userEmail: string;

  @ApiProperty({
    description: 'Name of the user who submitted the feedback',
    example: 'John Doe',
  })
  userName: string;

  @ApiProperty({
    description: 'Full feedback comment',
    example: 'I found a bug in the navigation menu when clicking on the settings icon.',
  })
  comment: string;

  @ApiProperty({
    description: 'Preview of the comment (first 100 characters)',
    example: 'I found a bug in the navigation menu...',
  })
  commentPreview: string;

  @ApiProperty({
    description: 'Route/path where feedback was submitted',
    example: '/dashboard/settings',
  })
  route: string;

  @ApiPropertyOptional({
    description: 'Full URL where feedback was submitted',
    example: 'https://app.example.com/dashboard/settings',
  })
  url?: string;

  @ApiProperty({
    description: 'Indicates if feedback has a screenshot attached',
    example: true,
  })
  hasScreenshot: boolean;

  @ApiProperty({
    description: 'Timestamp when the feedback was submitted',
    example: '2025-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  // Browser and device information
  @ApiPropertyOptional({
    description: 'Browser name',
    example: 'Chrome',
  })
  browserName?: string;

  @ApiPropertyOptional({
    description: 'Browser version',
    example: '120',
  })
  browserVersion?: string;

  @ApiPropertyOptional({
    description: 'Operating system name',
    example: 'Windows',
  })
  osName?: string;

  @ApiPropertyOptional({
    description: 'Operating system version',
    example: '10/11',
  })
  osVersion?: string;

  @ApiPropertyOptional({
    description: 'Device type',
    example: 'Desktop',
  })
  deviceType?: string;

  @ApiPropertyOptional({
    description: 'Screen resolution',
    example: '1920x1080',
  })
  screenResolution?: string;

  @ApiPropertyOptional({
    description: 'Browser language',
    example: 'en-US',
  })
  language?: string;

  @ApiPropertyOptional({
    description: 'User timezone',
    example: 'Europe/Berlin',
  })
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Raw user agent string',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  })
  userAgent?: string;

  @ApiPropertyOptional({
    description: 'Presigned URL for screenshot download (valid for 5 minutes)',
    example: 'https://minio.example.com/feedback/screenshot.png?X-Amz-...',
  })
  screenshotUrl?: string;

  @ApiPropertyOptional({
    description: 'Jira issue key if ticket was created (STORY-041E)',
    example: 'PROJ-123',
  })
  jiraIssueKey?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when Jira ticket was created (STORY-041E)',
    example: '2025-01-15T11:00:00.000Z',
  })
  jiraCreatedAt?: Date;

  @ApiPropertyOptional({
    description: 'Full Jira issue URL (STORY-041E)',
    example: 'https://company.atlassian.net/browse/PROJ-123',
  })
  jiraIssueUrl?: string;
}

/**
 * Screenshot URL response DTO
 */
export class ScreenshotUrlResponseDto {
  @ApiProperty({
    description: 'Presigned URL for screenshot download',
    example: 'https://minio.example.com/feedback/screenshot.png?X-Amz-...',
  })
  url: string;

  @ApiProperty({
    description: 'URL expiration time in seconds',
    example: 300,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'URL expiration timestamp',
    example: '2025-01-15T10:35:00.000Z',
  })
  expiresAt: Date;
}

/**
 * Delete feedback response DTO
 */
export class DeleteFeedbackResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Feedback deleted successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Indicates if screenshot was also deleted from storage',
    example: true,
  })
  screenshotDeleted: boolean;
}
