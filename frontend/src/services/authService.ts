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
 */
export interface LoginErrorWithCaptcha {
  message: string;
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
 */
let accessToken: string | null = null;

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
      if (accessToken && config.headers) {
        config.headers.Authorization = `Bearer ${accessToken}`;
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
   */
  isAuthenticated(): boolean {
    return !!accessToken || !!localStorage.getItem(REFRESH_TOKEN_KEY);
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
   */
  parseCaptchaFromError(error: unknown): LoginErrorWithCaptcha | null {
    if (axios.isAxiosError(error) && error.response?.data) {
      const data = error.response.data;
      if (data.requiresCaptcha) {
        return {
          message: data.message || 'CAPTCHA erforderlich',
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
