/**
 * Login Security Service
 * STORY-CAPTCHA: Login Security with CAPTCHA and Delay
 *
 * Tracks failed login attempts per IP address and manages CAPTCHA
 * requirements and login delays.
 *
 * Features:
 * - Track failed login attempts per IP
 * - After 2 failed attempts: require CAPTCHA
 * - After 2 failed attempts: 10 second delay on subsequent attempts
 * - Simple math CAPTCHA generation and verification
 * - Automatic cleanup of expired attempt records
 */

import { Injectable, Inject, forwardRef } from '@nestjs/common';
import * as crypto from 'crypto';
import { WinstonLoggerService } from '../common/services/logger.service';

/**
 * Attempt record for tracking failed logins
 */
interface AttemptRecord {
  count: number;
  lastAttempt: Date;
  resetTime: Date;
}

/**
 * CAPTCHA challenge stored in memory
 */
interface CaptchaChallenge {
  answer: string;
  expiresAt: Date;
}

/**
 * Login status response
 */
export interface LoginSecurityStatus {
  requiresCaptcha: boolean;
  delaySeconds: number;
  failedAttempts: number;
}

/**
 * CAPTCHA generation response
 */
export interface CaptchaGenerationResult {
  captchaId: string;
  question: string;
  expiresAt: Date;
}

@Injectable()
export class LoginSecurityService {
  // Track failed attempts per IP
  private attempts: Map<string, AttemptRecord> = new Map();

  // Store CAPTCHA challenges by ID
  private captchaChallenges: Map<string, CaptchaChallenge> = new Map();

  // Configuration
  private readonly captchaThreshold: number = 2; // Require CAPTCHA after this many failures
  private readonly delaySeconds: number = 10; // Delay in seconds after threshold
  private readonly attemptWindowMs: number = 15 * 60 * 1000; // 15 minutes
  private readonly captchaExpiryMs: number = 5 * 60 * 1000; // 5 minutes

  constructor(
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
  ) {
    // Cleanup expired records every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get the current security status for an IP
   *
   * @param ip - Client IP address
   * @returns Login security status
   */
  getStatus(ip: string): LoginSecurityStatus {
    const record = this.attempts.get(ip);

    if (!record || new Date() >= record.resetTime) {
      return {
        requiresCaptcha: false,
        delaySeconds: 0,
        failedAttempts: 0,
      };
    }

    const requiresCaptcha = record.count >= this.captchaThreshold;
    const delaySeconds = requiresCaptcha ? this.delaySeconds : 0;

    return {
      requiresCaptcha,
      delaySeconds,
      failedAttempts: record.count,
    };
  }

  /**
   * Record a failed login attempt
   *
   * @param ip - Client IP address
   */
  recordFailedAttempt(ip: string): void {
    const now = new Date();
    const record = this.attempts.get(ip);

    if (!record || now >= record.resetTime) {
      // First failure or expired record
      this.attempts.set(ip, {
        count: 1,
        lastAttempt: now,
        resetTime: new Date(now.getTime() + this.attemptWindowMs),
      });
    } else {
      // Increment existing record
      record.count++;
      record.lastAttempt = now;
      this.attempts.set(ip, record);
    }

    const newRecord = this.attempts.get(ip);
    this.logger.log(
      `Failed login attempt recorded for IP ${this.maskIp(ip)}: ${newRecord?.count} attempts`,
      'LoginSecurityService',
    );
  }

  /**
   * Clear failed attempts for an IP (on successful login)
   *
   * @param ip - Client IP address
   */
  clearAttempts(ip: string): void {
    if (this.attempts.has(ip)) {
      this.attempts.delete(ip);
      this.logger.debug(
        `Cleared login attempts for IP ${this.maskIp(ip)}`,
        'LoginSecurityService',
      );
    }
  }

  /**
   * Generate a new CAPTCHA challenge
   *
   * @returns CAPTCHA generation result with ID and question
   */
  generateCaptcha(): CaptchaGenerationResult {
    // Generate random math problem
    const operators = ['+', '-', '*'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    let num1: number;
    let num2: number;
    let answer: number;

    switch (operator) {
      case '+':
        num1 = Math.floor(Math.random() * 20) + 1;
        num2 = Math.floor(Math.random() * 20) + 1;
        answer = num1 + num2;
        break;
      case '-':
        num1 = Math.floor(Math.random() * 20) + 10;
        num2 = Math.floor(Math.random() * num1);
        answer = num1 - num2;
        break;
      case '*':
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
        answer = num1 * num2;
        break;
      default:
        num1 = 5;
        num2 = 3;
        answer = 8;
    }

    const captchaId = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + this.captchaExpiryMs);

    this.captchaChallenges.set(captchaId, {
      answer: answer.toString(),
      expiresAt,
    });

    const question = `Was ist ${num1} ${operator} ${num2}?`;

    this.logger.debug(
      `Generated CAPTCHA ${captchaId}: ${question} = ${answer}`,
      'LoginSecurityService',
    );

    return {
      captchaId,
      question,
      expiresAt,
    };
  }

  /**
   * Verify a CAPTCHA answer
   *
   * @param captchaId - CAPTCHA challenge ID
   * @param answer - User's answer
   * @returns True if correct, false otherwise
   */
  verifyCaptcha(captchaId: string, answer: string): boolean {
    const challenge = this.captchaChallenges.get(captchaId);

    if (!challenge) {
      this.logger.warn(
        `CAPTCHA verification failed: Challenge ${captchaId} not found`,
        'LoginSecurityService',
      );
      return false;
    }

    // Remove challenge after verification attempt (one-time use)
    this.captchaChallenges.delete(captchaId);

    // Check if expired
    if (new Date() >= challenge.expiresAt) {
      this.logger.warn(
        `CAPTCHA verification failed: Challenge ${captchaId} expired`,
        'LoginSecurityService',
      );
      return false;
    }

    // Check answer
    const isCorrect = challenge.answer === answer.trim();

    if (!isCorrect) {
      this.logger.warn(
        `CAPTCHA verification failed: Wrong answer for ${captchaId}`,
        'LoginSecurityService',
      );
    }

    return isCorrect;
  }

  /**
   * Apply login delay if required
   *
   * @param ip - Client IP address
   * @returns Promise that resolves after delay (if any)
   */
  async applyDelay(ip: string): Promise<void> {
    const status = this.getStatus(ip);

    if (status.delaySeconds > 0) {
      this.logger.log(
        `Applying ${status.delaySeconds}s login delay for IP ${this.maskIp(ip)}`,
        'LoginSecurityService',
      );
      await this.delay(status.delaySeconds * 1000);
    }
  }

  /**
   * Helper: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Helper: Mask IP for logging (privacy)
   */
  private maskIp(ip: string): string {
    if (ip.includes('.')) {
      // IPv4: Show first two octets
      const parts = ip.split('.');
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
    // IPv6 or unknown: Show first part
    return ip.substring(0, 8) + '...';
  }

  /**
   * Cleanup expired records
   */
  private cleanup(): void {
    const now = new Date();
    let cleanedAttempts = 0;
    let cleanedCaptchas = 0;

    // Clean up expired attempt records
    for (const [ip, record] of this.attempts.entries()) {
      if (now >= record.resetTime) {
        this.attempts.delete(ip);
        cleanedAttempts++;
      }
    }

    // Clean up expired CAPTCHA challenges
    for (const [id, challenge] of this.captchaChallenges.entries()) {
      if (now >= challenge.expiresAt) {
        this.captchaChallenges.delete(id);
        cleanedCaptchas++;
      }
    }

    if (cleanedAttempts > 0 || cleanedCaptchas > 0) {
      this.logger.debug(
        `Cleanup: ${cleanedAttempts} attempts, ${cleanedCaptchas} CAPTCHAs`,
        'LoginSecurityService',
      );
    }
  }
}
