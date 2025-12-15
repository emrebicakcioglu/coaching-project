/**
 * Maintenance DTOs
 * STORY-034: Maintenance Mode
 *
 * Data Transfer Objects for maintenance mode API
 */

import {
  IsBoolean,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating maintenance mode settings
 */
export class UpdateMaintenanceDto {
  @ApiProperty({
    description: 'Enable or disable maintenance mode',
    example: true,
  })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({
    description: 'Custom maintenance message to display to users',
    example: 'System maintenance in progress. We will be back soon!',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Message must be at most 500 characters' })
  message?: string;

  @ApiPropertyOptional({
    description: 'Estimated duration of maintenance in minutes',
    example: 120,
    minimum: 1,
    maximum: 1440, // 24 hours
  })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Duration must be at least 1 minute' })
  @Max(1440, { message: 'Duration cannot exceed 24 hours (1440 minutes)' })
  estimatedDurationMinutes?: number;
}

/**
 * DTO for maintenance status response
 */
export class MaintenanceResponseDto {
  @ApiProperty({
    description: 'Whether maintenance mode is currently enabled',
    example: false,
  })
  enabled: boolean;

  @ApiProperty({
    description: 'Maintenance message to display',
    example: 'We are currently performing scheduled maintenance. Please check back soon.',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Estimated end time of maintenance (ISO 8601 format)',
    example: '2025-11-19T18:00:00Z',
    nullable: true,
  })
  estimatedEndTime: string | null;

  @ApiPropertyOptional({
    description: 'When maintenance mode was started (ISO 8601 format)',
    example: '2025-11-19T16:00:00Z',
    nullable: true,
  })
  startedAt: string | null;
}

/**
 * DTO for maintenance update response with success message
 */
export class MaintenanceUpdateResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Maintenance mode enabled',
  })
  message: string;

  @ApiProperty({
    description: 'Updated maintenance status',
    type: MaintenanceResponseDto,
  })
  maintenance: MaintenanceResponseDto;
}
