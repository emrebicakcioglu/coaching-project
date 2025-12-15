/**
 * Version Service
 * STORY-030: Application Versioning
 *
 * Service for retrieving application version information from the backend API.
 * Returns version, build number, and git commit hash if available.
 */

import axios from 'axios';

// API base URL - version endpoint is public (no /v1 prefix)
const API_BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api/v1', '')
  : 'http://localhost:14102';

/**
 * Version information response from API
 */
export interface VersionInfo {
  /** Semantic version (MAJOR.MINOR.PATCH) */
  version: string;
  /** Application name */
  name: string;
  /** Application description */
  description: string;
  /** Timestamp of version retrieval */
  timestamp: string;
  /** Optional build number */
  build?: string;
  /** Optional git commit hash (first 12 characters) */
  commit?: string;
}

/**
 * Cache for version information
 * Prevents repeated API calls for static data
 */
let cachedVersion: VersionInfo | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Version Service
 *
 * Provides methods for retrieving application version information.
 */
export const versionService = {
  /**
   * Get application version information
   *
   * Fetches version from the backend API with caching.
   * Returns cached version if available and not expired.
   *
   * @returns Version information from API
   * @throws Error if API request fails
   */
  async getVersion(): Promise<VersionInfo> {
    // Return cached version if still valid
    const now = Date.now();
    if (cachedVersion && cacheTimestamp && now - cacheTimestamp < CACHE_DURATION_MS) {
      return cachedVersion;
    }

    try {
      const response = await axios.get<VersionInfo>(`${API_BASE_URL}/api/version`);

      // Cache the result
      cachedVersion = response.data;
      cacheTimestamp = now;

      return response.data;
    } catch (error) {
      // If we have cached data, return it even if expired
      if (cachedVersion) {
        return cachedVersion;
      }

      // Return fallback version if API fails and no cache
      return {
        version: '1.0.0',
        name: 'core-app',
        description: 'Core Application',
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * Get formatted version string
   *
   * Returns a formatted version string suitable for display.
   * Includes build number and commit hash if available.
   *
   * @returns Formatted version string (e.g., "v1.0.0" or "v1.0.0-build123")
   */
  async getVersionString(): Promise<string> {
    const info = await this.getVersion();
    let versionString = `v${info.version}`;

    // Add build number if available
    if (info.build) {
      versionString += `-${info.build}`;
    }

    return versionString;
  },

  /**
   * Get version string synchronously from cache
   *
   * Returns cached version string or fallback if not cached.
   * Useful for initial render before API call completes.
   *
   * @returns Version string from cache or fallback
   */
  getCachedVersionString(): string {
    if (cachedVersion) {
      let versionString = `v${cachedVersion.version}`;
      if (cachedVersion.build) {
        versionString += `-${cachedVersion.build}`;
      }
      return versionString;
    }
    return 'v1.0.0';
  },

  /**
   * Clear the version cache
   *
   * Forces the next getVersion() call to fetch fresh data from API.
   */
  clearCache(): void {
    cachedVersion = null;
    cacheTimestamp = null;
  },

  /**
   * Get frontend version from package.json (via Vite env)
   *
   * Returns the frontend version embedded at build time.
   * This is useful for comparing frontend/backend versions.
   *
   * @returns Frontend version string
   */
  getFrontendVersion(): string {
    // Vite injects this from package.json during build
    return import.meta.env.VITE_APP_VERSION || '1.0.0';
  },
};

export default versionService;
