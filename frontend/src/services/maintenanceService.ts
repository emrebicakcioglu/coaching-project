/**
 * Maintenance Service
 * STORY-034: Maintenance Mode
 *
 * Service for managing maintenance mode via API.
 */

import axios from 'axios';

// API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:14102/api/v1';

// Token storage key
const ACCESS_TOKEN_KEY = 'access_token';

/**
 * Get the current access token from storage
 */
const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

/**
 * Create axios instance with auth headers
 */
const createAuthHeaders = () => {
  const token = getAccessToken();
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
  };
};

// ===========================================
// Types & Interfaces
// ===========================================

/**
 * Maintenance status response from API
 */
export interface MaintenanceStatus {
  enabled: boolean;
  message: string;
  estimatedEndTime: string | null;
  startedAt: string | null;
}

/**
 * Update maintenance mode request
 */
export interface UpdateMaintenanceRequest {
  enabled: boolean;
  message?: string;
  estimatedDurationMinutes?: number;
}

/**
 * Maintenance update response
 */
export interface MaintenanceUpdateResponse {
  message: string;
  maintenance: MaintenanceStatus;
}

// ===========================================
// Maintenance Service
// ===========================================

/**
 * Maintenance Service
 * Provides methods for managing maintenance mode
 */
export const maintenanceService = {
  /**
   * Get current maintenance status
   * This endpoint is public
   */
  async getMaintenanceStatus(): Promise<MaintenanceStatus> {
    const response = await axios.get<MaintenanceStatus>(
      `${API_BASE_URL}/settings/maintenance`,
    );
    return response.data;
  },

  /**
   * Update maintenance mode
   * Admin only
   */
  async updateMaintenanceMode(
    data: UpdateMaintenanceRequest,
  ): Promise<MaintenanceStatus> {
    const response = await axios.put<MaintenanceStatus>(
      `${API_BASE_URL}/settings/maintenance`,
      data,
      createAuthHeaders(),
    );
    return response.data;
  },

  /**
   * Enable maintenance mode
   * Admin only
   */
  async enableMaintenanceMode(
    message?: string,
    durationMinutes?: number,
  ): Promise<MaintenanceStatus> {
    return this.updateMaintenanceMode({
      enabled: true,
      message,
      estimatedDurationMinutes: durationMinutes,
    });
  },

  /**
   * Disable maintenance mode
   * Admin only
   */
  async disableMaintenanceMode(): Promise<MaintenanceStatus> {
    return this.updateMaintenanceMode({
      enabled: false,
    });
  },
};

export default maintenanceService;
