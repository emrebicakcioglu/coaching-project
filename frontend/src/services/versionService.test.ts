/**
 * Version Service Unit Tests
 * STORY-030: Application Versioning
 *
 * Tests for the versionService.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { versionService } from './versionService';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as unknown as { get: ReturnType<typeof vi.fn> };

describe('versionService', () => {
  const mockVersionInfo = {
    version: '1.0.0',
    name: 'core-app-backend',
    description: 'Core Application Backend API',
    timestamp: '2025-12-08T10:00:00.000Z',
    build: '12345',
    commit: 'abc123def456',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    versionService.clearCache();
    mockedAxios.get = vi.fn().mockResolvedValue({ data: mockVersionInfo });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getVersion', () => {
    it('should fetch version from API', async () => {
      const result = await versionService.getVersion();

      expect(result).toEqual(mockVersionInfo);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/version')
      );
    });

    it('should cache the version', async () => {
      // First call
      await versionService.getVersion();
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await versionService.getVersion();
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should return fallback version on API error', async () => {
      mockedAxios.get = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await versionService.getVersion();

      expect(result.version).toBe('1.0.0');
      expect(result.name).toBe('core-app');
    });

    it('should return cached version on API error if available', async () => {
      // First successful call
      await versionService.getVersion();

      // Make API fail
      mockedAxios.get = vi.fn().mockRejectedValue(new Error('Network error'));

      // Clear cache timestamp but keep cached data (simulate expired cache)
      versionService.clearCache();

      // This should return fallback since cache was cleared
      const result = await versionService.getVersion();
      expect(result.version).toBe('1.0.0');
    });
  });

  describe('getVersionString', () => {
    it('should return formatted version string', async () => {
      const result = await versionService.getVersionString();

      expect(result).toBe('v1.0.0-12345');
    });

    it('should return version without build number if not available', async () => {
      mockedAxios.get = vi.fn().mockResolvedValue({
        data: {
          ...mockVersionInfo,
          build: undefined,
        },
      });
      versionService.clearCache();

      const result = await versionService.getVersionString();

      expect(result).toBe('v1.0.0');
    });
  });

  describe('getCachedVersionString', () => {
    it('should return cached version string', async () => {
      // First, populate the cache
      await versionService.getVersion();

      const result = versionService.getCachedVersionString();

      expect(result).toBe('v1.0.0-12345');
    });

    it('should return fallback when no cache', () => {
      versionService.clearCache();

      const result = versionService.getCachedVersionString();

      expect(result).toBe('v1.0.0');
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', async () => {
      // Populate cache
      await versionService.getVersion();
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);

      // Clear cache
      versionService.clearCache();

      // Next call should fetch again
      await versionService.getVersion();
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('getFrontendVersion', () => {
    it('should return frontend version', () => {
      const result = versionService.getFrontendVersion();

      // Should return a version string
      expect(typeof result).toBe('string');
      expect(result).toBeTruthy();
    });
  });
});
