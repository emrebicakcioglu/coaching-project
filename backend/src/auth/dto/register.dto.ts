/**
 * Registration DTOs
 * STORY-023: User Registration
 *
 * Data Transfer Objects for user registration and email verification.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
} from 'class-validator';

/**
 * Register DTO
 * Input for user registration endpoint
 */
export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'newuser@example.com',
    maxLength: 255,
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255, { message: 'Email must be at most 255 characters' })
  email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'Max Mustermann',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(255, { message: 'Name must be at most 255 characters' })
  name: string;

  @ApiProperty({
    description: 'User password (minimum 8 characters, must include uppercase, lowercase, number, and special character)',
    example: 'SecurePass123!',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must be at most 128 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message: 'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
    },
  )
  password: string;

  @ApiProperty({
    description: 'Password confirmation (must match password)',
    example: 'SecurePass123!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password confirmation is required' })
  passwordConfirm: string;
}

/**
 * Registration Response DTO
 * Output for successful registration
 */
export class RegisterResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Registration successful. Please check your email to verify your account.',
  })
  message: string;

  @ApiProperty({
    description: 'Created user ID',
    example: 152,
  })
  userId: number;
}

/**
 * Verify Email Query DTO
 * Query parameters for email verification endpoint
 */
export class VerifyEmailQueryDto {
  @ApiProperty({
    description: 'Email verification token',
    example: 'abc123def456...',
  })
  @IsString()
  @IsNotEmpty({ message: 'Verification token is required' })
  token: string;
}

/**
 * Verify Email Response DTO
 * Output for successful email verification
 */
export class VerifyEmailResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Email verified successfully. You can now log in.',
  })
  message: string;
}

/**
 * Registration Error Response DTO
 * Output for registration errors
 */
export class RegisterErrorResponseDto {
  @ApiProperty({
    description: 'Error message',
    example: 'Email already exists',
  })
  error: string;

  @ApiPropertyOptional({
    description: 'Detailed error messages',
    example: ['Email is already in use'],
    type: [String],
  })
  details?: string[];
}

/**
 * Resend Verification Email DTO
 * Input for resending verification email
 */
export class ResendVerificationDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}

/**
 * Resend Verification Response DTO
 * Output for resend verification request
 */
export class ResendVerificationResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'If the email exists and is not verified, a new verification email has been sent.',
  })
  message: string;
}
