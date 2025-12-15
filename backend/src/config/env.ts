import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

/**
 * Checks if essential environment variables are already set in process.env
 * This allows Docker Compose to pass environment variables directly without a .env file
 * @returns true if required environment variables are present, false otherwise
 */
export const hasRequiredEnvVars = (): boolean => {
  // Check for a minimal set of required environment variables
  // These are the essential vars needed for the application to start
  const requiredVars = ['DB_HOST', 'JWT_SECRET', 'RESEND_API_KEY'];
  return requiredVars.every((varName) => process.env[varName] !== undefined);
};

/**
 * Loads environment variables from .env file
 * Tries multiple paths: backend root, then current working directory
 * @returns true if loaded successfully, false otherwise
 */
export const loadEnvFile = (): boolean => {
  // Look for .env in the backend root directory
  const envPath = path.resolve(__dirname, '../../.env');
  const result = dotenv.config({ path: envPath });

  if (result.error) {
    // Try loading from current working directory as fallback
    const fallbackResult = dotenv.config();
    if (fallbackResult.error) {
      return false;
    }
  }
  return true;
};

/**
 * Handles missing .env file error
 * Logs error message and exits process (unless in test environment)
 */
export const handleMissingEnvFile = (): void => {
  console.error('❌ Error: .env file not found');
  console.error('   Please create a .env file from .env.example:');
  console.error('   npm run setup');
  /* istanbul ignore next */
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
};

// Load .env file at module initialization
const envLoaded = loadEnvFile();

// Only fail if both conditions are true:
// 1. .env file was not loaded successfully
// 2. Required environment variables are not already set (e.g., via Docker Compose)
if (!envLoaded && !hasRequiredEnvVars() && process.env.NODE_ENV !== 'test') {
  handleMissingEnvFile();
}

/**
 * Zod schema for environment variable validation
 * All required environment variables are defined here with their types and constraints
 */
export const envSchema = z.object({
  // Application settings
  // 'test' is included for Jest test environment
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  APP_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('4102'),
  APP_HOST: z.string().default('localhost'),
  APP_URL: z.string().url().default('http://localhost:4102'),

  // Database settings (PostgreSQL) - STORY-024A
  DB_HOST: z.string().min(1, 'DB_HOST is required'),
  DB_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('5432'),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_PASSWORD: z.string().min(8, 'DB_PASSWORD must be at least 8 characters'),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),
  DB_SSL: z.string().transform((v) => v === 'true').default('false'),

  // Connection Pool settings - STORY-024A
  DB_POOL_MAX: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('20'),
  DB_POOL_IDLE_TIMEOUT_MS: z.string().transform(Number).pipe(z.number().min(1000)).default('30000'),
  DB_POOL_CONNECTION_TIMEOUT_MS: z.string().transform(Number).pipe(z.number().min(100)).default('2000'),

  // JWT Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // Email settings (Resend.com)
  RESEND_API_KEY: z.string().startsWith('re_', 'RESEND_API_KEY must start with "re_"'),
  EMAIL_FROM_NAME: z.string().min(1, 'EMAIL_FROM_NAME is required'),
  EMAIL_FROM_ADDRESS: z.string().email('EMAIL_FROM_ADDRESS must be a valid email'),

  // MinIO settings (Optional) - STORY-029, STORY-026A
  MINIO_ENDPOINT: z.string().optional(),
  MINIO_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).optional(),
  MINIO_CONSOLE_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).optional(),
  MINIO_USE_SSL: z.string().transform((v) => v === 'true').optional(),
  MINIO_ACCESS_KEY: z.string().optional(),
  MINIO_SECRET_KEY: z.string().optional(),
  MINIO_BUCKET: z.string().optional(),
  // MinIO bucket configuration (STORY-026A)
  MINIO_BUCKET_UPLOADS: z.string().default('uploads'),
  MINIO_BUCKET_LOGOS: z.string().default('logos'),
  MINIO_BUCKET_FEEDBACK: z.string().default('feedback'),
  // Storage health check timeout (STORY-029)
  STORAGE_CHECK_TIMEOUT: z.string().transform(Number).pipe(z.number().min(1000)).optional(),

  // Security settings
  BCRYPT_ROUNDS: z.string().transform(Number).pipe(z.number().min(10).max(15)).default('12'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().min(1000)).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().min(1)).default('100'),

  // Logging settings (STORY-027: Enhanced logging configuration)
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FILE_PATH: z.string().default('./logs/app.log'),
  // STORY-027: Log directory for daily rotating logs
  LOG_DIR: z.string().default('./logs'),
  // STORY-027: Maximum days to keep logs (e.g., '14d' for 14 days)
  LOG_MAX_FILES: z.string().default('14d'),
  // STORY-027: Maximum size per log file (e.g., '20m' for 20MB)
  LOG_MAX_SIZE: z.string().default('20m'),

  // Audit Logging settings (STORY-028: System Logging - Audit Trail)
  // Enable/disable audit logging (default: true)
  AUDIT_LOG_ENABLED: z.string().transform((v) => v !== 'false').default('true'),
  // Log all API requests to audit trail (default: false for performance)
  AUDIT_LOG_API_REQUESTS: z.string().transform((v) => v === 'true').default('false'),
  // Log read-only requests (GET/HEAD/OPTIONS) when API logging is enabled (default: true)
  AUDIT_LOG_READ_ONLY: z.string().transform((v) => v !== 'false').default('true'),
});

/**
 * Type definition for validated environment variables
 */
export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates environment variables against the schema
 * Exits the process if validation fails (except in test environment)
 *
 * @returns Validated environment configuration object
 */
export const validateEnv = (): EnvConfig => {
  try {
    const env = envSchema.parse(process.env);
    console.log('✅ Environment variables validated successfully');
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      console.error('');

      const missingVars: string[] = [];
      const invalidVars: Array<{ name: string; message: string }> = [];

      error.errors.forEach((err) => {
        const varName = err.path.join('.');
        if (err.code === 'invalid_type' && err.received === 'undefined') {
          missingVars.push(varName);
        } else {
          invalidVars.push({ name: varName, message: err.message });
        }
      });

      if (missingVars.length > 0) {
        console.error('Missing required variables:');
        missingVars.forEach((v) => console.error(`  - ${v}`));
        console.error('');
      }

      if (invalidVars.length > 0) {
        console.error('Invalid variables:');
        invalidVars.forEach((v) => console.error(`  - ${v.name}: ${v.message}`));
        console.error('');
      }

      console.error('Please check your .env file and ensure all required variables are set correctly.');
      console.error('See .env.example for reference.');
    } else {
      console.error('❌ Unexpected error validating environment:', error);
    }

    // Don't exit during tests
    /* istanbul ignore next */
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }

    throw error;
  }
};

/**
 * Validated environment configuration
 * Use this object throughout the application instead of process.env
 *
 * @example
 * import { env } from './config/env';
 *
 * const db = new Pool({
 *   host: env.DB_HOST,
 *   port: env.DB_PORT,
 *   user: env.DB_USER,
 *   password: env.DB_PASSWORD,
 *   database: env.DB_NAME,
 * });
 */
let env: EnvConfig;

// Only validate on import if not in test environment
// Tests will call validateEnv manually with mocked env vars
/* istanbul ignore next */
if (process.env.NODE_ENV !== 'test') {
  env = validateEnv();
} else {
  // Provide a minimal default for tests
  env = {} as EnvConfig;
}

export { env };
