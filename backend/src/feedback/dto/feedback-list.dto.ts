/**
 * Feedback List DTOs
 * STORY-041C: Feedback Admin API
 *
 * Data Transfer Objects for listing and querying feedback submissions.
 * Used by the admin API to retrieve paginated feedback lists.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Feedback status for filtering
 */
export enum FeedbackStatus {
  NEW = 'new',
  REVIEWED = 'reviewed',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

/**
 * Query parameters for listing feedbacks
 */
export class FeedbackListQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by feedback status',
    enum: FeedbackStatus,
    example: FeedbackStatus.NEW,
  })
  @IsOptional()
  @IsEnum(FeedbackStatus)
  status?: FeedbackStatus;

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({
    description: 'Search term for comment or email',
    example: 'bug',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * Feedback list item DTO
 * Represents a single feedback in the list view
 */
export class FeedbackListItemDto {
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
    example: 'I found a bug in the navigation menu when clicking on the settings icon.',
  })
  commentPreview: string;

  @ApiProperty({
    description: 'Route/path where feedback was submitted',
    example: '/dashboard/settings',
  })
  route: string;

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
}

/**
 * Pagination metadata
 */
export class PaginationDto {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of items',
    example: 42,
  })
  total: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  pages: number;
}

/**
 * Paginated response for feedback list
 */
export class FeedbackListResponseDto {
  @ApiProperty({
    description: 'Array of feedback items',
    type: [FeedbackListItemDto],
  })
  data: FeedbackListItemDto[];

  @ApiProperty({
    description: 'Pagination information',
    type: PaginationDto,
  })
  pagination: PaginationDto;
}
