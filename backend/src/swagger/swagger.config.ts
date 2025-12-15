/**
 * Swagger Configuration
 * STORY-022: Swagger/OpenAPI Documentation
 *
 * Configuration for OpenAPI 3.0 documentation.
 * Provides Swagger UI at /api/docs and JSON spec at /api/docs/json.
 *
 * Environment Variables:
 * - SWAGGER_ENABLED: Enable/disable Swagger UI (default: true in development)
 * - APP_URL: Base URL for the API server
 * - APP_PORT: Port the API server runs on
 */

import { DocumentBuilder, SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

/**
 * Swagger configuration options
 */
export interface SwaggerConfig {
  /** API title */
  title: string;
  /** API description */
  description: string;
  /** API version */
  version: string;
  /** Server URL */
  serverUrl: string;
  /** Contact information */
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  /** License information */
  license?: {
    name: string;
    url?: string;
  };
}

/**
 * Default Swagger configuration
 */
export const defaultSwaggerConfig: SwaggerConfig = {
  title: 'Core App API',
  description: `
## RESTful API for Core Application

This API provides endpoints for:
- **Users** - User management (CRUD operations)
- **Auth** - Authentication (login, logout, token refresh, password reset)
- **Settings** - Application settings management
- **Audit** - Audit log access (admin only)
- **Health** - Health check endpoint

### Authentication
Most endpoints require JWT Bearer authentication. Use the Authorize button to enter your access token.

### Rate Limiting
All endpoints are rate-limited. See response headers for rate limit information:
- \`RateLimit-Limit\`: Maximum requests per window
- \`RateLimit-Remaining\`: Remaining requests in current window
- \`RateLimit-Reset\`: Time when the rate limit resets

### Error Responses
All error responses follow a standard format:
\`\`\`json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "path": "/api/v1/users",
  "requestId": "abc-123"
}
\`\`\`
  `,
  version: '1.0.0',
  serverUrl: process.env.APP_URL || `http://localhost:${process.env.APP_PORT || 4102}`,
  contact: {
    name: 'Core App Team',
    email: 'support@example.com',
  },
  license: {
    name: 'MIT',
    url: 'https://opensource.org/licenses/MIT',
  },
};

/**
 * Create Swagger document configuration
 * @param config - Swagger configuration options
 * @returns DocumentBuilder instance
 */
export function createSwaggerDocument(config: SwaggerConfig = defaultSwaggerConfig): DocumentBuilder {
  const builder = new DocumentBuilder()
    .setTitle(config.title)
    .setDescription(config.description)
    .setVersion(config.version)
    .addServer(config.serverUrl, 'API Server')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'bearerAuth',
    )
    .addTag('Health', 'Health check endpoints')
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Settings', 'Application settings endpoints')
    .addTag('Audit', 'Audit log endpoints (admin only)');

  if (config.contact) {
    builder.setContact(
      config.contact.name || '',
      config.contact.url || '',
      config.contact.email || '',
    );
  }

  if (config.license) {
    builder.setLicense(config.license.name, config.license.url || '');
  }

  return builder;
}

/**
 * Setup Swagger documentation for the application
 * @param app - NestJS application instance
 * @param config - Optional Swagger configuration
 * @returns OpenAPI document object
 */
export function setupSwagger(
  app: INestApplication,
  config: SwaggerConfig = defaultSwaggerConfig,
): OpenAPIObject {
  const documentBuilder = createSwaggerDocument(config);
  const document = SwaggerModule.createDocument(app, documentBuilder.build());

  // Setup Swagger UI at /api/docs
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 3,
      syntaxHighlight: {
        activate: true,
        theme: 'monokai',
      },
    },
    customSiteTitle: 'Core App API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title { font-size: 2em; }
    `,
  });

  return document;
}

/**
 * Check if Swagger is enabled based on environment
 * @returns true if Swagger should be enabled
 */
export function isSwaggerEnabled(): boolean {
  const swaggerEnabled = process.env.SWAGGER_ENABLED;
  const nodeEnv = process.env.NODE_ENV || 'development';

  // If explicitly set, use that value
  if (swaggerEnabled !== undefined) {
    return swaggerEnabled === 'true';
  }

  // Default: enabled in development and staging, disabled in production
  return nodeEnv !== 'production';
}
