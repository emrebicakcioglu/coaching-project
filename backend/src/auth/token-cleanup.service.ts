/**
 * Token Cleanup Service
 * STORY-008: Session Management mit "Remember Me"
 *
 * Scheduled service to cleanup expired refresh tokens from the database.
 * This helps maintain database performance and removes stale session data.
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { WinstonLoggerService } from '../common/services/logger.service';
import { AuthService } from './auth.service';

/**
 * Token Cleanup Service
 * Runs periodic cleanup of expired refresh tokens
 */
@Injectable()
export class TokenCleanupService implements OnModuleInit, OnModuleDestroy {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly cleanupIntervalMs: number;

  constructor(
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
  ) {
    // Default: run cleanup every hour (3600000ms)
    // Can be configured via environment variable
    this.cleanupIntervalMs = parseInt(
      process.env.TOKEN_CLEANUP_INTERVAL_MS || '3600000',
      10,
    );
  }

  /**
   * Start the cleanup scheduler when the module initializes
   */
  onModuleInit(): void {
    // Only run in production/development, not in test environment
    if (process.env.NODE_ENV === 'test') {
      this.logger.log(
        'Token cleanup service disabled in test environment',
        'TokenCleanupService',
      );
      return;
    }

    this.startCleanupScheduler();
    this.logger.log(
      `Token cleanup service started (interval: ${this.cleanupIntervalMs}ms)`,
      'TokenCleanupService',
    );

    // Run initial cleanup after a short delay to allow database to be ready
    setTimeout(() => this.runCleanup(), 10000);
  }

  /**
   * Stop the cleanup scheduler when the module is destroyed
   */
  onModuleDestroy(): void {
    this.stopCleanupScheduler();
    this.logger.log('Token cleanup service stopped', 'TokenCleanupService');
  }

  /**
   * Start the periodic cleanup scheduler
   */
  private startCleanupScheduler(): void {
    if (this.cleanupInterval) {
      return; // Already running
    }

    this.cleanupInterval = setInterval(() => {
      this.runCleanup().catch((error) => {
        this.logger.error(
          `Token cleanup error: ${error.message}`,
          error.stack,
          'TokenCleanupService',
        );
      });
    }, this.cleanupIntervalMs);
  }

  /**
   * Stop the periodic cleanup scheduler
   */
  private stopCleanupScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Run the token cleanup
   * Can be called manually or by the scheduler
   */
  async runCleanup(): Promise<number> {
    try {
      const count = await this.authService.cleanupExpiredTokens();
      if (count > 0) {
        this.logger.log(
          `Token cleanup completed: ${count} expired tokens removed`,
          'TokenCleanupService',
        );
      }
      return count;
    } catch (error) {
      this.logger.error(
        `Token cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'TokenCleanupService',
      );
      throw error;
    }
  }

  /**
   * Force an immediate cleanup (useful for admin endpoints or testing)
   */
  async forceCleanup(): Promise<number> {
    this.logger.log('Force cleanup requested', 'TokenCleanupService');
    return this.runCleanup();
  }
}
