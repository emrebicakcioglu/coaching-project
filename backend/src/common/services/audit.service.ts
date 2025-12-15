/**
 * Audit Service
 * STORY-028: System Logging (Audit Trail)
 *
 * Centralized service for audit logging that tracks:
 * - User authentication events (login, logout, failed attempts)
 * - User management events (registration, password changes, profile updates)
 * - Role/permission assignments
 * - Settings changes
 * - API requests (configurable)
 *
 * Features:
 * - Asynchronous logging to prevent blocking
 * - Structured logging with Winston integration
 * - Database persistence for audit compliance
 * - Request context extraction (IP, User-Agent, Request ID)
 * - Configurable via environment variables
 *
 * Environment Variables:
 * - AUDIT_LOG_ENABLED: Enable/disable audit logging (default: true)
 * - AUDIT_LOG_API_REQUESTS: Log all API requests (default: false)
 *
 * Usage:
 * @example
 * // Inject the service
 * constructor(private readonly auditService: AuditService) {}
 *
 * // Log an event
 * await this.auditService.log({
 *   action: 'USER_LOGIN',
 *   userId: user.id,
 *   details: { email: user.email },
 *   request: req
 * });
 */

import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Request } from 'express';
import { WinstonLoggerService } from './logger.service';
import { DatabaseService } from '../../database/database.service';
import {
  AuditLog,
  AuditLogInsert,
  AuditLogFilter,
  AuditAction,
  AuditLogLevel,
} from '../../database/types';

/**
 * Extended Request interface with optional user and requestId
 */
interface AuditRequest extends Request {
  user?: { id?: number; email?: string };
  requestId?: string;
}

/**
 * Options for creating an audit log entry
 */
export interface AuditLogOptions {
  /** Action being performed */
  action: AuditAction;
  /** User ID performing the action (optional for system events) */
  userId?: number | null;
  /** Resource type being affected */
  resource?: string;
  /** ID of the specific resource */
  resourceId?: number;
  /** Additional context/details for the event */
  details?: Record<string, unknown>;
  /** Log level (default: info) */
  level?: AuditLogLevel;
  /** Express Request object for context extraction */
  request?: AuditRequest;
  /** Manually specified IP address (used if request not provided) */
  ipAddress?: string;
  /** Manually specified User-Agent (used if request not provided) */
  userAgent?: string;
  /** Manually specified Request ID (used if request not provided) */
  requestId?: string;
}

/**
 * Paginated audit log response
 */
export interface PaginatedAuditLogs {
  data: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Audit Service Class
 * Singleton service for centralized audit logging
 */
@Injectable()
export class AuditService {
  private readonly isEnabled: boolean;
  private readonly logApiRequests: boolean;

  constructor(
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
  ) {
    this.isEnabled = process.env.AUDIT_LOG_ENABLED !== 'false';
    this.logApiRequests = process.env.AUDIT_LOG_API_REQUESTS === 'true';

    if (this.isEnabled) {
      this.logger.log('Audit logging enabled', 'AuditService');
    } else {
      this.logger.warn('Audit logging disabled', 'AuditService');
    }
  }

  /**
   * Extract client IP address from request
   * Handles X-Forwarded-For header for proxied requests
   *
   * @param request - Express Request object
   * @returns Client IP address
   */
  private extractIpAddress(request?: AuditRequest): string | null {
    if (!request) return null;

    // Check for X-Forwarded-For header (used by proxies/load balancers)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips.trim();
    }

    // Check for X-Real-IP header
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fall back to req.ip (may be IPv6 loopback in development)
    return request.ip || null;
  }

  /**
   * Extract User-Agent from request
   *
   * @param request - Express Request object
   * @returns User-Agent string
   */
  private extractUserAgent(request?: AuditRequest): string | null {
    if (!request) return null;
    const userAgent = request.headers['user-agent'];
    return typeof userAgent === 'string' ? userAgent : null;
  }

  /**
   * Extract Request ID from request (set by RequestIdMiddleware)
   *
   * @param request - Express Request object
   * @returns Request ID string
   */
  private extractRequestId(request?: AuditRequest): string | null {
    if (!request) return null;
    return request.requestId || null;
  }

  /**
   * Extract User ID from request (from authenticated user)
   *
   * @param request - Express Request object
   * @returns User ID
   */
  private extractUserId(request?: AuditRequest): number | null {
    if (!request?.user?.id) return null;
    return typeof request.user.id === 'number' ? request.user.id : null;
  }

  /**
   * Sanitize details object to remove sensitive data
   * Never log passwords, tokens, or other sensitive information
   *
   * @param details - Details object to sanitize
   * @returns Sanitized details object
   */
  private sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> {
    if (!details) return {};

    const sensitiveKeys = [
      'password',
      'password_hash',
      'token',
      'secret',
      'api_key',
      'apiKey',
      'authorization',
      'mfa_secret',
      'credit_card',
      'ssn',
      'social_security',
    ];

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(details)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some((sk) => lowerKey.includes(sk));

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeDetails(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Log an audit event
   * Writes to both database and Winston logger asynchronously
   *
   * @param options - Audit log options
   * @returns The created audit log entry (or null if disabled)
   */
  async log(options: AuditLogOptions): Promise<AuditLog | null> {
    if (!this.isEnabled) {
      return null;
    }

    const {
      action,
      userId,
      resource,
      resourceId,
      details,
      level = 'info',
      request,
      ipAddress,
      userAgent,
      requestId,
    } = options;

    // Extract context from request or use provided values
    const extractedUserId = userId ?? this.extractUserId(request);
    const extractedIpAddress = ipAddress ?? this.extractIpAddress(request);
    const extractedUserAgent = userAgent ?? this.extractUserAgent(request);
    const extractedRequestId = requestId ?? this.extractRequestId(request);

    // Sanitize details to remove sensitive data
    const sanitizedDetails = this.sanitizeDetails(details);

    // Prepare audit log entry
    const auditLogInsert: AuditLogInsert = {
      user_id: extractedUserId,
      action,
      resource: resource || null,
      resource_id: resourceId || null,
      details: sanitizedDetails,
      ip_address: extractedIpAddress,
      user_agent: extractedUserAgent,
      request_id: extractedRequestId,
      log_level: level,
    };

    // Log to Winston (structured logging)
    this.logger.logWithMetadata(
      level,
      `Audit: ${action}`,
      {
        userId: extractedUserId?.toString(),
        requestId: extractedRequestId || undefined,
        action,
        resource,
        resourceId,
        ...sanitizedDetails,
      },
      'AuditService',
    );

    // Write to database asynchronously (fire and forget pattern with error handling)
    try {
      const result = await this.insertAuditLog(auditLogInsert);
      return result;
    } catch (error) {
      // Log error but don't throw - audit logging should not break the application
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to write audit log to database: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        'AuditService',
      );
      return null;
    }
  }

  /**
   * Insert audit log entry into database
   *
   * @param entry - Audit log entry to insert
   * @returns Created audit log entry
   */
  private async insertAuditLog(entry: AuditLogInsert): Promise<AuditLog> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const result = await pool.query<AuditLog>(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent, request_id, log_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        entry.user_id,
        entry.action,
        entry.resource,
        entry.resource_id,
        JSON.stringify(entry.details || {}),
        entry.ip_address,
        entry.user_agent,
        entry.request_id,
        entry.log_level || 'info',
      ],
    );

    return result.rows[0];
  }

  /**
   * Query audit logs with filtering and pagination
   *
   * @param filter - Filter options
   * @returns Paginated audit logs
   */
  async findAll(filter: AuditLogFilter = {}): Promise<PaginatedAuditLogs> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const {
      user_id,
      action,
      resource,
      resource_id,
      log_level,
      start_date,
      end_date,
      ip_address,
      limit = 50,
      offset = 0,
    } = filter;

    // Build dynamic WHERE clause
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (user_id !== undefined) {
      conditions.push(`user_id = $${paramIndex++}`);
      params.push(user_id);
    }

    if (action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(action);
    }

    if (resource) {
      conditions.push(`resource = $${paramIndex++}`);
      params.push(resource);
    }

    if (resource_id !== undefined) {
      conditions.push(`resource_id = $${paramIndex++}`);
      params.push(resource_id);
    }

    if (log_level) {
      conditions.push(`log_level = $${paramIndex++}`);
      params.push(log_level);
    }

    if (start_date) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(end_date);
    }

    if (ip_address) {
      conditions.push(`ip_address = $${paramIndex++}`);
      params.push(ip_address);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated data
    const dataResult = await pool.query<AuditLog>(
      `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset],
    );

    const pageSize = limit;
    const page = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);

    return {
      data: dataResult.rows,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Find a specific audit log entry by ID
   *
   * @param id - Audit log ID
   * @returns Audit log entry or null if not found
   */
  async findById(id: number): Promise<AuditLog | null> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const result = await pool.query<AuditLog>(
      'SELECT * FROM audit_logs WHERE id = $1',
      [id],
    );

    return result.rows[0] || null;
  }

  /**
   * Find audit logs by user ID
   *
   * @param userId - User ID
   * @param limit - Maximum number of results
   * @returns Array of audit log entries
   */
  async findByUserId(userId: number, limit = 100): Promise<AuditLog[]> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const result = await pool.query<AuditLog>(
      'SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit],
    );

    return result.rows;
  }

  /**
   * Find recent audit logs by action type
   *
   * @param action - Action type
   * @param limit - Maximum number of results
   * @returns Array of audit log entries
   */
  async findByAction(action: AuditAction, limit = 100): Promise<AuditLog[]> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const result = await pool.query<AuditLog>(
      'SELECT * FROM audit_logs WHERE action = $1 ORDER BY created_at DESC LIMIT $2',
      [action, limit],
    );

    return result.rows;
  }

  /**
   * Check if API request logging is enabled
   */
  isApiRequestLoggingEnabled(): boolean {
    return this.logApiRequests;
  }

  /**
   * Check if audit logging is enabled
   */
  isAuditLoggingEnabled(): boolean {
    return this.isEnabled;
  }

  // ===========================================
  // Convenience methods for common audit events
  // ===========================================

  /**
   * Log user login event
   */
  async logLogin(userId: number, request: AuditRequest, details?: Record<string, unknown>): Promise<AuditLog | null> {
    return this.log({
      action: 'USER_LOGIN',
      userId,
      resource: 'user',
      resourceId: userId,
      details: { event: 'login', ...details },
      level: 'info',
      request,
    });
  }

  /**
   * Log user logout event
   */
  async logLogout(userId: number, request: AuditRequest): Promise<AuditLog | null> {
    return this.log({
      action: 'USER_LOGOUT',
      userId,
      resource: 'user',
      resourceId: userId,
      details: { event: 'logout' },
      level: 'info',
      request,
    });
  }

  /**
   * Log failed login attempt
   */
  async logLoginFailed(
    email: string,
    request: AuditRequest,
    attemptCount?: number,
  ): Promise<AuditLog | null> {
    return this.log({
      action: 'USER_LOGIN_FAILED',
      userId: null,
      resource: 'user',
      details: { email, attemptCount, event: 'login_failed' },
      level: 'warn',
      request,
    });
  }

  /**
   * Log user registration event
   */
  async logRegistration(userId: number, request: AuditRequest, email: string): Promise<AuditLog | null> {
    return this.log({
      action: 'USER_REGISTER',
      userId,
      resource: 'user',
      resourceId: userId,
      details: { email, event: 'registration' },
      level: 'info',
      request,
    });
  }

  /**
   * Log password change event
   */
  async logPasswordChange(userId: number, request: AuditRequest): Promise<AuditLog | null> {
    return this.log({
      action: 'USER_PASSWORD_CHANGE',
      userId,
      resource: 'user',
      resourceId: userId,
      details: { event: 'password_change' },
      level: 'info',
      request,
    });
  }

  /**
   * Log role assignment event
   */
  async logRoleAssignment(
    userId: number,
    roleId: number,
    roleName: string,
    assignedBy: number,
    request: AuditRequest,
  ): Promise<AuditLog | null> {
    return this.log({
      action: 'ROLE_ASSIGN',
      userId: assignedBy,
      resource: 'user_role',
      resourceId: userId,
      details: { targetUserId: userId, roleId, roleName, event: 'role_assigned' },
      level: 'info',
      request,
    });
  }

  /**
   * Log settings change event
   */
  async logSettingsChange(
    userId: number,
    request: AuditRequest,
    settingName: string,
    oldValue?: unknown,
    newValue?: unknown,
  ): Promise<AuditLog | null> {
    return this.log({
      action: 'SETTINGS_UPDATE',
      userId,
      resource: 'settings',
      details: {
        settingName,
        oldValue: oldValue !== undefined ? oldValue : '[not captured]',
        newValue: newValue !== undefined ? newValue : '[not captured]',
        event: 'settings_change',
      },
      level: 'info',
      request,
    });
  }

  /**
   * Log API request (only if enabled)
   */
  async logApiRequest(
    request: AuditRequest,
    method: string,
    path: string,
    statusCode: number,
    responseTimeMs: number,
  ): Promise<AuditLog | null> {
    if (!this.logApiRequests) {
      return null;
    }

    const level: AuditLogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    return this.log({
      action: 'API_REQUEST',
      userId: this.extractUserId(request),
      resource: 'api',
      details: {
        method,
        path,
        statusCode,
        responseTimeMs,
        event: 'api_request',
      },
      level,
      request,
    });
  }
}
