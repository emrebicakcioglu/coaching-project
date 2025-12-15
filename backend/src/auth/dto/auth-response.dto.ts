/**
 * Auth Response DTOs
 * STORY-021B: Resource Endpoints
 * STORY-022: Swagger/OpenAPI Documentation
 * STORY-005B: MFA Login-Flow (Backend)
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

/**
 * Auth response after successful login (non-MFA user)
 * STORY-005B: Extended to support mfaRequired flag
 */
export class AuthResponseDto {
  /**
   * JWT access token
   */
  @ApiPropertyOptional({
    description: 'JWT access token (only present when mfaRequired is false)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token?: string;

  /**
   * Refresh token for obtaining new access tokens
   */
  @ApiPropertyOptional({
    description: 'Refresh token for obtaining new access tokens (only present when mfaRequired is false)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refresh_token?: string;

  /**
   * Token type (always "Bearer")
   */
  @ApiPropertyOptional({
    description: 'Token type (only present when mfaRequired is false)',
    example: 'Bearer',
    default: 'Bearer',
  })
  token_type?: string;

  /**
   * Access token expiration time in seconds
   */
  @ApiPropertyOptional({
    description: 'Access token expiration time in seconds (only present when mfaRequired is false)',
    example: 86400,
  })
  expires_in?: number;

  /**
   * Authenticated user details
   */
  @ApiPropertyOptional({
    description: 'Authenticated user details (only present when mfaRequired is false)',
    type: () => UserResponseDto,
  })
  user?: UserResponseDto;

  /**
   * STORY-005B: MFA required flag
   * When true, user must complete MFA verification
   */
  @ApiPropertyOptional({
    description: 'Indicates MFA verification is required',
    example: true,
  })
  mfaRequired?: boolean;

  /**
   * STORY-005B: Temporary token for MFA verification
   * Only present when mfaRequired is true
   */
  @ApiPropertyOptional({
    description: 'Temporary token for MFA verification (valid for 5 minutes)',
    example: 'mfa_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  tempToken?: string;

  /**
   * STORY-005B: Message for MFA requirement
   */
  @ApiPropertyOptional({
    description: 'Message (e.g., MFA verification required)',
    example: 'MFA verification required',
  })
  message?: string;
}

/**
 * Token refresh response
 */
export class TokenRefreshResponseDto {
  /**
   * New JWT access token
   */
  @ApiProperty({
    description: 'New JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  /**
   * New refresh token
   */
  @ApiProperty({
    description: 'New refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refresh_token: string;

  /**
   * Token type (always "Bearer")
   */
  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
    default: 'Bearer',
  })
  token_type: string = 'Bearer';

  /**
   * Access token expiration time in seconds
   */
  @ApiProperty({
    description: 'Access token expiration time in seconds',
    example: 86400,
  })
  expires_in: number;
}

/**
 * Logout response
 */
export class LogoutResponseDto {
  /**
   * Success message
   */
  @ApiProperty({
    description: 'Success message',
    example: 'Logged out successfully',
  })
  message: string = 'Logged out successfully';
}

/**
 * Password reset request response
 */
export class ForgotPasswordResponseDto {
  /**
   * Success message
   */
  @ApiProperty({
    description: 'Success message',
    example: 'If the email exists, a password reset link has been sent',
  })
  message: string = 'If the email exists, a password reset link has been sent';
}

/**
 * Password reset execution response
 */
export class ResetPasswordResponseDto {
  /**
   * Success message
   */
  @ApiProperty({
    description: 'Success message',
    example: 'Password has been reset successfully',
  })
  message: string = 'Password has been reset successfully';
}
