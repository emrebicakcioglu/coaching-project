/**
 * Storage Integration Tests
 * STORY-026A: MinIO Setup
 * STORY-026B: MinIO File API (Pagination support)
 *
 * Integration tests for the file storage API endpoints.
 * These tests verify the full request/response cycle with mocked MinIO client.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { StorageModule } from '../../src/storage/storage.module';
import { StorageService } from '../../src/storage/storage.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { BucketName } from '../../src/storage/dto';

// Mock JWT Auth Guard to allow all requests
const mockJwtAuthGuard = {
  canActivate: jest.fn().mockReturnValue(true),
};

// Mock Logger
const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// Mock StorageService for integration tests
const mockStorageService = {
  isConfigured: jest.fn().mockReturnValue(true),
  initializeBuckets: jest.fn().mockResolvedValue(undefined),
  getBucketName: jest.fn((bucket: BucketName) => {
    const names = {
      [BucketName.UPLOADS]: 'uploads',
      [BucketName.LOGOS]: 'logos',
      [BucketName.FEEDBACK]: 'feedback',
    };
    return names[bucket];
  }),
  uploadFile: jest.fn(),
  uploadBuffer: jest.fn(),
  getFile: jest.fn(),
  getFileStat: jest.fn(),
  listFiles: jest.fn(),
  deleteFile: jest.fn(),
  getPresignedDownloadUrl: jest.fn(),
  getPresignedUploadUrl: jest.fn(),
  fileExists: jest.fn(),
};

describe('Storage Integration Tests (STORY-026A)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Set test environment variables
    process.env.MINIO_ENDPOINT = 'localhost';
    process.env.MINIO_PORT = '9000';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [StorageModule],
    })
      .overrideProvider(StorageService)
      .useValue(mockStorageService)
      .overrideProvider(WinstonLoggerService)
      .useValue(mockLogger)
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageService.isConfigured.mockReturnValue(true);
  });

  describe('POST /api/v1/files/upload', () => {
    it('should upload a file successfully', async () => {
      mockStorageService.uploadFile.mockResolvedValue({
        success: true,
        fileName: '1699234567890-test-document.pdf',
        originalName: 'test-document.pdf',
        bucket: 'uploads',
        size: 1024,
        mimeType: 'application/pdf',
        url: '/api/v1/files/1699234567890-test-document.pdf',
        etag: '"abc123"',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/files/upload')
        .attach('file', Buffer.from('test content'), 'test-document.pdf')
        .field('bucket', 'uploads')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.originalName).toBe('test-document.pdf');
      expect(response.body.url).toContain('/api/v1/files/');
    });

    it('should return 400 when no file is provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/files/upload')
        .field('bucket', 'uploads')
        .expect(400);

      expect(response.body.message).toContain('No file provided');
    });

    it('should return 500 when storage is not configured', async () => {
      mockStorageService.isConfigured.mockReturnValue(false);

      const response = await request(app.getHttpServer())
        .post('/api/v1/files/upload')
        .attach('file', Buffer.from('test content'), 'test-document.pdf')
        .expect(500);

      expect(response.body.message).toContain('not configured');
    });

    it('should upload to specific bucket', async () => {
      mockStorageService.uploadFile.mockResolvedValue({
        success: true,
        fileName: '1699234567890-logo.png',
        originalName: 'logo.png',
        bucket: 'logos',
        size: 2048,
        mimeType: 'image/png',
        url: '/api/v1/files/1699234567890-logo.png',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/files/upload')
        .attach('file', Buffer.from('PNG image data'), 'logo.png')
        .field('bucket', 'logos')
        .expect(201);

      expect(response.body.bucket).toBe('logos');
    });
  });

  describe('GET /api/v1/files/:fileName', () => {
    it('should download a file successfully', async () => {
      const fileContent = Buffer.from('test file content');
      const mockStream = {
        pipe: jest.fn((res) => {
          res.send(fileContent);
        }),
      };

      mockStorageService.getFile.mockResolvedValue({
        stream: mockStream,
        stat: {
          size: fileContent.length,
          metaData: { 'content-type': 'application/pdf' },
        },
      });

      await request(app.getHttpServer())
        .get('/api/v1/files/test-file.pdf')
        .expect('Content-Type', /application\/pdf/)
        .expect(200);
    });

    it('should return 404 when file not found', async () => {
      const notFoundError = new Error('Not found');
      (notFoundError as { code?: string }).code = 'NotFound';
      mockStorageService.getFile.mockRejectedValue(notFoundError);

      const response = await request(app.getHttpServer())
        .get('/api/v1/files/non-existent.pdf')
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should download from specific bucket', async () => {
      const fileContent = Buffer.from('test logo content');
      const mockStream = {
        pipe: jest.fn((res) => {
          res.send(fileContent);
        }),
      };

      mockStorageService.getFile.mockResolvedValue({
        stream: mockStream,
        stat: {
          size: 100,
          metaData: { 'content-type': 'image/png' },
        },
      });

      await request(app.getHttpServer())
        .get('/api/v1/files/logo.png?bucket=logos')
        .expect(200);

      expect(mockStorageService.getFile).toHaveBeenCalledWith('logo.png', 'logos');
    });
  });

  describe('GET /api/v1/files', () => {
    it('should list files in bucket with pagination', async () => {
      mockStorageService.listFiles.mockResolvedValue({
        success: true,
        bucket: 'uploads',
        count: 2,
        files: [
          { name: 'file1.pdf', size: 1024, lastModified: new Date() },
          { name: 'file2.pdf', size: 2048, lastModified: new Date() },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          pages: 1,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/files')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.files).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.total).toBe(2);
    });

    it('should filter files by prefix', async () => {
      mockStorageService.listFiles.mockResolvedValue({
        success: true,
        bucket: 'uploads',
        count: 1,
        files: [{ name: 'users/123/file.pdf', size: 1024, lastModified: new Date() }],
        prefix: 'users/123/',
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          pages: 1,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/files?prefix=users/123/')
        .expect(200);

      expect(response.body.prefix).toBe('users/123/');
      expect(mockStorageService.listFiles).toHaveBeenCalledWith(
        expect.any(String),
        'users/123/',
        1,
        20,
      );
    });

    it('should list files from specific bucket', async () => {
      mockStorageService.listFiles.mockResolvedValue({
        success: true,
        bucket: 'feedback',
        count: 5,
        files: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 5,
          pages: 1,
        },
      });

      await request(app.getHttpServer())
        .get('/api/v1/files?bucket=feedback')
        .expect(200);

      expect(mockStorageService.listFiles).toHaveBeenCalledWith('feedback', undefined, 1, 20);
    });

    // STORY-026B: Pagination tests
    it('should support page parameter', async () => {
      mockStorageService.listFiles.mockResolvedValue({
        success: true,
        bucket: 'uploads',
        count: 10,
        files: Array.from({ length: 10 }, (_, i) => ({
          name: `file${i + 11}.pdf`,
          size: 1024,
          lastModified: new Date(),
        })),
        pagination: {
          page: 2,
          limit: 10,
          total: 25,
          pages: 3,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/files?page=2&limit=10')
        .expect(200);

      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(10);
      expect(mockStorageService.listFiles).toHaveBeenCalledWith('uploads', undefined, 2, 10);
    });

    it('should support limit parameter', async () => {
      mockStorageService.listFiles.mockResolvedValue({
        success: true,
        bucket: 'uploads',
        count: 50,
        files: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 100,
          pages: 2,
        },
      });

      await request(app.getHttpServer())
        .get('/api/v1/files?limit=50')
        .expect(200);

      expect(mockStorageService.listFiles).toHaveBeenCalledWith('uploads', undefined, 1, 50);
    });

    it('should validate page must be at least 1', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/files?page=0')
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should validate limit must be between 1 and 100', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/files?limit=150')
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('DELETE /api/v1/files/:fileName', () => {
    it('should delete file successfully', async () => {
      mockStorageService.deleteFile.mockResolvedValue({
        success: true,
        fileName: 'test-file.pdf',
        message: 'File deleted successfully',
      });

      const response = await request(app.getHttpServer())
        .delete('/api/v1/files/test-file.pdf')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('File deleted successfully');
    });

    it('should return 404 when file not found', async () => {
      const notFoundError = new Error('Not found');
      (notFoundError as { code?: string }).code = 'NotFound';
      mockStorageService.deleteFile.mockRejectedValue(notFoundError);

      const response = await request(app.getHttpServer())
        .delete('/api/v1/files/non-existent.pdf')
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should delete from specific bucket', async () => {
      mockStorageService.deleteFile.mockResolvedValue({
        success: true,
        fileName: 'logo.png',
        message: 'File deleted successfully',
      });

      await request(app.getHttpServer())
        .delete('/api/v1/files/logo.png?bucket=logos')
        .expect(200);

      expect(mockStorageService.deleteFile).toHaveBeenCalledWith('logo.png', 'logos');
    });
  });

  describe('GET /api/v1/files/:fileName/presigned', () => {
    it('should generate presigned download URL', async () => {
      const expiresAt = new Date(Date.now() + 3600000);
      mockStorageService.getPresignedDownloadUrl.mockResolvedValue({
        success: true,
        fileName: 'test-file.pdf',
        url: 'http://localhost:9000/uploads/test-file.pdf?X-Amz-Signature=abc123',
        expiresIn: 3600,
        expiresAt,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/files/test-file.pdf/presigned')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.url).toContain('http://localhost:9000');
      expect(response.body.expiresIn).toBe(3600);
    });

    it('should use custom expiry time', async () => {
      mockStorageService.getPresignedDownloadUrl.mockResolvedValue({
        success: true,
        fileName: 'test-file.pdf',
        url: 'http://localhost:9000/uploads/test-file.pdf?X-Amz-Signature=abc123',
        expiresIn: 7200,
        expiresAt: new Date(),
      });

      await request(app.getHttpServer())
        .get('/api/v1/files/test-file.pdf/presigned?expiry=7200')
        .expect(200);

      expect(mockStorageService.getPresignedDownloadUrl).toHaveBeenCalledWith(
        'test-file.pdf',
        expect.any(String),
        7200,
      );
    });

    it('should return 404 when file not found', async () => {
      const notFoundError = new Error('Not found');
      (notFoundError as { code?: string }).code = 'NotFound';
      mockStorageService.getPresignedDownloadUrl.mockRejectedValue(notFoundError);

      const response = await request(app.getHttpServer())
        .get('/api/v1/files/non-existent.pdf/presigned')
        .expect(404);

      expect(response.body.message).toContain('not found');
    });
  });

  describe('POST /api/v1/files/presigned-upload', () => {
    it('should generate presigned upload URL', async () => {
      const expiresAt = new Date(Date.now() + 3600000);
      mockStorageService.getPresignedUploadUrl.mockResolvedValue({
        success: true,
        fileName: '1699234567890-new-file.pdf',
        uploadUrl: 'http://localhost:9000/uploads/1699234567890-new-file.pdf?X-Amz-Signature=abc123',
        fileUrl: '/api/v1/files/1699234567890-new-file.pdf',
        expiresIn: 3600,
        expiresAt,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/files/presigned-upload')
        .send({
          fileName: 'new-file.pdf',
          bucket: 'uploads',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.uploadUrl).toContain('http://localhost:9000');
      expect(response.body.fileUrl).toContain('/api/v1/files/');
    });

    it('should return 400 when fileName not provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/files/presigned-upload')
        .send({
          bucket: 'uploads',
        })
        .expect(400);

      expect(Array.isArray(response.body.message) ? response.body.message.join(' ') : response.body.message).toContain('fileName');
    });

    it('should use custom expiry time', async () => {
      mockStorageService.getPresignedUploadUrl.mockResolvedValue({
        success: true,
        fileName: '1699234567890-new-file.pdf',
        uploadUrl: 'http://localhost:9000/uploads/1699234567890-new-file.pdf',
        fileUrl: '/api/v1/files/1699234567890-new-file.pdf',
        expiresIn: 1800,
        expiresAt: new Date(),
      });

      await request(app.getHttpServer())
        .post('/api/v1/files/presigned-upload')
        .send({
          fileName: 'new-file.pdf',
          bucket: 'uploads',
          expiry: 1800,
        })
        .expect(201);

      expect(mockStorageService.getPresignedUploadUrl).toHaveBeenCalledWith(
        'new-file.pdf',
        'uploads',
        1800,
      );
    });
  });

  describe('GET /api/v1/files/:fileName/exists', () => {
    it('should return exists: true when file exists', async () => {
      mockStorageService.fileExists.mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .get('/api/v1/files/test-file.pdf/exists')
        .expect(200);

      expect(response.body.exists).toBe(true);
      expect(response.body.fileName).toBe('test-file.pdf');
    });

    it('should return exists: false when file does not exist', async () => {
      mockStorageService.fileExists.mockResolvedValue(false);

      const response = await request(app.getHttpServer())
        .get('/api/v1/files/non-existent.pdf/exists')
        .expect(200);

      expect(response.body.exists).toBe(false);
    });

    it('should check existence in specific bucket', async () => {
      mockStorageService.fileExists.mockResolvedValue(true);

      await request(app.getHttpServer())
        .get('/api/v1/files/logo.png/exists?bucket=logos')
        .expect(200);

      expect(mockStorageService.fileExists).toHaveBeenCalledWith('logo.png', 'logos');
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when storage service is not configured for upload', async () => {
      mockStorageService.isConfigured.mockReturnValue(false);

      const response = await request(app.getHttpServer())
        .post('/api/v1/files/upload')
        .attach('file', Buffer.from('test'), 'test.txt')
        .expect(500);

      expect(response.body.message).toContain('not configured');
    });

    it('should return 500 when storage service is not configured for list', async () => {
      mockStorageService.isConfigured.mockReturnValue(false);

      const response = await request(app.getHttpServer())
        .get('/api/v1/files')
        .expect(500);

      expect(response.body.message).toContain('not configured');
    });

    it('should handle internal server errors gracefully', async () => {
      mockStorageService.listFiles.mockRejectedValue(new Error('Connection failed'));

      const response = await request(app.getHttpServer())
        .get('/api/v1/files')
        .expect(500);

      expect(response.body.message).toContain('Failed to list files');
    });
  });
});
