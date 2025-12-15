/**
 * Storage Controller Unit Tests
 * STORY-026A: MinIO Setup
 * STORY-026B: MinIO File API (Pagination support)
 *
 * Tests for the StorageController that handles file API endpoints.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { StorageController } from '../../src/storage/storage.controller';
import { StorageService } from '../../src/storage/storage.service';
import { BucketName, FileUploadDto, FileListQueryDto, PresignedUrlQueryDto, PresignedUploadRequestDto } from '../../src/storage/dto';

// Mock StorageService
const mockStorageService = {
  isConfigured: jest.fn(),
  uploadFile: jest.fn(),
  getFile: jest.fn(),
  listFiles: jest.fn(),
  deleteFile: jest.fn(),
  getPresignedDownloadUrl: jest.fn(),
  getPresignedUploadUrl: jest.fn(),
  fileExists: jest.fn(),
};

describe('StorageController', () => {
  let controller: StorageController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageController],
      providers: [
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
      ],
    }).compile();

    controller = module.get<StorageController>(StorageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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

    const mockUploadDto: FileUploadDto = {
      bucket: BucketName.UPLOADS,
    };

    it('should upload file successfully', async () => {
      mockStorageService.isConfigured.mockReturnValue(true);
      mockStorageService.uploadFile.mockResolvedValue({
        success: true,
        fileName: '123-test-document.pdf',
        originalName: 'test-document.pdf',
        bucket: 'uploads',
        size: 1024,
        mimeType: 'application/pdf',
        url: '/api/v1/files/123-test-document.pdf',
      });

      const result = await controller.uploadFile(mockFile, mockUploadDto);

      expect(result.success).toBe(true);
      expect(result.originalName).toBe('test-document.pdf');
      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
        mockFile,
        BucketName.UPLOADS,
        undefined,
        undefined,
      );
    });

    it('should throw BadRequestException when no file provided', async () => {
      await expect(
        controller.uploadFile(undefined as unknown as Express.Multer.File, mockUploadDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException when storage not configured', async () => {
      mockStorageService.isConfigured.mockReturnValue(false);

      await expect(controller.uploadFile(mockFile, mockUploadDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw InternalServerErrorException on upload failure', async () => {
      mockStorageService.isConfigured.mockReturnValue(true);
      mockStorageService.uploadFile.mockRejectedValue(new Error('Upload failed'));

      await expect(controller.uploadFile(mockFile, mockUploadDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('downloadFile', () => {
    const mockResponse = {
      setHeader: jest.fn(),
    } as unknown as Response;

    const mockStream = {
      pipe: jest.fn(),
    };

    it('should download file successfully', async () => {
      mockStorageService.isConfigured.mockReturnValue(true);
      mockStorageService.getFile.mockResolvedValue({
        stream: mockStream,
        stat: {
          size: 1024,
          metaData: { 'content-type': 'application/pdf' },
        },
      });

      await controller.downloadFile('test-file.pdf', BucketName.UPLOADS, mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Length', 1024);
      expect(mockStream.pipe).toHaveBeenCalledWith(mockResponse);
    });

    it('should throw InternalServerErrorException when storage not configured', async () => {
      mockStorageService.isConfigured.mockReturnValue(false);

      await expect(
        controller.downloadFile('test-file.pdf', BucketName.UPLOADS, mockResponse),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw NotFoundException when file not found', async () => {
      mockStorageService.isConfigured.mockReturnValue(true);
      const notFoundError = new Error('Not found');
      (notFoundError as { code?: string }).code = 'NotFound';
      mockStorageService.getFile.mockRejectedValue(notFoundError);

      await expect(
        controller.downloadFile('non-existent.pdf', BucketName.UPLOADS, mockResponse),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listFiles', () => {
    const mockQuery: FileListQueryDto = {
      bucket: BucketName.UPLOADS,
      page: 1,
      limit: 20,
    };

    it('should list files successfully with pagination', async () => {
      mockStorageService.isConfigured.mockReturnValue(true);
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

      const result = await controller.listFiles(mockQuery);

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(mockStorageService.listFiles).toHaveBeenCalledWith(BucketName.UPLOADS, undefined, 1, 20);
    });

    it('should filter by prefix when provided', async () => {
      mockStorageService.isConfigured.mockReturnValue(true);
      mockStorageService.listFiles.mockResolvedValue({
        success: true,
        bucket: 'uploads',
        count: 0,
        files: [],
        prefix: 'users/123/',
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0,
        },
      });

      await controller.listFiles({ ...mockQuery, prefix: 'users/123/' });

      expect(mockStorageService.listFiles).toHaveBeenCalledWith(BucketName.UPLOADS, 'users/123/', 1, 20);
    });

    it('should use custom page and limit when provided', async () => {
      mockStorageService.isConfigured.mockReturnValue(true);
      mockStorageService.listFiles.mockResolvedValue({
        success: true,
        bucket: 'uploads',
        count: 10,
        files: [],
        pagination: {
          page: 2,
          limit: 10,
          total: 25,
          pages: 3,
        },
      });

      await controller.listFiles({ ...mockQuery, page: 2, limit: 10 });

      expect(mockStorageService.listFiles).toHaveBeenCalledWith(BucketName.UPLOADS, undefined, 2, 10);
    });

    it('should throw InternalServerErrorException when storage not configured', async () => {
      mockStorageService.isConfigured.mockReturnValue(false);

      await expect(controller.listFiles(mockQuery)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockStorageService.isConfigured.mockReturnValue(true);
      mockStorageService.deleteFile.mockResolvedValue({
        success: true,
        fileName: 'test-file.pdf',
        message: 'File deleted successfully',
      });

      const result = await controller.deleteFile('test-file.pdf', BucketName.UPLOADS);

      expect(result.success).toBe(true);
      expect(result.message).toBe('File deleted successfully');
    });

    it('should throw InternalServerErrorException when storage not configured', async () => {
      mockStorageService.isConfigured.mockReturnValue(false);

      await expect(controller.deleteFile('test-file.pdf', BucketName.UPLOADS)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw NotFoundException when file not found', async () => {
      mockStorageService.isConfigured.mockReturnValue(true);
      const notFoundError = new Error('Not found');
      (notFoundError as { code?: string }).code = 'NotFound';
      mockStorageService.deleteFile.mockRejectedValue(notFoundError);

      await expect(controller.deleteFile('non-existent.pdf', BucketName.UPLOADS)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPresignedUrl', () => {
    const mockQuery: PresignedUrlQueryDto = {
      bucket: BucketName.UPLOADS,
      expiry: 3600,
    };

    it('should generate presigned URL successfully', async () => {
      mockStorageService.isConfigured.mockReturnValue(true);
      mockStorageService.getPresignedDownloadUrl.mockResolvedValue({
        success: true,
        fileName: 'test-file.pdf',
        url: 'http://localhost:9000/uploads/test-file.pdf?signature=abc',
        expiresIn: 3600,
        expiresAt: new Date(),
      });

      const result = await controller.getPresignedUrl('test-file.pdf', mockQuery);

      expect(result.success).toBe(true);
      expect(result.url).toContain('http://localhost:9000');
    });

    it('should throw InternalServerErrorException when storage not configured', async () => {
      mockStorageService.isConfigured.mockReturnValue(false);

      await expect(controller.getPresignedUrl('test-file.pdf', mockQuery)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw NotFoundException when file not found', async () => {
      mockStorageService.isConfigured.mockReturnValue(true);
      const notFoundError = new Error('Not found');
      (notFoundError as { code?: string }).code = 'NotFound';
      mockStorageService.getPresignedDownloadUrl.mockRejectedValue(notFoundError);

      await expect(controller.getPresignedUrl('non-existent.pdf', mockQuery)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPresignedUploadUrl', () => {
    const mockDto: PresignedUploadRequestDto = {
      fileName: 'new-file.pdf',
      bucket: BucketName.UPLOADS,
      expiry: 3600,
    };

    it('should generate presigned upload URL successfully', async () => {
      mockStorageService.isConfigured.mockReturnValue(true);
      mockStorageService.getPresignedUploadUrl.mockResolvedValue({
        success: true,
        fileName: '123-new-file.pdf',
        uploadUrl: 'http://localhost:9000/uploads/123-new-file.pdf?signature=abc',
        fileUrl: '/api/v1/files/123-new-file.pdf',
        expiresIn: 3600,
        expiresAt: new Date(),
      });

      const result = await controller.getPresignedUploadUrl(mockDto);

      expect(result.success).toBe(true);
      expect(result.uploadUrl).toContain('http://localhost:9000');
    });

    it('should throw BadRequestException when fileName not provided', async () => {
      await expect(
        controller.getPresignedUploadUrl({ ...mockDto, fileName: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException when storage not configured', async () => {
      mockStorageService.isConfigured.mockReturnValue(false);

      await expect(controller.getPresignedUploadUrl(mockDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('checkFileExists', () => {
    it('should return exists: true when file exists', async () => {
      mockStorageService.isConfigured.mockReturnValue(true);
      mockStorageService.fileExists.mockResolvedValue(true);

      const result = await controller.checkFileExists('test-file.pdf', BucketName.UPLOADS);

      expect(result.exists).toBe(true);
      expect(result.fileName).toBe('test-file.pdf');
    });

    it('should return exists: false when file does not exist', async () => {
      mockStorageService.isConfigured.mockReturnValue(true);
      mockStorageService.fileExists.mockResolvedValue(false);

      const result = await controller.checkFileExists('non-existent.pdf', BucketName.UPLOADS);

      expect(result.exists).toBe(false);
    });

    it('should return exists: false when storage not configured', async () => {
      mockStorageService.isConfigured.mockReturnValue(false);

      const result = await controller.checkFileExists('test-file.pdf', BucketName.UPLOADS);

      expect(result.exists).toBe(false);
    });
  });
});
