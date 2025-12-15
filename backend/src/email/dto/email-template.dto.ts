/**
 * Email Template DTOs
 * STORY-023B: E-Mail Templates & Queue
 *
 * Data Transfer Objects for email template operations.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsArray, MaxLength, MinLength, Matches } from 'class-validator';

/**
 * DTO for creating a new email template
 */
export class CreateEmailTemplateDto {
  @ApiProperty({
    description: 'Unique template name (lowercase, alphanumeric with hyphens)',
    example: 'welcome',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Template name must be lowercase alphanumeric with hyphens only',
  })
  name: string;

  @ApiProperty({
    description: 'Email subject (supports Handlebars variables)',
    example: 'Welcome to {{companyName}}!',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  subject: string;

  @ApiProperty({
    description: 'HTML email content (supports Handlebars syntax)',
    example: '<h1>Welcome, {{name}}!</h1>',
  })
  @IsString()
  html_content: string;

  @ApiPropertyOptional({
    description: 'Plain text email content (supports Handlebars syntax)',
    example: 'Welcome, {{name}}!',
  })
  @IsOptional()
  @IsString()
  text_content?: string;

  @ApiPropertyOptional({
    description: 'List of available template variables',
    example: ['name', 'companyName', 'verificationLink'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({
    description: 'Template description',
    example: 'Welcome email sent to new users upon registration',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the template is active and can be used',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

/**
 * DTO for updating an existing email template
 */
export class UpdateEmailTemplateDto {
  @ApiPropertyOptional({
    description: 'Unique template name (lowercase, alphanumeric with hyphens)',
    example: 'welcome-v2',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Template name must be lowercase alphanumeric with hyphens only',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Email subject (supports Handlebars variables)',
    example: 'Welcome to {{companyName}}!',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subject?: string;

  @ApiPropertyOptional({
    description: 'HTML email content (supports Handlebars syntax)',
    example: '<h1>Welcome, {{name}}!</h1>',
  })
  @IsOptional()
  @IsString()
  html_content?: string;

  @ApiPropertyOptional({
    description: 'Plain text email content (supports Handlebars syntax)',
    example: 'Welcome, {{name}}!',
  })
  @IsOptional()
  @IsString()
  text_content?: string;

  @ApiPropertyOptional({
    description: 'List of available template variables',
    example: ['name', 'companyName', 'verificationLink'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({
    description: 'Template description',
    example: 'Updated welcome email for new users',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the template is active and can be used',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

/**
 * Response DTO for email template
 */
export class EmailTemplateResponseDto {
  @ApiProperty({ description: 'Template ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Template name', example: 'welcome' })
  name: string;

  @ApiProperty({ description: 'Email subject', example: 'Welcome to {{companyName}}!' })
  subject: string;

  @ApiProperty({ description: 'HTML content' })
  html_content: string;

  @ApiPropertyOptional({ description: 'Plain text content', nullable: true })
  text_content?: string | null;

  @ApiProperty({ description: 'Available variables', type: [String] })
  variables: string[];

  @ApiPropertyOptional({ description: 'Template description', nullable: true })
  description?: string | null;

  @ApiProperty({ description: 'Whether template is active', example: true })
  is_active: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  created_at: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updated_at: Date;
}

/**
 * DTO for template preview request
 */
export class PreviewTemplateDto {
  @ApiPropertyOptional({
    description: 'Sample data for template preview',
    example: { name: 'John Doe', companyName: 'Acme Inc' },
  })
  @IsOptional()
  data?: Record<string, unknown>;
}

/**
 * Response DTO for template preview
 */
export class TemplatePreviewResponseDto {
  @ApiProperty({ description: 'Rendered email subject', example: 'Welcome to Acme Inc!' })
  subject: string;

  @ApiProperty({ description: 'Rendered HTML content' })
  html: string;

  @ApiPropertyOptional({ description: 'Rendered plain text content' })
  text?: string;
}
