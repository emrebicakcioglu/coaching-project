/**
 * JWT Authentication Guard
 * STORY-003A: User CRUD Backend API
 *
 * Guards endpoints that require authentication.
 * Validates JWT tokens and attaches user info to request.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard)
 * @Get()
 * async protectedEndpoint(@Req() req: AuthenticatedRequest) {
 *   console.log(req.user.id);
 * }
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as crypto from 'crypto';

/**
 * Metadata key for public routes (skip authentication)
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark routes as public (no authentication required)
 */
import { SetMetadata } from '@nestjs/common';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * JWT Token Payload interface
 */
export interface JwtPayload {
  sub: number;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Authenticated user interface attached to request
 */
export interface AuthenticatedUser {
  id: number;
  email: string;
}

/**
 * Extended Request interface with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  requestId?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwtSecret: string;

  constructor(private readonly reflector: Reflector) {
    this.jwtSecret = process.env.JWT_SECRET || '';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    const payload = this.decodeAndVerifyToken(token);

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Attach user info to request
    (request as AuthenticatedRequest).user = {
      id: payload.sub,
      email: payload.email,
    };

    return true;
  }

  /**
   * Extract Bearer token from Authorization header
   */
  private extractTokenFromHeader(request: Request): string | null {
    const authorization = request.headers.authorization;

    if (!authorization) {
      return null;
    }

    const [type, token] = authorization.split(' ');

    if (type !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }

  /**
   * Decode and verify JWT token
   */
  private decodeAndVerifyToken(token: string): JwtPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const [encodedHeader, encodedPayload, signature] = parts;

      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', this.jwtSecret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');

      if (signature !== expectedSignature) {
        return null;
      }

      // Decode payload
      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString(),
      ) as JwtPayload;

      // Check expiration
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }
}
