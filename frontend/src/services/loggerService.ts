/**
 * Logger Service
 * Centralized logging for the frontend application.
 *
 * Features:
 * - Configurable log levels
 * - Production-safe (suppresses debug/info in production)
 * - Consistent formatting
 * - Context support for better debugging
 *
 * @example
 * ```typescript
 * import { logger } from './loggerService';
 *
 * // Basic usage
 * logger.debug('Loading component');
 * logger.info('User logged in');
 * logger.warn('API rate limit approaching');
 * logger.error('Failed to fetch data', error);
 *
 * // With context
 * logger.error('Failed to load user', error, { userId: 123 });
 * ```
 */

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  /** Minimum log level to display */
  minLevel: LogLevel;
  /** Whether to include timestamps */
  showTimestamp: boolean;
  /** Whether to include log level prefix */
  showLevel: boolean;
}

/**
 * Default configuration based on environment
 */
const getDefaultConfig = (): LoggerConfig => {
  const isProduction = import.meta.env.PROD;
  const isDevelopment = import.meta.env.DEV;

  return {
    // In production, only show warnings and errors
    // In development, show everything
    minLevel: isProduction ? LogLevel.WARN : LogLevel.DEBUG,
    showTimestamp: isDevelopment,
    showLevel: true,
  };
};

/**
 * Current logger configuration
 */
let config: LoggerConfig = getDefaultConfig();

/**
 * Format a log message with optional context
 */
const formatMessage = (
  level: string,
  message: string,
  context?: Record<string, unknown>
): string => {
  const parts: string[] = [];

  if (config.showTimestamp) {
    parts.push(`[${new Date().toISOString()}]`);
  }

  if (config.showLevel) {
    parts.push(`[${level}]`);
  }

  parts.push(message);

  if (context && Object.keys(context).length > 0) {
    parts.push(JSON.stringify(context));
  }

  return parts.join(' ');
};

/**
 * Check if a log level should be displayed
 */
const shouldLog = (level: LogLevel): boolean => {
  return level >= config.minLevel;
};

/**
 * Logger Service
 * Provides consistent logging across the application
 */
export const logger = {
  /**
   * Log debug message (only in development)
   * Use for detailed debugging information
   */
  debug(message: string, context?: Record<string, unknown>): void {
    if (shouldLog(LogLevel.DEBUG)) {
      console.debug(formatMessage('DEBUG', message, context));
    }
  },

  /**
   * Log info message (only in development)
   * Use for general information about application flow
   */
  info(message: string, context?: Record<string, unknown>): void {
    if (shouldLog(LogLevel.INFO)) {
      console.info(formatMessage('INFO', message, context));
    }
  },

  /**
   * Log warning message (shown in production)
   * Use for potentially problematic situations
   */
  warn(message: string, error?: unknown, context?: Record<string, unknown>): void {
    if (shouldLog(LogLevel.WARN)) {
      const formattedMessage = formatMessage('WARN', message, context);
      if (error) {
        console.warn(formattedMessage, error);
      } else {
        console.warn(formattedMessage);
      }
    }
  },

  /**
   * Log error message (always shown)
   * Use for error conditions
   */
  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    if (shouldLog(LogLevel.ERROR)) {
      const formattedMessage = formatMessage('ERROR', message, context);
      if (error) {
        console.error(formattedMessage, error);
      } else {
        console.error(formattedMessage);
      }
    }
  },

  /**
   * Configure the logger
   * Useful for tests or special environments
   */
  configure(newConfig: Partial<LoggerConfig>): void {
    config = { ...config, ...newConfig };
  },

  /**
   * Reset configuration to defaults
   */
  resetConfig(): void {
    config = getDefaultConfig();
  },

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void {
    config.minLevel = level;
  },

  /**
   * Silence all logs (useful for tests)
   */
  silence(): void {
    config.minLevel = LogLevel.SILENT;
  },

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return config.minLevel;
  },
};

export default logger;
