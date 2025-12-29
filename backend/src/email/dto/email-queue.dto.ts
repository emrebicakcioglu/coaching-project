/**
 * Email Queue DTOs
 * STORY-023B: E-Mail Templates & Queue
 *
 * Data Transfer Objects for email queue operations.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsNumber, IsObject, Min, Max, IsDateString, IsIn } from 'class-validator';
import { EmailQueueStatus } from '../../database/types';

/**
 * DTO for sending an email (queued)
 */
export class QueueEmailDto {
  @ApiProperty({
    description: 'Template name to use',
    example: 'welcome',
  })
  @IsString()
  template_name: string;

  @ApiProperty({
    description: 'Recipient email address',
    example: 'user@example.com',
  })
  @IsEmail()
  recipient: string;

  @ApiPropertyOptional({
    description: 'Template variables for substitution',
    example: { name: 'John Doe', verificationLink: 'https://example.com/verify?token=abc123' },
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Email priority (higher = processed first)',
    example: 0,
    minimum: -100,
    maximum: 100,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(-100)
  @Max(100)
  priority?: number;

  @ApiPropertyOptional({
    description: 'Maximum retry attempts',
    example: 3,
    minimum: 0,
    maximum: 10,
    default: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  max_retries?: number;

  @ApiPropertyOptional({
    description: 'Scheduled send time (ISO 8601)',
    example: '2025-12-07T12:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  scheduled_at?: string;
}

/**
 * DTO for queue filter parameters
 */
export class QueueFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['pending', 'processing', 'sent', 'failed', 'cancelled'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'processing', 'sent', 'failed', 'cancelled'])
  status?: EmailQueueStatus;

  @ApiPropertyOptional({
    description: 'Filter by template name',
    example: 'welcome',
  })
  @IsOptional()
  @IsString()
  template_name?: string;

  @ApiPropertyOptional({
    description: 'Filter by recipient (partial match)',
    example: '@example.com',
  })
  @IsOptional()
  @IsString()
  recipient?: string;

  @ApiPropertyOptional({
    description: 'Filter from date (ISO 8601)',
    example: '2025-12-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Filter to date (ISO 8601)',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({
    description: 'Number of items to return',
    example: 50,
    minimum: 1,
    maximum: 100,
    default: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of items to skip',
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

/**
 * Response DTO for queue item
 */
export class QueueItemResponseDto {
  @ApiProperty({ description: 'Queue item ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Template name', example: 'welcome' })
  template_name: string;

  @ApiProperty({ description: 'Recipient email', example: 'user@example.com' })
  recipient: string;

  @ApiProperty({ description: 'Email subject', example: 'Welcome to Core App!' })
  subject: string;

  @ApiProperty({ description: 'Template variables' })
  variables: Record<string, unknown>;

  @ApiProperty({ description: 'Priority', example: 0 })
  priority: number;

  @ApiProperty({
    description: 'Current status',
    enum: ['pending', 'processing', 'sent', 'failed', 'cancelled'],
    example: 'pending',
  })
  status: string;

  @ApiProperty({ description: 'Retry count', example: 0 })
  retry_count: number;

  @ApiProperty({ description: 'Maximum retries', example: 3 })
  max_retries: number;

  @ApiPropertyOptional({ description: 'Next retry time', nullable: true })
  next_retry_at?: Date | null;

  @ApiPropertyOptional({ description: 'Error message', nullable: true })
  error?: string | null;

  @ApiPropertyOptional({ description: 'Resend message ID', nullable: true })
  message_id?: string | null;

  @ApiProperty({ description: 'Scheduled send time' })
  scheduled_at: Date;

  @ApiPropertyOptional({ description: 'Processing start time', nullable: true })
  processing_started_at?: Date | null;

  @ApiPropertyOptional({ description: 'Completion time', nullable: true })
  completed_at?: Date | null;

  @ApiProperty({ description: 'Creation time' })
  created_at: Date;
}

/**
 * Response DTO for queue statistics
 */
export class QueueStatsResponseDto {
  @ApiProperty({ description: 'Pending emails count', example: 10 })
  pending: number;

  @ApiProperty({ description: 'Processing emails count', example: 2 })
  processing: number;

  @ApiProperty({ description: 'Sent emails count', example: 100 })
  sent: number;

  @ApiProperty({ description: 'Failed emails count', example: 5 })
  failed: number;

  @ApiProperty({ description: 'Total emails count', example: 117 })
  total: number;
}

/**
 * Response DTO for queue status
 */
export class QueueStatusResponseDto {
  @ApiProperty({ description: 'Whether queue processing is enabled', example: true })
  enabled: boolean;

  @ApiProperty({ description: 'Whether queue is currently processing', example: false })
  processing: boolean;

  @ApiProperty({ description: 'Whether Redis is connected', example: true })
  redisConnected: boolean;

  @ApiProperty({ description: 'Rate limit per minute', example: 60 })
  rateLimit: number;

  @ApiProperty({ description: 'Emails sent this minute', example: 5 })
  emailsSentThisMinute: number;

  @ApiProperty({ description: 'Queue statistics' })
  stats: QueueStatsResponseDto;
}

/**
 * Response DTO for queued email
 */
export class QueuedEmailResponseDto {
  @ApiProperty({ description: 'Whether email was successfully queued', example: true })
  success: boolean;

  @ApiProperty({ description: 'Queue item ID', example: 123 })
  queueId: number;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error?: string;
}
