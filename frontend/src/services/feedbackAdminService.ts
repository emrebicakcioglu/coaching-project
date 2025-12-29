/**
 * Feedback Admin Service
 * STORY-041H: Feedback Admin Page
 *
 * Service for managing feedback submissions in the admin panel including:
 * - Listing feedback submissions with pagination
 * - Viewing feedback details
 * - Deleting feedback submissions
 * - Creating Jira tickets from feedback
 * - Downloading screenshots
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
 * Feedback list item interface (for table display)
 */
export interface FeedbackListItem {
  id: number;
  userId: number;
  userEmail: string;
  userName: string;
  comment: string;
  commentPreview: string;
  route: string;
  hasScreenshot: boolean;
  createdAt: string;
  jiraIssueKey?: string;
  jiraIssueUrl?: string;
}

/**
 * Feedback detail interface (for modal display)
 */
export interface FeedbackDetail extends FeedbackListItem {
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  deviceType: string;
  screenResolution: string;
  language: string;
  timezone: string;
  jiraCreatedAt?: string;
}

/**
 * Pagination interface
 */
export interface FeedbackPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/**
 * Paginated feedback response
 */
export interface PaginatedFeedbackResponse {
  data: FeedbackListItem[];
  pagination: FeedbackPagination;
}

/**
 * Screenshot URL response
 */
export interface ScreenshotUrlResponse {
  url: string;
  expiresAt?: string;
}

/**
 * Jira ticket creation response
 */
export interface JiraTicketResponse {
  issueKey: string;
  issueUrl: string;
  message: string;
}

/**
 * Jira configuration status
 */
export interface JiraConfigStatus {
  configured: boolean;
  projectKey?: string;
}

// ===========================================
// Feedback Admin Service
// ===========================================

/**
 * Feedback Admin Service
 * Provides methods for managing feedback submissions in the admin panel
 */
export const feedbackAdminService = {
  /**
   * List all feedback submissions with pagination
   *
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 20)
   * @returns Paginated list of feedback submissions
   */
  async list(page = 1, limit = 20): Promise<PaginatedFeedbackResponse> {
    try {
      const response = await axios.get<PaginatedFeedbackResponse>(
        `${API_BASE_URL}/admin/feedbacks?page=${page}&limit=${limit}`,
        createAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch feedback list:', error);
      throw error;
    }
  },

  /**
   * Get a single feedback submission by ID
   *
   * @param id - Feedback ID
   * @returns Feedback details
   */
  async getOne(id: number): Promise<FeedbackDetail> {
    try {
      const response = await axios.get<FeedbackDetail>(
        `${API_BASE_URL}/admin/feedbacks/${id}`,
        createAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch feedback ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get screenshot URL for a feedback submission
   * Returns a presigned URL for downloading the screenshot
   *
   * @param id - Feedback ID
   * @returns Screenshot URL and expiration
   */
  async getScreenshotUrl(id: number): Promise<ScreenshotUrlResponse> {
    try {
      const response = await axios.get<ScreenshotUrlResponse>(
        `${API_BASE_URL}/admin/feedbacks/${id}/screenshot`,
        createAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to get screenshot URL for feedback ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete a feedback submission
   *
   * @param id - Feedback ID
   */
  async delete(id: number): Promise<void> {
    try {
      await axios.delete(
        `${API_BASE_URL}/admin/feedbacks/${id}`,
        createAuthHeaders()
      );
    } catch (error) {
      console.error(`Failed to delete feedback ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create a Jira ticket from a feedback submission
   *
   * @param id - Feedback ID
   * @param deleteAfter - Whether to delete the feedback after creating the ticket
   * @returns Created Jira ticket information
   */
  async createJiraTicket(id: number, deleteAfter = false): Promise<JiraTicketResponse> {
    try {
      const response = await axios.post<JiraTicketResponse>(
        `${API_BASE_URL}/admin/feedbacks/${id}/jira`,
        { deleteAfterCreation: deleteAfter },
        createAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to create Jira ticket for feedback ${id}:`, error);
      throw error;
    }
  },

  /**
   * Check if Jira is configured
   *
   * @returns Jira configuration status
   */
  async checkJiraConfig(): Promise<JiraConfigStatus> {
    try {
      const response = await axios.get<JiraConfigStatus>(
        `${API_BASE_URL}/admin/jira/status`,
        createAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Failed to check Jira configuration:', error);
      // Return not configured on error
      return { configured: false };
    }
  },

  /**
   * Get thumbnail URL for a feedback screenshot
   * Used for displaying in the list view
   *
   * @param id - Feedback ID
   * @returns Thumbnail URL
   */
  async getThumbnailUrl(id: number): Promise<string> {
    try {
      const response = await axios.get<ScreenshotUrlResponse>(
        `${API_BASE_URL}/admin/feedbacks/${id}/thumbnail`,
        createAuthHeaders()
      );
      return response.data.url;
    } catch (error) {
      console.error(`Failed to get thumbnail URL for feedback ${id}:`, error);
      // Return empty string to show placeholder
      return '';
    }
  },
};

export default feedbackAdminService;
