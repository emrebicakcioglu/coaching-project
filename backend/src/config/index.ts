/**
 * Configuration module exports
 * Centralizes all configuration-related exports for the application
 *
 * Stories:
 * - STORY-012: Environment Configuration
 * - STORY-024A: PostgreSQL Database Setup (added loadEnvFile, handleMissingEnvFile)
 */

export { env, validateEnv, envSchema, loadEnvFile, handleMissingEnvFile, hasRequiredEnvVars } from './env';
export type { EnvConfig } from './env';
