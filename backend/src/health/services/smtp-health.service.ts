/**
 * SMTP Health Check Service
 *
 * Performs connectivity checks against the SMTP server.
 * Uses socket connection to verify SMTP server is reachable.
 *
 * Story: STORY-029 (Health Status)
 *
 * Environment Variables:
 * - SMTP_HOST: SMTP server hostname (default: localhost)
 * - SMTP_PORT: SMTP server port (default: 587)
 * - SMTP_CHECK_TIMEOUT: Health check timeout in ms (default: 5000)
 */

import { Injectable } from '@nestjs/common';
import * as net from 'net';

export interface SmtpHealthCheckResult {
  healthy: boolean;
  responseTimeMs: number;
  error?: string;
}

@Injectable()
export class SmtpHealthService {
  private readonly host: string;
  private readonly port: number;
  private readonly timeout: number;

  constructor() {
    this.host = process.env.SMTP_HOST || 'localhost';
    this.port = parseInt(process.env.SMTP_PORT || '587', 10);
    this.timeout = parseInt(process.env.SMTP_CHECK_TIMEOUT || '5000', 10);
  }

  /**
   * Check SMTP server connectivity
   *
   * Attempts to establish a TCP connection to the SMTP server
   * and waits for the SMTP greeting (220 response).
   *
   * @returns Promise<SmtpHealthCheckResult> - Health check result with response time
   */
  async healthCheck(): Promise<SmtpHealthCheckResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      // If SMTP is not configured, return healthy with a note
      if (!process.env.SMTP_HOST) {
        resolve({
          healthy: true, // SMTP is optional, treat as healthy when not configured
          responseTimeMs: Date.now() - startTime,
          error: 'SMTP not configured',
        });
        return;
      }

      const socket = new net.Socket();
      let resolved = false;

      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
        }
      };

      // Set timeout for the connection
      socket.setTimeout(this.timeout);

      socket.on('connect', () => {
        // Wait for SMTP greeting
        socket.once('data', (data) => {
          const responseTimeMs = Date.now() - startTime;
          const response = data.toString();

          // SMTP servers respond with 220 on successful connection
          if (response.startsWith('220')) {
            cleanup();
            resolve({
              healthy: true,
              responseTimeMs,
            });
          } else {
            cleanup();
            resolve({
              healthy: false,
              responseTimeMs,
              error: `Unexpected SMTP response: ${response.substring(0, 50)}`,
            });
          }
        });
      });

      socket.on('timeout', () => {
        cleanup();
        resolve({
          healthy: false,
          responseTimeMs: Date.now() - startTime,
          error: `Connection timeout after ${this.timeout}ms`,
        });
      });

      socket.on('error', (err) => {
        cleanup();
        resolve({
          healthy: false,
          responseTimeMs: Date.now() - startTime,
          error: err.message,
        });
      });

      // Attempt connection
      socket.connect(this.port, this.host);
    });
  }
}
