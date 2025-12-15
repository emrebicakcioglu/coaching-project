/**
 * Localization Utilities Tests
 * STORY-018A: Standard-Sprache Backend (i18n Setup)
 *
 * Unit tests for localization utility functions:
 * - Date formatting
 * - Number formatting
 * - Currency formatting
 * - Relative time formatting
 */

import {
  formatDate,
  formatDateLocale,
  formatDateTime,
  formatNumber,
  formatCurrency,
  formatPercent,
  formatFileSize,
  formatRelativeTime,
  getLocaleConfig,
  getNumberFormatLocale,
  parseLocalizedNumber,
  LocalizationFormatter,
  DEFAULT_LOCALE_CONFIGS,
  DATE_FORMAT_PATTERNS,
  NUMBER_FORMAT_LOCALES,
} from '../../src/settings/localization.utils';

describe('Localization Utilities', () => {
  describe('Default Configurations', () => {
    it('should have English locale config', () => {
      expect(DEFAULT_LOCALE_CONFIGS.en).toEqual({
        language: 'en',
        dateFormat: 'YYYY-MM-DD',
        numberFormat: 'en-US',
      });
    });

    it('should have German locale config', () => {
      expect(DEFAULT_LOCALE_CONFIGS.de).toEqual({
        language: 'de',
        dateFormat: 'DD.MM.YYYY',
        numberFormat: 'de-DE',
      });
    });

    it('should have date format patterns', () => {
      expect(DATE_FORMAT_PATTERNS['YYYY-MM-DD']).toBeDefined();
      expect(DATE_FORMAT_PATTERNS['DD.MM.YYYY']).toBeDefined();
      expect(DATE_FORMAT_PATTERNS['MM/DD/YYYY']).toBeDefined();
    });

    it('should have number format locales', () => {
      expect(NUMBER_FORMAT_LOCALES['en-US']).toBe('1,234.56');
      expect(NUMBER_FORMAT_LOCALES['de-DE']).toBe('1.234,56');
    });
  });

  describe('formatDate', () => {
    const testDate = new Date('2025-01-15T10:30:00Z');

    it('should format date in ISO format', () => {
      const result = formatDate(testDate, 'YYYY-MM-DD');
      expect(result).toBe('2025-01-15');
    });

    it('should format date in German format', () => {
      const result = formatDate(testDate, 'DD.MM.YYYY');
      expect(result).toBe('15.01.2025');
    });

    it('should format date in US format', () => {
      const result = formatDate(testDate, 'MM/DD/YYYY');
      expect(result).toBe('01/15/2025');
    });

    it('should handle date with time', () => {
      const result = formatDate(testDate, 'YYYY-MM-DD HH:mm:ss');
      expect(result).toMatch(/2025-01-15 \d{2}:\d{2}:\d{2}/);
    });

    it('should handle string date input', () => {
      const result = formatDate('2025-01-15', 'DD.MM.YYYY');
      expect(result).toBe('15.01.2025');
    });

    it('should handle numeric date input', () => {
      const result = formatDate(testDate.getTime(), 'YYYY-MM-DD');
      expect(result).toBe('2025-01-15');
    });

    it('should return "Invalid Date" for invalid input', () => {
      const result = formatDate('invalid', 'YYYY-MM-DD');
      expect(result).toBe('Invalid Date');
    });
  });

  describe('formatDateLocale', () => {
    const testDate = new Date('2025-01-15T10:30:00Z');

    it('should format date for en-US locale', () => {
      const result = formatDateLocale(testDate, 'en-US');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should format date for de-DE locale', () => {
      const result = formatDateLocale(testDate, 'de-DE');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should accept custom options', () => {
      const result = formatDateLocale(testDate, 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      expect(result).toContain('2025');
      expect(result).toContain('January');
    });

    it('should return "Invalid Date" for invalid input', () => {
      const result = formatDateLocale('invalid', 'en-US');
      expect(result).toBe('Invalid Date');
    });
  });

  describe('formatDateTime', () => {
    const testDate = new Date('2025-01-15T10:30:45Z');

    it('should format date and time for en-US locale', () => {
      const result = formatDateTime(testDate, 'en-US');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should format date and time for de-DE locale', () => {
      const result = formatDateTime(testDate, 'de-DE');
      expect(result).toBeDefined();
    });

    it('should return "Invalid Date" for invalid input', () => {
      const result = formatDateTime('invalid', 'en-US');
      expect(result).toBe('Invalid Date');
    });
  });

  describe('formatNumber', () => {
    it('should format number for en-US locale', () => {
      const result = formatNumber(1234567.89, 'en-US');
      expect(result).toBe('1,234,567.89');
    });

    it('should format number for de-DE locale', () => {
      const result = formatNumber(1234567.89, 'de-DE');
      expect(result).toBe('1.234.567,89');
    });

    it('should accept custom options', () => {
      const result = formatNumber(1234.5, 'en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      expect(result).toBe('1,234.50');
    });
  });

  describe('formatCurrency', () => {
    it('should format USD currency', () => {
      const result = formatCurrency(1234.56, 'en-US', 'USD');
      expect(result).toContain('$');
      expect(result).toContain('1,234.56');
    });

    it('should format EUR currency for German locale', () => {
      const result = formatCurrency(1234.56, 'de-DE', 'EUR');
      expect(result).toContain('€');
    });

    it('should use USD as default currency', () => {
      const result = formatCurrency(100, 'en-US');
      expect(result).toContain('$');
    });
  });

  describe('formatPercent', () => {
    it('should format percentage for en-US locale', () => {
      const result = formatPercent(0.75, 'en-US');
      expect(result).toBe('75%');
    });

    it('should format percentage for de-DE locale', () => {
      const result = formatPercent(0.75, 'de-DE');
      expect(result).toContain('75');
      expect(result).toContain('%');
    });

    it('should handle decimal percentages', () => {
      const result = formatPercent(0.7525, 'en-US');
      expect(result).toBe('75.25%');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      const result = formatFileSize(512, 'en-US');
      expect(result).toBe('512 B');
    });

    it('should format kilobytes', () => {
      const result = formatFileSize(1536, 'en-US');
      expect(result).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      const result = formatFileSize(1572864, 'en-US');
      expect(result).toBe('1.5 MB');
    });

    it('should format gigabytes', () => {
      const result = formatFileSize(1610612736, 'en-US');
      expect(result).toBe('1.5 GB');
    });

    it('should use locale number formatting', () => {
      const result = formatFileSize(1536, 'de-DE');
      expect(result).toContain('KB');
    });
  });

  describe('formatRelativeTime', () => {
    it('should format seconds ago', () => {
      const now = new Date();
      const past = new Date(now.getTime() - 30000); // 30 seconds ago
      const result = formatRelativeTime(past, 'en-US', now);
      expect(result).toContain('second');
    });

    it('should format minutes ago', () => {
      const now = new Date();
      const past = new Date(now.getTime() - 300000); // 5 minutes ago
      const result = formatRelativeTime(past, 'en-US', now);
      expect(result).toContain('minute');
    });

    it('should format hours ago', () => {
      const now = new Date();
      const past = new Date(now.getTime() - 7200000); // 2 hours ago
      const result = formatRelativeTime(past, 'en-US', now);
      expect(result).toContain('hour');
    });

    it('should format days ago', () => {
      const now = new Date();
      const past = new Date(now.getTime() - 172800000); // 2 days ago
      const result = formatRelativeTime(past, 'en-US', now);
      expect(result).toContain('day');
    });

    it('should format in German', () => {
      const now = new Date();
      const past = new Date(now.getTime() - 7200000); // 2 hours ago
      const result = formatRelativeTime(past, 'de-DE', now);
      expect(result).toContain('Stunde');
    });

    it('should return "Invalid Date" for invalid input', () => {
      const result = formatRelativeTime('invalid', 'en-US');
      expect(result).toBe('Invalid Date');
    });
  });

  describe('getLocaleConfig', () => {
    it('should return English config for "en"', () => {
      const config = getLocaleConfig('en');
      expect(config.language).toBe('en');
      expect(config.dateFormat).toBe('YYYY-MM-DD');
    });

    it('should return German config for "de"', () => {
      const config = getLocaleConfig('de');
      expect(config.language).toBe('de');
      expect(config.dateFormat).toBe('DD.MM.YYYY');
    });

    it('should return English config for unknown language', () => {
      const config = getLocaleConfig('unknown');
      expect(config.language).toBe('en');
    });
  });

  describe('getNumberFormatLocale', () => {
    it('should return en-US for English', () => {
      expect(getNumberFormatLocale('en')).toBe('en-US');
    });

    it('should return de-DE for German', () => {
      expect(getNumberFormatLocale('de')).toBe('de-DE');
    });

    it('should return en-US for unknown language', () => {
      expect(getNumberFormatLocale('unknown')).toBe('en-US');
    });
  });

  describe('parseLocalizedNumber', () => {
    it('should parse en-US number', () => {
      const result = parseLocalizedNumber('1,234.56', 'en-US');
      expect(result).toBe(1234.56);
    });

    it('should parse de-DE number', () => {
      const result = parseLocalizedNumber('1.234,56', 'de-DE');
      expect(result).toBe(1234.56);
    });

    it('should return NaN for invalid number', () => {
      const result = parseLocalizedNumber('invalid', 'en-US');
      expect(isNaN(result)).toBe(true);
    });
  });

  describe('LocalizationFormatter', () => {
    let enFormatter: LocalizationFormatter;
    let deFormatter: LocalizationFormatter;

    beforeEach(() => {
      enFormatter = new LocalizationFormatter('en-US', 'YYYY-MM-DD');
      deFormatter = new LocalizationFormatter('de-DE', 'DD.MM.YYYY');
    });

    it('should format date using pattern', () => {
      const date = new Date('2025-01-15');
      expect(enFormatter.date(date)).toBe('2025-01-15');
      expect(deFormatter.date(date)).toBe('15.01.2025');
    });

    it('should format number using locale', () => {
      expect(enFormatter.number(1234.56)).toBe('1,234.56');
      expect(deFormatter.number(1234.56)).toBe('1.234,56');
    });

    it('should format currency', () => {
      const result = enFormatter.currency(100, 'USD');
      expect(result).toContain('$');
      expect(result).toContain('100');
    });

    it('should format percent', () => {
      expect(enFormatter.percent(0.5)).toBe('50%');
    });

    it('should format file size', () => {
      expect(enFormatter.fileSize(1024)).toBe('1 KB');
    });

    it('should parse localized number', () => {
      expect(enFormatter.parseNumber('1,234.56')).toBe(1234.56);
      expect(deFormatter.parseNumber('1.234,56')).toBe(1234.56);
    });
  });
});
