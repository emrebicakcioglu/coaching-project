/**
 * Storage (MinIO) Health Check Service
 *
 * Performs connectivity checks against the MinIO/S3-compatible storage server.
 * Uses HTTP request to verify the storage server is reachable.
 *
 * Story: STORY-029 (Health Status)
 *
 * Environment Variables:
 * - MINIO_ENDPOINT: MinIO server hostname (default: localhost)
 * - MINIO_PORT: MinIO API port (default: 4104)
 * - MINIO_USE_SSL: Use HTTPS (default: false)
 * - STORAGE_CHECK_TIMEOUT: Health check timeout in ms (default: 5000)
 *
 * Note: MinIO is an optional service. If not configured, the check will
 * return healthy status to allow graceful degradation.
 */

import { Injectable } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';

export interface StorageHealthCheckResult {
  healthy: boolean;
  responseTimeMs: number;
  error?: string;
}

@Injectable()
export class StorageHealthService {
  private readonly endpoint: string;
  private readonly port: number;
  private readonly useSsl: boolean;
  private readonly timeout: number;

  constructor() {
    this.endpoint = process.env.MINIO_ENDPOINT || 'localhost';
    this.port = parseInt(process.env.MINIO_PORT || '4104', 10);
    this.useSsl = process.env.MINIO_USE_SSL === 'true';
    this.timeout = parseInt(process.env.STORAGE_CHECK_TIMEOUT || '5000', 10);
  }

  /**
   * Check MinIO/Storage server connectivity
   *
   * Sends an HTTP request to the MinIO health endpoint (/minio/health/live)
   * to verify the server is reachable and responsive.
   *
   * @returns Promise<StorageHealthCheckResult> - Health check result with response time
   */
  async healthCheck(): Promise<StorageHealthCheckResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      // If MinIO is not configured, return healthy with a note (graceful degradation)
      if (!process.env.MINIO_ENDPOINT) {
        resolve({
          healthy: true, // Storage is optional, treat as healthy when not configured
          responseTimeMs: Date.now() - startTime,
          error: 'Storage not configured',
        });
        return;
      }

      const protocol = this.useSsl ? https : http;

      const options: http.RequestOptions = {
        hostname: this.endpoint,
        port: this.port,
        path: '/minio/health/live',
        method: 'GET',
        timeout: this.timeout,
      };

      const req = protocol.request(options, (res) => {
        const responseTimeMs = Date.now() - startTime;

        // MinIO health endpoint returns 200 when healthy
        if (res.statusCode === 200) {
          resolve({
            healthy: true,
            responseTimeMs,
          });
        } else {
          resolve({
            healthy: false,
            responseTimeMs,
            error: `Unexpected status code: ${res.statusCode}`,
          });
        }

        // Consume response data to free up memory
        res.resume();
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          healthy: false,
          responseTimeMs: Date.now() - startTime,
          error: `Connection timeout after ${this.timeout}ms`,
        });
      });

      req.on('error', (err) => {
        resolve({
          healthy: false,
          responseTimeMs: Date.now() - startTime,
          error: err.message,
        });
      });

      req.end();
    });
  }
}
