/**
 * SMTP Health Service Unit Tests
 *
 * Tests for the SMTP connectivity health check service.
 *
 * Story: STORY-029 (Health Status)
 */

import { SmtpHealthService } from '../../src/health/services/smtp-health.service';
import * as net from 'net';
import { EventEmitter } from 'events';

// Mock the net module
jest.mock('net');

describe('SmtpHealthService', () => {
  let service: SmtpHealthService;
  let mockSocket: EventEmitter & {
    connect: jest.Mock;
    setTimeout: jest.Mock;
    destroy: jest.Mock;
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock socket using EventEmitter for proper event handling
    mockSocket = Object.assign(new EventEmitter(), {
      connect: jest.fn(),
      setTimeout: jest.fn(),
      destroy: jest.fn(),
    });

    // Mock Socket constructor
    (net.Socket as unknown as jest.Mock).mockImplementation(() => mockSocket);

    // Clear environment variables
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_CHECK_TIMEOUT;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('healthCheck', () => {
    it('should return healthy with "not configured" when SMTP_HOST is not set', async () => {
      service = new SmtpHealthService();

      const result = await service.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.error).toBe('SMTP not configured');
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should return healthy when SMTP server responds with 220', async () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      service = new SmtpHealthService();

      const resultPromise = service.healthCheck();

      // Simulate successful connection and SMTP greeting
      setImmediate(() => {
        mockSocket.emit('connect');
        setImmediate(() => {
          mockSocket.emit('data', Buffer.from('220 smtp.example.com ESMTP'));
        });
      });

      const result = await resultPromise;

      expect(result.healthy).toBe(true);
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
      expect(mockSocket.connect).toHaveBeenCalledWith(587, 'smtp.example.com');
    });

    it('should return unhealthy when SMTP server responds with unexpected code', async () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      service = new SmtpHealthService();

      const resultPromise = service.healthCheck();

      // Simulate connection and non-220 response
      setImmediate(() => {
        mockSocket.emit('connect');
        setImmediate(() => {
          mockSocket.emit('data', Buffer.from('550 Service unavailable'));
        });
      });

      const result = await resultPromise;

      expect(result.healthy).toBe(false);
      expect(result.error).toContain('Unexpected SMTP response');
    });

    it('should return unhealthy on connection timeout', async () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_CHECK_TIMEOUT = '100';
      service = new SmtpHealthService();

      const resultPromise = service.healthCheck();

      // Trigger timeout
      setImmediate(() => {
        mockSocket.emit('timeout');
      });

      const result = await resultPromise;

      expect(result.healthy).toBe(false);
      expect(result.error).toContain('Connection timeout');
    });

    it('should return unhealthy on connection error', async () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      service = new SmtpHealthService();

      const resultPromise = service.healthCheck();

      // Trigger error
      setImmediate(() => {
        mockSocket.emit('error', new Error('Connection refused'));
      });

      const result = await resultPromise;

      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Connection refused');
    });

    it('should use default port 587 when SMTP_PORT is not set', async () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      service = new SmtpHealthService();

      const resultPromise = service.healthCheck();

      setImmediate(() => {
        mockSocket.emit('connect');
        setImmediate(() => {
          mockSocket.emit('data', Buffer.from('220 OK'));
        });
      });

      await resultPromise;

      expect(mockSocket.connect).toHaveBeenCalledWith(587, 'smtp.example.com');
    });

    it('should use custom port when SMTP_PORT is set', async () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '465';
      service = new SmtpHealthService();

      const resultPromise = service.healthCheck();

      setImmediate(() => {
        mockSocket.emit('connect');
        setImmediate(() => {
          mockSocket.emit('data', Buffer.from('220 OK'));
        });
      });

      await resultPromise;

      expect(mockSocket.connect).toHaveBeenCalledWith(465, 'smtp.example.com');
    });
  });
});
