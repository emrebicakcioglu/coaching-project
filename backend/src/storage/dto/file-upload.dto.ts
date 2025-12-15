/**
 * File Upload DTOs
 * STORY-026A: MinIO Setup
 * STORY-026B: MinIO File API (Pagination support)
 *
 * Data Transfer Objects for file upload operations.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Supported bucket names for file storage
 */
export enum BucketName {
  UPLOADS = 'uploads',
  LOGOS = 'logos',
  FEEDBACK = 'feedback',
}

/**
 * DTO for file upload requests
 */
export class FileUploadDto {
  @ApiPropertyOptional({
    description: 'Target bucket for the file',
    enum: BucketName,
    default: BucketName.UPLOADS,
  })
  @IsOptional()
  @IsEnum(BucketName)
  bucket?: BucketName = BucketName.UPLOADS;

  @ApiPropertyOptional({
    description: 'Optional custom filename (will be prefixed with timestamp)',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  customName?: string;

  @ApiPropertyOptional({
    description: 'Optional subdirectory path within the bucket',
    maxLength: 255,
    example: 'users/123/profile',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  path?: string;
}

/**
 * DTO for file deletion
 */
export class FileDeleteDto {
  @ApiProperty({
    description: 'Name of the file to delete',
    example: '1699234567890-document.pdf',
  })
  @IsString()
  fileName!: string;

  @ApiPropertyOptional({
    description: 'Target bucket containing the file',
    enum: BucketName,
    default: BucketName.UPLOADS,
  })
  @IsOptional()
  @IsEnum(BucketName)
  bucket?: BucketName = BucketName.UPLOADS;
}

/**
 * DTO for file listing query parameters
 * STORY-026B: Added pagination support
 */
export class FileListQueryDto {
  @ApiPropertyOptional({
    description: 'Target bucket to list files from',
    enum: BucketName,
    default: BucketName.UPLOADS,
  })
  @IsOptional()
  @IsEnum(BucketName)
  bucket?: BucketName = BucketName.UPLOADS;

  @ApiPropertyOptional({
    description: 'Prefix filter for file names',
    maxLength: 255,
    example: 'users/123/',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  prefix?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
