/**
 * Storage Service
 * STORY-026A: MinIO Setup
 * STORY-026B: MinIO File API (Pagination support)
 *
 * Provides file storage functionality using MinIO (S3-compatible).
 *
 * Features:
 * - MinIO client initialization and connection
 * - Bucket creation and management
 * - File upload with metadata
 * - File download as stream
 * - File listing with prefix filtering and pagination (STORY-026B)
 * - File deletion
 * - Presigned URL generation for secure client-side downloads
 *
 * Environment Variables Required:
 * - MINIO_ENDPOINT: MinIO server hostname
 * - MINIO_PORT: MinIO API port (default: 9000)
 * - MINIO_USE_SSL: Use HTTPS (default: false)
 * - MINIO_ACCESS_KEY: MinIO access key
 * - MINIO_SECRET_KEY: MinIO secret key
 * - MINIO_BUCKET_UPLOADS: Bucket for general uploads
 * - MINIO_BUCKET_LOGOS: Bucket for logo files
 * - MINIO_BUCKET_FEEDBACK: Bucket for feedback screenshots
 */

import { Injectable, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { Client as MinioClient, ItemBucketMetadata } from 'minio';
import { Readable } from 'stream';
import { WinstonLoggerService } from '../common/services/logger.service';
import {
  BucketName,
  FileUploadResponseDto,
  FileInfoDto,
  FileListResponseDto,
  FileDeleteResponseDto,
  PresignedUrlResponseDto,
  PresignedUploadResponseDto,
} from './dto';

/**
 * File metadata interface for internal use
 */
interface FileMetadata {
  'Content-Type': string;
  'X-Original-Name': string;
  'X-Upload-Date': string;
  [key: string]: string;
}

/**
 * MinIO list object interface for type safety
 */
interface MinioListObject {
  name?: string;
  size?: number;
  lastModified?: Date;
  etag?: string;
}

/**
 * Storage Service
 * Singleton service for file operations via MinIO
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private client: MinioClient | null = null;
  private readonly endpoint: string;
  private readonly port: number;
  private readonly useSsl: boolean;
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly buckets: { [key in BucketName]: string };
  private bucketsInitialized = false;

  constructor(
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
  ) {
    this.endpoint = process.env.MINIO_ENDPOINT || '';
    this.port = parseInt(process.env.MINIO_PORT || '9000', 10);
    this.useSsl = process.env.MINIO_USE_SSL === 'true';
    this.accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
    this.secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';

    this.buckets = {
      [BucketName.UPLOADS]: process.env.MINIO_BUCKET_UPLOADS || 'uploads',
      [BucketName.LOGOS]: process.env.MINIO_BUCKET_LOGOS || 'logos',
      [BucketName.FEEDBACK]: process.env.MINIO_BUCKET_FEEDBACK || 'feedback',
    };

    this.logger.log('StorageService initialized', 'StorageService');
  }

  /**
   * Module initialization - verify configuration
   */
  async onModuleInit(): Promise<void> {
    if (!this.endpoint) {
      this.logger.warn(
        'MINIO_ENDPOINT not configured. File storage operations will be unavailable.',
        'StorageService',
      );
      return;
    }

    try {
      this.client = new MinioClient({
        endPoint: this.endpoint,
        port: this.port,
        useSSL: this.useSsl,
        accessKey: this.accessKey,
        secretKey: this.secretKey,
      });

      this.logger.log(
        `MinIO client configured: ${this.useSsl ? 'https' : 'http'}://${this.endpoint}:${this.port}`,
        'StorageService',
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize MinIO client: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'StorageService',
      );
    }
  }

  /**
   * Initialize required buckets
   * Called on module startup
   */
  async initializeBuckets(): Promise<void> {
    if (!this.client) {
      this.logger.warn('MinIO client not initialized. Skipping bucket initialization.', 'StorageService');
      return;
    }

    for (const bucketKey of Object.values(BucketName)) {
      const bucketName = this.buckets[bucketKey];
      try {
        const exists = await this.client.bucketExists(bucketName);
        if (!exists) {
          await this.client.makeBucket(bucketName);
          this.logger.log(`Created bucket: ${bucketName}`, 'StorageService');
        } else {
          this.logger.debug(`Bucket exists: ${bucketName}`, 'StorageService');
        }
      } catch (error) {
        this.logger.error(
          `Failed to initialize bucket ${bucketName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : undefined,
          'StorageService',
        );
      }
    }

    this.bucketsInitialized = true;
    this.logger.log('Bucket initialization complete', 'StorageService');
  }

  /**
   * Check if storage service is properly configured and ready
   */
  isConfigured(): boolean {
    return !!this.client && !!this.endpoint;
  }

  /**
   * Check if buckets have been initialized
   */
  areBucketsInitialized(): boolean {
    return this.bucketsInitialized;
  }

  /**
   * Get the actual bucket name from enum
   */
  getBucketName(bucket: BucketName): string {
    return this.buckets[bucket];
  }

  /**
   * Generate a unique filename with timestamp prefix
   */
  private generateFileName(originalName: string, customName?: string): string {
    const timestamp = Date.now();
    const safeName = (customName || originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${timestamp}-${safeName}`;
  }

  /**
   * Upload a file to MinIO
   */
  async uploadFile(
    file: Express.Multer.File,
    bucket: BucketName = BucketName.UPLOADS,
    customName?: string,
    path?: string,
  ): Promise<FileUploadResponseDto> {
    if (!this.client) {
      throw new Error('MinIO client not initialized. Storage service is unavailable.');
    }

    const bucketName = this.buckets[bucket];
    const fileName = this.generateFileName(file.originalname, customName);
    const objectName = path ? `${path}/${fileName}` : fileName;

    const metadata: FileMetadata = {
      'Content-Type': file.mimetype,
      'X-Original-Name': file.originalname,
      'X-Upload-Date': new Date().toISOString(),
    };

    try {
      const result = await this.client.putObject(
        bucketName,
        objectName,
        file.buffer,
        file.size,
        metadata,
      );

      this.logger.log(
        `File uploaded: ${objectName} to bucket ${bucketName} (${file.size} bytes)`,
        'StorageService',
      );

      return {
        success: true,
        fileName: objectName,
        originalName: file.originalname,
        bucket: bucketName,
        size: file.size,
        mimeType: file.mimetype,
        url: `/api/v1/files/${encodeURIComponent(objectName)}`,
        etag: result.etag,
      };
    } catch (error) {
      this.logger.error(
        `Failed to upload file ${objectName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'StorageService',
      );
      throw error;
    }
  }

  /**
   * Upload a file from buffer (for internal use, e.g., feedback screenshots)
   */
  async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    bucket: BucketName = BucketName.UPLOADS,
  ): Promise<FileUploadResponseDto> {
    if (!this.client) {
      throw new Error('MinIO client not initialized. Storage service is unavailable.');
    }

    const bucketName = this.buckets[bucket];
    const objectName = this.generateFileName(fileName);

    const metadata: FileMetadata = {
      'Content-Type': mimeType,
      'X-Original-Name': fileName,
      'X-Upload-Date': new Date().toISOString(),
    };

    try {
      const result = await this.client.putObject(
        bucketName,
        objectName,
        buffer,
        buffer.length,
        metadata,
      );

      this.logger.log(
        `Buffer uploaded: ${objectName} to bucket ${bucketName} (${buffer.length} bytes)`,
        'StorageService',
      );

      return {
        success: true,
        fileName: objectName,
        originalName: fileName,
        bucket: bucketName,
        size: buffer.length,
        mimeType,
        url: `/api/v1/files/${encodeURIComponent(objectName)}`,
        etag: result.etag,
      };
    } catch (error) {
      this.logger.error(
        `Failed to upload buffer ${objectName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'StorageService',
      );
      throw error;
    }
  }

  /**
   * Get file as stream for download
   */
  async getFile(
    fileName: string,
    bucket: BucketName = BucketName.UPLOADS,
  ): Promise<{ stream: Readable; stat: { size: number; metaData: ItemBucketMetadata } }> {
    if (!this.client) {
      throw new Error('MinIO client not initialized. Storage service is unavailable.');
    }

    const bucketName = this.buckets[bucket];

    try {
      const stat = await this.client.statObject(bucketName, fileName);
      const stream = await this.client.getObject(bucketName, fileName);

      return {
        stream,
        stat: {
          size: stat.size,
          metaData: stat.metaData || {},
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get file ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'StorageService',
      );
      throw error;
    }
  }

  /**
   * Get file metadata/stat
   */
  async getFileStat(
    fileName: string,
    bucket: BucketName = BucketName.UPLOADS,
  ): Promise<FileInfoDto | null> {
    if (!this.client) {
      throw new Error('MinIO client not initialized. Storage service is unavailable.');
    }

    const bucketName = this.buckets[bucket];

    try {
      const stat = await this.client.statObject(bucketName, fileName);

      return {
        name: fileName,
        size: stat.size,
        lastModified: stat.lastModified,
        etag: stat.etag,
        contentType: stat.metaData?.['content-type'] || 'application/octet-stream',
      };
    } catch (error) {
      // Return null if file doesn't exist (NotFound)
      if ((error as { code?: string }).code === 'NotFound') {
        return null;
      }
      throw error;
    }
  }

  /**
   * List files in a bucket with optional prefix and pagination
   * STORY-026B: Added pagination support
   *
   * @param bucket - Bucket to list files from
   * @param prefix - Optional prefix filter
   * @param page - Page number (1-indexed)
   * @param limit - Number of items per page
   */
  async listFiles(
    bucket: BucketName = BucketName.UPLOADS,
    prefix?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<FileListResponseDto> {
    if (!this.client) {
      throw new Error('MinIO client not initialized. Storage service is unavailable.');
    }

    const bucketName = this.buckets[bucket];
    const allFiles: FileInfoDto[] = [];

    return new Promise((resolve, reject) => {
      const stream = this.client!.listObjects(bucketName, prefix || '', true);

      stream.on('data', (obj: MinioListObject) => {
        if (obj.name) {
          allFiles.push({
            name: obj.name,
            size: obj.size ?? 0,
            lastModified: obj.lastModified ?? new Date(),
            etag: obj.etag,
          });
        }
      });

      stream.on('error', (error: Error) => {
        this.logger.error(
          `Failed to list files in ${bucketName}: ${error.message}`,
          error.stack,
          'StorageService',
        );
        reject(error);
      });

      stream.on('end', () => {
        // Calculate pagination
        const total = allFiles.length;
        const pages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedFiles = allFiles.slice(startIndex, endIndex);

        resolve({
          success: true,
          bucket: bucketName,
          count: paginatedFiles.length,
          files: paginatedFiles,
          prefix: prefix || undefined,
          pagination: {
            page,
            limit,
            total,
            pages,
          },
        });
      });
    });
  }

  /**
   * Delete a file from MinIO
   */
  async deleteFile(
    fileName: string,
    bucket: BucketName = BucketName.UPLOADS,
  ): Promise<FileDeleteResponseDto> {
    if (!this.client) {
      throw new Error('MinIO client not initialized. Storage service is unavailable.');
    }

    const bucketName = this.buckets[bucket];

    try {
      // Check if file exists first
      await this.client.statObject(bucketName, fileName);

      // Delete the file
      await this.client.removeObject(bucketName, fileName);

      this.logger.log(`File deleted: ${fileName} from bucket ${bucketName}`, 'StorageService');

      return {
        success: true,
        fileName,
        message: 'File deleted successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to delete file ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'StorageService',
      );
      throw error;
    }
  }

  /**
   * Generate a presigned URL for file download
   */
  async getPresignedDownloadUrl(
    fileName: string,
    bucket: BucketName = BucketName.UPLOADS,
    expirySeconds: number = 3600,
  ): Promise<PresignedUrlResponseDto> {
    if (!this.client) {
      throw new Error('MinIO client not initialized. Storage service is unavailable.');
    }

    const bucketName = this.buckets[bucket];

    try {
      // Verify file exists
      await this.client.statObject(bucketName, fileName);

      // Generate presigned URL
      const url = await this.client.presignedGetObject(bucketName, fileName, expirySeconds);

      const expiresAt = new Date(Date.now() + expirySeconds * 1000);

      this.logger.debug(
        `Presigned download URL generated for ${fileName} (expires in ${expirySeconds}s)`,
        'StorageService',
      );

      return {
        success: true,
        fileName,
        url,
        expiresIn: expirySeconds,
        expiresAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned URL for ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'StorageService',
      );
      throw error;
    }
  }

  /**
   * Generate a presigned URL for file upload
   * Allows clients to upload directly to MinIO
   */
  async getPresignedUploadUrl(
    fileName: string,
    bucket: BucketName = BucketName.UPLOADS,
    expirySeconds: number = 3600,
  ): Promise<PresignedUploadResponseDto> {
    if (!this.client) {
      throw new Error('MinIO client not initialized. Storage service is unavailable.');
    }

    const bucketName = this.buckets[bucket];
    const objectName = this.generateFileName(fileName);

    try {
      // Generate presigned PUT URL
      const url = await this.client.presignedPutObject(bucketName, objectName, expirySeconds);

      const expiresAt = new Date(Date.now() + expirySeconds * 1000);

      this.logger.debug(
        `Presigned upload URL generated for ${objectName} (expires in ${expirySeconds}s)`,
        'StorageService',
      );

      return {
        success: true,
        fileName: objectName,
        uploadUrl: url,
        fileUrl: `/api/v1/files/${encodeURIComponent(objectName)}`,
        expiresIn: expirySeconds,
        expiresAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned upload URL for ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'StorageService',
      );
      throw error;
    }
  }

  /**
   * Check if a file exists in MinIO
   */
  async fileExists(fileName: string, bucket: BucketName = BucketName.UPLOADS): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    const bucketName = this.buckets[bucket];

    try {
      await this.client.statObject(bucketName, fileName);
      return true;
    } catch {
      return false;
    }
  }
}
