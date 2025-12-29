/**
 * Feedback Service Unit Tests
 * STORY-038A: Feedback-Backend API
 * STORY-038B: Feedback Rate Limiting & Email Queue
 * STORY-041B: Feedback Screenshot Storage in MinIO
 * STORY-002-REWORK-003: Fixed HTTP 500 error - optional screenshot support
 *
 * Tests for FeedbackService including:
 * - Base64 to Buffer conversion
 * - Email sending with attachments
 * - Error handling
 * - Async email queue processing (STORY-038B)
 * - Browser info and route capture (STORY-038B)
 * - Metadata extraction (STORY-038B)
 * - Screenshot storage in MinIO (STORY-041B)
 * - Notification emails without attachment (STORY-041B)
 * - Optional screenshot support (STORY-002-REWORK-003)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FeedbackService } from '../../src/feedback/feedback.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';
import { DatabaseService } from '../../src/database/database.service';
import { EmailQueueService } from '../../src/email/email-queue.service';
import { StorageService } from '../../src/storage/storage.service';
import { BucketName } from '../../src/storage/dto';
import { Request } from 'express';

// Mock Resend
const mockResendSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockResendSend,
    },
  })),
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockRejectedValue(new Error('Template not found')),
}));

describe('FeedbackService', () => {
  let service: FeedbackService;
  let mockLogger: jest.Mocked<WinstonLoggerService>;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockEmailQueueService: jest.Mocked<EmailQueueService>;
  let mockStorageService: jest.Mocked<StorageService>;
  let mockPool: { query: jest.Mock };

  beforeEach(async () => {
    // Reset environment
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.SUPPORT_EMAIL = 'support@test.com';
    process.env.EMAIL_FROM_NAME = 'Test App';
    process.env.EMAIL_FROM_ADDRESS = 'noreply@test.com';
    // STORY-038B: Disable queue by default for backward compatibility in tests
    process.env.FEEDBACK_USE_QUEUE = 'false';
    process.env.FEEDBACK_QUEUE_PRIORITY = '5';
    // STORY-041B: Admin URL for email links
    process.env.ADMIN_URL = 'http://localhost:3000';

    // Create mocks
    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<WinstonLoggerService>;

    mockPool = {
      query: jest.fn().mockResolvedValue({ rows: [{ name: 'Test User' }] }),
    };

    mockDatabaseService = {
      getPool: jest.fn().mockReturnValue(mockPool),
    } as unknown as jest.Mocked<DatabaseService>;

    // STORY-038B: Mock EmailQueueService
    mockEmailQueueService = {
      enqueue: jest.fn().mockResolvedValue({ id: 1, status: 'pending' }),
      getQueueStats: jest.fn().mockResolvedValue({ pending: 0, sent: 0, failed: 0, total: 0 }),
    } as unknown as jest.Mocked<EmailQueueService>;

    // STORY-041B: Mock StorageService
    mockStorageService = {
      isConfigured: jest.fn().mockReturnValue(true),
      uploadBuffer: jest.fn().mockResolvedValue({
        success: true,
        fileName: '1234567890-feedback-1234567890.png',
        originalName: 'feedback-1234567890.png',
        bucket: 'feedback',
        size: 1234,
        mimeType: 'image/png',
        url: '/api/v1/files/1234567890-feedback-1234567890.png',
        etag: 'test-etag',
      }),
      getBucketName: jest.fn().mockReturnValue('feedback'),
    } as unknown as jest.Mocked<StorageService>;

    // Reset Resend mock
    mockResendSend.mockReset();
    mockResendSend.mockResolvedValue({
      data: { id: 'test-message-id' },
      error: null,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        { provide: WinstonLoggerService, useValue: mockLogger },
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: EmailQueueService, useValue: mockEmailQueueService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize the service', () => {
      expect(service).toBeDefined();
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('FeedbackService initialized'),
        'FeedbackService',
      );
    });

    it('should initialize with queue disabled', () => {
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('queue: disabled'),
        'FeedbackService',
      );
    });
  });

  describe('convertBase64ToBuffer', () => {
    it('should convert a simple Base64 string to Buffer', () => {
      // Simple text "Hello" encoded in base64
      const base64String = 'SGVsbG8=';
      const buffer = service.convertBase64ToBuffer(base64String);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.toString()).toBe('Hello');
    });

    it('should handle data URL format with PNG prefix', () => {
      // PNG magic bytes: 89 50 4E 47 (as Base64: iVBORw)
      const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const dataUrl = `data:image/png;base64,${pngBase64}`;

      const buffer = service.convertBase64ToBuffer(dataUrl);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // Verify PNG magic bytes
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4e);
      expect(buffer[3]).toBe(0x47);
    });

    it('should handle data URL format with JPEG prefix', () => {
      // JPEG magic bytes: FF D8 (as Base64: /9j/)
      const jpegBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAA==';
      const dataUrl = `data:image/jpeg;base64,${jpegBase64}`;

      const buffer = service.convertBase64ToBuffer(dataUrl);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // Verify JPEG magic bytes
      expect(buffer[0]).toBe(0xff);
      expect(buffer[1]).toBe(0xd8);
    });

    it('should throw BadRequestException for empty string', () => {
      expect(() => service.convertBase64ToBuffer('')).toThrow(BadRequestException);
      expect(() => service.convertBase64ToBuffer('')).toThrow(
        'Invalid screenshot: Base64 string is required',
      );
    });

    it('should throw BadRequestException for null input', () => {
      expect(() => service.convertBase64ToBuffer(null as unknown as string)).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for undefined input', () => {
      expect(() => service.convertBase64ToBuffer(undefined as unknown as string)).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid Base64 characters', () => {
      const invalidBase64 = 'SGVs!!!bG8='; // Contains invalid ! characters
      expect(() => service.convertBase64ToBuffer(invalidBase64)).toThrow(BadRequestException);
      expect(() => service.convertBase64ToBuffer(invalidBase64)).toThrow(
        'Invalid screenshot: Contains invalid Base64 characters',
      );
    });

    it('should throw BadRequestException for malformed data URL with multiple commas', () => {
      const malformedDataUrl = 'data:image/png;base64,SGVs,bG8=';
      expect(() => service.convertBase64ToBuffer(malformedDataUrl)).toThrow(BadRequestException);
      expect(() => service.convertBase64ToBuffer(malformedDataUrl)).toThrow(
        'Invalid screenshot: Malformed data URL',
      );
    });

    it('should warn for non-PNG/JPEG images but still process', () => {
      // This is a valid base64 but doesn't have PNG/JPEG magic bytes
      const textBase64 = 'SGVsbG8gV29ybGQ='; // "Hello World"
      const buffer = service.convertBase64ToBuffer(textBase64);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Screenshot may not be a valid PNG or JPEG image',
        'FeedbackService',
      );
    });

    it('should handle short buffers without checking magic bytes', () => {
      // Very short base64 string
      const shortBase64 = 'YWI='; // "ab"
      const buffer = service.convertBase64ToBuffer(shortBase64);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBe(2);
    });
  });

  // STORY-041B: Updated tests to reflect new MinIO storage behavior
  describe('submitFeedback', () => {
    const mockFeedbackDto = {
      screenshot: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      comment: 'Test feedback comment',
      url: 'https://example.com/test',
      browserInfo: 'Chrome 120',
    };

    const mockUser = {
      id: 1,
      email: 'user@test.com',
      name: 'Test User',
    };

    beforeEach(() => {
      // Set up standard mocks for submitFeedback tests (STORY-041B)
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('information_schema.tables')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (query.includes('information_schema.columns') && query.includes('screenshot_path')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (query.includes('INSERT INTO feedback_submissions')) {
          return Promise.resolve({ rows: [{ id: 100 }] });
        }
        if (query.includes('SELECT name FROM users')) {
          return Promise.resolve({ rows: [{ name: 'Test User' }] });
        }
        if (query.includes('INSERT INTO email_logs')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('UPDATE feedback_submissions')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });
    });

    it('should submit feedback successfully', async () => {
      const result = await service.submitFeedback(mockFeedbackDto, mockUser);

      // STORY-041B: Now returns id and screenshotStored
      expect(result.message).toContain('submitted successfully');
      expect(result.id).toBe(100);
      expect(result.screenshotStored).toBe(true);
      expect(mockResendSend).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Processing feedback submission'),
        'FeedbackService',
      );
    });

    // STORY-041B: Now we don't include attachments (screenshots are in MinIO)
    it('should send notification email without attachment', async () => {
      await service.submitFeedback(mockFeedbackDto, mockUser);

      const sendCall = mockResendSend.mock.calls[0][0];
      expect(sendCall.attachments).toBeUndefined();
    });

    it('should send email to configured support address', async () => {
      await service.submitFeedback(mockFeedbackDto, mockUser);

      const sendCall = mockResendSend.mock.calls[0][0];
      expect(sendCall.to).toContain('support@test.com');
    });

    // STORY-041B: New subject format "Neues Feedback von [User]"
    it('should include user name in email subject', async () => {
      await service.submitFeedback(mockFeedbackDto, mockUser);

      const sendCall = mockResendSend.mock.calls[0][0];
      expect(sendCall.subject).toContain('Neues Feedback von');
      expect(sendCall.subject).toContain('Test User');
    });

    it('should fetch user name from database if not provided', async () => {
      const userWithoutName = { id: 1, email: 'user@test.com' };

      await service.submitFeedback(mockFeedbackDto, userWithoutName);

      // Database should be queried for user name
      const userNameCall = mockPool.query.mock.calls.find(
        (call) => call[0]?.includes?.('SELECT name FROM users'),
      );
      expect(userNameCall).toBeDefined();
      expect(userNameCall[1]).toContain(1);
    });

    it('should use email as fallback if user name not found in database', async () => {
      const userWithoutName = { id: 1, email: 'user@test.com' };
      // Override the mock to return empty for user name query
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT name FROM users')) {
          return Promise.resolve({ rows: [] }); // No user found
        }
        if (query.includes('information_schema.tables')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (query.includes('information_schema.columns')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (query.includes('INSERT INTO feedback_submissions')) {
          return Promise.resolve({ rows: [{ id: 100 }] });
        }
        if (query.includes('INSERT INTO email_logs')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('UPDATE feedback_submissions')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      await service.submitFeedback(mockFeedbackDto, userWithoutName);

      const sendCall = mockResendSend.mock.calls[0][0];
      expect(sendCall.subject).toContain('user@test.com');
    });

    it('should handle optional fields (url and browserInfo)', async () => {
      const minimalFeedbackDto = {
        screenshot: mockFeedbackDto.screenshot,
        comment: 'Minimal feedback',
      };

      const result = await service.submitFeedback(minimalFeedbackDto, mockUser);

      expect(mockResendSend).toHaveBeenCalledTimes(1);
      expect(result.id).toBe(100);
    });

    it('should log email to database on success', async () => {
      await service.submitFeedback(mockFeedbackDto, mockUser);

      // Should have INSERT INTO email_logs call
      const emailLogCall = mockPool.query.mock.calls.find(
        (call) => call[0]?.includes?.('INSERT INTO email_logs'),
      );
      expect(emailLogCall).toBeDefined();
      expect(emailLogCall[1]).toContain('sent');
    });

    // STORY-041B: Email failures no longer throw - feedback is still stored
    it('should handle Resend API errors gracefully', async () => {
      mockResendSend.mockResolvedValueOnce({
        data: null,
        error: { message: 'API key invalid' },
      });

      // No longer throws - feedback is stored, email failure is logged
      const result = await service.submitFeedback(mockFeedbackDto, mockUser);

      expect(result.id).toBe(100);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('notification email failed'),
        'FeedbackService',
      );
    });

    it('should log failed email to database on error', async () => {
      mockResendSend.mockResolvedValueOnce({
        data: null,
        error: { message: 'API error' },
      });

      await service.submitFeedback(mockFeedbackDto, mockUser);

      // Should log failed email
      const emailLogCall = mockPool.query.mock.calls.find(
        (call) => call[0]?.includes?.('INSERT INTO email_logs') && call[1]?.includes?.('failed'),
      );
      expect(emailLogCall).toBeDefined();
    });

    it('should handle data URL format screenshot', async () => {
      const feedbackWithDataUrl = {
        ...mockFeedbackDto,
        screenshot: `data:image/png;base64,${mockFeedbackDto.screenshot}`,
      };

      const result = await service.submitFeedback(feedbackWithDataUrl, mockUser);

      expect(mockResendSend).toHaveBeenCalledTimes(1);
      expect(result.id).toBe(100);
    });

    // STORY-002-REWORK-003: Invalid screenshot no longer throws - feedback continues without screenshot
    it('should continue without screenshot when invalid screenshot provided', async () => {
      const feedbackWithInvalidScreenshot = {
        ...mockFeedbackDto,
        screenshot: 'not-valid-base64!!!',
      };

      const result = await service.submitFeedback(feedbackWithInvalidScreenshot, mockUser);

      // Should still succeed - feedback is submitted without screenshot
      expect(result.id).toBe(100);
      expect(result.screenshotStored).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to process screenshot'),
        'FeedbackService',
      );
    });

    // STORY-002-REWORK-003: Test for feedback without screenshot
    it('should submit feedback without screenshot', async () => {
      const feedbackWithoutScreenshot = {
        comment: 'Feedback without screenshot',
        url: 'https://example.com/test',
      };

      const result = await service.submitFeedback(feedbackWithoutScreenshot, mockUser);

      expect(result.id).toBe(100);
      expect(result.screenshotStored).toBe(false);
      expect(mockStorageService.uploadBuffer).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Feedback submitted without screenshot'),
        'FeedbackService',
      );
    });

    it('should handle database errors gracefully during logging', async () => {
      // Mock sequence with email log error
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('information_schema.tables')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (query.includes('information_schema.columns')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (query.includes('INSERT INTO feedback_submissions')) {
          return Promise.resolve({ rows: [{ id: 100 }] });
        }
        if (query.includes('SELECT name FROM users')) {
          return Promise.resolve({ rows: [{ name: 'Test User' }] });
        }
        if (query.includes('INSERT INTO email_logs')) {
          return Promise.reject(new Error('Database error')); // Email log fails
        }
        if (query.includes('UPDATE feedback_submissions')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      // Should not throw - feedback should still succeed
      const result = await service.submitFeedback(mockFeedbackDto, mockUser);

      expect(result.id).toBe(100);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to log feedback email'),
        expect.any(String),
        'FeedbackService',
      );
    });

    // STORY-041B: Null database pool now throws (feedback requires database)
    it('should throw error when database pool is null', async () => {
      mockDatabaseService.getPool.mockReturnValue(null);

      await expect(service.submitFeedback(mockFeedbackDto, mockUser)).rejects.toThrow(
        'Database not available',
      );
    });
  });

  describe('clearTemplateCache', () => {
    it('should clear the template cache and log the action', () => {
      service.clearTemplateCache();

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Feedback template cache cleared',
        'FeedbackService',
      );
    });
  });

  // STORY-038B: Tests for browser info and route capture
  // STORY-041B: Updated to reflect new database-required behavior
  describe('STORY-038B: Metadata extraction', () => {
    const mockFeedbackDto = {
      screenshot: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      comment: 'Test feedback comment',
      url: 'https://example.com/dashboard/settings',
      browserInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      screenResolution: '1920x1080',
      language: 'en-US',
      timezone: 'America/New_York',
    };

    const mockUser = {
      id: 1,
      email: 'user@test.com',
      name: 'Test User',
    };

    beforeEach(() => {
      // STORY-041B: Set up standard mocks
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('information_schema.tables')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (query.includes('information_schema.columns')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (query.includes('INSERT INTO feedback_submissions')) {
          return Promise.resolve({ rows: [{ id: 200 }] });
        }
        if (query.includes('SELECT name FROM users')) {
          return Promise.resolve({ rows: [{ name: 'Test User' }] });
        }
        if (query.includes('INSERT INTO email_logs')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('UPDATE feedback_submissions')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });
    });

    it('should accept additional metadata fields in DTO', async () => {
      const result = await service.submitFeedback(mockFeedbackDto, mockUser);

      expect(mockResendSend).toHaveBeenCalledTimes(1);
      expect(result.id).toBe(200);
    });

    it('should handle request object for metadata extraction', async () => {
      const mockRequest = {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
          'accept-language': 'en-US,en;q=0.9',
          referer: 'https://example.com/previous-page',
        },
      } as unknown as Request;

      const result = await service.submitFeedback(mockFeedbackDto, mockUser, mockRequest);

      expect(mockResendSend).toHaveBeenCalledTimes(1);
      expect(result.id).toBe(200);
    });

    it('should extract route from URL', async () => {
      const result = await service.submitFeedback(mockFeedbackDto, mockUser);

      // Verify the feedback was processed
      expect(mockResendSend).toHaveBeenCalled();
      expect(result.id).toBe(200);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('submitted'),
        'FeedbackService',
      );
    });

    it('should handle feedback with minimal fields', async () => {
      const minimalFeedbackDto = {
        screenshot: mockFeedbackDto.screenshot,
        comment: 'Minimal feedback',
      };

      const result = await service.submitFeedback(minimalFeedbackDto, mockUser);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(mockResendSend).toHaveBeenCalledTimes(1);
    });
  });

  // STORY-038B: Tests for feedback storage
  // STORY-041B: Updated to reflect new behavior where feedback requires database
  describe('STORY-038B: Feedback storage', () => {
    const mockFeedbackDto = {
      screenshot: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      comment: 'Test feedback comment',
      url: 'https://example.com/test',
    };

    const mockUser = {
      id: 1,
      email: 'user@test.com',
      name: 'Test User',
    };

    it('should store feedback in database when table exists', async () => {
      // Mock all necessary queries
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('information_schema.tables')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (query.includes('information_schema.columns')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (query.includes('INSERT INTO feedback_submissions')) {
          return Promise.resolve({ rows: [{ id: 300 }] });
        }
        if (query.includes('SELECT name FROM users')) {
          return Promise.resolve({ rows: [{ name: 'Test User' }] });
        }
        if (query.includes('INSERT INTO email_logs')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('UPDATE feedback_submissions')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await service.submitFeedback(mockFeedbackDto, mockUser);

      // Verify feedback was stored
      const insertCall = mockPool.query.mock.calls.find(
        (call) => call[0]?.includes?.('INSERT INTO feedback_submissions'),
      );
      expect(insertCall).toBeDefined();
      expect(result.id).toBe(300);
    });

    // STORY-041B: Now throws when table doesn't exist
    it('should throw error when table does not exist', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('information_schema.tables')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('SELECT name FROM users')) {
          return Promise.resolve({ rows: [{ name: 'Test User' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(service.submitFeedback(mockFeedbackDto, mockUser)).rejects.toThrow(
        'feedback_submissions table not yet created',
      );
    });

    // STORY-041B: Storage failures now throw errors
    it('should throw error if storage fails', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('information_schema.tables')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (query.includes('information_schema.columns')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (query.includes('INSERT INTO feedback_submissions')) {
          return Promise.reject(new Error('Storage failed'));
        }
        if (query.includes('SELECT name FROM users')) {
          return Promise.resolve({ rows: [{ name: 'Test User' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(service.submitFeedback(mockFeedbackDto, mockUser)).rejects.toThrow(
        'Storage failed',
      );
    });
  });

  // STORY-038B: Tests for async queue processing
  // STORY-041B: Updated to reflect new database-required behavior
  describe('STORY-038B: Async email queue', () => {
    const mockFeedbackDto = {
      screenshot: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      comment: 'Test feedback for queue',
      url: 'https://example.com/test',
    };

    const mockUser = {
      id: 1,
      email: 'user@test.com',
      name: 'Test User',
    };

    beforeEach(async () => {
      // Enable queue for these tests
      process.env.FEEDBACK_USE_QUEUE = 'true';

      // Recreate the module with queue enabled
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FeedbackService,
          { provide: WinstonLoggerService, useValue: mockLogger },
          { provide: DatabaseService, useValue: mockDatabaseService },
          { provide: EmailQueueService, useValue: mockEmailQueueService },
          { provide: StorageService, useValue: mockStorageService },
        ],
      }).compile();

      service = module.get<FeedbackService>(FeedbackService);
    });

    it('should return queued status when queue is enabled', async () => {
      // STORY-041B: Now requires full database mocks
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('information_schema.tables')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (query.includes('information_schema.columns')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (query.includes('INSERT INTO feedback_submissions')) {
          return Promise.resolve({ rows: [{ id: 400 }] });
        }
        if (query.includes('SELECT name FROM users')) {
          return Promise.resolve({ rows: [{ name: 'Test User' }] });
        }
        if (query.includes('INSERT INTO email_logs')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('UPDATE feedback_submissions')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await service.submitFeedback(mockFeedbackDto, mockUser);

      expect(result.message).toContain('submitted successfully');
      expect(result.queued).toBe(true);
      expect(result.id).toBe(400);
    });

    it('should log queue processing', async () => {
      // STORY-041B: Now requires full database mocks
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('information_schema.tables')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (query.includes('information_schema.columns')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (query.includes('INSERT INTO feedback_submissions')) {
          return Promise.resolve({ rows: [{ id: 500 }] });
        }
        if (query.includes('SELECT name FROM users')) {
          return Promise.resolve({ rows: [{ name: 'Test User' }] });
        }
        if (query.includes('INSERT INTO email_logs')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('UPDATE feedback_submissions')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await service.submitFeedback(mockFeedbackDto, mockUser);

      expect(result.id).toBe(500);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('submitted'),
        'FeedbackService',
      );
    });
  });

  // STORY-041B: Tests for MinIO screenshot storage
  describe('STORY-041B: Screenshot storage in MinIO', () => {
    const mockFeedbackDto = {
      screenshot: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      comment: 'Test feedback with screenshot',
      url: 'https://example.com/test',
    };

    const mockUser = {
      id: 1,
      email: 'user@test.com',
      name: 'Test User',
    };

    beforeEach(() => {
      // Set up standard mocks for STORY-041B tests
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('information_schema.tables')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (query.includes('information_schema.columns') && query.includes('screenshot_path')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (query.includes('INSERT INTO feedback_submissions')) {
          return Promise.resolve({ rows: [{ id: 123 }] });
        }
        if (query.includes('SELECT name FROM users')) {
          return Promise.resolve({ rows: [{ name: 'Test User' }] });
        }
        if (query.includes('INSERT INTO email_logs')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('UPDATE feedback_submissions')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });
    });

    it('should upload screenshot to MinIO', async () => {
      const result = await service.submitFeedback(mockFeedbackDto, mockUser);

      expect(mockStorageService.uploadBuffer).toHaveBeenCalledTimes(1);
      expect(mockStorageService.uploadBuffer).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringMatching(/^feedback-\d+\.png$/),
        'image/png',
        BucketName.FEEDBACK,
      );
      expect(result.screenshotStored).toBe(true);
    });

    it('should return feedback ID in response', async () => {
      const result = await service.submitFeedback(mockFeedbackDto, mockUser);

      expect(result.id).toBe(123);
      expect(result.message).toContain('submitted successfully');
    });

    it('should save screenshot_path in database', async () => {
      await service.submitFeedback(mockFeedbackDto, mockUser);

      // Find the INSERT query for feedback_submissions
      const insertCall = mockPool.query.mock.calls.find(
        (call) => call[0]?.includes?.('INSERT INTO feedback_submissions') && call[0]?.includes?.('screenshot_path'),
      );
      expect(insertCall).toBeDefined();
      // The screenshot_path should be in the parameters (17th parameter)
      expect(insertCall[1][16]).toMatch(/^\d+-feedback-\d+\.png$/);
    });

    it('should send notification email without attachment', async () => {
      await service.submitFeedback(mockFeedbackDto, mockUser);

      expect(mockResendSend).toHaveBeenCalledTimes(1);
      const emailPayload = mockResendSend.mock.calls[0][0];
      // Should NOT have attachments
      expect(emailPayload.attachments).toBeUndefined();
      // Should have the new subject format
      expect(emailPayload.subject).toContain('Neues Feedback von');
    });

    it('should include admin link in notification email', async () => {
      await service.submitFeedback(mockFeedbackDto, mockUser);

      const emailPayload = mockResendSend.mock.calls[0][0];
      expect(emailPayload.html).toContain('http://localhost:3000/admin/feedback/123');
    });

    it('should handle storage service unavailability gracefully', async () => {
      mockStorageService.isConfigured.mockReturnValue(false);

      const result = await service.submitFeedback(mockFeedbackDto, mockUser);

      expect(result.screenshotStored).toBe(false);
      expect(result.id).toBe(123);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('StorageService not available'),
        'FeedbackService',
      );
    });

    it('should continue if MinIO upload fails', async () => {
      mockStorageService.uploadBuffer.mockRejectedValue(new Error('MinIO connection failed'));

      const result = await service.submitFeedback(mockFeedbackDto, mockUser);

      expect(result.screenshotStored).toBe(false);
      expect(result.id).toBe(123);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to upload screenshot to MinIO'),
        expect.any(String),
        'FeedbackService',
      );
    });

    it('should update email status in feedback record', async () => {
      await service.submitFeedback(mockFeedbackDto, mockUser);

      const updateCall = mockPool.query.mock.calls.find(
        (call) => call[0]?.includes?.('UPDATE feedback_submissions') && call[0]?.includes?.('email_status'),
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[1]).toContain('sent');
      expect(updateCall[1]).toContain(123);
    });

    it('should fallback to insert without screenshot_path if column not exists', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('information_schema.tables')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (query.includes('information_schema.columns') && query.includes('screenshot_path')) {
          return Promise.resolve({ rows: [{ exists: false }] }); // Column does not exist
        }
        if (query.includes('INSERT INTO feedback_submissions') && !query.includes('screenshot_path')) {
          return Promise.resolve({ rows: [{ id: 456 }] });
        }
        if (query.includes('SELECT name FROM users')) {
          return Promise.resolve({ rows: [{ name: 'Test User' }] });
        }
        if (query.includes('INSERT INTO email_logs')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('UPDATE feedback_submissions')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await service.submitFeedback(mockFeedbackDto, mockUser);

      expect(result.id).toBe(456);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('screenshot_path column not found'),
        'FeedbackService',
      );
    });

    it('should log feedback ID when storage is successful', async () => {
      await service.submitFeedback(mockFeedbackDto, mockUser);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Screenshot uploaded to MinIO'),
        'FeedbackService',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Feedback record 123 stored'),
        'FeedbackService',
      );
    });
  });

  // STORY-041B: Tests for notification-only emails
  describe('STORY-041B: Notification email without attachment', () => {
    const mockFeedbackDto = {
      screenshot: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      comment: 'Test feedback for notification',
      url: 'https://example.com/test',
    };

    const mockUser = {
      id: 1,
      email: 'user@test.com',
      name: 'Test User',
    };

    beforeEach(() => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('information_schema.tables')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (query.includes('information_schema.columns')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (query.includes('INSERT INTO feedback_submissions')) {
          return Promise.resolve({ rows: [{ id: 999 }] });
        }
        if (query.includes('SELECT name FROM users')) {
          return Promise.resolve({ rows: [{ name: 'Test User' }] });
        }
        if (query.includes('INSERT INTO email_logs')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('UPDATE feedback_submissions')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });
    });

    it('should not include any attachments in notification email', async () => {
      await service.submitFeedback(mockFeedbackDto, mockUser);

      const emailPayload = mockResendSend.mock.calls[0][0];
      expect(emailPayload.attachments).toBeUndefined();
    });

    it('should include screenshot notice in email when screenshot stored', async () => {
      await service.submitFeedback(mockFeedbackDto, mockUser);

      const emailPayload = mockResendSend.mock.calls[0][0];
      expect(emailPayload.html).toContain('Screenshot vorhanden');
    });

    it('should include feedback ID in notification email', async () => {
      await service.submitFeedback(mockFeedbackDto, mockUser);

      const emailPayload = mockResendSend.mock.calls[0][0];
      expect(emailPayload.html).toContain('999');
    });

    it('should handle email sending failure without throwing', async () => {
      mockResendSend.mockResolvedValueOnce({
        data: null,
        error: { message: 'Email API error' },
      });

      const result = await service.submitFeedback(mockFeedbackDto, mockUser);

      // Should still return a result (feedback was stored)
      expect(result.id).toBe(999);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('notification email failed'),
        'FeedbackService',
      );
    });

    it('should update email status to failed on email error', async () => {
      mockResendSend.mockResolvedValueOnce({
        data: null,
        error: { message: 'Email API error' },
      });

      await service.submitFeedback(mockFeedbackDto, mockUser);

      const updateCall = mockPool.query.mock.calls.find(
        (call) => call[0]?.includes?.('UPDATE feedback_submissions') && call[0]?.includes?.('email_status'),
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[1]).toContain('failed');
    });
  });
});
