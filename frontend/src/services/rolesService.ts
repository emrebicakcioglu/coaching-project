/**
 * Roles Service
 * STORY-007B: User Role Assignment
 * STORY-025B: Roles Management UI
 *
 * Service for handling roles API calls including CRUD operations.
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:14102/api/v1';

// Token storage keys (shared with authService)
const ACCESS_TOKEN_KEY = 'access_token';

/**
 * Permission interface
 */
export interface Permission {
  id: number;
  name: string;
  description?: string | null;
  category?: string | null;
}

/**
 * Role interface
 */
export interface Role {
  id: number;
  name: string;
  description?: string | null;
  is_system?: boolean;
  created_at: string;
  permissions?: Permission[];
  userCount?: number;
}

/**
 * DTO for creating a new role
 */
export interface CreateRoleDto {
  name: string;
  description?: string;
  permissionIds?: number[];
}

/**
 * DTO for updating an existing role
 */
export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissionIds?: number[];
}

/**
 * Response from delete operation
 */
export interface DeleteRoleResponse {
  message: string;
  role: Role;
}

/**
 * Grouped permissions response
 */
export interface GroupedPermissionsResponse {
  categories: Record<string, Permission[]>;
  total: number;
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
      const token = accessToken || localStorage.getItem(ACCESS_TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  return client;
};

// Create the API client instance
const apiClient = createApiClient();

/**
 * Roles Service
 * Provides roles API methods including CRUD operations
 */
export const rolesService = {
  /**
   * List all roles
   */
  async listRoles(): Promise<Role[]> {
    const response = await apiClient.get<Role[]>('/roles');
    return response.data;
  },

  /**
   * Get a single role by ID
   */
  async getRole(id: number): Promise<Role> {
    const response = await apiClient.get<Role>(`/roles/${id}`);
    return response.data;
  },

  /**
   * Create a new role
   * @param data - Role data to create
   * @returns Created role
   */
  async createRole(data: CreateRoleDto): Promise<Role> {
    const response = await apiClient.post<Role>('/roles', data);
    return response.data;
  },

  /**
   * Update an existing role
   * @param id - Role ID to update
   * @param data - Role data to update
   * @returns Updated role
   */
  async updateRole(id: number, data: UpdateRoleDto): Promise<Role> {
    const response = await apiClient.put<Role>(`/roles/${id}`, data);
    return response.data;
  },

  /**
   * Delete a role
   * @param id - Role ID to delete
   * @returns Delete response with message and deleted role
   */
  async deleteRole(id: number): Promise<DeleteRoleResponse> {
    const response = await apiClient.delete<DeleteRoleResponse>(`/roles/${id}`);
    return response.data;
  },

  /**
   * Assign permissions to a role
   * @param id - Role ID
   * @param permissionIds - Array of permission IDs to assign
   * @returns Updated role
   */
  async assignPermissions(id: number, permissionIds: number[]): Promise<Role> {
    const response = await apiClient.post<Role>(`/roles/${id}/permissions`, { permissionIds });
    return response.data;
  },

  /**
   * Remove permissions from a role
   * @param id - Role ID
   * @param permissionIds - Array of permission IDs to remove
   * @returns Updated role
   */
  async removePermissions(id: number, permissionIds: number[]): Promise<Role> {
    const response = await apiClient.delete<Role>(`/roles/${id}/permissions`, {
      data: { permissionIds },
    });
    return response.data;
  },

  /**
   * List all permissions
   */
  async listPermissions(): Promise<Permission[]> {
    const response = await apiClient.get<Permission[]>('/permissions');
    return response.data;
  },

  /**
   * Get permissions grouped by category
   */
  async getPermissionsGrouped(): Promise<GroupedPermissionsResponse> {
    const response = await apiClient.get<GroupedPermissionsResponse>('/permissions/grouped');
    return response.data;
  },

  /**
   * Get permission categories
   */
  async getPermissionCategories(): Promise<string[]> {
    const response = await apiClient.get<string[]>('/permissions/categories');
    return response.data;
  },

  /**
   * Set access token (for synchronization with authService)
   */
  setAccessToken(token: string): void {
    accessToken = token;
  },
};

export default rolesService;
