/**
 * Swagger Configuration Unit Tests
 * STORY-022: Swagger/OpenAPI Documentation
 *
 * Tests for Swagger configuration validation and setup.
 */

import { DocumentBuilder } from '@nestjs/swagger';
import { SecuritySchemeObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import {
  defaultSwaggerConfig,
  createSwaggerDocument,
  isSwaggerEnabled,
  SwaggerConfig,
} from '../../src/swagger/swagger.config';

describe('SwaggerConfig', () => {
  // Store original env
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment for each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('defaultSwaggerConfig', () => {
    it('should have correct default title', () => {
      expect(defaultSwaggerConfig.title).toBe('Core App API');
    });

    it('should have correct default version', () => {
      expect(defaultSwaggerConfig.version).toBe('1.0.0');
    });

    it('should have a description', () => {
      expect(defaultSwaggerConfig.description).toBeDefined();
      expect(defaultSwaggerConfig.description.length).toBeGreaterThan(0);
    });

    it('should have contact information', () => {
      expect(defaultSwaggerConfig.contact).toBeDefined();
      expect(defaultSwaggerConfig.contact?.name).toBe('Core App Team');
    });

    it('should have license information', () => {
      expect(defaultSwaggerConfig.license).toBeDefined();
      expect(defaultSwaggerConfig.license?.name).toBe('MIT');
    });
  });

  describe('createSwaggerDocument', () => {
    it('should create a DocumentBuilder with default config', () => {
      const builder = createSwaggerDocument();
      expect(builder).toBeDefined();
      expect(builder).toBeInstanceOf(DocumentBuilder);
    });

    it('should create a DocumentBuilder with custom config', () => {
      const customConfig: SwaggerConfig = {
        title: 'Custom API',
        description: 'Custom Description',
        version: '2.0.0',
        serverUrl: 'http://localhost:8080',
      };

      const builder = createSwaggerDocument(customConfig);
      expect(builder).toBeDefined();
      expect(builder).toBeInstanceOf(DocumentBuilder);
    });

    it('should build valid OpenAPI specification', () => {
      const builder = createSwaggerDocument();
      const spec = builder.build();

      expect(spec).toBeDefined();
      expect(spec.openapi).toBe('3.0.0');
      expect(spec.info).toBeDefined();
      expect(spec.info.title).toBe(defaultSwaggerConfig.title);
      expect(spec.info.version).toBe(defaultSwaggerConfig.version);
    });

    it('should include bearer auth security scheme', () => {
      const builder = createSwaggerDocument();
      const spec = builder.build();

      expect(spec.components).toBeDefined();
      expect(spec.components?.securitySchemes).toBeDefined();
      expect(spec.components?.securitySchemes?.bearerAuth).toBeDefined();
      const bearerAuth = spec.components?.securitySchemes?.bearerAuth as SecuritySchemeObject;
      expect(bearerAuth.type).toBe('http');
      expect(bearerAuth.scheme).toBe('bearer');
      expect(bearerAuth.bearerFormat).toBe('JWT');
    });

    it('should include API tags', () => {
      const builder = createSwaggerDocument();
      const spec = builder.build();

      expect(spec.tags).toBeDefined();
      expect(spec.tags?.length).toBeGreaterThan(0);

      const tagNames = spec.tags?.map((tag) => tag.name) || [];
      expect(tagNames).toContain('Health');
      expect(tagNames).toContain('Auth');
      expect(tagNames).toContain('Users');
      expect(tagNames).toContain('Settings');
      expect(tagNames).toContain('Audit');
    });

    it('should include server URL', () => {
      const builder = createSwaggerDocument();
      const spec = builder.build();

      expect(spec.servers).toBeDefined();
      expect(spec.servers?.length).toBeGreaterThan(0);
    });
  });

  describe('isSwaggerEnabled', () => {
    it('should return true when SWAGGER_ENABLED is "true"', () => {
      process.env.SWAGGER_ENABLED = 'true';
      expect(isSwaggerEnabled()).toBe(true);
    });

    it('should return false when SWAGGER_ENABLED is "false"', () => {
      process.env.SWAGGER_ENABLED = 'false';
      expect(isSwaggerEnabled()).toBe(false);
    });

    it('should return true in development environment when not explicitly set', () => {
      delete process.env.SWAGGER_ENABLED;
      process.env.NODE_ENV = 'development';
      expect(isSwaggerEnabled()).toBe(true);
    });

    it('should return true in staging environment when not explicitly set', () => {
      delete process.env.SWAGGER_ENABLED;
      process.env.NODE_ENV = 'staging';
      expect(isSwaggerEnabled()).toBe(true);
    });

    it('should return false in production environment when not explicitly set', () => {
      delete process.env.SWAGGER_ENABLED;
      process.env.NODE_ENV = 'production';
      expect(isSwaggerEnabled()).toBe(false);
    });

    it('should respect explicit setting over environment', () => {
      process.env.SWAGGER_ENABLED = 'true';
      process.env.NODE_ENV = 'production';
      expect(isSwaggerEnabled()).toBe(true);
    });
  });

  describe('SwaggerConfig interface', () => {
    it('should accept minimal config', () => {
      const config: SwaggerConfig = {
        title: 'Test API',
        description: 'Test',
        version: '1.0.0',
        serverUrl: 'http://localhost',
      };
      const builder = createSwaggerDocument(config);
      expect(builder).toBeDefined();
    });

    it('should accept config with contact', () => {
      const config: SwaggerConfig = {
        title: 'Test API',
        description: 'Test',
        version: '1.0.0',
        serverUrl: 'http://localhost',
        contact: {
          name: 'Test Team',
          email: 'test@example.com',
          url: 'https://example.com',
        },
      };
      const builder = createSwaggerDocument(config);
      const spec = builder.build();
      expect(spec.info.contact).toBeDefined();
    });

    it('should accept config with license', () => {
      const config: SwaggerConfig = {
        title: 'Test API',
        description: 'Test',
        version: '1.0.0',
        serverUrl: 'http://localhost',
        license: {
          name: 'Apache 2.0',
          url: 'https://www.apache.org/licenses/LICENSE-2.0',
        },
      };
      const builder = createSwaggerDocument(config);
      const spec = builder.build();
      expect(spec.info.license).toBeDefined();
    });
  });

  describe('OpenAPI specification validation', () => {
    it('should have valid OpenAPI 3.0 version', () => {
      const builder = createSwaggerDocument();
      const spec = builder.build();
      expect(spec.openapi).toMatch(/^3\.\d+\.\d+$/);
    });

    it('should have required info fields', () => {
      const builder = createSwaggerDocument();
      const spec = builder.build();

      expect(spec.info).toBeDefined();
      expect(spec.info.title).toBeDefined();
      expect(spec.info.version).toBeDefined();
    });

    it('should have valid server configuration', () => {
      const builder = createSwaggerDocument();
      const spec = builder.build();

      expect(spec.servers).toBeDefined();
      if (spec.servers && spec.servers.length > 0) {
        expect(spec.servers[0].url).toBeDefined();
        expect(typeof spec.servers[0].url).toBe('string');
      }
    });
  });
});
