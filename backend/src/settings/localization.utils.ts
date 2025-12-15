/**
 * Localization Utilities
 * STORY-018A: Standard-Sprache Backend (i18n Setup)
 *
 * Utility functions for date, number, and currency formatting
 * based on user locale preferences.
 */

import { LanguageCode, LANGUAGE_METADATA } from './dto/language-settings.dto';

/**
 * Locale configuration for formatting
 */
export interface LocaleConfig {
  language: LanguageCode;
  dateFormat: string;
  numberFormat: string;
}

/**
 * Default locale configurations per language
 */
export const DEFAULT_LOCALE_CONFIGS: Record<LanguageCode, LocaleConfig> = {
  en: {
    language: 'en',
    dateFormat: 'YYYY-MM-DD',
    numberFormat: 'en-US',
  },
  de: {
    language: 'de',
    dateFormat: 'DD.MM.YYYY',
    numberFormat: 'de-DE',
  },
};

/**
 * Date format patterns and their meanings
 */
export const DATE_FORMAT_PATTERNS: Record<string, string> = {
  'YYYY-MM-DD': 'ISO format (2025-01-15)',
  'DD.MM.YYYY': 'German format (15.01.2025)',
  'MM/DD/YYYY': 'US format (01/15/2025)',
  'DD/MM/YYYY': 'European format (15/01/2025)',
  'YYYY/MM/DD': 'Asian format (2025/01/15)',
};

/**
 * Number format locales and their examples
 */
export const NUMBER_FORMAT_LOCALES: Record<string, string> = {
  'en-US': '1,234.56',
  'en-GB': '1,234.56',
  'de-DE': '1.234,56',
  'de-AT': '1.234,56',
  'de-CH': "1'234.56",
  'fr-FR': '1 234,56',
};

/**
 * Format a date according to the specified format pattern
 *
 * @param date - Date to format
 * @param pattern - Date format pattern (e.g., 'YYYY-MM-DD', 'DD.MM.YYYY')
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | number, pattern: string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return pattern
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * Format a date using locale-aware Intl.DateTimeFormat
 *
 * @param date - Date to format
 * @param locale - Locale string (e.g., 'en-US', 'de-DE')
 * @param options - DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDateLocale(
  date: Date | string | number,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  return new Intl.DateTimeFormat(locale, options || defaultOptions).format(d);
}

/**
 * Format a date and time using locale-aware Intl.DateTimeFormat
 *
 * @param date - Date to format
 * @param locale - Locale string (e.g., 'en-US', 'de-DE')
 * @param options - DateTimeFormat options
 * @returns Formatted date/time string
 */
export function formatDateTime(
  date: Date | string | number,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  };

  return new Intl.DateTimeFormat(locale, options || defaultOptions).format(d);
}

/**
 * Format a number according to locale
 *
 * @param value - Number to format
 * @param locale - Locale string (e.g., 'en-US', 'de-DE')
 * @param options - NumberFormat options
 * @returns Formatted number string
 */
export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format a number as currency
 *
 * @param value - Number to format
 * @param locale - Locale string (e.g., 'en-US', 'de-DE')
 * @param currency - Currency code (e.g., 'USD', 'EUR')
 * @param options - Additional NumberFormat options
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number,
  locale: string,
  currency: string = 'USD',
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    ...options,
  }).format(value);
}

/**
 * Format a number as percentage
 *
 * @param value - Number to format (0-1 range for percentages)
 * @param locale - Locale string (e.g., 'en-US', 'de-DE')
 * @param options - Additional NumberFormat options
 * @returns Formatted percentage string
 */
export function formatPercent(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

/**
 * Format a file size in human-readable format
 *
 * @param bytes - Size in bytes
 * @param locale - Locale string (e.g., 'en-US', 'de-DE')
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number, locale: string): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  const formattedSize = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(size);

  return `${formattedSize} ${units[unitIndex]}`;
}

/**
 * Format a relative time (e.g., "2 hours ago")
 *
 * @param date - Date to compare
 * @param locale - Locale string (e.g., 'en-US', 'de-DE')
 * @param now - Reference date (defaults to now)
 * @returns Formatted relative time string
 */
export function formatRelativeTime(
  date: Date | string | number,
  locale: string,
  now: Date = new Date(),
): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }

  const diffMs = d.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  const diffWeek = Math.round(diffDay / 7);
  const diffMonth = Math.round(diffDay / 30);
  const diffYear = Math.round(diffDay / 365);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(diffSec) < 60) {
    return rtf.format(diffSec, 'second');
  } else if (Math.abs(diffMin) < 60) {
    return rtf.format(diffMin, 'minute');
  } else if (Math.abs(diffHour) < 24) {
    return rtf.format(diffHour, 'hour');
  } else if (Math.abs(diffDay) < 7) {
    return rtf.format(diffDay, 'day');
  } else if (Math.abs(diffWeek) < 4) {
    return rtf.format(diffWeek, 'week');
  } else if (Math.abs(diffMonth) < 12) {
    return rtf.format(diffMonth, 'month');
  } else {
    return rtf.format(diffYear, 'year');
  }
}

/**
 * Get the locale config for a language
 *
 * @param language - Language code
 * @returns Locale configuration
 */
export function getLocaleConfig(language: string): LocaleConfig {
  if (language in DEFAULT_LOCALE_CONFIGS) {
    return DEFAULT_LOCALE_CONFIGS[language as LanguageCode];
  }
  return DEFAULT_LOCALE_CONFIGS.en;
}

/**
 * Get the number format locale from language code
 *
 * @param language - Language code (e.g., 'en', 'de')
 * @returns Full locale string (e.g., 'en-US', 'de-DE')
 */
export function getNumberFormatLocale(language: string): string {
  const metadata = LANGUAGE_METADATA[language as LanguageCode];
  return metadata?.numberFormat || 'en-US';
}

/**
 * Parse a localized number string back to number
 *
 * @param value - Localized number string
 * @param locale - Locale used for formatting
 * @returns Parsed number or NaN if invalid
 */
export function parseLocalizedNumber(value: string, locale: string): number {
  // Get the decimal and group separators for the locale
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  const decimalSep = parts.find(p => p.type === 'decimal')?.value || '.';
  const groupSep = parts.find(p => p.type === 'group')?.value || ',';

  // Remove group separators and replace decimal separator with '.'
  const normalized = value
    .replace(new RegExp(`\\${groupSep}`, 'g'), '')
    .replace(decimalSep, '.');

  return parseFloat(normalized);
}

/**
 * Localization service class for reusable formatting
 */
export class LocalizationFormatter {
  private readonly locale: string;
  private readonly datePattern: string;

  constructor(locale: string, datePattern?: string) {
    this.locale = locale;
    this.datePattern = datePattern || 'YYYY-MM-DD';
  }

  date(value: Date | string | number): string {
    return formatDate(value, this.datePattern);
  }

  dateLocale(value: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
    return formatDateLocale(value, this.locale, options);
  }

  dateTime(value: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
    return formatDateTime(value, this.locale, options);
  }

  number(value: number, options?: Intl.NumberFormatOptions): string {
    return formatNumber(value, this.locale, options);
  }

  currency(value: number, currency?: string, options?: Intl.NumberFormatOptions): string {
    return formatCurrency(value, this.locale, currency, options);
  }

  percent(value: number, options?: Intl.NumberFormatOptions): string {
    return formatPercent(value, this.locale, options);
  }

  fileSize(bytes: number): string {
    return formatFileSize(bytes, this.locale);
  }

  relativeTime(value: Date | string | number, now?: Date): string {
    return formatRelativeTime(value, this.locale, now);
  }

  parseNumber(value: string): number {
    return parseLocalizedNumber(value, this.locale);
  }
}
