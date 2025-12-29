/**
 * Dashboard Service
 * STORY-103: Dashboard Page UI Audit
 *
 * Service for fetching dashboard statistics.
 * Aggregates data from multiple API endpoints.
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { logger } from './loggerService';

// API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:14102/api/v1';

// Token storage keys (shared with authService)
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

/**
 * Dashboard statistics interface
 */
export interface DashboardStats {
  totalUsers: number;
  activeSessions: number;
  totalRoles: number;
  systemHealthy: boolean;
}

/**
 * In-memory token storage
 * Initialize from localStorage to persist across page refreshes
 */
let accessToken: string | null = localStorage.getItem(ACCESS_TOKEN_KEY);

/**
 * Create Axios instance with auth interceptors
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  });

  // Request interceptor - add access token to requests
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = accessToken || localStorage.getItem(ACCESS_TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
        if (!accessToken && token) {
          accessToken = token;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor - handle 401 errors with token refresh
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
          if (!refreshToken) {
            throw new Error('No refresh token');
          }

          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          accessToken = response.data.access_token;
          localStorage.setItem(ACCESS_TOKEN_KEY, response.data.access_token);
          localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refresh_token);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          return client(originalRequest);
        } catch {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          accessToken = null;
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
};

// Create the API client instance
const apiClient = createApiClient();

/**
 * Dashboard Service
 * Provides methods to fetch dashboard statistics
 */
export const dashboardService = {
  /**
   * Fetch dashboard statistics
   * Aggregates data from users, roles, and sessions endpoints
   */
  async getStats(): Promise<DashboardStats> {
    try {
      // Fetch data in parallel for better performance
      const [usersResponse, rolesResponse, sessionsResponse] = await Promise.allSettled([
        apiClient.get('/users', { params: { limit: 1 } }),
        apiClient.get('/roles'),
        apiClient.get('/auth/sessions'),
      ]);

      // Extract total users from pagination
      let totalUsers = 0;
      if (usersResponse.status === 'fulfilled' && usersResponse.value.data?.pagination) {
        totalUsers = usersResponse.value.data.pagination.total;
      }

      // Count roles
      let totalRoles = 0;
      if (rolesResponse.status === 'fulfilled' && Array.isArray(rolesResponse.value.data)) {
        totalRoles = rolesResponse.value.data.length;
      }

      // Count active sessions
      let activeSessions = 0;
      if (sessionsResponse.status === 'fulfilled' && sessionsResponse.value.data?.sessions) {
        activeSessions = sessionsResponse.value.data.sessions.length;
      }

      // System is healthy if all requests succeeded
      const systemHealthy =
        usersResponse.status === 'fulfilled' &&
        rolesResponse.status === 'fulfilled' &&
        sessionsResponse.status === 'fulfilled';

      return {
        totalUsers,
        activeSessions,
        totalRoles,
        systemHealthy,
      };
    } catch (error) {
      // Return zeros if something went wrong
      logger.error('Failed to fetch dashboard stats', error);
      return {
        totalUsers: 0,
        activeSessions: 0,
        totalRoles: 0,
        systemHealthy: false,
      };
    }
  },

  /**
   * Set access token (for synchronization with authService)
   */
  setAccessToken(token: string): void {
    accessToken = token;
  },
};

export default dashboardService;
