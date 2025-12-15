/**
 * Storage Service Unit Tests
 * STORY-026A: MinIO Setup
 * STORY-026B: MinIO File API (Pagination support)
 *
 * Tests for the StorageService that handles file operations via MinIO.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from '../../src/storage/storage.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';
import { BucketName } from '../../src/storage/dto';

// Mock the minio module
jest.mock('minio', () => ({
  Client: jest.fn().mockImplementation(() => ({
    bucketExists: jest.fn(),
    makeBucket: jest.fn(),
    putObject: jest.fn(),
    getObject: jest.fn(),
    statObject: jest.fn(),
    listObjects: jest.fn(),
    removeObject: jest.fn(),
    presignedGetObject: jest.fn(),
    presignedPutObject: jest.fn(),
  })),
}));

// Mock the logger
const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

describe('StorageService', () => {
  let service: StorageService;
  let mockMinioClient: {
    bucketExists: jest.Mock;
    makeBucket: jest.Mock;
    putObject: jest.Mock;
    getObject: jest.Mock;
    statObject: jest.Mock;
    listObjects: jest.Mock;
    removeObject: jest.Mock;
    presignedGetObject: jest.Mock;
    presignedPutObject: jest.Mock;
  };

  // Store original env
  const originalEnv = process.env;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Set environment variables
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      MINIO_ENDPOINT: 'localhost',
      MINIO_PORT: '9000',
      MINIO_USE_SSL: 'false',
      MINIO_ACCESS_KEY: 'minioadmin',
      MINIO_SECRET_KEY: 'minioadmin',
      MINIO_BUCKET_UPLOADS: 'uploads',
      MINIO_BUCKET_LOGOS: 'logos',
      MINIO_BUCKET_FEEDBACK: 'feedback',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: WinstonLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);

    // Get mock client after module init
    await service.onModuleInit();

    // Access the private client for mocking
    mockMinioClient = (service as unknown as { client: typeof mockMinioClient }).client;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Module Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize MinIO client with correct configuration', () => {
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('MinIO client configured'),
        'StorageService',
      );
    });

    it('should log warning when MINIO_ENDPOINT is not configured', async () => {
      process.env.MINIO_ENDPOINT = '';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StorageService,
          {
            provide: WinstonLoggerService,
            useValue: mockLogger,
          },
        ],
      }).compile();

      const unconfiguredService = module.get<StorageService>(StorageService);
      await unconfiguredService.onModuleInit();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('MINIO_ENDPOINT not configured'),
        'StorageService',
      );
    });
  });

  describe('isConfigured', () => {
    it('should return true when MinIO is properly configured', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when MinIO endpoint is not set', async () => {
      process.env.MINIO_ENDPOINT = '';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StorageService,
          {
            provide: WinstonLoggerService,
            useValue: mockLogger,
          },
        ],
      }).compile();

      const unconfiguredService = module.get<StorageService>(StorageService);
      await unconfiguredService.onModuleInit();

      expect(unconfiguredService.isConfigured()).toBe(false);
    });
  });

  describe('getBucketName', () => {
    it('should return correct bucket name for UPLOADS', () => {
      expect(service.getBucketName(BucketName.UPLOADS)).toBe('uploads');
    });

    it('should return correct bucket name for LOGOS', () => {
      expect(service.getBucketName(BucketName.LOGOS)).toBe('logos');
    });

    it('should return correct bucket name for FEEDBACK', () => {
      expect(service.getBucketName(BucketName.FEEDBACK)).toBe('feedback');
    });
  });

  describe('initializeBuckets', () => {
    it('should create buckets that do not exist', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(false);
      mockMinioClient.makeBucket.mockResolvedValue(undefined);

      await service.initializeBuckets();

      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('uploads');
      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('logos');
      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('feedback');
      expect(mockMinioClient.makeBucket).toHaveBeenCalledTimes(3);
    });

    it('should not create buckets that already exist', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);

      await service.initializeBuckets();

      expect(mockMinioClient.makeBucket).not.toHaveBeenCalled();
    });

    it('should handle bucket creation errors gracefully', async () => {
      mockMinioClient.bucketExists.mockRejectedValue(new Error('Connection error'));

      await service.initializeBuckets();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize bucket'),
        expect.any(String),
        'StorageService',
      );
    });
  });

  describe('uploadFile', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test-document.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('test content'),
      destination: '',
      filename: '',
      path: '',
      stream: null as never,
    };

    it('should upload file successfully', async () => {
      mockMinioClient.putObject.mockResolvedValue({ etag: '"abc123"' });

      const result = await service.uploadFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.originalName).toBe('test-document.pdf');
      expect(result.bucket).toBe('uploads');
      expect(result.size).toBe(1024);
      expect(result.mimeType).toBe('application/pdf');
      expect(result.url).toContain('/api/v1/files/');
    });

    it('should upload file to specified bucket', async () => {
      mockMinioClient.putObject.mockResolvedValue({ etag: '"abc123"' });

      const result = await service.uploadFile(mockFile, BucketName.LOGOS);

      expect(result.bucket).toBe('logos');
    });

    it('should use custom filename if provided', async () => {
      mockMinioClient.putObject.mockResolvedValue({ etag: '"abc123"' });

      const result = await service.uploadFile(mockFile, BucketName.UPLOADS, 'custom-name.pdf');

      expect(result.fileName).toContain('custom-name.pdf');
    });

    it('should include path in filename if provided', async () => {
      mockMinioClient.putObject.mockResolvedValue({ etag: '"abc123"' });

      const result = await service.uploadFile(mockFile, BucketName.UPLOADS, undefined, 'users/123');

      expect(result.fileName).toContain('users/123/');
    });

    it('should throw error when client is not initialized', async () => {
      process.env.MINIO_ENDPOINT = '';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StorageService,
          {
            provide: WinstonLoggerService,
            useValue: mockLogger,
          },
        ],
      }).compile();

      const unconfiguredService = module.get<StorageService>(StorageService);
      await unconfiguredService.onModuleInit();

      await expect(unconfiguredService.uploadFile(mockFile)).rejects.toThrow(
        'MinIO client not initialized',
      );
    });

    it('should handle upload errors', async () => {
      mockMinioClient.putObject.mockRejectedValue(new Error('Upload failed'));

      await expect(service.uploadFile(mockFile)).rejects.toThrow('Upload failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('uploadBuffer', () => {
    const testBuffer = Buffer.from('test content');

    it('should upload buffer successfully', async () => {
      mockMinioClient.putObject.mockResolvedValue({ etag: '"abc123"' });

      const result = await service.uploadBuffer(testBuffer, 'test.png', 'image/png');

      expect(result.success).toBe(true);
      expect(result.originalName).toBe('test.png');
      expect(result.mimeType).toBe('image/png');
    });

    it('should upload buffer to specified bucket', async () => {
      mockMinioClient.putObject.mockResolvedValue({ etag: '"abc123"' });

      const result = await service.uploadBuffer(
        testBuffer,
        'screenshot.png',
        'image/png',
        BucketName.FEEDBACK,
      );

      expect(result.bucket).toBe('feedback');
    });
  });

  describe('getFile', () => {
    it('should return file stream and stat', async () => {
      const mockStream = { pipe: jest.fn() };
      const mockStat = {
        size: 1024,
        lastModified: new Date(),
        metaData: { 'content-type': 'application/pdf' },
      };

      mockMinioClient.statObject.mockResolvedValue(mockStat);
      mockMinioClient.getObject.mockResolvedValue(mockStream);

      const result = await service.getFile('test-file.pdf');

      expect(result.stream).toBe(mockStream);
      expect(result.stat.size).toBe(1024);
    });

    it('should throw error when file not found', async () => {
      const notFoundError = new Error('Not found');
      (notFoundError as { code?: string }).code = 'NotFound';
      mockMinioClient.statObject.mockRejectedValue(notFoundError);

      await expect(service.getFile('non-existent.pdf')).rejects.toThrow();
    });
  });

  describe('getFileStat', () => {
    it('should return file metadata', async () => {
      const mockStat = {
        size: 1024,
        lastModified: new Date(),
        etag: '"abc123"',
        metaData: { 'content-type': 'application/pdf' },
      };

      mockMinioClient.statObject.mockResolvedValue(mockStat);

      const result = await service.getFileStat('test-file.pdf');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('test-file.pdf');
      expect(result?.size).toBe(1024);
    });

    it('should return null when file not found', async () => {
      const notFoundError = new Error('Not found');
      (notFoundError as { code?: string }).code = 'NotFound';
      mockMinioClient.statObject.mockRejectedValue(notFoundError);

      const result = await service.getFileStat('non-existent.pdf');

      expect(result).toBeNull();
    });
  });

  describe('listFiles', () => {
    it('should list files in bucket', async () => {
      const mockObjects = [
        { name: 'file1.pdf', size: 1024, lastModified: new Date(), etag: '"abc"' },
        { name: 'file2.pdf', size: 2048, lastModified: new Date(), etag: '"def"' },
      ];

      const mockStream: { on: jest.Mock } = {
        on: jest.fn((event: string, callback: (data?: unknown) => void) => {
          if (event === 'data') {
            mockObjects.forEach(callback);
          }
          if (event === 'end') {
            callback();
          }
          return mockStream as unknown;
        }),
      };

      mockMinioClient.listObjects.mockReturnValue(mockStream);

      const result = await service.listFiles();

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.files).toHaveLength(2);
    });

    it('should filter files by prefix', async () => {
      const mockStream: { on: jest.Mock } = {
        on: jest.fn((event: string, callback: () => void) => {
          if (event === 'end') {
            callback();
          }
          return mockStream as unknown;
        }),
      };

      mockMinioClient.listObjects.mockReturnValue(mockStream);

      await service.listFiles(BucketName.UPLOADS, 'users/123/');

      expect(mockMinioClient.listObjects).toHaveBeenCalledWith('uploads', 'users/123/', true);
    });

    // STORY-026B: Pagination tests
    it('should return pagination metadata', async () => {
      const mockObjects = [
        { name: 'file1.pdf', size: 1024, lastModified: new Date(), etag: '"abc"' },
        { name: 'file2.pdf', size: 2048, lastModified: new Date(), etag: '"def"' },
        { name: 'file3.pdf', size: 3072, lastModified: new Date(), etag: '"ghi"' },
      ];

      const mockStream: { on: jest.Mock } = {
        on: jest.fn((event: string, callback: (data?: unknown) => void) => {
          if (event === 'data') {
            mockObjects.forEach(callback);
          }
          if (event === 'end') {
            callback();
          }
          return mockStream as unknown;
        }),
      };

      mockMinioClient.listObjects.mockReturnValue(mockStream);

      const result = await service.listFiles(BucketName.UPLOADS, undefined, 1, 20);

      expect(result.pagination).toBeDefined();
      expect(result.pagination?.page).toBe(1);
      expect(result.pagination?.limit).toBe(20);
      expect(result.pagination?.total).toBe(3);
      expect(result.pagination?.pages).toBe(1);
    });

    it('should paginate results correctly for first page', async () => {
      const mockObjects = Array.from({ length: 25 }, (_, i) => ({
        name: `file${i + 1}.pdf`,
        size: 1024 * (i + 1),
        lastModified: new Date(),
        etag: `"etag${i}"`,
      }));

      const mockStream: { on: jest.Mock } = {
        on: jest.fn((event: string, callback: (data?: unknown) => void) => {
          if (event === 'data') {
            mockObjects.forEach(callback);
          }
          if (event === 'end') {
            callback();
          }
          return mockStream as unknown;
        }),
      };

      mockMinioClient.listObjects.mockReturnValue(mockStream);

      const result = await service.listFiles(BucketName.UPLOADS, undefined, 1, 10);

      expect(result.count).toBe(10);
      expect(result.files).toHaveLength(10);
      expect(result.files[0].name).toBe('file1.pdf');
      expect(result.files[9].name).toBe('file10.pdf');
      expect(result.pagination?.total).toBe(25);
      expect(result.pagination?.pages).toBe(3);
    });

    it('should paginate results correctly for second page', async () => {
      const mockObjects = Array.from({ length: 25 }, (_, i) => ({
        name: `file${i + 1}.pdf`,
        size: 1024 * (i + 1),
        lastModified: new Date(),
        etag: `"etag${i}"`,
      }));

      const mockStream: { on: jest.Mock } = {
        on: jest.fn((event: string, callback: (data?: unknown) => void) => {
          if (event === 'data') {
            mockObjects.forEach(callback);
          }
          if (event === 'end') {
            callback();
          }
          return mockStream as unknown;
        }),
      };

      mockMinioClient.listObjects.mockReturnValue(mockStream);

      const result = await service.listFiles(BucketName.UPLOADS, undefined, 2, 10);

      expect(result.count).toBe(10);
      expect(result.files).toHaveLength(10);
      expect(result.files[0].name).toBe('file11.pdf');
      expect(result.files[9].name).toBe('file20.pdf');
      expect(result.pagination?.page).toBe(2);
    });

    it('should return partial page for last page', async () => {
      const mockObjects = Array.from({ length: 25 }, (_, i) => ({
        name: `file${i + 1}.pdf`,
        size: 1024 * (i + 1),
        lastModified: new Date(),
        etag: `"etag${i}"`,
      }));

      const mockStream: { on: jest.Mock } = {
        on: jest.fn((event: string, callback: (data?: unknown) => void) => {
          if (event === 'data') {
            mockObjects.forEach(callback);
          }
          if (event === 'end') {
            callback();
          }
          return mockStream as unknown;
        }),
      };

      mockMinioClient.listObjects.mockReturnValue(mockStream);

      const result = await service.listFiles(BucketName.UPLOADS, undefined, 3, 10);

      expect(result.count).toBe(5);
      expect(result.files).toHaveLength(5);
      expect(result.files[0].name).toBe('file21.pdf');
      expect(result.files[4].name).toBe('file25.pdf');
      expect(result.pagination?.page).toBe(3);
    });

    it('should return empty array for page beyond available data', async () => {
      const mockObjects = [
        { name: 'file1.pdf', size: 1024, lastModified: new Date(), etag: '"abc"' },
      ];

      const mockStream: { on: jest.Mock } = {
        on: jest.fn((event: string, callback: (data?: unknown) => void) => {
          if (event === 'data') {
            mockObjects.forEach(callback);
          }
          if (event === 'end') {
            callback();
          }
          return mockStream as unknown;
        }),
      };

      mockMinioClient.listObjects.mockReturnValue(mockStream);

      const result = await service.listFiles(BucketName.UPLOADS, undefined, 5, 10);

      expect(result.count).toBe(0);
      expect(result.files).toHaveLength(0);
      expect(result.pagination?.total).toBe(1);
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockMinioClient.statObject.mockResolvedValue({});
      mockMinioClient.removeObject.mockResolvedValue(undefined);

      const result = await service.deleteFile('test-file.pdf');

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('test-file.pdf');
      expect(result.message).toBe('File deleted successfully');
    });

    it('should throw error when file not found', async () => {
      const notFoundError = new Error('Not found');
      (notFoundError as { code?: string }).code = 'NotFound';
      mockMinioClient.statObject.mockRejectedValue(notFoundError);

      await expect(service.deleteFile('non-existent.pdf')).rejects.toThrow();
    });
  });

  describe('getPresignedDownloadUrl', () => {
    it('should generate presigned download URL', async () => {
      mockMinioClient.statObject.mockResolvedValue({});
      mockMinioClient.presignedGetObject.mockResolvedValue('http://localhost:9000/uploads/test.pdf?signature=abc');

      const result = await service.getPresignedDownloadUrl('test.pdf');

      expect(result.success).toBe(true);
      expect(result.url).toContain('http://localhost:9000');
      expect(result.expiresIn).toBe(3600);
    });

    it('should use custom expiry time', async () => {
      mockMinioClient.statObject.mockResolvedValue({});
      mockMinioClient.presignedGetObject.mockResolvedValue('http://localhost:9000/uploads/test.pdf?signature=abc');

      const result = await service.getPresignedDownloadUrl('test.pdf', BucketName.UPLOADS, 7200);

      expect(result.expiresIn).toBe(7200);
    });

    it('should throw error when file not found', async () => {
      const notFoundError = new Error('Not found');
      (notFoundError as { code?: string }).code = 'NotFound';
      mockMinioClient.statObject.mockRejectedValue(notFoundError);

      await expect(service.getPresignedDownloadUrl('non-existent.pdf')).rejects.toThrow();
    });
  });

  describe('getPresignedUploadUrl', () => {
    it('should generate presigned upload URL', async () => {
      mockMinioClient.presignedPutObject.mockResolvedValue('http://localhost:9000/uploads/123-test.pdf?signature=abc');

      const result = await service.getPresignedUploadUrl('test.pdf');

      expect(result.success).toBe(true);
      expect(result.uploadUrl).toContain('http://localhost:9000');
      expect(result.fileUrl).toContain('/api/v1/files/');
      expect(result.expiresIn).toBe(3600);
    });

    it('should use custom expiry time', async () => {
      mockMinioClient.presignedPutObject.mockResolvedValue('http://localhost:9000/uploads/123-test.pdf?signature=abc');

      const result = await service.getPresignedUploadUrl('test.pdf', BucketName.UPLOADS, 1800);

      expect(result.expiresIn).toBe(1800);
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      mockMinioClient.statObject.mockResolvedValue({});

      const result = await service.fileExists('test.pdf');

      expect(result).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      mockMinioClient.statObject.mockRejectedValue(new Error('Not found'));

      const result = await service.fileExists('non-existent.pdf');

      expect(result).toBe(false);
    });

    it('should return false when service is not configured', async () => {
      process.env.MINIO_ENDPOINT = '';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StorageService,
          {
            provide: WinstonLoggerService,
            useValue: mockLogger,
          },
        ],
      }).compile();

      const unconfiguredService = module.get<StorageService>(StorageService);
      await unconfiguredService.onModuleInit();

      const result = await unconfiguredService.fileExists('test.pdf');

      expect(result).toBe(false);
    });
  });
});
