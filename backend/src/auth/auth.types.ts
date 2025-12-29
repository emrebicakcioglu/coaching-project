/**
 * Auth Types
 * Shared interfaces and types for authentication services.
 *
 * Extracted from auth.service.ts during refactoring to:
 * - AuthTokenService
 * - AuthSessionService
 * - AuthPasswordService
 * - AuthRegistrationService
 */

import { Request } from 'express';

/**
 * Extended Request interface with optional user
 */
export interface AuthRequest extends Request {
  user?: { id?: number; email?: string };
  requestId?: string;
}

/**
 * JWT Token Payload
 */
export interface JwtPayload {
  sub: number;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Token generation options
 */
export interface TokenGenerationOptions {
  expiresIn?: string;
  rememberMe?: boolean;
}

/**
 * Refresh token record from database
 */
export interface RefreshTokenRecord {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  device_info: string | null;
  ip_address: string | null;
  browser: string | null;
  location: string | null;
  remember_me: boolean;
  created_at: Date;
  last_used_at: Date | null;
}
