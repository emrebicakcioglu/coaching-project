/**
 * Presigned URL DTOs
 * STORY-026A: MinIO Setup
 * STORY-026B: MinIO File API
 *
 * Data Transfer Objects for presigned URL operations.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { BucketName } from './file-upload.dto';

/**
 * Query DTO for presigned URL generation
 */
export class PresignedUrlQueryDto {
  @ApiPropertyOptional({
    description: 'Target bucket containing the file',
    enum: BucketName,
    default: BucketName.UPLOADS,
  })
  @IsOptional()
  @IsEnum(BucketName)
  bucket?: BucketName = BucketName.UPLOADS;

  @ApiPropertyOptional({
    description: 'URL expiry time in seconds (default: 3600 = 1 hour, max: 604800 = 7 days)',
    default: 3600,
    minimum: 60,
    maximum: 604800,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(60)
  @Max(604800)
  expiry?: number = 3600;
}

/**
 * Response DTO for presigned URL
 */
export class PresignedUrlResponseDto {
  @ApiProperty({
    description: 'Indicates operation was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Filename',
    example: '1699234567890-document.pdf',
  })
  fileName!: string;

  @ApiProperty({
    description: 'Presigned URL for secure download',
    example: 'http://localhost:14104/uploads/1699234567890-document.pdf?X-Amz-Algorithm=...',
  })
  url!: string;

  @ApiProperty({
    description: 'URL expiry time in seconds',
    example: 3600,
  })
  expiresIn!: number;

  @ApiProperty({
    description: 'URL expiration timestamp',
    example: '2024-01-15T11:30:00Z',
  })
  expiresAt!: Date;
}

/**
 * Request DTO for presigned upload URL
 */
export class PresignedUploadRequestDto {
  @ApiProperty({
    description: 'Filename for the upload',
    example: 'document.pdf',
  })
  @IsString()
  fileName!: string;

  @ApiPropertyOptional({
    description: 'Target bucket for the upload',
    enum: BucketName,
    default: BucketName.UPLOADS,
  })
  @IsOptional()
  @IsEnum(BucketName)
  bucket?: BucketName = BucketName.UPLOADS;

  @ApiPropertyOptional({
    description: 'Content type of the file',
    example: 'application/pdf',
  })
  @IsOptional()
  @IsString()
  contentType?: string;

  @ApiPropertyOptional({
    description: 'URL expiry time in seconds (default: 3600 = 1 hour)',
    default: 3600,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(60)
  @Max(604800)
  expiry?: number = 3600;
}

/**
 * Response DTO for presigned upload URL
 */
export class PresignedUploadResponseDto {
  @ApiProperty({
    description: 'Indicates operation was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Stored filename (with timestamp prefix)',
    example: '1699234567890-document.pdf',
  })
  fileName!: string;

  @ApiProperty({
    description: 'Presigned URL for upload',
    example: 'http://localhost:14104/uploads/1699234567890-document.pdf?X-Amz-Algorithm=...',
  })
  uploadUrl!: string;

  @ApiProperty({
    description: 'URL to access the file after upload',
    example: '/api/v1/files/1699234567890-document.pdf',
  })
  fileUrl!: string;

  @ApiProperty({
    description: 'URL expiry time in seconds',
    example: 3600,
  })
  expiresIn!: number;

  @ApiProperty({
    description: 'URL expiration timestamp',
    example: '2024-01-15T11:30:00Z',
  })
  expiresAt!: Date;
}
