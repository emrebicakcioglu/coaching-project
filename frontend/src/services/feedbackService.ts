/**
 * Feedback Service
 * STORY-041F: Feedback Trigger UI
 * STORY-041G: Feedback Modal UI
 *
 * Service for managing feedback feature including:
 * - Checking feedback feature flag status
 * - Fetching feature toggle states
 * - Submitting feedback with screenshot
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
 * Feature data interface
 */
export interface FeatureData {
  enabled: boolean;
  name: string;
  description: string;
  category: string;
}

/**
 * Feature response interface
 */
export interface FeatureResponse {
  key: string;
  enabled: boolean;
  name: string;
  description: string;
  category: string;
}

/**
 * Features list response interface
 */
export interface FeaturesListResponse {
  features: FeatureResponse[];
  count: number;
}

/**
 * Feature enabled check response
 */
export interface FeatureEnabledResponse {
  key: string;
  enabled: boolean;
}

// ===========================================
// STORY-041G: Feedback Submission Types
// ===========================================

/**
 * Feedback submission request data
 */
export interface SubmitFeedbackRequest {
  /** Base64 encoded screenshot image */
  screenshot: string;
  /** User feedback comment/message */
  comment: string;
  /** Current page URL where feedback was submitted */
  url?: string;
  /** Screen resolution (e.g., "1920x1080") */
  screenResolution?: string;
  /** Browser language code (e.g., "en-US") */
  language?: string;
  /** User timezone (e.g., "Europe/Berlin") */
  timezone?: string;
  /** Browser and device information */
  browserInfo?: string;
}

/**
 * Feedback submission response
 */
export interface SubmitFeedbackResponse {
  /** Success message */
  message: string;
  /** Unique identifier of the feedback submission */
  id?: number;
  /** Indicates if feedback was queued for async processing */
  queued?: boolean;
  /** Indicates if screenshot was stored */
  screenshotStored?: boolean;
}

// ===========================================
// Feedback Service
// ===========================================

/**
 * Feedback Service
 * Provides methods for checking feedback feature status
 */
export const feedbackService = {
  /**
   * Check if feedback feature is enabled
   * Uses public endpoint (no auth required)
   *
   * @returns Whether feedback feature is enabled
   */
  async isFeedbackEnabled(): Promise<boolean> {
    try {
      const response = await axios.get<FeatureEnabledResponse>(
        `${API_BASE_URL}/features/feedback/enabled`
      );
      return response.data.enabled;
    } catch (error) {
      console.error('Failed to check feedback feature status:', error);
      // Default to disabled on error
      return false;
    }
  },

  /**
   * Get all public features
   * Uses public endpoint (no auth required)
   *
   * @returns Public features list
   */
  async getPublicFeatures(): Promise<FeaturesListResponse> {
    try {
      const response = await axios.get<FeaturesListResponse>(
        `${API_BASE_URL}/features/public`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get public features:', error);
      return { features: [], count: 0 };
    }
  },

  /**
   * Get all features (authenticated)
   * Requires authentication
   *
   * @returns All features list
   */
  async getAllFeatures(): Promise<FeaturesListResponse> {
    try {
      const response = await axios.get<FeaturesListResponse>(
        `${API_BASE_URL}/features`,
        createAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get features:', error);
      return { features: [], count: 0 };
    }
  },

  /**
   * Check if a specific feature is enabled
   * Uses public endpoint (no auth required)
   *
   * @param featureKey - The feature key to check
   * @returns Whether the feature is enabled
   */
  async isFeatureEnabled(featureKey: string): Promise<boolean> {
    try {
      const response = await axios.get<FeatureEnabledResponse>(
        `${API_BASE_URL}/features/${encodeURIComponent(featureKey)}/enabled`
      );
      return response.data.enabled;
    } catch (error) {
      console.error(`Failed to check ${featureKey} feature status:`, error);
      // Default to disabled on error
      return false;
    }
  },

  // ===========================================
  // STORY-041G: Feedback Submission
  // ===========================================

  /**
   * Submit user feedback with screenshot
   * Requires authentication
   *
   * @param data - Feedback submission data including screenshot and comment
   * @returns Submission response with success status
   * @throws Error if submission fails
   */
  async submitFeedback(data: SubmitFeedbackRequest): Promise<SubmitFeedbackResponse> {
    const response = await axios.post<SubmitFeedbackResponse>(
      `${API_BASE_URL.replace('/api/v1', '')}/api/feedback`,
      data,
      createAuthHeaders()
    );
    return response.data;
  },
};

export default feedbackService;
