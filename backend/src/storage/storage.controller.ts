/**
 * Storage Controller
 * STORY-026A: MinIO Setup
 * STORY-026B: MinIO File API (Pagination support)
 *
 * REST API endpoints for file storage operations.
 *
 * Endpoints:
 * - POST   /api/v1/files/upload              - Upload a file to MinIO
 * - GET    /api/v1/files/:fileName           - Download a file from MinIO
 * - GET    /api/v1/files                     - List files in bucket (with pagination)
 * - DELETE /api/v1/files/:fileName           - Delete a file from MinIO
 * - GET    /api/v1/files/:fileName/presigned - Get presigned URL for download
 * - POST   /api/v1/files/presigned-upload    - Get presigned URL for upload
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { StorageService } from './storage.service';
import {
  BucketName,
  FileUploadDto,
  FileListQueryDto,
  FileUploadResponseDto,
  FileListResponseDto,
  FileDeleteResponseDto,
  StorageErrorResponseDto,
  PresignedUrlQueryDto,
  PresignedUrlResponseDto,
  PresignedUploadRequestDto,
  PresignedUploadResponseDto,
} from './dto';

/**
 * Multer configuration for file uploads
 * Max file size: 50MB
 */
const multerConfig = {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
};

@ApiTags('Files')
@Controller('api/v1/files')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Upload a file to MinIO
   */
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiOperation({ summary: 'Upload a file to MinIO storage' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The file to upload (max 50MB)',
        },
        bucket: {
          type: 'string',
          enum: Object.values(BucketName),
          default: BucketName.UPLOADS,
          description: 'Target bucket',
        },
        customName: {
          type: 'string',
          description: 'Optional custom filename',
        },
        path: {
          type: 'string',
          description: 'Optional subdirectory path',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: FileUploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - no file provided or invalid parameters',
    type: StorageErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - valid JWT required',
  })
  @ApiResponse({
    status: 500,
    description: 'Storage service unavailable',
    type: StorageErrorResponseDto,
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: FileUploadDto,
  ): Promise<FileUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!this.storageService.isConfigured()) {
      throw new InternalServerErrorException('Storage service is not configured');
    }

    try {
      const bucket = dto.bucket || BucketName.UPLOADS;
      return await this.storageService.uploadFile(file, bucket, dto.customName, dto.path);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Download a file from MinIO
   */
  @Get(':fileName')
  @ApiOperation({ summary: 'Download a file from MinIO storage' })
  @ApiParam({
    name: 'fileName',
    description: 'Name of the file to download',
    example: '1699234567890-document.pdf',
  })
  @ApiQuery({
    name: 'bucket',
    required: false,
    enum: BucketName,
    description: 'Source bucket (default: uploads)',
  })
  @ApiResponse({
    status: 200,
    description: 'File content as stream',
    content: {
      'application/octet-stream': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
    type: StorageErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Storage service unavailable',
    type: StorageErrorResponseDto,
  })
  async downloadFile(
    @Param('fileName') fileName: string,
    @Query('bucket') bucket: BucketName = BucketName.UPLOADS,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.storageService.isConfigured()) {
      throw new InternalServerErrorException('Storage service is not configured');
    }

    try {
      const { stream, stat } = await this.storageService.getFile(fileName, bucket);

      // Set response headers
      const contentType = (stat.metaData?.['content-type'] || 'application/octet-stream') as string;
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      // Pipe the stream to response
      stream.pipe(res);
    } catch (error) {
      if ((error as { code?: string }).code === 'NotFound') {
        throw new NotFoundException(`File not found: ${fileName}`);
      }
      throw new InternalServerErrorException(
        `Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * List files in a bucket
   * STORY-026B: Added pagination support
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List files in a bucket with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of files',
    type: FileListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - valid JWT required',
  })
  @ApiResponse({
    status: 500,
    description: 'Storage service unavailable',
    type: StorageErrorResponseDto,
  })
  async listFiles(@Query() query: FileListQueryDto): Promise<FileListResponseDto> {
    if (!this.storageService.isConfigured()) {
      throw new InternalServerErrorException('Storage service is not configured');
    }

    try {
      const bucket = query.bucket || BucketName.UPLOADS;
      const page = query.page || 1;
      const limit = query.limit || 20;
      return await this.storageService.listFiles(bucket, query.prefix, page, limit);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete a file from MinIO
   */
  @Delete(':fileName')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a file from MinIO storage' })
  @ApiParam({
    name: 'fileName',
    description: 'Name of the file to delete',
    example: '1699234567890-document.pdf',
  })
  @ApiQuery({
    name: 'bucket',
    required: false,
    enum: BucketName,
    description: 'Source bucket (default: uploads)',
  })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
    type: FileDeleteResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - valid JWT required',
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
    type: StorageErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Storage service unavailable',
    type: StorageErrorResponseDto,
  })
  async deleteFile(
    @Param('fileName') fileName: string,
    @Query('bucket') bucket: BucketName = BucketName.UPLOADS,
  ): Promise<FileDeleteResponseDto> {
    if (!this.storageService.isConfigured()) {
      throw new InternalServerErrorException('Storage service is not configured');
    }

    try {
      return await this.storageService.deleteFile(fileName, bucket);
    } catch (error) {
      if ((error as { code?: string }).code === 'NotFound') {
        throw new NotFoundException(`File not found: ${fileName}`);
      }
      throw new InternalServerErrorException(
        `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get a presigned URL for file download
   */
  @Get(':fileName/presigned')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a presigned URL for secure file download' })
  @ApiParam({
    name: 'fileName',
    description: 'Name of the file',
    example: '1699234567890-document.pdf',
  })
  @ApiResponse({
    status: 200,
    description: 'Presigned URL generated',
    type: PresignedUrlResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - valid JWT required',
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
    type: StorageErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Storage service unavailable',
    type: StorageErrorResponseDto,
  })
  async getPresignedUrl(
    @Param('fileName') fileName: string,
    @Query() query: PresignedUrlQueryDto,
  ): Promise<PresignedUrlResponseDto> {
    if (!this.storageService.isConfigured()) {
      throw new InternalServerErrorException('Storage service is not configured');
    }

    try {
      const bucket = query.bucket || BucketName.UPLOADS;
      const expiry = query.expiry || 3600;
      return await this.storageService.getPresignedDownloadUrl(fileName, bucket, expiry);
    } catch (error) {
      if ((error as { code?: string }).code === 'NotFound') {
        throw new NotFoundException(`File not found: ${fileName}`);
      }
      throw new InternalServerErrorException(
        `Failed to generate presigned URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get a presigned URL for file upload
   */
  @Post('presigned-upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a presigned URL for direct file upload to MinIO' })
  @ApiResponse({
    status: 201,
    description: 'Presigned upload URL generated',
    type: PresignedUploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid parameters',
    type: StorageErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - valid JWT required',
  })
  @ApiResponse({
    status: 500,
    description: 'Storage service unavailable',
    type: StorageErrorResponseDto,
  })
  async getPresignedUploadUrl(
    @Body() dto: PresignedUploadRequestDto,
  ): Promise<PresignedUploadResponseDto> {
    if (!dto.fileName) {
      throw new BadRequestException('fileName is required');
    }

    if (!this.storageService.isConfigured()) {
      throw new InternalServerErrorException('Storage service is not configured');
    }

    try {
      const bucket = dto.bucket || BucketName.UPLOADS;
      const expiry = dto.expiry || 3600;
      return await this.storageService.getPresignedUploadUrl(dto.fileName, bucket, expiry);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to generate presigned upload URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Check if a file exists
   */
  @Get(':fileName/exists')
  @ApiOperation({ summary: 'Check if a file exists in storage' })
  @ApiParam({
    name: 'fileName',
    description: 'Name of the file to check',
    example: '1699234567890-document.pdf',
  })
  @ApiQuery({
    name: 'bucket',
    required: false,
    enum: BucketName,
    description: 'Source bucket (default: uploads)',
  })
  @ApiResponse({
    status: 200,
    description: 'File existence status',
    schema: {
      type: 'object',
      properties: {
        exists: { type: 'boolean' },
        fileName: { type: 'string' },
      },
    },
  })
  async checkFileExists(
    @Param('fileName') fileName: string,
    @Query('bucket') bucket: BucketName = BucketName.UPLOADS,
  ): Promise<{ exists: boolean; fileName: string }> {
    if (!this.storageService.isConfigured()) {
      return { exists: false, fileName };
    }

    const exists = await this.storageService.fileExists(fileName, bucket);
    return { exists, fileName };
  }
}
