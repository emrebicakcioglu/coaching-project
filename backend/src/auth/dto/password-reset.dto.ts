/**
 * Password Reset DTOs
 * STORY-021B: Resource Endpoints
 * STORY-022: Swagger/OpenAPI Documentation
 */

import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for requesting a password reset (forgot password)
 */
export class ForgotPasswordDto {
  /**
   * Email address to send reset link to
   */
  @ApiProperty({
    description: 'Email address to send reset link to',
    example: 'user@example.com',
    format: 'email',
    maxLength: 255,
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255, { message: 'Email must be at most 255 characters' })
  email: string;
}

/**
 * DTO for executing a password reset
 */
export class ResetPasswordDto {
  /**
   * Password reset token received via email
   */
  @ApiProperty({
    description: 'Password reset token received via email',
    example: 'abc123def456...',
  })
  @IsString()
  @MinLength(1, { message: 'Token is required' })
  token: string;

  /**
   * New password
   * Must be at least 8 characters with at least one uppercase, one lowercase, and one number
   */
  @ApiProperty({
    description: 'New password. Must be at least 8 characters with at least one uppercase, one lowercase, and one number',
    example: 'NewSecurePass123',
    format: 'password',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must be at most 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  new_password: string;
}
