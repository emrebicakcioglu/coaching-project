/**
 * Users Service
 * STORY-007B: User Role Assignment
 *
 * Service for handling user management API calls including
 * role assignment, user CRUD operations, and permission queries.
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:14102/api/v1';

// Token storage keys (shared with authService)
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

/**
 * Role interface
 */
export interface Role {
  id: number;
  name: string;
  description?: string | null;
}

/**
 * User interface
 */
export interface User {
  id: number;
  email: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended' | 'deleted';
  mfa_enabled: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string | null;
  deleted_at?: string | null;
  roles?: Role[];
}

/**
 * User with permissions interface
 * STORY-007B: User Role Assignment
 */
export interface UserWithPermissions extends User {
  permissions: string[];
}

/**
 * Pagination interface
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

/**
 * List users query parameters
 */
export interface ListUsersParams {
  page?: number;
  limit?: number;
  sort?: string;
  status?: 'active' | 'inactive' | 'suspended' | 'deleted';
  search?: string;
  mfa_enabled?: boolean;
  role?: string;
  include_deleted?: boolean;
}

/**
 * Create user DTO
 */
export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  status?: 'active' | 'inactive' | 'suspended';
  mfa_enabled?: boolean;
  roles?: string[];
}

/**
 * Update user DTO
 */
export interface UpdateUserDto {
  email?: string;
  password?: string;
  name?: string;
  status?: 'active' | 'inactive' | 'suspended';
  mfa_enabled?: boolean;
}

/**
 * Assign roles DTO
 */
export interface AssignRolesDto {
  roles: string[];
}

/**
 * In-memory token storage
 */
let accessToken: string | null = null;

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
      // Try to get token from memory or localStorage
      const token = accessToken || localStorage.getItem(ACCESS_TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor - handle 401 errors
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      if (error.response?.status === 401) {
        // Token expired or invalid - redirect to login
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        accessToken = null;
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return client;
};

// Create the API client instance
const apiClient = createApiClient();

/**
 * Users Service
 * Provides user management API methods
 */
export const usersService = {
  /**
   * List all users with pagination and filtering
   */
  async listUsers(params?: ListUsersParams): Promise<PaginatedResponse<User>> {
    const response = await apiClient.get<PaginatedResponse<User>>('/users', { params });
    return response.data;
  },

  /**
   * Get a single user by ID
   */
  async getUser(id: number): Promise<User> {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
  },

  /**
   * Get a user with aggregated permissions
   * STORY-007B: User Role Assignment
   */
  async getUserWithPermissions(id: number): Promise<UserWithPermissions> {
    const response = await apiClient.get<UserWithPermissions>(`/users/${id}/permissions`);
    return response.data;
  },

  /**
   * Create a new user
   */
  async createUser(data: CreateUserDto): Promise<User> {
    const response = await apiClient.post<User>('/users', data);
    return response.data;
  },

  /**
   * Update a user
   */
  async updateUser(id: number, data: UpdateUserDto): Promise<User> {
    const response = await apiClient.put<User>(`/users/${id}`, data);
    return response.data;
  },

  /**
   * Delete a user (soft delete)
   */
  async deleteUser(id: number): Promise<User> {
    const response = await apiClient.delete<User>(`/users/${id}`);
    return response.data;
  },

  /**
   * Restore a deleted user
   */
  async restoreUser(id: number): Promise<User> {
    const response = await apiClient.post<User>(`/users/${id}/restore`);
    return response.data;
  },

  /**
   * Assign roles to a user
   * STORY-007B: User Role Assignment
   */
  async assignRoles(userId: number, roles: string[]): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      `/users/${userId}/roles`,
      { roles }
    );
    return response.data;
  },

  /**
   * Remove roles from a user
   * STORY-007B: User Role Assignment
   */
  async removeRoles(userId: number, roles: string[]): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `/users/${userId}/roles`,
      { data: { roles } }
    );
    return response.data;
  },

  /**
   * Admin reset user password
   */
  async resetUserPassword(id: number, newPassword: string): Promise<User> {
    const response = await apiClient.post<User>(`/users/${id}/reset-password`, {
      new_password: newPassword,
    });
    return response.data;
  },

  /**
   * Set access token (for synchronization with authService)
   */
  setAccessToken(token: string): void {
    accessToken = token;
  },

  /**
   * Clear access token
   */
  clearAccessToken(): void {
    accessToken = null;
  },
};

export default usersService;
