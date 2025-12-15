/**
 * Theme Service Unit Tests
 * STORY-017B: Theme-System Frontend
 *
 * Tests for the themeService.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { themeService, DEFAULT_THEME_COLORS, ThemeColors } from './themeService';

// Create mock functions
const mockGet = vi.fn();
const mockPut = vi.fn();

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: mockGet,
      put: mockPut,
      interceptors: {
        request: {
          use: vi.fn(),
        },
      },
    })),
  },
}));

describe('themeService', () => {
  const mockThemeColors: ThemeColors = {
    primary: '#ff0000',
    secondary: '#00ff00',
    background: {
      page: '#ffffff',
      card: '#f5f5f5',
    },
    text: {
      primary: '#000000',
      secondary: '#666666',
    },
    status: {
      success: '#00ff00',
      warning: '#ffff00',
      error: '#ff0000',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    themeService.clearCache();
    localStorage.clear();
    mockGet.mockResolvedValue({ data: mockThemeColors });
    mockPut.mockResolvedValue({ data: mockThemeColors });
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('getThemeColors', () => {
    it('should fetch theme colors from API', async () => {
      const result = await themeService.getThemeColors();

      expect(result).toEqual(mockThemeColors);
      expect(mockGet).toHaveBeenCalledWith('/settings/theme');
    });

    it('should cache theme colors in localStorage', async () => {
      await themeService.getThemeColors();

      const cached = localStorage.getItem('app_theme_colors');
      expect(cached).toBeTruthy();
      expect(JSON.parse(cached!)).toEqual(mockThemeColors);
    });

    it('should return cached theme on API error', async () => {
      // First, cache some theme colors
      localStorage.setItem('app_theme_colors', JSON.stringify(mockThemeColors));

      // Make API fail
      mockGet.mockRejectedValueOnce(new Error('Network error'));

      const result = await themeService.getThemeColors();

      expect(result).toEqual(mockThemeColors);
    });

    it('should return default theme when API fails and no cache', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'));

      const result = await themeService.getThemeColors();

      expect(result).toEqual(DEFAULT_THEME_COLORS);
    });
  });

  describe('updateThemeColors', () => {
    it('should update theme colors via API', async () => {
      const updateDto = { primary: '#0000ff' };
      const updatedColors = { ...mockThemeColors, primary: '#0000ff' };
      mockPut.mockResolvedValueOnce({ data: updatedColors });

      const result = await themeService.updateThemeColors(updateDto);

      expect(result.primary).toBe('#0000ff');
      expect(mockPut).toHaveBeenCalledWith('/settings/theme', updateDto);
    });

    it('should update localStorage cache after update', async () => {
      const updateDto = { primary: '#0000ff' };
      const updatedColors = { ...mockThemeColors, primary: '#0000ff' };
      mockPut.mockResolvedValueOnce({ data: updatedColors });

      await themeService.updateThemeColors(updateDto);

      const cached = localStorage.getItem('app_theme_colors');
      expect(JSON.parse(cached!).primary).toBe('#0000ff');
    });
  });

  describe('getCachedTheme', () => {
    it('should return cached theme from localStorage', () => {
      localStorage.setItem('app_theme_colors', JSON.stringify(mockThemeColors));

      const result = themeService.getCachedTheme();

      expect(result).toEqual(mockThemeColors);
    });

    it('should return null when no cache', () => {
      const result = themeService.getCachedTheme();

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      localStorage.setItem('app_theme_colors', 'invalid json');

      const result = themeService.getCachedTheme();

      expect(result).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('should clear cached theme from localStorage', () => {
      localStorage.setItem('app_theme_colors', JSON.stringify(mockThemeColors));

      themeService.clearCache();

      expect(localStorage.getItem('app_theme_colors')).toBeNull();
    });
  });

  describe('getDefaultColors', () => {
    it('should return a copy of default colors', () => {
      const result = themeService.getDefaultColors();

      expect(result).toEqual(DEFAULT_THEME_COLORS);
      // Ensure it's a copy, not the same reference
      expect(result).not.toBe(DEFAULT_THEME_COLORS);
    });
  });

  describe('isValidHexColor', () => {
    it('should validate correct hex colors', () => {
      expect(themeService.isValidHexColor('#ff0000')).toBe(true);
      expect(themeService.isValidHexColor('#FF0000')).toBe(true);
      expect(themeService.isValidHexColor('#000000')).toBe(true);
      expect(themeService.isValidHexColor('#ffffff')).toBe(true);
      expect(themeService.isValidHexColor('#123abc')).toBe(true);
    });

    it('should reject invalid hex colors', () => {
      expect(themeService.isValidHexColor('ff0000')).toBe(false); // Missing #
      expect(themeService.isValidHexColor('#f00')).toBe(false); // Short form
      expect(themeService.isValidHexColor('#ff000')).toBe(false); // Too short
      expect(themeService.isValidHexColor('#ff00000')).toBe(false); // Too long
      expect(themeService.isValidHexColor('#gggggg')).toBe(false); // Invalid chars
      expect(themeService.isValidHexColor('red')).toBe(false); // Named color
      expect(themeService.isValidHexColor('')).toBe(false); // Empty
    });
  });
});
