/**
 * Storage Module
 * STORY-026A: MinIO Setup
 * STORY-026B: MinIO File API (Pagination support)
 *
 * NestJS module for file storage functionality using MinIO.
 * Provides S3-compatible object storage for file uploads.
 *
 * Features:
 * - MinIO client integration
 * - Bucket initialization (uploads, logos, feedback)
 * - File upload/download API with pagination (STORY-026B)
 * - Presigned URL generation
 * - File metadata handling
 *
 * Exports:
 * - StorageService: For file operations from other modules
 */

import { Module, Global, OnModuleInit } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { WinstonLoggerService } from '../common/services/logger.service';

/**
 * Global Storage Module
 * Making it global allows other modules to use storage services without importing StorageModule
 */
@Global()
@Module({
  imports: [
    // Configure Multer for in-memory file storage
    // Files are stored in buffer and passed directly to MinIO
    MulterModule.register({
      storage: undefined, // Use memory storage (default)
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
      },
    }),
  ],
  controllers: [StorageController],
  providers: [StorageService, WinstonLoggerService],
  exports: [StorageService],
})
export class StorageModule implements OnModuleInit {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Initialize buckets on module startup
   */
  async onModuleInit(): Promise<void> {
    await this.storageService.initializeBuckets();
  }
}
