/**
 * Auth Session Service
 * Handles session management operations.
 *
 * Extracted from AuthService during refactoring.
 * Contains:
 * - getSessions
 * - terminateSession
 * - terminateAllSessions
 * - cleanupExpiredTokens
 * - updateTokenLastUsed
 * - parseDeviceFromUserAgent
 * - parseBrowserFromUserAgent
 */

import {
  Injectable,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { WinstonLoggerService } from '../common/services/logger.service';
import { AuditService } from '../common/services/audit.service';
import { RefreshToken } from '../database/types';
import {
  SessionItemDto,
  SessionsListResponseDto,
  SessionTerminatedResponseDto,
  AllSessionsTerminatedResponseDto,
} from './dto/session.dto';
import { AuthRequest } from './auth.types';

@Injectable()
export class AuthSessionService {
  constructor(
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get all active sessions for a user
   * STORY-008: Session Management
   *
   * @param userId - User ID
   * @param currentTokenHash - Hash of current token to mark as "current"
   * @returns List of active sessions
   */
  async getSessions(
    userId: number,
    currentTokenHash?: string,
  ): Promise<SessionsListResponseDto> {
    const pool = this.databaseService.ensurePool();

    const result = await pool.query<RefreshToken>(
      `SELECT id, device_info, browser, ip_address, location, created_at, last_used_at, token_hash
       FROM refresh_tokens
       WHERE user_id = $1
         AND revoked_at IS NULL
         AND expires_at > NOW()
         AND (device_info IS NULL OR device_info != 'PASSWORD_RESET')
       ORDER BY last_used_at DESC`,
      [userId],
    );

    const sessions: SessionItemDto[] = result.rows.map((row) => ({
      id: row.id,
      device: this.parseDeviceFromUserAgent(row.device_info ?? null),
      browser: row.browser || this.parseBrowserFromUserAgent(row.device_info ?? null),
      ip: row.ip_address || 'Unknown',
      location: row.location || null,
      lastActivity: row.last_used_at?.toISOString() || row.created_at.toISOString(),
      createdAt: row.created_at.toISOString(),
      current: currentTokenHash ? row.token_hash === currentTokenHash : false,
    }));

    return { sessions };
  }

  /**
   * Terminate a specific session
   * STORY-008: Session Management
   *
   * @param sessionId - Session/Token ID to terminate
   * @param userId - User ID (for authorization)
   * @param request - Express request for audit logging
   * @returns Termination response
   */
  async terminateSession(
    sessionId: number,
    userId: number,
    request: AuthRequest,
  ): Promise<SessionTerminatedResponseDto> {
    const pool = this.databaseService.ensurePool();

    // Verify session belongs to user and is still active
    // SECURITY FIX: Also check revoked_at and expires_at to prevent
    // terminating already invalid sessions
    const sessionResult = await pool.query<RefreshToken>(
      `SELECT * FROM refresh_tokens
       WHERE id = $1
         AND user_id = $2
         AND revoked_at IS NULL
         AND expires_at > NOW()`,
      [sessionId, userId],
    );

    if (sessionResult.rows.length === 0) {
      throw new ForbiddenException('Session not found, already terminated, or does not belong to you');
    }

    // Revoke the session
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
      [sessionId],
    );

    // Audit log
    await this.auditService.log({
      action: 'SESSION_TERMINATED',
      userId,
      resource: 'session',
      resourceId: sessionId,
      details: { sessionId },
      request,
    });

    this.logger.log(
      `Session ${sessionId} terminated for user ${userId}`,
      'AuthSessionService',
    );

    return { message: 'Session terminated' };
  }

  /**
   * Terminate all sessions for a user except current
   * STORY-008: Session Management
   *
   * @param userId - User ID
   * @param currentTokenHash - Optional: hash of current token to preserve
   * @param request - Express request for audit logging
   * @returns All sessions terminated response
   */
  async terminateAllSessions(
    userId: number,
    currentTokenHash: string | null,
    request: AuthRequest,
  ): Promise<AllSessionsTerminatedResponseDto> {
    const pool = this.databaseService.ensurePool();

    let result;
    if (currentTokenHash) {
      // Keep the current session active
      result = await pool.query(
        `UPDATE refresh_tokens
         SET revoked_at = NOW()
         WHERE user_id = $1
           AND revoked_at IS NULL
           AND token_hash != $2
           AND (device_info IS NULL OR device_info != 'PASSWORD_RESET')`,
        [userId, currentTokenHash],
      );
    } else {
      // Revoke all sessions including current
      result = await pool.query(
        `UPDATE refresh_tokens
         SET revoked_at = NOW()
         WHERE user_id = $1
           AND revoked_at IS NULL
           AND (device_info IS NULL OR device_info != 'PASSWORD_RESET')`,
        [userId],
      );
    }

    const count = result.rowCount || 0;

    // Audit log
    await this.auditService.log({
      action: 'ALL_SESSIONS_TERMINATED',
      userId,
      resource: 'session',
      details: { count, preservedCurrent: !!currentTokenHash },
      request,
    });

    this.logger.log(
      `All sessions (${count}) terminated for user ${userId}`,
      'AuthSessionService',
    );

    return { message: 'All sessions terminated', count };
  }

  /**
   * Cleanup expired refresh tokens
   * STORY-008: Maintenance task
   *
   * @returns Number of tokens cleaned up
   */
  async cleanupExpiredTokens(): Promise<number> {
    const pool = this.databaseService.ensurePool();

    const result = await pool.query(
      `DELETE FROM refresh_tokens WHERE expires_at < NOW()`,
    );

    const count = result.rowCount || 0;
    if (count > 0) {
      this.logger.log(`Cleaned up ${count} expired refresh tokens`, 'AuthSessionService');
    }

    return count;
  }

  /**
   * Update last_used_at for a token
   * STORY-008: Session activity tracking
   *
   * @param tokenHash - Hash of the token
   */
  async updateTokenLastUsed(tokenHash: string): Promise<void> {
    const pool = this.databaseService.ensurePool();

    await pool.query(
      `UPDATE refresh_tokens SET last_used_at = NOW() WHERE token_hash = $1`,
      [tokenHash],
    );
  }

  /**
   * Parse browser name from User-Agent string
   * STORY-008: Helper method for session display
   */
  parseBrowserFromUserAgent(userAgent: string | null): string {
    if (!userAgent) return 'Unknown';

    // Common browser patterns
    if (userAgent.includes('Firefox/')) return 'Firefox';
    if (userAgent.includes('Edg/')) return 'Edge';
    if (userAgent.includes('Chrome/')) return 'Chrome';
    if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Opera/') || userAgent.includes('OPR/')) return 'Opera';
    if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) return 'Internet Explorer';

    return 'Unknown';
  }

  /**
   * Parse device/OS from User-Agent string
   * STORY-008: Helper method for session display
   */
  parseDeviceFromUserAgent(userAgent: string | null): string {
    if (!userAgent) return 'Unknown Device';

    const browser = this.parseBrowserFromUserAgent(userAgent);
    let os = 'Unknown';

    // Parse OS
    if (userAgent.includes('Windows NT 10')) os = 'Windows 10';
    else if (userAgent.includes('Windows NT 6.3')) os = 'Windows 8.1';
    else if (userAgent.includes('Windows NT 6.2')) os = 'Windows 8';
    else if (userAgent.includes('Windows NT 6.1')) os = 'Windows 7';
    else if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac OS X')) os = 'macOS';
    else if (userAgent.includes('iPhone')) os = 'iPhone';
    else if (userAgent.includes('iPad')) os = 'iPad';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('Linux')) os = 'Linux';

    return `${browser} on ${os}`;
  }
}
