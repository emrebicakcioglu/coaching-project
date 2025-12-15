/**
 * Email DTOs
 * STORY-023A: E-Mail Service Setup (Resend.com)
 *
 * Data Transfer Objects for email operations.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsObject } from 'class-validator';

/**
 * Base email data for template rendering
 * Additional properties can be passed for template variables
 */
export class EmailTemplateDataDto {
  @ApiPropertyOptional({ description: 'User name for personalization' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Company name for branding' })
  @IsOptional()
  @IsString()
  companyName?: string;

  // Additional template variables can be passed as extra properties
  // TypeScript allows extra properties due to structural typing
}

/**
 * DTO for sending a generic email
 */
export class SendEmailDto {
  @ApiProperty({ description: 'Recipient email address', example: 'user@example.com' })
  @IsEmail()
  to: string;

  @ApiProperty({ description: 'Email subject', example: 'Welcome to Core App!' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Template name (without extension)', example: 'welcome' })
  @IsString()
  template: string;

  @ApiProperty({ description: 'Template data for variable substitution', type: EmailTemplateDataDto })
  @IsObject()
  data: EmailTemplateDataDto;
}

/**
 * DTO for password reset email
 */
export class SendPasswordResetEmailDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User display name', example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Password reset link', example: 'https://app.com/reset?token=abc123' })
  @IsString()
  resetLink: string;
}

/**
 * DTO for welcome email
 */
export class SendWelcomeEmailDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User display name', example: 'John Doe' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Email verification link', example: 'https://app.com/verify?token=abc123' })
  @IsOptional()
  @IsString()
  verificationLink?: string;
}

/**
 * DTO for email verification email
 */
export class SendVerificationEmailDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User display name', example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Email verification link', example: 'https://app.com/verify?token=abc123' })
  @IsString()
  verificationLink: string;
}

/**
 * DTO for feedback confirmation email
 */
export class SendFeedbackConfirmationEmailDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User display name', example: 'John Doe' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Feedback subject', example: 'Bug Report' })
  @IsOptional()
  @IsString()
  feedbackSubject?: string;
}

/**
 * DTO for internal support request email
 */
export class SendSupportRequestEmailDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  userEmail: string;

  @ApiProperty({ description: 'User display name', example: 'John Doe' })
  @IsString()
  userName: string;

  @ApiProperty({ description: 'Support request subject', example: 'Account Issue' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Support request message/details' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'User ID if authenticated' })
  @IsOptional()
  userId?: number;
}

/**
 * Response DTO for email send operation
 */
export class EmailSendResponseDto {
  @ApiProperty({ description: 'Whether the email was sent successfully' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Resend message ID if successful' })
  messageId?: string;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error?: string;
}

/**
 * Email log entry interface for database storage
 */
export interface EmailLogEntry {
  id?: number;
  to: string;
  subject: string;
  template: string;
  messageId?: string;
  status: 'sent' | 'failed' | 'pending';
  error?: string;
  retryCount: number;
  sentAt?: Date;
  createdAt: Date;
}
