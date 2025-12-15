/**
 * Core Application Backend - NestJS Entry Point
 *
 * This is the main entry point for the NestJS application.
 * Configures CORS, validation, and global exception handling.
 *
 * Stories:
 * - STORY-021A: API-Basis-Infrastruktur (NestJS Setup)
 * - STORY-021B: API Middleware & Error Handling (Rate Limiting, Logging)
 * - STORY-012: Environment Configuration
 * - STORY-024A: PostgreSQL Database Setup
 * - STORY-024B: PostgreSQL Schema & Migrations
 * - STORY-027: Error Logging (Daily rotation, structured logging)
 * - STORY-028: System Logging (Audit Trail)
 * - STORY-022: Swagger/OpenAPI Documentation
 * - STORY-029: Health Status (SMTP, MinIO health checks)
 *
 * Required Environment Variables:
 * - APP_PORT: Port to listen on (default: 4102)
 * - FRONTEND_URL: Frontend URL for CORS (optional, defaults to http://localhost:3000)
 * - NODE_ENV: Environment (development, staging, production)
 * - RATE_LIMIT_WINDOW_MS: Rate limit window in ms (default: 60000)
 * - RATE_LIMIT_MAX_REQUESTS: Max requests per window (default: 100)
 * - LOG_LEVEL: Logging level (default: info)
 * - LOG_DIR: Log directory (default: ./logs)
 * - LOG_MAX_FILES: Log retention period (default: 14d)
 * - LOG_MAX_SIZE: Max log file size (default: 20m)
 * - AUDIT_LOG_ENABLED: Enable audit logging (default: true)
 * - AUDIT_LOG_API_REQUESTS: Log all API requests to audit trail (default: false)
 * - SWAGGER_ENABLED: Enable Swagger UI (default: true in dev/staging, false in production)
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { WinstonLoggerService } from './common/services/logger.service';
import { env, validateEnv } from './config';
import { setupSwagger, isSwaggerEnabled } from './swagger';

/**
 * Bootstrap the NestJS application
 */
async function bootstrap(): Promise<void> {
  // Validate environment variables first
  let validatedEnv;
  try {
    validatedEnv = validateEnv();
  } catch {
    // validateEnv logs errors and throws, re-throw
    throw new Error('Failed to validate environment variables');
  }

  // Create logger service
  const logger = new WinstonLoggerService();

  // Create NestJS application with custom logger
  const app = await NestFactory.create(AppModule, {
    logger,
  });

  // Security headers with Helmet
  app.use(helmet());

  // CORS Configuration
  // Uses FRONTEND_URL from environment, defaults to http://localhost:3000
  // Also allows X-Request-ID header for distributed tracing (STORY-021B)
  // Story 2 QA Fix (Iteration 1): Support multiple origins for dev (port 3000) and Docker (port 14100)
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  // Parse CORS_ORIGINS for multiple origins, fallback to frontendUrl
  // Format: comma-separated list like "http://localhost:3000,http://localhost:14100"
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : [frontendUrl, 'http://localhost:3000', 'http://localhost:14100'];

  // Remove duplicates
  const uniqueOrigins = [...new Set(corsOrigins)];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) {
        callback(null, true);
        return;
      }
      // Check if origin is in allowed list
      if (uniqueOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  });

  logger.log(`CORS enabled for origins: ${uniqueOrigins.join(', ')}`, 'Bootstrap');

  // Global Validation Pipe
  // Validates all incoming requests against DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip non-whitelisted properties
      forbidNonWhitelisted: true, // Reject requests with unknown properties
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Exception Filter (STORY-021A, enhanced in STORY-021B with request ID)
  app.useGlobalFilters(new HttpExceptionFilter(logger));

  // Note: Rate limiting is now handled by RateLimitGuard in AppModule (STORY-021B)
  // This provides per-endpoint configurable rate limits via @RateLimit decorator
  const windowMs = validatedEnv.RATE_LIMIT_WINDOW_MS;
  const maxRequests = validatedEnv.RATE_LIMIT_MAX_REQUESTS;
  logger.log(
    `Rate limiting configured: ${maxRequests} requests per ${windowMs / 1000}s (global default)`,
    'Bootstrap',
  );

  // Swagger/OpenAPI Documentation (STORY-022)
  // Enable Swagger UI in development and staging environments
  const swaggerEnabled = isSwaggerEnabled();
  if (swaggerEnabled) {
    setupSwagger(app);
    logger.log('Swagger UI enabled at /api/docs', 'Bootstrap');
  }

  // Start listening
  const port = validatedEnv.APP_PORT;
  await app.listen(port, '0.0.0.0');

  // Log startup information
  logger.log('', 'Bootstrap');
  logger.log('================================', 'Bootstrap');
  logger.log('  Core Application Backend', 'Bootstrap');
  logger.log('================================', 'Bootstrap');
  logger.log('', 'Bootstrap');
  logger.log(`Environment: ${env.NODE_ENV}`, 'Bootstrap');
  logger.log(`Server running on: http://0.0.0.0:${port}`, 'Bootstrap');
  logger.log('', 'Bootstrap');
  logger.log('Health Endpoints (STORY-029):', 'Bootstrap');
  logger.log(`  Legacy:   http://localhost:${port}/health`, 'Bootstrap');
  logger.log(`  Full:     http://localhost:${port}/api/health`, 'Bootstrap');
  logger.log('', 'Bootstrap');
  logger.log(`Log Level: ${env.LOG_LEVEL}`, 'Bootstrap');
  logger.log(`Log Directory: ${process.env.LOG_DIR || './logs'}`, 'Bootstrap');
  logger.log(`Log Retention: ${process.env.LOG_MAX_FILES || '14d'}`, 'Bootstrap');
  logger.log('Middleware: RequestID, RequestLogging, AuditLogging (STORY-021B, STORY-028)', 'Bootstrap');
  logger.log(`Audit Logging: ${process.env.AUDIT_LOG_ENABLED !== 'false' ? 'enabled' : 'disabled'}`, 'Bootstrap');
  logger.log(`Audit API Requests: ${process.env.AUDIT_LOG_API_REQUESTS === 'true' ? 'enabled' : 'disabled'}`, 'Bootstrap');
  logger.log('', 'Bootstrap');
  logger.log('API Endpoints (STORY-021B):', 'Bootstrap');
  logger.log(`  Users:     http://localhost:${port}/api/v1/users`, 'Bootstrap');
  logger.log(`  Auth:      http://localhost:${port}/api/v1/auth`, 'Bootstrap');
  logger.log(`  Settings:  http://localhost:${port}/api/v1/settings`, 'Bootstrap');
  logger.log(`  Audit:     http://localhost:${port}/api/admin/audit-logs`, 'Bootstrap');
  logger.log('', 'Bootstrap');
  if (swaggerEnabled) {
    logger.log('API Documentation (STORY-022):', 'Bootstrap');
    logger.log(`  Swagger UI: http://localhost:${port}/api/docs`, 'Bootstrap');
    logger.log(`  OpenAPI JSON: http://localhost:${port}/api/docs-json`, 'Bootstrap');
    logger.log('', 'Bootstrap');
  }
}

// Start application
bootstrap().catch((error) => {
  console.error('Application startup failed:', error);
  process.exit(1);
});
