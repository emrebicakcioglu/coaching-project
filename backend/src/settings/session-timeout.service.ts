/**
 * Session Timeout Service
 * STORY-035: Support-E-Mail & Session-Timeout
 *
 * Handles session idle timeout tracking and enforcement:
 * - Tracks user's last activity timestamp
 * - Validates session activity against configured timeout
 * - Provides session status information
 */

import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { WinstonLoggerService } from '../common/services/logger.service';
import { GeneralSettingsService } from './general-settings.service';

/**
 * Session activity record stored in Redis or memory
 */
interface SessionActivity {
  userId: number;
  lastActivity: Date;
  tokenHash: string;
}

/**
 * Session status response
 */
export interface SessionStatus {
  isValid: boolean;
  remainingMs: number;
  shouldWarn: boolean;
  warningMessage?: string;
}

/**
 * Session Timeout Service
 * Tracks and validates session activity
 */
@Injectable()
export class SessionTimeoutService {
  // In-memory store for session activity (can be replaced with Redis for scale)
  private sessionActivity: Map<string, SessionActivity> = new Map();

  // Cleanup interval (runs every 5 minutes)
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
    @Inject(forwardRef(() => GeneralSettingsService))
    private readonly generalSettingsService: GeneralSettingsService,
  ) {
    // Start cleanup task
    this.startCleanupTask();
  }

  /**
   * Record user activity for session
   *
   * @param userId - User ID
   * @param tokenHash - Session token hash
   */
  recordActivity(userId: number, tokenHash: string): void {
    const key = this.getSessionKey(userId, tokenHash);
    this.sessionActivity.set(key, {
      userId,
      lastActivity: new Date(),
      tokenHash,
    });
  }

  /**
   * Get last activity timestamp for a session
   *
   * @param userId - User ID
   * @param tokenHash - Session token hash
   * @returns Last activity date or null if not found
   */
  getLastActivity(userId: number, tokenHash: string): Date | null {
    const key = this.getSessionKey(userId, tokenHash);
    const activity = this.sessionActivity.get(key);
    return activity?.lastActivity ?? null;
  }

  /**
   * Check if session is still valid (not timed out)
   *
   * @param userId - User ID
   * @param tokenHash - Session token hash
   * @returns Session status including remaining time
   */
  async checkSessionStatus(userId: number, tokenHash: string): Promise<SessionStatus> {
    const lastActivity = this.getLastActivity(userId, tokenHash);
    const timeoutMinutes = await this.generalSettingsService.getSessionTimeoutMinutes();
    const timeoutMs = timeoutMinutes * 60 * 1000;

    // If no activity recorded, session is considered new (valid)
    if (!lastActivity) {
      return {
        isValid: true,
        remainingMs: timeoutMs,
        shouldWarn: false,
      };
    }

    const elapsed = Date.now() - lastActivity.getTime();
    const remainingMs = Math.max(0, timeoutMs - elapsed);

    // Check if session has timed out
    if (remainingMs <= 0) {
      return {
        isValid: false,
        remainingMs: 0,
        shouldWarn: false,
        warningMessage: 'Session has expired due to inactivity',
      };
    }

    // Get warning threshold
    const settings = await this.generalSettingsService.getGeneralSettings();
    const warningMs = settings.warning_before_timeout_minutes * 60 * 1000;
    const shouldWarn = settings.show_timeout_warning && remainingMs <= warningMs;

    return {
      isValid: true,
      remainingMs,
      shouldWarn,
      warningMessage: shouldWarn
        ? `Your session will expire in ${Math.ceil(remainingMs / 60000)} minutes`
        : undefined,
    };
  }

  /**
   * Validate session and update activity if valid
   * Returns false if session has timed out
   *
   * @param userId - User ID
   * @param tokenHash - Session token hash
   * @returns True if session is valid, false if timed out
   */
  async validateAndUpdateSession(userId: number, tokenHash: string): Promise<boolean> {
    const status = await this.checkSessionStatus(userId, tokenHash);

    if (!status.isValid) {
      // Remove expired session from tracking
      this.removeSession(userId, tokenHash);
      return false;
    }

    // Update activity timestamp
    this.recordActivity(userId, tokenHash);
    return true;
  }

  /**
   * Remove session from tracking
   *
   * @param userId - User ID
   * @param tokenHash - Session token hash
   */
  removeSession(userId: number, tokenHash: string): void {
    const key = this.getSessionKey(userId, tokenHash);
    this.sessionActivity.delete(key);
  }

  /**
   * Remove all sessions for a user
   *
   * @param userId - User ID
   */
  removeAllUserSessions(userId: number): void {
    for (const [key] of this.sessionActivity) {
      if (key.startsWith(`${userId}:`)) {
        this.sessionActivity.delete(key);
      }
    }
  }

  /**
   * Get number of active sessions being tracked
   * Useful for monitoring
   *
   * @returns Number of tracked sessions
   */
  getActiveSessionCount(): number {
    return this.sessionActivity.size;
  }

  /**
   * Generate session key from user ID and token hash
   */
  private getSessionKey(userId: number, tokenHash: string): string {
    return `${userId}:${tokenHash}`;
  }

  /**
   * Start background cleanup task to remove stale sessions
   */
  private startCleanupTask(): void {
    // Run every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupStaleSessions().catch((err) => {
          this.logger.error(
            `Session cleanup failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
            err instanceof Error ? err.stack : undefined,
            'SessionTimeoutService',
          );
        });
      },
      5 * 60 * 1000,
    );

    this.logger.log('Session timeout cleanup task started', 'SessionTimeoutService');
  }

  /**
   * Clean up stale sessions that have been inactive for too long
   */
  private async cleanupStaleSessions(): Promise<void> {
    const timeoutMinutes = await this.generalSettingsService.getSessionTimeoutMinutes();
    // Add buffer for cleanup (2x timeout)
    const staleThreshold = timeoutMinutes * 2 * 60 * 1000;
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, activity] of this.sessionActivity) {
      if (now - activity.lastActivity.getTime() > staleThreshold) {
        this.sessionActivity.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(
        `Cleaned up ${cleanedCount} stale sessions`,
        'SessionTimeoutService',
      );
    }
  }

  /**
   * Stop cleanup task (for graceful shutdown)
   */
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.logger.log('Session timeout cleanup task stopped', 'SessionTimeoutService');
    }
  }
}
