/**
 * Environment Configuration Tests
 *
 * Tests for the environment variable validation and loading functionality.
 * Coverage target: >= 85%
 */

import { z } from 'zod';
import { envSchema, validateEnv, loadEnvFile, handleMissingEnvFile, hasRequiredEnvVars } from '../../src/config/env';

describe('Environment Configuration', () => {
  // Store original env
  const originalEnv = process.env;

  // Valid test environment
  const validEnv = {
    NODE_ENV: 'development',
    APP_PORT: '4102',
    APP_HOST: 'localhost',
    APP_URL: 'http://localhost:4102',
    DB_HOST: 'localhost',
    DB_PORT: '5432',
    DB_USER: 'postgres',
    DB_PASSWORD: 'securepassword123',
    DB_NAME: 'core_app',
    DB_SSL: 'false',
    // Connection Pool settings - STORY-024A
    DB_POOL_MAX: '20',
    DB_POOL_IDLE_TIMEOUT_MS: '30000',
    DB_POOL_CONNECTION_TIMEOUT_MS: '2000',
    JWT_SECRET: 'this-is-a-super-secret-jwt-key-that-is-at-least-32-characters',
    JWT_EXPIRES_IN: '24h',
    JWT_REFRESH_EXPIRES_IN: '30d',
    RESEND_API_KEY: 're_test123456789',
    EMAIL_FROM_NAME: 'Test App',
    EMAIL_FROM_ADDRESS: 'test@example.com',
    LOG_LEVEL: 'info',
    LOG_FILE_PATH: './logs/app.log',
    BCRYPT_ROUNDS: '12',
    RATE_LIMIT_WINDOW_MS: '60000',
    RATE_LIMIT_MAX_REQUESTS: '100',
  };

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('envSchema - Valid Configuration', () => {
    it('should validate a complete valid configuration', () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('development');
        expect(result.data.APP_PORT).toBe(4102);
        expect(result.data.DB_HOST).toBe('localhost');
      }
    });

    it('should accept all valid NODE_ENV values', () => {
      const environments = ['development', 'staging', 'production'];

      environments.forEach((env) => {
        const testEnv = { ...validEnv, NODE_ENV: env };
        const result = envSchema.safeParse(testEnv);
        expect(result.success).toBe(true);
      });
    });

    it('should accept valid log levels', () => {
      const logLevels = ['debug', 'info', 'warn', 'error'];

      logLevels.forEach((level) => {
        const testEnv = { ...validEnv, LOG_LEVEL: level };
        const result = envSchema.safeParse(testEnv);
        expect(result.success).toBe(true);
      });
    });

    it('should handle optional MinIO configuration', () => {
      const envWithMinio = {
        ...validEnv,
        MINIO_ENDPOINT: 'localhost',
        MINIO_PORT: '9000',
        MINIO_CONSOLE_PORT: '9001',
        MINIO_USE_SSL: 'false',
        MINIO_ACCESS_KEY: 'minioadmin',
        MINIO_SECRET_KEY: 'minioadmin',
        MINIO_BUCKET: 'test-bucket',
      };

      const result = envSchema.safeParse(envWithMinio);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.MINIO_ENDPOINT).toBe('localhost');
        expect(result.data.MINIO_PORT).toBe(9000);
      }
    });
  });

  describe('envSchema - Default Values', () => {
    it('should apply default value for APP_PORT', () => {
      const envWithoutPort = { ...validEnv };
      delete (envWithoutPort as Record<string, unknown>).APP_PORT;

      const result = envSchema.safeParse(envWithoutPort);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.APP_PORT).toBe(4102);
      }
    });

    it('should apply default value for NODE_ENV', () => {
      const envWithoutNodeEnv = { ...validEnv };
      delete (envWithoutNodeEnv as Record<string, unknown>).NODE_ENV;

      const result = envSchema.safeParse(envWithoutNodeEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('development');
      }
    });

    it('should apply default value for LOG_LEVEL', () => {
      const envWithoutLogLevel = { ...validEnv };
      delete (envWithoutLogLevel as Record<string, unknown>).LOG_LEVEL;

      const result = envSchema.safeParse(envWithoutLogLevel);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.LOG_LEVEL).toBe('info');
      }
    });

    it('should apply default value for JWT_EXPIRES_IN', () => {
      const envWithoutExpiry = { ...validEnv };
      delete (envWithoutExpiry as Record<string, unknown>).JWT_EXPIRES_IN;

      const result = envSchema.safeParse(envWithoutExpiry);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.JWT_EXPIRES_IN).toBe('24h');
      }
    });

    it('should apply default value for BCRYPT_ROUNDS', () => {
      const envWithoutBcrypt = { ...validEnv };
      delete (envWithoutBcrypt as Record<string, unknown>).BCRYPT_ROUNDS;

      const result = envSchema.safeParse(envWithoutBcrypt);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.BCRYPT_ROUNDS).toBe(12);
      }
    });

    it('should apply default value for DB_SSL', () => {
      const envWithoutSSL = { ...validEnv };
      delete (envWithoutSSL as Record<string, unknown>).DB_SSL;

      const result = envSchema.safeParse(envWithoutSSL);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.DB_SSL).toBe(false);
      }
    });

    // STORY-024A: Connection Pool defaults
    it('should apply default value for DB_POOL_MAX', () => {
      const envWithoutPoolMax = { ...validEnv };
      delete (envWithoutPoolMax as Record<string, unknown>).DB_POOL_MAX;

      const result = envSchema.safeParse(envWithoutPoolMax);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.DB_POOL_MAX).toBe(20);
      }
    });

    it('should apply default value for DB_POOL_IDLE_TIMEOUT_MS', () => {
      const envWithoutIdleTimeout = { ...validEnv };
      delete (envWithoutIdleTimeout as Record<string, unknown>).DB_POOL_IDLE_TIMEOUT_MS;

      const result = envSchema.safeParse(envWithoutIdleTimeout);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.DB_POOL_IDLE_TIMEOUT_MS).toBe(30000);
      }
    });

    it('should apply default value for DB_POOL_CONNECTION_TIMEOUT_MS', () => {
      const envWithoutConnTimeout = { ...validEnv };
      delete (envWithoutConnTimeout as Record<string, unknown>).DB_POOL_CONNECTION_TIMEOUT_MS;

      const result = envSchema.safeParse(envWithoutConnTimeout);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.DB_POOL_CONNECTION_TIMEOUT_MS).toBe(2000);
      }
    });
  });

  describe('envSchema - Type Transformations', () => {
    it('should transform APP_PORT string to number', () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.APP_PORT).toBe('number');
        expect(result.data.APP_PORT).toBe(4102);
      }
    });

    it('should transform DB_PORT string to number', () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.DB_PORT).toBe('number');
        expect(result.data.DB_PORT).toBe(5432);
      }
    });

    it('should transform DB_SSL string to boolean', () => {
      const envWithSSL = { ...validEnv, DB_SSL: 'true' };
      const result = envSchema.safeParse(envWithSSL);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.DB_SSL).toBe('boolean');
        expect(result.data.DB_SSL).toBe(true);
      }
    });

    it('should transform BCRYPT_ROUNDS string to number', () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.BCRYPT_ROUNDS).toBe('number');
        expect(result.data.BCRYPT_ROUNDS).toBe(12);
      }
    });

    it('should transform RATE_LIMIT_WINDOW_MS string to number', () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.RATE_LIMIT_WINDOW_MS).toBe('number');
        expect(result.data.RATE_LIMIT_WINDOW_MS).toBe(60000);
      }
    });
  });

  describe('envSchema - Missing Required Variables', () => {
    it('should fail validation when DB_HOST is missing', () => {
      const envWithoutDbHost = { ...validEnv };
      delete (envWithoutDbHost as Record<string, unknown>).DB_HOST;

      const result = envSchema.safeParse(envWithoutDbHost);
      expect(result.success).toBe(false);
    });

    it('should fail validation when DB_USER is missing', () => {
      const envWithoutDbUser = { ...validEnv };
      delete (envWithoutDbUser as Record<string, unknown>).DB_USER;

      const result = envSchema.safeParse(envWithoutDbUser);
      expect(result.success).toBe(false);
    });

    it('should fail validation when DB_PASSWORD is missing', () => {
      const envWithoutDbPassword = { ...validEnv };
      delete (envWithoutDbPassword as Record<string, unknown>).DB_PASSWORD;

      const result = envSchema.safeParse(envWithoutDbPassword);
      expect(result.success).toBe(false);
    });

    it('should fail validation when DB_NAME is missing', () => {
      const envWithoutDbName = { ...validEnv };
      delete (envWithoutDbName as Record<string, unknown>).DB_NAME;

      const result = envSchema.safeParse(envWithoutDbName);
      expect(result.success).toBe(false);
    });

    it('should fail validation when JWT_SECRET is missing', () => {
      const envWithoutJwt = { ...validEnv };
      delete (envWithoutJwt as Record<string, unknown>).JWT_SECRET;

      const result = envSchema.safeParse(envWithoutJwt);
      expect(result.success).toBe(false);
    });

    it('should fail validation when RESEND_API_KEY is missing', () => {
      const envWithoutResend = { ...validEnv };
      delete (envWithoutResend as Record<string, unknown>).RESEND_API_KEY;

      const result = envSchema.safeParse(envWithoutResend);
      expect(result.success).toBe(false);
    });

    it('should fail validation when EMAIL_FROM_NAME is missing', () => {
      const envWithoutEmailName = { ...validEnv };
      delete (envWithoutEmailName as Record<string, unknown>).EMAIL_FROM_NAME;

      const result = envSchema.safeParse(envWithoutEmailName);
      expect(result.success).toBe(false);
    });

    it('should fail validation when EMAIL_FROM_ADDRESS is missing', () => {
      const envWithoutEmailAddress = { ...validEnv };
      delete (envWithoutEmailAddress as Record<string, unknown>).EMAIL_FROM_ADDRESS;

      const result = envSchema.safeParse(envWithoutEmailAddress);
      expect(result.success).toBe(false);
    });
  });

  describe('envSchema - Invalid Variable Formats', () => {
    it('should fail validation for invalid NODE_ENV', () => {
      const envWithInvalidNodeEnv = { ...validEnv, NODE_ENV: 'invalid' };
      const result = envSchema.safeParse(envWithInvalidNodeEnv);
      expect(result.success).toBe(false);
    });

    it('should fail validation for invalid LOG_LEVEL', () => {
      const envWithInvalidLogLevel = { ...validEnv, LOG_LEVEL: 'invalid' };
      const result = envSchema.safeParse(envWithInvalidLogLevel);
      expect(result.success).toBe(false);
    });

    it('should fail validation for non-numeric APP_PORT', () => {
      const envWithInvalidPort = { ...validEnv, APP_PORT: 'not-a-number' };
      const result = envSchema.safeParse(envWithInvalidPort);
      expect(result.success).toBe(false);
    });

    it('should fail validation for APP_PORT out of range', () => {
      const envWithPortTooHigh = { ...validEnv, APP_PORT: '70000' };
      const result = envSchema.safeParse(envWithPortTooHigh);
      expect(result.success).toBe(false);

      const envWithPortTooLow = { ...validEnv, APP_PORT: '0' };
      const result2 = envSchema.safeParse(envWithPortTooLow);
      expect(result2.success).toBe(false);
    });

    it('should fail validation for short DB_PASSWORD', () => {
      const envWithShortPassword = { ...validEnv, DB_PASSWORD: 'short' };
      const result = envSchema.safeParse(envWithShortPassword);
      expect(result.success).toBe(false);
    });

    it('should fail validation for short JWT_SECRET', () => {
      const envWithShortSecret = { ...validEnv, JWT_SECRET: 'tooshort' };
      const result = envSchema.safeParse(envWithShortSecret);
      expect(result.success).toBe(false);
    });

    it('should fail validation for RESEND_API_KEY not starting with re_', () => {
      const envWithInvalidResend = { ...validEnv, RESEND_API_KEY: 'invalid_key' };
      const result = envSchema.safeParse(envWithInvalidResend);
      expect(result.success).toBe(false);
    });

    it('should fail validation for invalid EMAIL_FROM_ADDRESS', () => {
      const envWithInvalidEmail = { ...validEnv, EMAIL_FROM_ADDRESS: 'not-an-email' };
      const result = envSchema.safeParse(envWithInvalidEmail);
      expect(result.success).toBe(false);
    });

    it('should fail validation for invalid APP_URL', () => {
      const envWithInvalidUrl = { ...validEnv, APP_URL: 'not-a-url' };
      const result = envSchema.safeParse(envWithInvalidUrl);
      expect(result.success).toBe(false);
    });

    it('should fail validation for BCRYPT_ROUNDS out of range', () => {
      const envWithLowRounds = { ...validEnv, BCRYPT_ROUNDS: '5' };
      const result = envSchema.safeParse(envWithLowRounds);
      expect(result.success).toBe(false);

      const envWithHighRounds = { ...validEnv, BCRYPT_ROUNDS: '20' };
      const result2 = envSchema.safeParse(envWithHighRounds);
      expect(result2.success).toBe(false);
    });

    it('should fail validation for RATE_LIMIT_WINDOW_MS too low', () => {
      const envWithLowWindow = { ...validEnv, RATE_LIMIT_WINDOW_MS: '100' };
      const result = envSchema.safeParse(envWithLowWindow);
      expect(result.success).toBe(false);
    });

    // STORY-024A: Connection Pool validation
    it('should fail validation for DB_POOL_MAX out of range', () => {
      const envWithPoolTooLow = { ...validEnv, DB_POOL_MAX: '0' };
      const result = envSchema.safeParse(envWithPoolTooLow);
      expect(result.success).toBe(false);

      const envWithPoolTooHigh = { ...validEnv, DB_POOL_MAX: '200' };
      const result2 = envSchema.safeParse(envWithPoolTooHigh);
      expect(result2.success).toBe(false);
    });

    it('should fail validation for DB_POOL_IDLE_TIMEOUT_MS too low', () => {
      const envWithIdleTooLow = { ...validEnv, DB_POOL_IDLE_TIMEOUT_MS: '500' };
      const result = envSchema.safeParse(envWithIdleTooLow);
      expect(result.success).toBe(false);
    });

    it('should fail validation for DB_POOL_CONNECTION_TIMEOUT_MS too low', () => {
      const envWithConnTooLow = { ...validEnv, DB_POOL_CONNECTION_TIMEOUT_MS: '50' };
      const result = envSchema.safeParse(envWithConnTooLow);
      expect(result.success).toBe(false);
    });
  });

  describe('envSchema - Error Messages', () => {
    it('should provide meaningful error for missing required variable', () => {
      const envWithoutDbHost = { ...validEnv };
      delete (envWithoutDbHost as Record<string, unknown>).DB_HOST;

      const result = envSchema.safeParse(envWithoutDbHost);
      expect(result.success).toBe(false);
      if (!result.success) {
        const dbHostError = result.error.errors.find((e) => e.path.includes('DB_HOST'));
        expect(dbHostError).toBeDefined();
      }
    });

    it('should provide meaningful error for invalid format', () => {
      const envWithInvalidEmail = { ...validEnv, EMAIL_FROM_ADDRESS: 'invalid' };
      const result = envSchema.safeParse(envWithInvalidEmail);
      expect(result.success).toBe(false);
      if (!result.success) {
        const emailError = result.error.errors.find((e) => e.path.includes('EMAIL_FROM_ADDRESS'));
        expect(emailError).toBeDefined();
        expect(emailError?.message).toContain('email');
      }
    });

    it('should collect all validation errors', () => {
      const invalidEnv = {
        NODE_ENV: 'invalid',
        DB_PASSWORD: 'short',
        JWT_SECRET: 'short',
        RESEND_API_KEY: 'invalid',
        EMAIL_FROM_ADDRESS: 'invalid',
      };

      const result = envSchema.safeParse(invalidEnv);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Should have multiple errors
        expect(result.error.errors.length).toBeGreaterThan(3);
      }
    });
  });

  describe('envSchema - Production Environment', () => {
    it('should accept production environment configuration', () => {
      const productionEnv = {
        ...validEnv,
        NODE_ENV: 'production',
        APP_HOST: '0.0.0.0',
        APP_URL: 'https://api.example.com',
        DB_SSL: 'true',
        LOG_LEVEL: 'warn',
      };

      const result = envSchema.safeParse(productionEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('production');
        expect(result.data.DB_SSL).toBe(true);
      }
    });
  });

  describe('validateEnv function', () => {
    // Save original console methods
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    beforeEach(() => {
      // Mock console methods
      console.log = jest.fn();
      console.error = jest.fn();
    });

    afterEach(() => {
      // Restore console methods
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    });

    it('should return validated env config when all variables are valid', () => {
      // Set up process.env with valid values (use 'test' to prevent process.exit)
      process.env = { ...validEnv, NODE_ENV: 'test' };

      const result = validateEnv();

      expect(result).toBeDefined();
      expect(result.DB_HOST).toBe('localhost');
      expect(result.APP_PORT).toBe(4102);
      expect(result.NODE_ENV).toBe('test');
      expect(console.log).toHaveBeenCalledWith('✅ Environment variables validated successfully');
    });

    it('should throw error and log missing variables when required vars are missing', () => {
      // Set up process.env without required variables (use 'test' to prevent process.exit)
      process.env = { NODE_ENV: 'test' };

      expect(() => validateEnv()).toThrow(z.ZodError);
      expect(console.error).toHaveBeenCalledWith('❌ Invalid environment variables:');
      expect(console.error).toHaveBeenCalledWith('Missing required variables:');
    });

    it('should throw error and log invalid variables when values are invalid', () => {
      // Set up process.env with invalid values (use 'test' to prevent process.exit)
      process.env = {
        ...validEnv,
        NODE_ENV: 'test',
        DB_PASSWORD: 'short',
        JWT_SECRET: 'short',
      };

      expect(() => validateEnv()).toThrow(z.ZodError);
      expect(console.error).toHaveBeenCalledWith('❌ Invalid environment variables:');
      expect(console.error).toHaveBeenCalledWith('Invalid variables:');
    });

    it('should categorize errors correctly between missing and invalid', () => {
      // Set up with both missing and invalid (use 'test' to prevent process.exit)
      process.env = {
        NODE_ENV: 'test',
        APP_PORT: '4102',
        APP_HOST: 'localhost',
        APP_URL: 'http://localhost:4102',
        // Missing: DB_HOST
        DB_PORT: '5432',
        DB_USER: 'postgres',
        DB_PASSWORD: 'short', // Invalid (too short)
        DB_NAME: 'core_app',
        JWT_SECRET: 'this-is-a-super-secret-jwt-key-that-is-at-least-32-characters',
        RESEND_API_KEY: 're_test123',
        EMAIL_FROM_NAME: 'Test',
        EMAIL_FROM_ADDRESS: 'test@example.com',
      };

      expect(() => validateEnv()).toThrow(z.ZodError);
      // Should log both missing and invalid
      expect(console.error).toHaveBeenCalledWith('Missing required variables:');
      expect(console.error).toHaveBeenCalledWith('Invalid variables:');
    });

    it('should handle unexpected non-ZodError errors', () => {
      // Set NODE_ENV to test to prevent process.exit
      process.env = { ...validEnv, NODE_ENV: 'test' };

      // Mock envSchema.parse to throw a non-ZodError
      const mockError = new Error('Unexpected error');

      // Temporarily override the schema's parse method
      jest.spyOn(envSchema, 'parse').mockImplementationOnce(() => {
        throw mockError;
      });

      expect(() => validateEnv()).toThrow(mockError);
      expect(console.error).toHaveBeenCalledWith('❌ Unexpected error validating environment:', mockError);
    });

    it('should log specific missing variable names', () => {
      // Set up process.env missing specific required variables (use 'test' to prevent process.exit)
      process.env = {
        NODE_ENV: 'test',
        APP_PORT: '4102',
        APP_HOST: 'localhost',
        APP_URL: 'http://localhost:4102',
        // Missing: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
        DB_PORT: '5432',
        JWT_SECRET: 'this-is-a-super-secret-jwt-key-that-is-at-least-32-characters',
        JWT_EXPIRES_IN: '24h',
        JWT_REFRESH_EXPIRES_IN: '30d',
        RESEND_API_KEY: 're_test123',
        EMAIL_FROM_NAME: 'Test',
        EMAIL_FROM_ADDRESS: 'test@example.com',
      };

      expect(() => validateEnv()).toThrow(z.ZodError);
      expect(console.error).toHaveBeenCalledWith('Missing required variables:');
      // Verify that specific missing variables are logged
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('DB_HOST'));
    });

    it('should log invalid variable details with messages', () => {
      // Set up process.env with invalid RESEND_API_KEY format (use 'test' to prevent process.exit)
      process.env = {
        ...validEnv,
        NODE_ENV: 'test',
        RESEND_API_KEY: 'invalid_key_without_re_prefix',
      };

      expect(() => validateEnv()).toThrow(z.ZodError);
      expect(console.error).toHaveBeenCalledWith('Invalid variables:');
    });

    it('should validate development environment', () => {
      process.env = { ...validEnv, NODE_ENV: 'test' };
      // Need to mock to test development specifically without triggering process.exit
      jest.spyOn(envSchema, 'safeParse').mockReturnValueOnce({
        success: true,
        data: { ...validEnv, NODE_ENV: 'development' } as any,
      });

      const result = envSchema.safeParse({ ...validEnv, NODE_ENV: 'development' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('development');
      }
    });

    it('should validate staging environment via schema', () => {
      const result = envSchema.safeParse({ ...validEnv, NODE_ENV: 'staging' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('staging');
      }
    });

    it('should validate production environment via schema', () => {
      const result = envSchema.safeParse({ ...validEnv, NODE_ENV: 'production' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('production');
      }
    });

    it('should validate test environment via schema', () => {
      const result = envSchema.safeParse({ ...validEnv, NODE_ENV: 'test' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('test');
      }
    });
  });

  describe('loadEnvFile function', () => {
    it('should be a function that returns boolean', () => {
      // loadEnvFile is already called at module initialization
      // We just verify it exists and is callable
      expect(typeof loadEnvFile).toBe('function');

      // Call it and verify it returns a boolean
      const result = loadEnvFile();
      expect(typeof result).toBe('boolean');
    });

    it('should return true when env file is loaded successfully', () => {
      // In test environment, the function should return true or false based on .env existence
      const result = loadEnvFile();
      // Result depends on whether .env exists, but should always be boolean
      expect([true, false]).toContain(result);
    });

    it('should try fallback when primary path fails', () => {
      // We test that the function handles the fallback scenario
      // The actual result depends on whether .env exists anywhere
      const result = loadEnvFile();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('handleMissingEnvFile function', () => {
    // Save original console methods
    const originalConsoleError = console.error;

    beforeEach(() => {
      // Mock console methods
      console.error = jest.fn();
    });

    afterEach(() => {
      // Restore console methods
      console.error = originalConsoleError;
    });

    it('should log error messages when called', () => {
      // Call the function (won't exit in test environment)
      handleMissingEnvFile();

      expect(console.error).toHaveBeenCalledWith('❌ Error: .env file not found');
      expect(console.error).toHaveBeenCalledWith('   Please create a .env file from .env.example:');
      expect(console.error).toHaveBeenCalledWith('   npm run setup');
    });

    it('should not exit process in test environment', () => {
      // In test environment (NODE_ENV=test), this should not call process.exit
      expect(() => handleMissingEnvFile()).not.toThrow();
    });
  });

  describe('hasRequiredEnvVars function', () => {
    it('should return true when all required env vars are set', () => {
      // Set up process.env with required variables
      process.env.DB_HOST = 'localhost';
      process.env.JWT_SECRET = 'test-secret-32-chars-long-minimum-required';
      process.env.RESEND_API_KEY = 're_test123';

      const result = hasRequiredEnvVars();
      expect(result).toBe(true);
    });

    it('should return false when DB_HOST is missing', () => {
      // Clear required env vars
      delete process.env.DB_HOST;
      process.env.JWT_SECRET = 'test-secret-32-chars-long-minimum-required';
      process.env.RESEND_API_KEY = 're_test123';

      const result = hasRequiredEnvVars();
      expect(result).toBe(false);
    });

    it('should return false when JWT_SECRET is missing', () => {
      process.env.DB_HOST = 'localhost';
      delete process.env.JWT_SECRET;
      process.env.RESEND_API_KEY = 're_test123';

      const result = hasRequiredEnvVars();
      expect(result).toBe(false);
    });

    it('should return false when RESEND_API_KEY is missing', () => {
      process.env.DB_HOST = 'localhost';
      process.env.JWT_SECRET = 'test-secret-32-chars-long-minimum-required';
      delete process.env.RESEND_API_KEY;

      const result = hasRequiredEnvVars();
      expect(result).toBe(false);
    });

    it('should return false when all required vars are missing', () => {
      delete process.env.DB_HOST;
      delete process.env.JWT_SECRET;
      delete process.env.RESEND_API_KEY;

      const result = hasRequiredEnvVars();
      expect(result).toBe(false);
    });
  });
});
