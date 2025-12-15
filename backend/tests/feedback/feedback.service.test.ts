/**
 * Feedback Service Unit Tests
 * STORY-038A: Feedback-Backend API
 * STORY-038B: Feedback Rate Limiting & Email Queue
 *
 * Tests for FeedbackService including:
 * - Base64 to Buffer conversion
 * - Email sending with attachments
 * - Error handling
 * - Async email queue processing (STORY-038B)
 * - Browser info and route capture (STORY-038B)
 * - Metadata extraction (STORY-038B)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FeedbackService } from '../../src/feedback/feedback.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';
import { DatabaseService } from '../../src/database/database.service';
import { EmailQueueService } from '../../src/email/email-queue.service';
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

    it('should submit feedback successfully', async () => {
      const result = await service.submitFeedback(mockFeedbackDto, mockUser);

      expect(result).toEqual({ message: 'Feedback submitted successfully' });
      expect(mockResendSend).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Processing feedback submission'),
        'FeedbackService',
      );
    });

    it('should include screenshot as email attachment', async () => {
      await service.submitFeedback(mockFeedbackDto, mockUser);

      const sendCall = mockResendSend.mock.calls[0][0];
      expect(sendCall.attachments).toBeDefined();
      expect(sendCall.attachments).toHaveLength(1);
      expect(sendCall.attachments[0].filename).toMatch(/^screenshot-\d+\.png$/);
      expect(sendCall.attachments[0].content).toBeInstanceOf(Buffer);
    });

    it('should send email to configured support address', async () => {
      await service.submitFeedback(mockFeedbackDto, mockUser);

      const sendCall = mockResendSend.mock.calls[0][0];
      expect(sendCall.to).toContain('support@test.com');
    });

    it('should include user information in email subject', async () => {
      await service.submitFeedback(mockFeedbackDto, mockUser);

      const sendCall = mockResendSend.mock.calls[0][0];
      expect(sendCall.subject).toContain('Test User');
      expect(sendCall.subject).toContain('user@test.com');
    });

    it('should fetch user name from database if not provided', async () => {
      const userWithoutName = { id: 1, email: 'user@test.com' };
      mockPool.query.mockResolvedValueOnce({ rows: [{ name: 'DB User' }] });

      await service.submitFeedback(mockFeedbackDto, userWithoutName);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT name FROM users WHERE id = $1',
        [1],
      );
    });

    it('should use email as fallback if user name not found in database', async () => {
      const userWithoutName = { id: 1, email: 'user@test.com' };
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // User name query returns empty
        .mockResolvedValueOnce({ rows: [] }); // Email log query

      await service.submitFeedback(mockFeedbackDto, userWithoutName);

      const sendCall = mockResendSend.mock.calls[0][0];
      expect(sendCall.subject).toContain('user@test.com');
    });

    it('should handle optional fields (url and browserInfo)', async () => {
      const minimalFeedbackDto = {
        screenshot: mockFeedbackDto.screenshot,
        comment: 'Minimal feedback',
      };

      await service.submitFeedback(minimalFeedbackDto, mockUser);

      expect(mockResendSend).toHaveBeenCalledTimes(1);
    });

    it('should log email to database on success', async () => {
      await service.submitFeedback(mockFeedbackDto, mockUser);

      // Should have called query twice: once for user name, once for email log
      expect(mockPool.query).toHaveBeenCalled();
      const lastCall = mockPool.query.mock.calls[mockPool.query.mock.calls.length - 1];
      expect(lastCall[0]).toContain('INSERT INTO email_logs');
      expect(lastCall[1]).toContain('sent');
    });

    it('should handle Resend API errors', async () => {
      mockResendSend.mockResolvedValueOnce({
        data: null,
        error: { message: 'API key invalid' },
      });

      await expect(service.submitFeedback(mockFeedbackDto, mockUser)).rejects.toThrow(
        'Failed to send feedback email: Resend API error: API key invalid',
      );
    });

    it('should log failed email to database on error', async () => {
      mockResendSend.mockResolvedValueOnce({
        data: null,
        error: { message: 'API error' },
      });

      try {
        await service.submitFeedback(mockFeedbackDto, mockUser);
      } catch {
        // Expected to throw
      }

      const lastCall = mockPool.query.mock.calls[mockPool.query.mock.calls.length - 1];
      expect(lastCall[0]).toContain('INSERT INTO email_logs');
      expect(lastCall[1]).toContain('failed');
    });

    it('should handle data URL format screenshot', async () => {
      const feedbackWithDataUrl = {
        ...mockFeedbackDto,
        screenshot: `data:image/png;base64,${mockFeedbackDto.screenshot}`,
      };

      await service.submitFeedback(feedbackWithDataUrl, mockUser);

      expect(mockResendSend).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for invalid screenshot', async () => {
      const feedbackWithInvalidScreenshot = {
        ...mockFeedbackDto,
        screenshot: 'not-valid-base64!!!',
      };

      await expect(
        service.submitFeedback(feedbackWithInvalidScreenshot, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle database errors gracefully during logging', async () => {
      // STORY-038B: Now we first check table existence, then store, then email
      // Mock sequence: table check, store feedback, get user name, send email, log email
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('information_schema.tables')) {
          return Promise.resolve({ rows: [{ exists: false }] }); // No feedback_submissions table
        }
        if (query.includes('SELECT name FROM users')) {
          return Promise.resolve({ rows: [{ name: 'Test User' }] });
        }
        if (query.includes('INSERT INTO email_logs')) {
          return Promise.reject(new Error('Database error')); // Email log fails
        }
        return Promise.resolve({ rows: [] });
      });

      // Should not throw - feedback should still succeed
      const result = await service.submitFeedback(mockFeedbackDto, mockUser);

      expect(result).toEqual({ message: 'Feedback submitted successfully' });
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to log feedback email'),
        expect.any(String),
        'FeedbackService',
      );
    });

    it('should handle null database pool', async () => {
      mockDatabaseService.getPool.mockReturnValue(null);

      // Should still succeed - just won't log to database
      const result = await service.submitFeedback(mockFeedbackDto, mockUser);

      expect(result).toEqual({ message: 'Feedback submitted successfully' });
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

    it('should accept additional metadata fields in DTO', async () => {
      // Mock the feedback_submissions table existence check
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('information_schema.tables')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('SELECT name FROM users')) {
          return Promise.resolve({ rows: [{ name: 'Test User' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await service.submitFeedback(mockFeedbackDto, mockUser);

      expect(mockResendSend).toHaveBeenCalledTimes(1);
    });

    it('should handle request object for metadata extraction', async () => {
      const mockRequest = {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
          'accept-language': 'en-US,en;q=0.9',
          referer: 'https://example.com/previous-page',
        },
      } as unknown as Request;

      // Mock the feedback_submissions table existence check
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('information_schema.tables')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('SELECT name FROM users')) {
          return Promise.resolve({ rows: [{ name: 'Test User' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await service.submitFeedback(mockFeedbackDto, mockUser, mockRequest);

      expect(mockResendSend).toHaveBeenCalledTimes(1);
    });

    it('should extract route from URL', async () => {
      // Mock the feedback_submissions table existence check
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('information_schema.tables')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('SELECT name FROM users')) {
          return Promise.resolve({ rows: [{ name: 'Test User' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await service.submitFeedback(mockFeedbackDto, mockUser);

      // Verify the feedback was processed
      expect(mockResendSend).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Feedback submitted successfully'),
        'FeedbackService',
      );
    });

    it('should handle feedback with minimal fields', async () => {
      const minimalFeedbackDto = {
        screenshot: mockFeedbackDto.screenshot,
        comment: 'Minimal feedback',
      };

      // Mock the feedback_submissions table existence check
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('information_schema.tables')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('SELECT name FROM users')) {
          return Promise.resolve({ rows: [{ name: 'Test User' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await service.submitFeedback(minimalFeedbackDto, mockUser);

      expect(mockResendSend).toHaveBeenCalledTimes(1);
    });
  });

  // STORY-038B: Tests for feedback storage
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
      // Mock the feedback_submissions table existence check to return true
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('information_schema.tables')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (query.includes('INSERT INTO feedback_submissions')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT name FROM users')) {
          return Promise.resolve({ rows: [{ name: 'Test User' }] });
        }
        if (query.includes('INSERT INTO email_logs')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      await service.submitFeedback(mockFeedbackDto, mockUser);

      // Verify feedback was stored
      const insertCall = mockPool.query.mock.calls.find(
        (call) => call[0]?.includes?.('INSERT INTO feedback_submissions'),
      );
      expect(insertCall).toBeDefined();
    });

    it('should skip storage gracefully when table does not exist', async () => {
      // Mock the feedback_submissions table existence check to return false
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('information_schema.tables')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('SELECT name FROM users')) {
          return Promise.resolve({ rows: [{ name: 'Test User' }] });
        }
        if (query.includes('INSERT INTO email_logs')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      await service.submitFeedback(mockFeedbackDto, mockUser);

      // Verify feedback was not stored but email was sent
      const insertCall = mockPool.query.mock.calls.find(
        (call) => call[0]?.includes?.('INSERT INTO feedback_submissions'),
      );
      expect(insertCall).toBeUndefined();
      expect(mockResendSend).toHaveBeenCalled();
    });

    it('should continue if storage fails', async () => {
      // Mock the table check to succeed but insert to fail
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('information_schema.tables')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (query.includes('INSERT INTO feedback_submissions')) {
          return Promise.reject(new Error('Storage failed'));
        }
        if (query.includes('SELECT name FROM users')) {
          return Promise.resolve({ rows: [{ name: 'Test User' }] });
        }
        if (query.includes('INSERT INTO email_logs')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      // Should not throw - feedback submission should still succeed
      const result = await service.submitFeedback(mockFeedbackDto, mockUser);

      expect(result).toEqual({ message: 'Feedback submitted successfully' });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to store feedback record'),
        'FeedbackService',
      );
    });
  });

  // STORY-038B: Tests for async queue processing
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
        ],
      }).compile();

      service = module.get<FeedbackService>(FeedbackService);
    });

    it('should return queued status when queue is enabled', async () => {
      // Mock the feedback_submissions table existence check
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('information_schema.tables')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('SELECT name FROM users')) {
          return Promise.resolve({ rows: [{ name: 'Test User' }] });
        }
        if (query.includes('INSERT INTO email_logs')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await service.submitFeedback(mockFeedbackDto, mockUser);

      expect(result.message).toContain('submitted successfully');
      expect(result.queued).toBe(true);
    });

    it('should log queue processing', async () => {
      // Mock the feedback_submissions table existence check
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('information_schema.tables')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('SELECT name FROM users')) {
          return Promise.resolve({ rows: [{ name: 'Test User' }] });
        }
        if (query.includes('INSERT INTO email_logs')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      await service.submitFeedback(mockFeedbackDto, mockUser);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('queued for processing'),
        'FeedbackService',
      );
    });
  });
});
