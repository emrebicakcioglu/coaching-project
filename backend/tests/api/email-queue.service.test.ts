/**
 * Email Queue Service Tests
 * STORY-023B: E-Mail Templates & Queue
 *
 * Unit tests for EmailQueueService
 */

import { EmailQueueService } from '../../src/email/email-queue.service';
import { EmailTemplateService } from '../../src/email/email-template.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';
import { DatabaseService } from '../../src/database/database.service';

// Mock dependencies
jest.mock('../../src/common/services/logger.service');
jest.mock('../../src/database/database.service');
jest.mock('../../src/email/email-template.service');
jest.mock('ioredis');
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn(),
    },
  })),
}));

describe('EmailQueueService', () => {
  let service: EmailQueueService;
  let mockLogger: jest.Mocked<WinstonLoggerService>;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockTemplateService: jest.Mocked<EmailTemplateService>;
  let mockPool: any;

  const mockQueueItem = {
    id: 1,
    template_name: 'welcome',
    recipient: 'test@example.com',
    subject: 'Welcome!',
    variables: { name: 'Test User' },
    priority: 0,
    status: 'pending',
    retry_count: 0,
    max_retries: 3,
    next_retry_at: null,
    error: null,
    message_id: null,
    scheduled_at: new Date(),
    processing_started_at: null,
    completed_at: null,
    created_at: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock pool
    mockPool = {
      query: jest.fn(),
    };

    // Setup mocks
    mockDatabaseService = {
      getPool: jest.fn().mockReturnValue(mockPool),
    } as any;

    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    mockTemplateService = {
      renderTemplate: jest.fn().mockResolvedValue({
        subject: 'Welcome!',
        html: '<h1>Welcome!</h1>',
        text: 'Welcome!',
      }),
    } as any;

    // Create service instance
    service = new EmailQueueService(
      mockLogger,
      mockDatabaseService,
      mockTemplateService,
    );
  });

  describe('enqueue', () => {
    it('should add email to queue', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockQueueItem] });

      const result = await service.enqueue({
        template_name: 'welcome',
        recipient: 'test@example.com',
        subject: 'Welcome!',
        variables: { name: 'Test User' },
      });

      expect(result).toEqual(mockQueueItem);
      expect(mockPool.query).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Email queued'),
        'EmailQueueService',
      );
    });

    it('should throw error when database not available', async () => {
      mockDatabaseService.getPool.mockReturnValue(null);

      await expect(
        service.enqueue({
          template_name: 'welcome',
          recipient: 'test@example.com',
          subject: 'Welcome!',
        }),
      ).rejects.toThrow('Database connection not available');
    });

    it('should use template-rendered subject', async () => {
      mockTemplateService.renderTemplate.mockResolvedValueOnce({
        subject: 'Custom Subject from Template',
        html: '<h1>Hello</h1>',
        text: 'Hello',
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...mockQueueItem, subject: 'Custom Subject from Template' }],
      });

      await service.enqueue({
        template_name: 'welcome',
        recipient: 'test@example.com',
        subject: '',
        variables: { name: 'Test' },
      });

      expect(mockTemplateService.renderTemplate).toHaveBeenCalledWith(
        'welcome',
        { name: 'Test' },
      );
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          pending: '5',
          processing: '2',
          sent: '100',
          failed: '3',
          total: '110',
        }],
      });

      const result = await service.getQueueStats();

      expect(result).toEqual({
        pending: 5,
        processing: 2,
        sent: 100,
        failed: 3,
        total: 110,
      });
    });
  });

  describe('getQueueItems', () => {
    it('should return queue items with filters', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockQueueItem] });

      const result = await service.getQueueItems({ status: 'pending' });

      expect(result).toEqual([mockQueueItem]);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('status = $1'),
        expect.arrayContaining(['pending']),
      );
    });

    it('should filter by template name', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockQueueItem] });

      const result = await service.getQueueItems({ template_name: 'welcome' });

      expect(result).toEqual([mockQueueItem]);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('template_name = $'),
        expect.arrayContaining(['welcome']),
      );
    });

    it('should filter by recipient with partial match', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockQueueItem] });

      const result = await service.getQueueItems({ recipient: '@example.com' });

      expect(result).toEqual([mockQueueItem]);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('recipient ILIKE $'),
        expect.arrayContaining(['%@example.com%']),
      );
    });
  });

  describe('getQueueItem', () => {
    it('should return queue item by ID', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockQueueItem] });

      const result = await service.getQueueItem(1);

      expect(result).toEqual(mockQueueItem);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM email_queue WHERE id = $1',
        [1],
      );
    });

    it('should return null when not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getQueueItem(999);

      expect(result).toBeNull();
    });
  });

  describe('cancelQueueItem', () => {
    it('should cancel a pending queue item', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const result = await service.cancelQueueItem(1);

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'cancelled'"),
        [1],
      );
    });

    it('should return false when item not found or not pending', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.cancelQueueItem(999);

      expect(result).toBe(false);
    });
  });

  describe('retryQueueItem', () => {
    it('should retry a failed queue item', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const result = await service.retryQueueItem(1);

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'pending'"),
        [1],
      );
    });

    it('should return false when item not found or not failed', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.retryQueueItem(999);

      expect(result).toBe(false);
    });
  });

  describe('cleanupOldItems', () => {
    it('should delete old completed queue items', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 10 });

      const result = await service.cleanupOldItems(30);

      expect(result).toBe(10);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('30 days'),
      );
    });
  });

  describe('getStatus', () => {
    it('should return queue service status', () => {
      const status = service.getStatus();

      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('processing');
      expect(status).toHaveProperty('redisConnected');
      expect(status).toHaveProperty('rateLimit');
      expect(status).toHaveProperty('emailsSentThisMinute');
    });
  });

  describe('calculateExponentialBackoff', () => {
    it('should increase delay exponentially', () => {
      // Access private method through any type cast
      const calculateBackoff = (service as any).calculateExponentialBackoff.bind(service);

      const delay1 = calculateBackoff(1);
      const delay2 = calculateBackoff(2);
      const delay3 = calculateBackoff(3);

      // Base delay is 5000ms (default)
      // Retry 1: 5000 * 2^0 = 5000 + jitter
      // Retry 2: 5000 * 2^1 = 10000 + jitter
      // Retry 3: 5000 * 2^2 = 20000 + jitter

      expect(delay1).toBeGreaterThanOrEqual(5000);
      expect(delay1).toBeLessThanOrEqual(6250); // 5000 + 25% jitter
      expect(delay2).toBeGreaterThanOrEqual(10000);
      expect(delay3).toBeGreaterThanOrEqual(20000);
    });

    it('should cap delay at 1 hour', () => {
      const calculateBackoff = (service as any).calculateExponentialBackoff.bind(service);

      // Very high retry count
      const delay = calculateBackoff(20);

      expect(delay).toBeLessThanOrEqual(3600000); // 1 hour in ms
    });
  });
});
