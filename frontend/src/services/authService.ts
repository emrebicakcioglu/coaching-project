/**
 * Auth Service
 * STORY-008: Session Management mit "Remember Me"
 *
 * Service for handling authentication and session management.
 * Includes Axios interceptor for automatic token refresh.
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:14102/api/v1';

// MFA API base URL (without /v1 prefix - backend MFA routes are at /api/auth/mfa)
const MFA_API_BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api/v1', '/api')
  : 'http://localhost:14102/api';

// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

/**
 * Session interface matching backend response
 */
export interface Session {
  id: number;
  device: string;
  browser: string;
  ip: string;
  location: string | null;
  lastActivity: string;
  createdAt: string;
  current: boolean;
}

/**
 * Login request parameters
 */
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  captchaId?: string;
  captchaAnswer?: string;
}

/**
 * CAPTCHA challenge response
 * STORY-CAPTCHA: Login Security
 */
export interface CaptchaChallenge {
  captchaId: string;
  question: string;
  expiresAt: string;
}

/**
 * Login security status response
 * STORY-CAPTCHA: Login Security
 */
export interface LoginSecurityStatus {
  requiresCaptcha: boolean;
  delaySeconds: number;
  failedAttempts: number;
}

/**
 * Extended login error response with CAPTCHA info
 * STORY-CAPTCHA: Login Security
 * STORY-002-REWORK-001: Added errorCode for i18n localization
 */
export interface LoginErrorWithCaptcha {
  message: string;
  errorCode?: string;
  requiresCaptcha?: boolean;
  captcha?: CaptchaChallenge;
  delaySeconds?: number;
  failedAttempts?: number;
}

/**
 * Login response
 */
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: number;
    email: string;
    name: string;
    status: string;
  };
}

/**
 * Token refresh response
 */
export interface TokenRefreshResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Sessions list response
 */
export interface SessionsResponse {
  sessions: Session[];
}

/**
 * Terminate all sessions options
 */
export interface TerminateAllOptions {
  keepCurrent?: boolean;
}

/**
 * In-memory token storage (more secure than localStorage for access token)
 * Initialize from localStorage to persist across page refreshes
 */
let accessToken: string | null = localStorage.getItem(ACCESS_TOKEN_KEY);

/**
 * JWT Payload interface for token decoding
 */
interface JwtPayload {
  sub: number;
  email: string;
  exp: number;
  iat: number;
}

/**
 * Decode a JWT token without verification
 * Used only for reading expiration time on the client side
 */
const decodeJwt = (token: string): JwtPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    // Handle base64url encoding
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

/**
 * Check if a token is expired
 * @param token - JWT token to check
 * @param bufferSeconds - Buffer time before actual expiration (default: 60 seconds)
 * @returns true if token is expired or will expire within buffer time
 */
const isTokenExpired = (token: string | null, bufferSeconds: number = 60): boolean => {
  if (!token) return true;

  const payload = decodeJwt(token);
  if (!payload || !payload.exp) return true;

  // Check if token expires within buffer time
  const expirationTime = payload.exp * 1000; // Convert to milliseconds
  const currentTime = Date.now();
  const bufferTime = bufferSeconds * 1000;

  return currentTime >= (expirationTime - bufferTime);
};

/**
 * Get token expiration time in milliseconds
 * @returns Expiration timestamp or null if no valid token
 */
const getTokenExpirationTime = (token: string | null): number | null => {
  if (!token) return null;

  const payload = decodeJwt(token);
  if (!payload || !payload.exp) return null;

  return payload.exp * 1000; // Convert to milliseconds
};

/**
 * Event name for auth state changes
 * Components can listen to this event to react to auth changes
 */
export const AUTH_STATE_CHANGE_EVENT = 'auth-state-change';

/**
 * Dispatch auth state change event
 */
const dispatchAuthStateChange = (isAuthenticated: boolean, reason: string) => {
  window.dispatchEvent(
    new CustomEvent(AUTH_STATE_CHANGE_EVENT, {
      detail: { isAuthenticated, reason },
    })
  );
};

/**
 * Flag to prevent multiple refresh requests
 */
let isRefreshing = false;

/**
 * Queue of failed requests to retry after token refresh
 */
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

/**
 * Process the queue of failed requests
 */
const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Create Axios instance with interceptors
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true, // Include cookies for refresh token
  });

  // Request interceptor - add access token to requests
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Use in-memory token first, fall back to localStorage
      const token = accessToken || localStorage.getItem(ACCESS_TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
        // Sync in-memory token if it was retrieved from localStorage
        if (!accessToken && token) {
          accessToken = token;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor - handle 401 and auto-refresh
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      // If error is 401 and we haven't retried yet
      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        originalRequest.url !== '/auth/refresh' &&
        originalRequest.url !== '/auth/login'
      ) {
        if (isRefreshing) {
          // If already refreshing, queue this request
          return new Promise((resolve, reject) => {
            failedQueue.push({
              resolve: (token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(client(originalRequest));
              },
              reject: (err: Error) => reject(err),
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Get refresh token from storage
          const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          // Attempt to refresh the token
          const response = await axios.post<TokenRefreshResponse>(
            `${API_BASE_URL}/auth/refresh`,
            { refresh_token: refreshToken },
            { withCredentials: true }
          );

          // Store new tokens
          accessToken = response.data.access_token;
          localStorage.setItem(ACCESS_TOKEN_KEY, response.data.access_token);
          localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refresh_token);

          // Update the failed request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }

          // Process queued requests
          processQueue(null, accessToken);

          // Retry the original request
          return client(originalRequest);
        } catch (refreshError) {
          // Refresh failed - clear tokens and redirect to login
          processQueue(refreshError as Error, null);
          authService.clearTokens();

          // Dispatch auth state change event so UI can react
          dispatchAuthStateChange(false, 'token_refresh_failed');

          // Redirect to login page
          window.location.href = '/login';

          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
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
 * Auth Service
 * Provides authentication and session management methods
 */
export const authService = {
  /**
   * Login user with email and password
   * STORY-008: Supports rememberMe option
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);

    // Store tokens
    accessToken = response.data.access_token;
    localStorage.setItem(ACCESS_TOKEN_KEY, response.data.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refresh_token);

    return response.data;
  },

  /**
   * Logout user and revoke refresh token
   */
  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    try {
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refresh_token: refreshToken });
      }
    } finally {
      this.clearTokens();
    }
  },

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<TokenRefreshResponse> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post<TokenRefreshResponse>(
      `${API_BASE_URL}/auth/refresh`,
      { refresh_token: refreshToken },
      { withCredentials: true }
    );

    // Store new tokens
    accessToken = response.data.access_token;
    localStorage.setItem(ACCESS_TOKEN_KEY, response.data.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refresh_token);

    return response.data;
  },

  /**
   * Get all active sessions
   * STORY-008: Session Management
   */
  async getSessions(): Promise<SessionsResponse> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const response = await apiClient.get<SessionsResponse>('/auth/sessions', {
      data: refreshToken ? { refresh_token: refreshToken } : undefined,
    });
    return response.data;
  },

  /**
   * Terminate a specific session
   * STORY-008: Session Management
   */
  async terminateSession(sessionId: number): Promise<void> {
    await apiClient.delete(`/auth/sessions/${sessionId}`);
  },

  /**
   * Terminate all sessions
   * STORY-008: Session Management
   */
  async terminateAllSessions(options?: TerminateAllOptions): Promise<{ count: number }> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const response = await apiClient.delete<{ message: string; count: number }>(
      '/auth/sessions/all',
      {
        data: {
          refresh_token: refreshToken,
          keepCurrent: options?.keepCurrent ?? false,
        },
      }
    );

    // If not keeping current session, clear tokens
    if (!options?.keepCurrent) {
      this.clearTokens();
    }

    return { count: response.data.count };
  },

  /**
   * Clear all stored tokens
   */
  clearTokens(): void {
    accessToken = null;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Check if user is authenticated
   * IMPORTANT: Now checks token expiration, not just presence
   * This prevents users from appearing authenticated with expired tokens
   */
  isAuthenticated(): boolean {
    const token = accessToken || localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    // If access token exists and is not expired, user is authenticated
    if (token && !isTokenExpired(token, 0)) {
      return true;
    }

    // If access token is expired but refresh token exists and is not expired,
    // user can be re-authenticated (refresh will happen on next API call)
    if (refreshToken && !isTokenExpired(refreshToken, 0)) {
      return true;
    }

    return false;
  },

  /**
   * Check if access token is about to expire
   * Used for proactive token refresh before expiration
   * @param bufferSeconds - Time before expiration to consider "about to expire" (default: 60s)
   */
  isTokenAboutToExpire(bufferSeconds: number = 60): boolean {
    const token = accessToken || localStorage.getItem(ACCESS_TOKEN_KEY);
    return isTokenExpired(token, bufferSeconds);
  },

  /**
   * Get time until token expiration in milliseconds
   * @returns Time until expiration, or 0 if expired/no token
   */
  getTimeUntilExpiration(): number {
    const token = accessToken || localStorage.getItem(ACCESS_TOKEN_KEY);
    const expirationTime = getTokenExpirationTime(token);

    if (!expirationTime) return 0;

    const remaining = expirationTime - Date.now();
    return remaining > 0 ? remaining : 0;
  },

  /**
   * Force logout and redirect to login
   * Used when session has expired and cannot be recovered
   */
  forceLogout(reason: string = 'session_expired'): void {
    console.warn(`Force logout triggered: ${reason}`);
    this.clearTokens();
    dispatchAuthStateChange(false, reason);
    window.location.href = '/login';
  },

  /**
   * Get current access token (for debugging/testing)
   */
  getAccessToken(): string | null {
    return accessToken;
  },

  /**
   * Set access token (for initialization from stored state)
   */
  setAccessToken(token: string): void {
    accessToken = token;
  },
};

/**
 * Forgot password request parameters
 * STORY-009: Password Reset
 */
export interface ForgotPasswordRequest {
  email: string;
}

/**
 * Forgot password response
 * STORY-009: Password Reset
 */
export interface ForgotPasswordResponse {
  message: string;
}

/**
 * Reset password request parameters
 * STORY-009: Password Reset
 */
export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

/**
 * Reset password response
 * STORY-009: Password Reset
 */
export interface ResetPasswordResponse {
  message: string;
}

/**
 * Validate password reset token request
 * STORY-009: Password Reset
 */
export interface ValidateTokenRequest {
  token: string;
}

/**
 * Validate password reset token response
 * STORY-009: Password Reset
 */
export interface ValidateTokenResponse {
  valid: boolean;
}

/**
 * Password reset service methods
 * STORY-009: Password Reset
 */
export const passwordResetService = {
  /**
   * Request a password reset email
   * STORY-009: Password Reset
   *
   * Note: The API always returns success to prevent email enumeration attacks.
   * This means we cannot determine if the email actually exists.
   */
  async forgotPassword(request: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    const response = await axios.post<ForgotPasswordResponse>(
      `${API_BASE_URL}/auth/forgot-password`,
      request
    );
    return response.data;
  },

  /**
   * Reset password with a valid token
   * STORY-009: Password Reset
   */
  async resetPassword(request: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    const response = await axios.post<ResetPasswordResponse>(
      `${API_BASE_URL}/auth/reset-password`,
      request
    );
    return response.data;
  },

  /**
   * Validate a password reset token
   * STORY-009: Password Reset
   *
   * Note: This attempts to make a request to check if the token is valid.
   * The backend doesn't have a dedicated validate endpoint, so this uses
   * a workaround by attempting to reset with an empty password.
   * For now, we'll assume the token is valid and let the actual reset
   * call handle validation.
   */
  validateToken(_token: string): boolean {
    // Token validation happens on the backend during reset
    // We can do basic format checks here
    return _token && _token.length === 64; // Expected token length (32 bytes hex = 64 chars)
  },
};

export default authService;

// ===========================================
// Registration Service (STORY-023)
// ===========================================

/**
 * Registration request parameters
 * STORY-023: User Registration
 */
export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
  passwordConfirm: string;
}

/**
 * Registration response
 * STORY-023: User Registration
 */
export interface RegisterResponse {
  message: string;
  userId: number;
}

/**
 * Verify email response
 * STORY-023: User Registration
 */
export interface VerifyEmailResponse {
  message: string;
}

/**
 * Resend verification request
 * STORY-023: User Registration
 */
export interface ResendVerificationRequest {
  email: string;
}

/**
 * Resend verification response
 * STORY-023: User Registration
 */
export interface ResendVerificationResponse {
  message: string;
}

/**
 * Registration service methods
 * STORY-023: User Registration
 */
export const registrationService = {
  /**
   * Register a new user
   * STORY-023: User Registration
   */
  async register(request: RegisterRequest): Promise<RegisterResponse> {
    const response = await axios.post<RegisterResponse>(
      `${API_BASE_URL}/auth/register`,
      request
    );
    return response.data;
  },

  /**
   * Verify email address
   * STORY-023: User Registration
   */
  async verifyEmail(token: string): Promise<VerifyEmailResponse> {
    const response = await axios.get<VerifyEmailResponse>(
      `${API_BASE_URL}/auth/verify-email`,
      { params: { token } }
    );
    return response.data;
  },

  /**
   * Resend verification email
   * STORY-023: User Registration
   */
  async resendVerification(request: ResendVerificationRequest): Promise<ResendVerificationResponse> {
    const response = await axios.post<ResendVerificationResponse>(
      `${API_BASE_URL}/auth/resend-verification`,
      request
    );
    return response.data;
  },
};


// ===========================================
// CAPTCHA Service (STORY-CAPTCHA)
// ===========================================

/**
 * CAPTCHA Service
 * STORY-CAPTCHA: Login Security
 *
 * Provides methods for CAPTCHA challenge and login security status.
 */
export const captchaService = {
  /**
   * Get login security status
   * Checks if CAPTCHA is required for the current IP
   */
  async getLoginStatus(): Promise<LoginSecurityStatus> {
    const response = await axios.get<LoginSecurityStatus>(
      `${API_BASE_URL}/auth/login-status`
    );
    return response.data;
  },

  /**
   * Get a new CAPTCHA challenge
   */
  async getCaptcha(): Promise<CaptchaChallenge> {
    const response = await axios.get<CaptchaChallenge>(
      `${API_BASE_URL}/auth/captcha`
    );
    return response.data;
  },

  /**
   * Parse CAPTCHA info from error response
   * STORY-002-REWORK-001: Updated to include errorCode for i18n localization
   */
  parseCaptchaFromError(error: unknown): LoginErrorWithCaptcha | null {
    if (axios.isAxiosError(error) && error.response?.data) {
      const data = error.response.data;
      if (data.requiresCaptcha) {
        return {
          message: data.message || 'CAPTCHA_REQUIRED',
          errorCode: data.errorCode || data.message,
          requiresCaptcha: true,
          captcha: data.captcha,
          delaySeconds: data.delaySeconds,
          failedAttempts: data.failedAttempts,
        };
      }
    }
    return null;
  },
};

// ===========================================
// MFA Service (STORY-005C)
// ===========================================

/**
 * MFA Setup initiation response
 * STORY-005C: MFA UI (Frontend)
 */
export interface MFASetupResponse {
  /** QR code data URL for authenticator app scanning */
  qrCodeUrl: string;
  /** Secret key for manual entry */
  secret: string;
  /** Backup codes for account recovery */
  backupCodes: string[];
}

/**
 * MFA Setup verification request
 * STORY-005C: MFA UI (Frontend)
 */
export interface MFAVerifySetupRequest {
  /** 6-digit TOTP code from authenticator app */
  code: string;
}

/**
 * MFA Login verification request
 * STORY-005C: MFA UI (Frontend)
 */
export interface MFAVerifyLoginRequest {
  /** Temporary token from initial login */
  tempToken: string;
  /** 6-digit TOTP code from authenticator app */
  code: string;
}

/**
 * MFA Backup code verification request
 * STORY-005C: MFA UI (Frontend)
 */
export interface MFAVerifyBackupCodeRequest {
  /** Temporary token from initial login */
  tempToken: string;
  /** 8-character backup code */
  backupCode: string;
}

/**
 * MFA Login verification response
 * STORY-005C: MFA UI (Frontend)
 */
export interface MFAVerifyLoginResponse {
  /** Access token */
  access_token: string;
  /** Refresh token */
  refresh_token: string;
  /** Token type (usually "Bearer") */
  token_type: string;
  /** Token expiry in seconds */
  expires_in: number;
  /** User information */
  user: {
    id: number;
    email: string;
    name: string;
    status: string;
  };
}

/**
 * MFA Status response
 * STORY-005C: MFA UI (Frontend)
 */
export interface MFAStatusResponse {
  /** Whether MFA is enabled for the user */
  mfaEnabled: boolean;
  /** Number of remaining backup codes */
  backupCodesRemaining?: number;
}

/**
 * MFA Disable request
 * STORY-005C: MFA UI (Frontend)
 */
export interface MFADisableRequest {
  /** Current password for verification */
  password: string;
  /** 6-digit TOTP code for verification */
  code: string;
}

/**
 * MFA Service
 * STORY-005C: MFA UI (Frontend)
 *
 * Provides methods for MFA setup, verification, and management.
 * Note: MFA endpoints use /api/auth/mfa/* (without /v1 prefix)
 */
export const mfaService = {
  /**
   * Initiate MFA setup
   * Returns QR code, secret, and backup codes
   */
  async initiateMFASetup(): Promise<MFASetupResponse> {
    // MFA endpoints are at /api/auth/mfa/* (without /v1)
    const token = accessToken || localStorage.getItem(ACCESS_TOKEN_KEY);
    const response = await axios.post<MFASetupResponse>(
      `${MFA_API_BASE_URL}/auth/mfa/setup`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        withCredentials: true,
      }
    );
    return response.data;
  },

  /**
   * Verify MFA setup with TOTP code
   * Enables MFA for the user account
   */
  async verifyMFASetup(code: string): Promise<void> {
    // MFA endpoints are at /api/auth/mfa/* (without /v1)
    const token = accessToken || localStorage.getItem(ACCESS_TOKEN_KEY);
    await axios.post(
      `${MFA_API_BASE_URL}/auth/mfa/verify-setup`,
      { code },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        withCredentials: true,
      }
    );
  },

  /**
   * Verify MFA code during login
   * Returns full authentication tokens
   */
  async verifyMFALogin(request: MFAVerifyLoginRequest): Promise<MFAVerifyLoginResponse> {
    // MFA endpoints are at /api/auth/mfa/* (without /v1)
    const response = await axios.post<MFAVerifyLoginResponse>(
      `${MFA_API_BASE_URL}/auth/mfa/verify-login`,
      request
    );

    // Store tokens on successful verification
    accessToken = response.data.access_token;
    localStorage.setItem(ACCESS_TOKEN_KEY, response.data.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refresh_token);

    return response.data;
  },

  /**
   * Verify backup code during login
   * Returns full authentication tokens
   */
  async verifyBackupCode(request: MFAVerifyBackupCodeRequest): Promise<MFAVerifyLoginResponse> {
    // MFA endpoints are at /api/auth/mfa/* (without /v1)
    const response = await axios.post<MFAVerifyLoginResponse>(
      `${MFA_API_BASE_URL}/auth/mfa/verify-backup-code`,
      request
    );

    // Store tokens on successful verification
    accessToken = response.data.access_token;
    localStorage.setItem(ACCESS_TOKEN_KEY, response.data.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refresh_token);

    return response.data;
  },

  /**
   * Get MFA status for current user
   */
  async getMFAStatus(): Promise<MFAStatusResponse> {
    // MFA endpoints are at /api/auth/mfa/* (without /v1)
    const token = accessToken || localStorage.getItem(ACCESS_TOKEN_KEY);
    const response = await axios.get<MFAStatusResponse>(
      `${MFA_API_BASE_URL}/auth/mfa/status`,
      {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
        withCredentials: true,
      }
    );
    return response.data;
  },

  /**
   * Disable MFA for current user
   * Requires password and current TOTP code for security
   */
  async disableMFA(request: MFADisableRequest): Promise<void> {
    // MFA endpoints are at /api/auth/mfa/* (without /v1)
    const token = accessToken || localStorage.getItem(ACCESS_TOKEN_KEY);
    await axios.post(
      `${MFA_API_BASE_URL}/auth/mfa/disable`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        withCredentials: true,
      }
    );
  },

  /**
   * Regenerate backup codes
   * Invalidates all existing backup codes
   */
  async regenerateBackupCodes(): Promise<{ backupCodes: string[] }> {
    // MFA endpoints are at /api/auth/mfa/* (without /v1)
    const token = accessToken || localStorage.getItem(ACCESS_TOKEN_KEY);
    const response = await axios.post<{ backupCodes: string[] }>(
      `${MFA_API_BASE_URL}/auth/mfa/regenerate-backup-codes`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        withCredentials: true,
      }
    );
    return response.data;
  },
};
