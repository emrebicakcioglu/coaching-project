/**
 * Email Service Unit Tests
 * STORY-023A: E-Mail Service Setup (Resend.com)
 *
 * Tests for EmailService functionality including:
 * - Service initialization with Resend API key
 * - Template rendering with Handlebars
 * - Email sending via Resend
 * - Error handling for failed sends
 * - Retry mechanism verification
 * - Email logging functionality
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from '../../src/email/email.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';
import { DatabaseService } from '../../src/database/database.service';

// Mock the Resend SDK
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn(),
    },
  })),
}));

// Mock fs/promises for template loading
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

import { Resend } from 'resend';
import * as fs from 'fs/promises';

describe('EmailService', () => {
  let service: EmailService;
  let mockLogger: jest.Mocked<WinstonLoggerService>;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockResendInstance: { emails: { send: jest.Mock } };
  let mockPool: { query: jest.Mock };

  // Sample template content
  const sampleHtmlTemplate = `
    <!DOCTYPE html>
    <html>
    <body>
      <h1>Hello {{name}}</h1>
      <p>Welcome to {{companyName}}!</p>
      {{#if resetLink}}
      <a href="{{resetLink}}">Reset Password</a>
      {{/if}}
    </body>
    </html>
  `;

  const sampleTextTemplate = `
    Hello {{name}}
    Welcome to {{companyName}}!
    {{#if resetLink}}
    Reset your password: {{resetLink}}
    {{/if}}
  `;

  beforeEach(async () => {
    // Set up environment variables for testing
    process.env.NODE_ENV = 'test';
    process.env.RESEND_API_KEY = 're_test_key_123456789';
    process.env.EMAIL_FROM_NAME = 'Test App';
    process.env.EMAIL_FROM_ADDRESS = 'noreply@test.com';
    process.env.EMAIL_MAX_RETRIES = '2';
    process.env.EMAIL_RETRY_DELAY_MS = '10';

    // Create mock pool
    mockPool = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
    };

    // Create mock logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      logWithMetadata: jest.fn(),
      logHttpRequest: jest.fn(),
      logException: jest.fn(),
      setContext: jest.fn().mockReturnThis(),
      getLogDir: jest.fn().mockReturnValue('./logs'),
    } as unknown as jest.Mocked<WinstonLoggerService>;

    // Create mock database service
    mockDatabaseService = {
      getPool: jest.fn().mockReturnValue(mockPool),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<DatabaseService>;

    // Setup mock Resend instance
    mockResendInstance = {
      emails: {
        send: jest.fn().mockResolvedValue({
          data: { id: 'msg_test_12345' },
          error: null,
        }),
      },
    };
    (Resend as jest.Mock).mockImplementation(() => mockResendInstance);

    // Setup mock file system
    (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.endsWith('.txt.hbs')) {
        return Promise.resolve(sampleTextTemplate);
      }
      return Promise.resolve(sampleHtmlTemplate);
    });

    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: WinstonLoggerService,
          useValue: mockLogger,
        },
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with valid Resend API key', () => {
      expect(Resend).toHaveBeenCalledWith('re_test_key_123456789');
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Resend API key configured successfully',
        'EmailService',
      );
    });

    it('should warn if API key is not configured', async () => {
      process.env.RESEND_API_KEY = '';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: WinstonLoggerService, useValue: mockLogger },
          { provide: DatabaseService, useValue: mockDatabaseService },
        ],
      }).compile();

      const newService = module.get<EmailService>(EmailService);
      await newService.onModuleInit();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('RESEND_API_KEY not configured'),
        'EmailService',
      );
    });

    it('should warn if API key does not start with re_', async () => {
      process.env.RESEND_API_KEY = 'invalid_key';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: WinstonLoggerService, useValue: mockLogger },
          { provide: DatabaseService, useValue: mockDatabaseService },
        ],
      }).compile();

      const newService = module.get<EmailService>(EmailService);
      await newService.onModuleInit();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('RESEND_API_KEY not configured or invalid'),
        'EmailService',
      );
    });
  });

  describe('template rendering', () => {
    it('should render templates with variables', async () => {
      const result = await service.sendEmail(
        'test@example.com',
        'Test Subject',
        'welcome',
        { name: 'John Doe' },
      );

      expect(result.success).toBe(true);
      expect(mockResendInstance.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Hello John Doe'),
        }),
      );
    });

    it('should load and compile both HTML and text templates', async () => {
      await service.sendEmail(
        'test@example.com',
        'Test Subject',
        'password-reset',
        { name: 'Jane', resetLink: 'https://example.com/reset' },
      );

      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('password-reset.hbs'),
        'utf-8',
      );
    });

    it('should cache compiled templates', async () => {
      // First call
      await service.sendEmail('test@example.com', 'Test', 'welcome', { name: 'Test' });

      // Reset readFile mock to track new calls
      (fs.readFile as jest.Mock).mockClear();

      // Second call - should use cache
      await service.sendEmail('test2@example.com', 'Test 2', 'welcome', { name: 'Test2' });

      // Template should not be loaded again (cached)
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it('should clear template cache when requested', async () => {
      // Load a template
      await service.sendEmail('test@example.com', 'Test', 'welcome', { name: 'Test' });

      // Clear cache
      service.clearTemplateCache();

      // Reset readFile mock
      (fs.readFile as jest.Mock).mockClear();

      // Load again - should re-read from filesystem
      await service.sendEmail('test@example.com', 'Test', 'welcome', { name: 'Test' });

      expect(fs.readFile).toHaveBeenCalled();
    });
  });

  describe('email sending', () => {
    it('should send welcome email successfully', async () => {
      const result = await service.sendWelcomeEmail({
        email: 'user@example.com',
        name: 'John Doe',
        verificationLink: 'https://example.com/verify?token=abc123',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_test_12345');
      expect(mockResendInstance.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Test App <noreply@test.com>',
          to: ['user@example.com'],
          subject: 'Welcome to Core App!',
        }),
      );
    });

    it('should send password reset email successfully', async () => {
      const result = await service.sendPasswordResetEmail({
        email: 'user@example.com',
        name: 'Jane Doe',
        resetLink: 'https://example.com/reset?token=xyz789',
      });

      expect(result.success).toBe(true);
      // STORY-009: Updated to German subject line
      expect(mockResendInstance.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Passwort zurücksetzen - Test App',
        }),
      );
    });

    it('should send verification email successfully', async () => {
      const result = await service.sendVerificationEmail({
        email: 'user@example.com',
        name: 'Test User',
        verificationLink: 'https://example.com/verify?token=verify123',
      });

      expect(result.success).toBe(true);
      expect(mockResendInstance.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Verify Your Email Address',
        }),
      );
    });

    it('should send feedback confirmation email successfully', async () => {
      const result = await service.sendFeedbackConfirmationEmail({
        email: 'user@example.com',
        name: 'Feedback User',
        feedbackSubject: 'Bug Report',
      });

      expect(result.success).toBe(true);
      expect(mockResendInstance.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'We Received Your Feedback',
        }),
      );
    });

    it('should send support request email to support address', async () => {
      const result = await service.sendSupportRequestEmail({
        userEmail: 'user@example.com',
        userName: 'Support User',
        subject: 'Account Issue',
        message: 'I need help with my account',
        userId: 123,
      });

      expect(result.success).toBe(true);
      expect(mockResendInstance.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Support Request: Account Issue',
        }),
      );
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      mockResendInstance.emails.send.mockResolvedValue({
        data: null,
        error: { message: 'API rate limit exceeded' },
      });

      const result = await service.sendEmail(
        'test@example.com',
        'Test',
        'welcome',
        { name: 'Test' },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('API rate limit exceeded');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle template loading errors', async () => {
      // Clear template cache so the template needs to be loaded fresh
      service.clearTemplateCache();

      // Override the mock to fail for the specific template we're testing
      (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('nonexistent-template')) {
          return Promise.reject(new Error('ENOENT: file not found'));
        }
        if (filePath.endsWith('.txt.hbs')) {
          return Promise.resolve(sampleTextTemplate);
        }
        return Promise.resolve(sampleHtmlTemplate);
      });

      const result = await service.sendEmail(
        'test@example.com',
        'Test',
        'nonexistent-template',
        { name: 'Test' },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('file not found');
    });

    it('should log sent emails with message ID', async () => {
      await service.sendEmail(
        'test@example.com',
        'Test Subject',
        'welcome',
        { name: 'Test' },
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO email_logs'),
        expect.arrayContaining([
          'test@example.com',
          'Test Subject',
          'welcome',
          'msg_test_12345',
          'sent',
        ]),
      );
    });

    it('should log failed emails with error', async () => {
      mockResendInstance.emails.send.mockResolvedValue({
        data: null,
        error: { message: 'Invalid recipient' },
      });

      await service.sendEmail(
        'invalid-email',
        'Test Subject',
        'welcome',
        { name: 'Test' },
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO email_logs'),
        expect.arrayContaining([
          'invalid-email',
          'Test Subject',
          'welcome',
          null,
          'failed',
        ]),
      );
    });
  });

  describe('retry mechanism', () => {
    it('should retry on transient failures', async () => {
      // Fail first time, succeed on retry
      mockResendInstance.emails.send
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Temporary failure' },
        })
        .mockResolvedValueOnce({
          data: { id: 'msg_retry_success' },
          error: null,
        });

      const result = await service.sendEmail(
        'test@example.com',
        'Test',
        'welcome',
        { name: 'Test' },
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_retry_success');
      expect(mockResendInstance.emails.send).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Retrying email send (1/2)'),
        'EmailService',
      );
    });

    it('should stop retrying after max attempts', async () => {
      mockResendInstance.emails.send.mockResolvedValue({
        data: null,
        error: { message: 'Permanent failure' },
      });

      const result = await service.sendEmail(
        'test@example.com',
        'Test',
        'welcome',
        { name: 'Test' },
      );

      expect(result.success).toBe(false);
      // Initial + 2 retries = 3 attempts
      expect(mockResendInstance.emails.send).toHaveBeenCalledTimes(3);
    });

    it('should track retry count in logs', async () => {
      mockResendInstance.emails.send.mockResolvedValue({
        data: null,
        error: { message: 'Permanent failure' },
      });

      await service.sendEmail(
        'test@example.com',
        'Test',
        'welcome',
        { name: 'Test' },
      );

      // Check that final log has retry count
      const lastCall = mockPool.query.mock.calls[mockPool.query.mock.calls.length - 1];
      expect(lastCall[1]).toContain(2); // retry_count = 2 (after 2 retries)
    });
  });

  describe('configuration', () => {
    it('should report configured status correctly', () => {
      process.env.RESEND_API_KEY = 're_valid_key';
      process.env.EMAIL_FROM_ADDRESS = 'valid@example.com';

      expect(service.isConfigured()).toBe(true);
    });

    it('should report not configured with placeholder values', async () => {
      process.env.RESEND_API_KEY = '';
      process.env.EMAIL_FROM_ADDRESS = 'noreply@example.com';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: WinstonLoggerService, useValue: mockLogger },
          { provide: DatabaseService, useValue: mockDatabaseService },
        ],
      }).compile();

      const newService = module.get<EmailService>(EmailService);
      expect(newService.isConfigured()).toBe(false);
    });
  });

  describe('database logging fallback', () => {
    it('should handle database unavailable gracefully', async () => {
      mockDatabaseService.getPool.mockReturnValue(null);

      const result = await service.sendEmail(
        'test@example.com',
        'Test',
        'welcome',
        { name: 'Test' },
      );

      // Email should still be sent successfully
      expect(result.success).toBe(true);
      // Warning should be logged about DB unavailability
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('DB unavailable'),
        'EmailService',
      );
    });

    it('should handle database query errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Connection lost'));

      const result = await service.sendEmail(
        'test@example.com',
        'Test',
        'welcome',
        { name: 'Test' },
      );

      // Email should still be sent successfully
      expect(result.success).toBe(true);
      // Error should be logged but not thrown
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to log email'),
        expect.any(String),
        'EmailService',
      );
    });
  });
});
