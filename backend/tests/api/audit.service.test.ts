/**
 * Audit Service Unit Tests
 * STORY-028: System Logging (Audit Trail)
 *
 * Tests for the AuditService including:
 * - Basic audit logging functionality
 * - Context extraction from requests
 * - Sensitive data sanitization
 * - Convenience methods for common events
 * - Database query functionality
 */

import { AuditService, AuditLogOptions } from '../../src/common/services/audit.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';
import { DatabaseService } from '../../src/database/database.service';
import { AuditLog } from '../../src/database/types';

// Mock the dependencies
const mockLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  logWithMetadata: jest.fn(),
  logException: jest.fn(),
} as unknown as WinstonLoggerService;

const mockQuery = jest.fn();
const mockPool = {
  query: mockQuery,
};

const mockDatabaseService = {
  getPool: jest.fn().mockReturnValue(mockPool),
  query: mockQuery,
} as unknown as DatabaseService;

// Mock Request object helper
const createMockRequest = (options: {
  ip?: string;
  headers?: Record<string, string>;
  user?: { id?: number; email?: string };
  requestId?: string;
} = {}) => ({
  ip: options.ip || '127.0.0.1',
  headers: {
    'user-agent': 'test-agent',
    ...options.headers,
  },
  user: options.user,
  requestId: options.requestId || 'test-request-id',
});

describe('AuditService (STORY-028)', () => {
  let auditService: AuditService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'test';
    process.env.AUDIT_LOG_ENABLED = 'true';
    process.env.AUDIT_LOG_API_REQUESTS = 'false';

    // Reset the mock query to return a standard response
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: 1,
          user_id: 1,
          action: 'USER_LOGIN',
          resource: 'user',
          resource_id: 1,
          details: {},
          ip_address: '127.0.0.1',
          user_agent: 'test-agent',
          request_id: 'test-request-id',
          log_level: 'info',
          created_at: new Date(),
        },
      ],
    });

    auditService = new AuditService(mockLogger, mockDatabaseService);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should create service with audit logging enabled', () => {
      expect(auditService).toBeDefined();
      expect(auditService.isAuditLoggingEnabled()).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledWith('Audit logging enabled', 'AuditService');
    });

    it('should create service with audit logging disabled', () => {
      process.env.AUDIT_LOG_ENABLED = 'false';
      const disabledService = new AuditService(mockLogger, mockDatabaseService);
      expect(disabledService.isAuditLoggingEnabled()).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('Audit logging disabled', 'AuditService');
    });

    it('should create service with API request logging enabled', () => {
      process.env.AUDIT_LOG_API_REQUESTS = 'true';
      const apiLoggingService = new AuditService(mockLogger, mockDatabaseService);
      expect(apiLoggingService.isApiRequestLoggingEnabled()).toBe(true);
    });

    it('should create service with API request logging disabled by default', () => {
      expect(auditService.isApiRequestLoggingEnabled()).toBe(false);
    });
  });

  describe('log()', () => {
    it('should log an audit event to the database', async () => {
      const options: AuditLogOptions = {
        action: 'USER_LOGIN',
        userId: 1,
        resource: 'user',
        resourceId: 1,
        details: { email: 'test@example.com' },
        level: 'info',
        request: createMockRequest() as any,
      };

      const result = await auditService.log(options);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining([1, 'USER_LOGIN', 'user', 1])
      );
      expect(mockLogger.logWithMetadata).toHaveBeenCalledWith(
        'info',
        'Audit: USER_LOGIN',
        expect.any(Object),
        'AuditService'
      );
    });

    it('should return null when audit logging is disabled', async () => {
      process.env.AUDIT_LOG_ENABLED = 'false';
      const disabledService = new AuditService(mockLogger, mockDatabaseService);

      const result = await disabledService.log({
        action: 'USER_LOGIN',
        userId: 1,
      });

      expect(result).toBeNull();
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should extract context from request object', async () => {
      const mockRequest = createMockRequest({
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Mozilla/5.0' },
        user: { id: 42 },
        requestId: 'req-12345',
      });

      await auditService.log({
        action: 'USER_LOGIN',
        request: mockRequest as any,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          42, // user_id extracted from request
          'USER_LOGIN',
          null, // resource
          null, // resource_id
          '{}', // details
          '192.168.1.1', // ip_address
          'Mozilla/5.0', // user_agent
          'req-12345', // request_id
          'info', // log_level
        ])
      );
    });

    it('should use manual values over request extracted values', async () => {
      const mockRequest = createMockRequest({
        user: { id: 10 },
        ip: '192.168.1.1',
      });

      await auditService.log({
        action: 'USER_LOGIN',
        userId: 99, // Manual override
        ipAddress: '10.0.0.1', // Manual override
        request: mockRequest as any,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          99, // Manual userId takes precedence
          'USER_LOGIN',
        ])
      );
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await auditService.log({
        action: 'USER_LOGIN',
        userId: 1,
      });

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write audit log to database'),
        expect.any(String),
        'AuditService'
      );
    });

    it('should handle X-Forwarded-For header for IP extraction', async () => {
      const mockRequest = createMockRequest({
        headers: {
          'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
        },
      });

      await auditService.log({
        action: 'USER_LOGIN',
        request: mockRequest as any,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['203.0.113.195']) // First IP in X-Forwarded-For
      );
    });

    it('should handle X-Real-IP header for IP extraction', async () => {
      const mockRequest = createMockRequest({
        headers: {
          'x-real-ip': '203.0.113.50',
        },
      });

      await auditService.log({
        action: 'USER_LOGIN',
        request: mockRequest as any,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['203.0.113.50'])
      );
    });
  });

  describe('sanitizeDetails()', () => {
    it('should redact sensitive fields from details', async () => {
      const options: AuditLogOptions = {
        action: 'USER_LOGIN',
        userId: 1,
        details: {
          email: 'test@example.com',
          password: 'secret123',
          token: 'jwt-token-here',
          api_key: 'key-12345',
        },
      };

      await auditService.log(options);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.stringContaining('"password":"[REDACTED]"'),
        ])
      );
    });

    it('should redact nested sensitive fields', async () => {
      const options: AuditLogOptions = {
        action: 'USER_LOGIN',
        userId: 1,
        details: {
          user: {
            email: 'test@example.com',
            password_hash: 'hashed-password',
          },
        },
      };

      await auditService.log(options);

      // The stringified JSON should contain REDACTED for password_hash
      const callArgs = mockQuery.mock.calls[0][1];
      const detailsJson = callArgs[4]; // details is at index 4
      expect(detailsJson).toContain('[REDACTED]');
    });

    it('should preserve non-sensitive fields', async () => {
      const options: AuditLogOptions = {
        action: 'USER_LOGIN',
        userId: 1,
        details: {
          email: 'test@example.com',
          loginTime: '2024-01-15T10:00:00Z',
        },
      };

      await auditService.log(options);

      const callArgs = mockQuery.mock.calls[0][1];
      const detailsJson = callArgs[4];
      expect(detailsJson).toContain('test@example.com');
      expect(detailsJson).toContain('2024-01-15T10:00:00Z');
    });
  });

  describe('convenience methods', () => {
    const mockRequest = createMockRequest({ user: { id: 1 } });

    describe('logLogin()', () => {
      it('should log a user login event', async () => {
        await auditService.logLogin(1, mockRequest as any, { browser: 'Chrome' });

        expect(mockQuery).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining([1, 'USER_LOGIN', 'user', 1])
        );
      });
    });

    describe('logLogout()', () => {
      it('should log a user logout event', async () => {
        await auditService.logLogout(1, mockRequest as any);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining([1, 'USER_LOGOUT', 'user', 1])
        );
      });
    });

    describe('logLoginFailed()', () => {
      it('should log a failed login attempt with warning level', async () => {
        await auditService.logLoginFailed('test@example.com', mockRequest as any, 3);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining([null, 'USER_LOGIN_FAILED'])
        );
        expect(mockLogger.logWithMetadata).toHaveBeenCalledWith(
          'warn',
          expect.any(String),
          expect.any(Object),
          'AuditService'
        );
      });
    });

    describe('logRegistration()', () => {
      it('should log a user registration event', async () => {
        await auditService.logRegistration(1, mockRequest as any, 'test@example.com');

        expect(mockQuery).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining([1, 'USER_REGISTER', 'user', 1])
        );
      });
    });

    describe('logPasswordChange()', () => {
      it('should log a password change event', async () => {
        await auditService.logPasswordChange(1, mockRequest as any);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining([1, 'USER_PASSWORD_CHANGE', 'user', 1])
        );
      });
    });

    describe('logRoleAssignment()', () => {
      it('should log a role assignment event', async () => {
        await auditService.logRoleAssignment(2, 1, 'admin', 1, mockRequest as any);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining([1, 'ROLE_ASSIGN', 'user_role', 2])
        );
      });
    });

    describe('logSettingsChange()', () => {
      it('should log a settings change event with before/after values', async () => {
        await auditService.logSettingsChange(
          1,
          mockRequest as any,
          'theme',
          'light',
          'dark'
        );

        expect(mockQuery).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining([1, 'SETTINGS_UPDATE', 'settings'])
        );
        const detailsJson = mockQuery.mock.calls[0][1][4];
        expect(detailsJson).toContain('theme');
        expect(detailsJson).toContain('light');
        expect(detailsJson).toContain('dark');
      });
    });

    describe('logApiRequest()', () => {
      it('should not log API requests when disabled', async () => {
        const result = await auditService.logApiRequest(
          mockRequest as any,
          'GET',
          '/api/users',
          200,
          45
        );

        expect(result).toBeNull();
        expect(mockQuery).not.toHaveBeenCalled();
      });

      it('should log API requests when enabled', async () => {
        process.env.AUDIT_LOG_API_REQUESTS = 'true';
        const apiLoggingService = new AuditService(mockLogger, mockDatabaseService);

        await apiLoggingService.logApiRequest(
          mockRequest as any,
          'GET',
          '/api/users',
          200,
          45
        );

        expect(mockQuery).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining(['API_REQUEST', 'api'])
        );
      });

      it('should log 5xx responses with error level', async () => {
        process.env.AUDIT_LOG_API_REQUESTS = 'true';
        const apiLoggingService = new AuditService(mockLogger, mockDatabaseService);

        await apiLoggingService.logApiRequest(
          mockRequest as any,
          'POST',
          '/api/users',
          500,
          100
        );

        expect(mockLogger.logWithMetadata).toHaveBeenCalledWith(
          'error',
          expect.any(String),
          expect.any(Object),
          'AuditService'
        );
      });

      it('should log 4xx responses with warn level', async () => {
        process.env.AUDIT_LOG_API_REQUESTS = 'true';
        const apiLoggingService = new AuditService(mockLogger, mockDatabaseService);

        await apiLoggingService.logApiRequest(
          mockRequest as any,
          'GET',
          '/api/users/999',
          404,
          20
        );

        expect(mockLogger.logWithMetadata).toHaveBeenCalledWith(
          'warn',
          expect.any(String),
          expect.any(Object),
          'AuditService'
        );
      });
    });
  });

  describe('findAll()', () => {
    beforeEach(() => {
      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 1,
            user_id: 1,
            action: 'USER_LOGIN',
            resource: 'user',
            resource_id: 1,
            details: {},
            ip_address: '127.0.0.1',
            user_agent: 'test-agent',
            request_id: 'test-id',
            log_level: 'info',
            created_at: new Date(),
          },
        ],
      });
    });

    it('should query audit logs with default pagination', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // Count query
        .mockResolvedValueOnce({ rows: [] }); // Data query

      const result = await auditService.findAll();

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
      expect(result).toHaveProperty('totalPages');
    });

    it('should apply filters to query', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [] });

      await auditService.findAll({
        user_id: 1,
        action: 'USER_LOGIN',
        log_level: 'info',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('user_id = $1'),
        expect.arrayContaining([1, 'USER_LOGIN', 'info'])
      );
    });

    it('should handle date range filters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [] });

      await auditService.findAll({
        start_date: startDate,
        end_date: endDate,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('created_at >='),
        expect.arrayContaining([startDate, endDate])
      );
    });
  });

  describe('findById()', () => {
    it('should find an audit log by ID', async () => {
      const mockLog: AuditLog = {
        id: 1,
        user_id: 1,
        action: 'USER_LOGIN',
        resource: 'user',
        resource_id: 1,
        details: {},
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
        request_id: 'test-id',
        log_level: 'info',
        created_at: new Date(),
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockLog] });

      const result = await auditService.findById(1);

      expect(result).toEqual(mockLog);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM audit_logs WHERE id = $1',
        [1]
      );
    });

    it('should return null when audit log not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await auditService.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByUserId()', () => {
    it('should find audit logs for a specific user', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 1, user_id: 1, action: 'USER_LOGIN' },
          { id: 2, user_id: 1, action: 'USER_LOGOUT' },
        ],
      });

      const result = await auditService.findByUserId(1);

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        [1, 100] // Default limit
      );
    });

    it('should respect custom limit', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await auditService.findByUserId(1, 25);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [1, 25]
      );
    });
  });

  describe('findByAction()', () => {
    it('should find audit logs by action type', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 1, action: 'USER_LOGIN' },
          { id: 2, action: 'USER_LOGIN' },
        ],
      });

      const result = await auditService.findByAction('USER_LOGIN');

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE action = $1'),
        ['USER_LOGIN', 100]
      );
    });
  });

  describe('database pool handling', () => {
    it('should throw error when pool is not available', async () => {
      const nullPoolService = {
        getPool: jest.fn().mockReturnValue(null),
      } as unknown as DatabaseService;

      const serviceWithNullPool = new AuditService(mockLogger, nullPoolService);

      await expect(serviceWithNullPool.findById(1)).rejects.toThrow(
        'Database pool not available'
      );
    });
  });

  describe('status checks', () => {
    it('should return audit logging status', () => {
      expect(auditService.isAuditLoggingEnabled()).toBe(true);
    });

    it('should return API request logging status', () => {
      expect(auditService.isApiRequestLoggingEnabled()).toBe(false);
    });
  });
});
