/**
 * Feedback Admin Service Unit Tests
 * STORY-041C: Feedback Admin API
 *
 * Tests for FeedbackAdminService including:
 * - List feedbacks with pagination
 * - Get feedback details
 * - Screenshot URL generation
 * - Delete feedback with MinIO cleanup
 * - Audit logging for delete operations
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { Request } from 'express';
import { FeedbackAdminService } from '../../src/feedback/feedback-admin.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';
import { DatabaseService } from '../../src/database/database.service';
import { StorageService } from '../../src/storage/storage.service';
import { AuditService } from '../../src/common/services/audit.service';
import { BucketName } from '../../src/storage/dto';
import { FeedbackStatus } from '../../src/feedback/dto/feedback-list.dto';

describe('FeedbackAdminService', () => {
  let service: FeedbackAdminService;
  let mockLogger: jest.Mocked<WinstonLoggerService>;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockStorageService: jest.Mocked<StorageService>;
  let mockAuditService: jest.Mocked<AuditService>;
  let mockPool: { query: jest.Mock };

  const mockFeedbackRow = {
    id: 1,
    user_id: 10,
    user_email: 'user@test.com',
    comment: 'Test feedback comment that is long enough to be truncated in the preview',
    url: 'https://app.test.com/dashboard',
    route: '/dashboard',
    browser_info: 'Mozilla/5.0',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    browser_name: 'Chrome',
    browser_version: '120',
    os_name: 'Windows',
    os_version: '10/11',
    device_type: 'Desktop',
    screen_resolution: '1920x1080',
    language: 'en-US',
    timezone: 'Europe/Berlin',
    has_screenshot: true,
    screenshot_path: '1234567890-feedback-1234567890.png',
    created_at: new Date('2025-01-15T10:30:00.000Z'),
    user_name: 'Test User',
  };

  beforeEach(async () => {
    // Create mocks
    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<WinstonLoggerService>;

    mockPool = {
      query: jest.fn(),
    };

    mockDatabaseService = {
      getPool: jest.fn().mockReturnValue(mockPool),
      ensurePool: jest.fn().mockReturnValue(mockPool),
    } as unknown as jest.Mocked<DatabaseService>;

    mockStorageService = {
      isConfigured: jest.fn().mockReturnValue(true),
      getPresignedDownloadUrl: jest.fn().mockResolvedValue({
        success: true,
        fileName: '1234567890-feedback-1234567890.png',
        url: 'https://minio.test.com/feedback/screenshot.png?presigned',
        expiresIn: 300,
        expiresAt: new Date(Date.now() + 300000),
      }),
      deleteFile: jest.fn().mockResolvedValue({
        success: true,
        fileName: '1234567890-feedback-1234567890.png',
        message: 'File deleted successfully',
      }),
    } as unknown as jest.Mocked<StorageService>;

    mockAuditService = {
      log: jest.fn().mockResolvedValue({ id: 1, action: 'FEEDBACK_DELETE' }),
    } as unknown as jest.Mocked<AuditService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackAdminService,
        { provide: WinstonLoggerService, useValue: mockLogger },
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<FeedbackAdminService>(FeedbackAdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize the service', () => {
      expect(service).toBeDefined();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'FeedbackAdminService initialized',
        'FeedbackAdminService',
      );
    });
  });

  describe('findAll', () => {
    it('should list feedbacks with pagination', async () => {
      // Mock count query
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '25' }] });
      // Mock data query
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { ...mockFeedbackRow, id: 1 },
          { ...mockFeedbackRow, id: 2 },
        ],
      });

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        pages: 3,
      });
      expect(mockDatabaseService.ensurePool).toHaveBeenCalled();
    });

    // Note: Status filtering is prepared for future use when status column is added
    // Currently feedback_submissions table doesn't have a status column
    it('should ignore status filter (not implemented in DB)', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '5' }] });
      mockPool.query.mockResolvedValueOnce({ rows: [mockFeedbackRow] });

      const result = await service.findAll({ page: 1, limit: 10, status: FeedbackStatus.NEW });

      // Status filter is ignored, but query should still succeed
      expect(result.data).toHaveLength(1);
    });

    it('should filter by user ID', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '3' }] });
      mockPool.query.mockResolvedValueOnce({ rows: [mockFeedbackRow] });

      await service.findAll({ page: 1, limit: 10, userId: 10 });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('fs.user_id = $'),
        expect.arrayContaining([10]),
      );
    });

    it('should search in comment and email', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      mockPool.query.mockResolvedValueOnce({ rows: [mockFeedbackRow] });

      await service.findAll({ page: 1, limit: 10, search: 'bug' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['%bug%']),
      );
    });

    it('should sort by created_at DESC', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      mockPool.query.mockResolvedValueOnce({ rows: [mockFeedbackRow] });

      await service.findAll({ page: 1, limit: 10 });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY fs.created_at DESC'),
        expect.any(Array),
      );
    });

    it('should truncate comment preview to 100 characters', async () => {
      const longComment = 'A'.repeat(150);
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...mockFeedbackRow, comment: longComment }],
      });

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data[0].commentPreview).toHaveLength(103); // 100 + '...'
      expect(result.data[0].commentPreview.endsWith('...')).toBe(true);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.findAll({ page: 1, limit: 10 })).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return feedback details with screenshot URL', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockFeedbackRow] });

      const result = await service.findOne(1);

      expect(result.id).toBe(1);
      expect(result.userId).toBe(10);
      expect(result.userEmail).toBe('user@test.com');
      expect(result.userName).toBe('Test User');
      expect(result.browserName).toBe('Chrome');
      expect(result.screenshotUrl).toBeDefined();
      expect(mockStorageService.getPresignedDownloadUrl).toHaveBeenCalledWith(
        mockFeedbackRow.screenshot_path,
        BucketName.FEEDBACK,
        300,
      );
    });

    it('should throw NotFoundException if feedback not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('should return feedback without screenshot URL if no screenshot', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...mockFeedbackRow, has_screenshot: false, screenshot_path: null }],
      });

      const result = await service.findOne(1);

      expect(result.screenshotUrl).toBeUndefined();
      expect(mockStorageService.getPresignedDownloadUrl).not.toHaveBeenCalled();
    });

    it('should handle presigned URL generation failure gracefully', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockFeedbackRow] });
      mockStorageService.getPresignedDownloadUrl.mockRejectedValueOnce(new Error('MinIO error'));

      const result = await service.findOne(1);

      expect(result.id).toBe(1);
      expect(result.screenshotUrl).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should use email as userName if user name is null', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...mockFeedbackRow, user_name: null }],
      });

      const result = await service.findOne(1);

      expect(result.userName).toBe('user@test.com');
    });
  });

  describe('getScreenshotUrl', () => {
    it('should generate presigned URL for screenshot', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ has_screenshot: true, screenshot_path: 'screenshot.png' }],
      });

      const result = await service.getScreenshotUrl(1);

      expect(result.url).toBeDefined();
      expect(result.expiresIn).toBe(300);
      expect(result.expiresAt).toBeDefined();
      expect(mockStorageService.getPresignedDownloadUrl).toHaveBeenCalledWith(
        'screenshot.png',
        BucketName.FEEDBACK,
        300,
      );
    });

    it('should throw NotFoundException if feedback not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.getScreenshotUrl(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if no screenshot', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ has_screenshot: false, screenshot_path: null }],
      });

      await expect(service.getScreenshotUrl(1)).rejects.toThrow(NotFoundException);
      expect(mockStorageService.getPresignedDownloadUrl).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if storage not configured', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ has_screenshot: true, screenshot_path: 'screenshot.png' }],
      });
      mockStorageService.isConfigured.mockReturnValueOnce(false);

      await expect(service.getScreenshotUrl(1)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('delete', () => {
    const adminUser = { id: 1, email: 'admin@test.com' };

    it('should delete feedback and screenshot', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: 10,
            user_email: 'user@test.com',
            comment: 'Test comment',
            has_screenshot: true,
            screenshot_path: 'screenshot.png',
          }],
        })
        .mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.delete(1, adminUser);

      expect(result.message).toBe('Feedback deleted successfully');
      expect(result.screenshotDeleted).toBe(true);
      expect(mockStorageService.deleteFile).toHaveBeenCalledWith('screenshot.png', BucketName.FEEDBACK);
      expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM feedback_submissions WHERE id = $1', [1]);
    });

    it('should create audit log entry on delete', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: 10,
            user_email: 'user@test.com',
            comment: 'Test comment',
            has_screenshot: true,
            screenshot_path: 'screenshot.png',
          }],
        })
        .mockResolvedValueOnce({ rowCount: 1 });

      const mockRequest = {} as Request;
      await service.delete(1, adminUser, mockRequest);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FEEDBACK_DELETE',
          userId: adminUser.id,
          resource: 'feedback',
          resourceId: 1,
          level: 'info',
        }),
      );

      // Verify key details are logged
      const auditCall = mockAuditService.log.mock.calls[0][0];
      expect(auditCall.details).toEqual(
        expect.objectContaining({
          deletedFeedbackId: 1,
          feedbackUserId: 10,
          feedbackUserEmail: 'user@test.com',
          hadScreenshot: true,
          screenshotDeleted: true,
          deletedBy: 'admin@test.com',
        }),
      );
    });

    it('should throw NotFoundException if feedback not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.delete(999, adminUser)).rejects.toThrow(NotFoundException);
      expect(mockStorageService.deleteFile).not.toHaveBeenCalled();
    });

    it('should delete feedback even if screenshot deletion fails', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: 10,
            user_email: 'user@test.com',
            comment: 'Test comment',
            has_screenshot: true,
            screenshot_path: 'screenshot.png',
          }],
        })
        .mockResolvedValueOnce({ rowCount: 1 });
      mockStorageService.deleteFile.mockRejectedValueOnce(new Error('MinIO error'));

      const result = await service.delete(1, adminUser);

      expect(result.message).toBe('Feedback deleted successfully');
      expect(result.screenshotDeleted).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should delete feedback without screenshot', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: 10,
            user_email: 'user@test.com',
            comment: 'Test comment',
            has_screenshot: false,
            screenshot_path: null,
          }],
        })
        .mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.delete(1, adminUser);

      expect(result.message).toBe('Feedback deleted successfully');
      expect(result.screenshotDeleted).toBe(false);
      expect(mockStorageService.deleteFile).not.toHaveBeenCalled();
    });

    it('should handle database deletion errors', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: 10,
            user_email: 'user@test.com',
            comment: 'Test comment',
            has_screenshot: false,
            screenshot_path: null,
          }],
        })
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(service.delete(1, adminUser)).rejects.toThrow(InternalServerErrorException);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty feedback list', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.pages).toBe(0);
    });

    it('should handle feedback with empty comment', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...mockFeedbackRow, comment: '' }],
      });

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data[0].commentPreview).toBe('');
    });

    it('should handle storage service not available', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockFeedbackRow] });
      mockStorageService.isConfigured.mockReturnValueOnce(false);

      const result = await service.findOne(1);

      expect(result.screenshotUrl).toBeUndefined();
    });
  });
});
