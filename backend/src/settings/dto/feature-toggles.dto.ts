/**
 * Feature Toggles DTOs
 * STORY-014A: Feature Toggles Backend
 *
 * Data Transfer Objects for feature toggle management.
 */

import { IsBoolean, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Single feature interface
 * Represents a feature with its metadata and enabled status
 */
export interface Feature {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
}

/**
 * Feature data stored in database
 * Structure of each feature in the JSONB column
 */
export interface FeatureData {
  enabled: boolean;
  name: string;
  description: string;
  category: string;
}

/**
 * Features map stored in database
 * Maps feature keys to their data
 */
export interface FeaturesMap {
  [key: string]: FeatureData;
}

/**
 * DTO for toggling a feature
 */
export class ToggleFeatureDto {
  @ApiProperty({
    description: 'Whether the feature should be enabled',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  enabled: boolean;
}

/**
 * DTO for creating/updating a feature (admin only)
 */
export class UpdateFeatureDto {
  @ApiProperty({
    description: 'Whether the feature is enabled',
    example: true,
  })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({
    description: 'Display name for the feature',
    example: 'User Registration',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Description of what the feature does',
    example: 'Allow users to self-register',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Category for grouping features',
    example: 'authentication',
  })
  @IsString()
  @IsOptional()
  category?: string;
}

/**
 * Response DTO for a single feature
 */
export class FeatureResponseDto {
  @ApiProperty({
    description: 'Unique feature identifier',
    example: 'user-registration',
  })
  key: string;

  @ApiProperty({
    description: 'Display name for the feature',
    example: 'User Registration',
  })
  name: string;

  @ApiProperty({
    description: 'Description of what the feature does',
    example: 'Allow users to self-register',
  })
  description: string;

  @ApiProperty({
    description: 'Whether the feature is currently enabled',
    example: true,
  })
  enabled: boolean;

  @ApiProperty({
    description: 'Category for grouping features',
    example: 'authentication',
  })
  category: string;

  /**
   * Create DTO from feature key and data
   */
  static fromData(key: string, data: FeatureData): FeatureResponseDto {
    const dto = new FeatureResponseDto();
    dto.key = key;
    dto.name = data.name;
    dto.description = data.description;
    dto.enabled = data.enabled;
    dto.category = data.category;
    return dto;
  }
}

/**
 * Response DTO for all features list
 */
export class FeaturesListResponseDto {
  @ApiProperty({
    description: 'List of all features',
    type: [FeatureResponseDto],
  })
  features: FeatureResponseDto[];

  /**
   * Create DTO from features map
   */
  static fromMap(featuresMap: FeaturesMap): FeaturesListResponseDto {
    const dto = new FeaturesListResponseDto();
    dto.features = Object.entries(featuresMap).map(([key, data]) =>
      FeatureResponseDto.fromData(key, data),
    );
    return dto;
  }
}

/**
 * Response DTO for feature toggle operation
 */
export class FeatureToggleResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Feature updated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Updated feature data',
    type: FeatureResponseDto,
  })
  feature: FeatureResponseDto;
}
