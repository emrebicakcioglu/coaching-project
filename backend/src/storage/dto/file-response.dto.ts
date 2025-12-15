/**
 * File Response DTOs
 * STORY-026A: MinIO Setup
 * STORY-026B: MinIO File API (Pagination support)
 *
 * Data Transfer Objects for file operation responses.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO for successful file upload
 */
export class FileUploadResponseDto {
  @ApiProperty({
    description: 'Indicates upload was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Stored filename (with timestamp prefix)',
    example: '1699234567890-document.pdf',
  })
  fileName!: string;

  @ApiProperty({
    description: 'Original filename',
    example: 'document.pdf',
  })
  originalName!: string;

  @ApiProperty({
    description: 'Bucket where file is stored',
    example: 'uploads',
  })
  bucket!: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 102400,
  })
  size!: number;

  @ApiProperty({
    description: 'File MIME type',
    example: 'application/pdf',
  })
  mimeType!: string;

  @ApiProperty({
    description: 'API URL to access the file',
    example: '/api/v1/files/1699234567890-document.pdf',
  })
  url!: string;

  @ApiPropertyOptional({
    description: 'ETag returned by MinIO',
    example: '"d41d8cd98f00b204e9800998ecf8427e"',
  })
  etag?: string;
}

/**
 * Response DTO for file metadata/info
 */
export class FileInfoDto {
  @ApiProperty({
    description: 'Filename',
    example: '1699234567890-document.pdf',
  })
  name!: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 102400,
  })
  size!: number;

  @ApiProperty({
    description: 'Last modified date',
    example: '2024-01-15T10:30:00Z',
  })
  lastModified!: Date;

  @ApiPropertyOptional({
    description: 'ETag/version identifier',
  })
  etag?: string;

  @ApiPropertyOptional({
    description: 'Content type (MIME type)',
    example: 'application/pdf',
  })
  contentType?: string;
}

/**
 * Pagination metadata DTO for file listing
 * STORY-026B: Added for pagination support
 */
export class FilePaginationDto {
  @ApiProperty({
    description: 'Current page number (1-indexed)',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit!: number;

  @ApiProperty({
    description: 'Total number of files across all pages',
    example: 100,
  })
  total!: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  pages!: number;
}

/**
 * Response DTO for file listing
 * STORY-026B: Added pagination support
 */
export class FileListResponseDto {
  @ApiProperty({
    description: 'Indicates operation was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Bucket name',
    example: 'uploads',
  })
  bucket!: string;

  @ApiProperty({
    description: 'Number of files on current page',
    example: 20,
  })
  count!: number;

  @ApiProperty({
    description: 'List of files for current page',
    type: [FileInfoDto],
  })
  files!: FileInfoDto[];

  @ApiPropertyOptional({
    description: 'Prefix used for filtering',
    example: 'users/123/',
  })
  prefix?: string;

  @ApiPropertyOptional({
    description: 'Pagination metadata (STORY-026B)',
    type: FilePaginationDto,
  })
  pagination?: FilePaginationDto;
}

/**
 * Response DTO for file deletion
 */
export class FileDeleteResponseDto {
  @ApiProperty({
    description: 'Indicates deletion was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Deleted filename',
    example: '1699234567890-document.pdf',
  })
  fileName!: string;

  @ApiProperty({
    description: 'Deletion message',
    example: 'File deleted successfully',
  })
  message!: string;
}

/**
 * Generic error response DTO
 */
export class StorageErrorResponseDto {
  @ApiProperty({
    description: 'Indicates operation failed',
    example: false,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Error message',
    example: 'File not found',
  })
  error!: string;
}
