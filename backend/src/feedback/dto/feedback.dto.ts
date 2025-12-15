/**
 * Feedback DTOs
 * STORY-038A: Feedback-Backend API
 * STORY-038B: Feedback Rate Limiting & Email Queue
 *
 * Data Transfer Objects for feedback submission with screenshot support.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * DTO for submitting user feedback with optional screenshot
 */
export class SubmitFeedbackDto {
  @ApiProperty({
    description: 'Base64 encoded screenshot image (PNG format)',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  })
  @IsString()
  @IsNotEmpty({ message: 'Screenshot is required' })
  screenshot: string;

  @ApiProperty({
    description: 'User feedback comment/message',
    example: 'I found a bug in the navigation menu when clicking on the settings icon.',
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty({ message: 'Comment is required' })
  @MaxLength(5000, { message: 'Comment must not exceed 5000 characters' })
  comment: string;

  @ApiPropertyOptional({
    description: 'Current page URL where feedback was submitted',
    example: 'https://app.example.com/dashboard/settings',
    maxLength: 2048,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048, { message: 'URL must not exceed 2048 characters' })
  url?: string;

  @ApiPropertyOptional({
    description: 'Browser and device information',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Browser info must not exceed 500 characters' })
  browserInfo?: string;

  // STORY-038B: Additional metadata fields
  @ApiPropertyOptional({
    description: 'Screen resolution (e.g., "1920x1080")',
    example: '1920x1080',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Screen resolution must not exceed 50 characters' })
  screenResolution?: string;

  @ApiPropertyOptional({
    description: 'Browser language code (e.g., "en-US")',
    example: 'en-US',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Language must not exceed 20 characters' })
  language?: string;

  @ApiPropertyOptional({
    description: 'User timezone (e.g., "America/New_York")',
    example: 'Europe/Berlin',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Timezone must not exceed 50 characters' })
  timezone?: string;
}

/**
 * Response DTO for successful feedback submission
 */
export class FeedbackResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Feedback submitted successfully',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Indicates if feedback was queued for async processing',
    example: true,
  })
  queued?: boolean;
}

/**
 * Email attachment interface for Resend
 */
export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

/**
 * STORY-038B: Feedback metadata for tracking
 */
export interface FeedbackMetadata {
  browserInfo: string;
  userAgent: string;
  route: string;
  url: string;
  timestamp: Date;
  // Parsed browser details
  browserName?: string;
  browserVersion?: string;
  osName?: string;
  osVersion?: string;
  deviceType?: string;
  // Additional metadata
  screenResolution?: string;
  language?: string;
  timezone?: string;
}
