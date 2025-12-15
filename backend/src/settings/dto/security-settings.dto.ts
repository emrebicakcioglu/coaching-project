/**
 * Security Settings DTOs
 * STORY-013A: In-App Settings Backend
 *
 * DTOs for security settings validation and API responses.
 */

import {
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { SecuritySettings } from '../../database/types';

/**
 * DTO for updating security settings
 * STORY-013A: In-App Settings Backend
 */
export class UpdateSecuritySettingsDto {
  @ApiPropertyOptional({
    description: 'Maximum failed login attempts before account lockout',
    example: 5,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt({ message: 'Max login attempts must be an integer' })
  @Min(1, { message: 'Max login attempts must be at least 1' })
  @Max(100, { message: 'Max login attempts cannot exceed 100' })
  max_login_attempts?: number;

  @ApiPropertyOptional({
    description: 'Minimum password length',
    example: 8,
    minimum: 6,
    maximum: 128,
  })
  @IsOptional()
  @IsInt({ message: 'Password min length must be an integer' })
  @Min(6, { message: 'Password min length must be at least 6' })
  @Max(128, { message: 'Password min length cannot exceed 128' })
  password_min_length?: number;

  @ApiPropertyOptional({
    description: 'Require at least one uppercase letter in passwords',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'password_require_uppercase must be a boolean' })
  password_require_uppercase?: boolean;

  @ApiPropertyOptional({
    description: 'Require at least one lowercase letter in passwords',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'password_require_lowercase must be a boolean' })
  password_require_lowercase?: boolean;

  @ApiPropertyOptional({
    description: 'Require at least one number in passwords',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'password_require_numbers must be a boolean' })
  password_require_numbers?: boolean;

  @ApiPropertyOptional({
    description: 'Require at least one special character in passwords',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'password_require_special_chars must be a boolean' })
  password_require_special_chars?: boolean;

  @ApiPropertyOptional({
    description: 'Session inactivity timeout in minutes',
    example: 15,
    minimum: 1,
    maximum: 1440,
  })
  @IsOptional()
  @IsInt({ message: 'Session inactivity timeout must be an integer' })
  @Min(1, { message: 'Session inactivity timeout must be at least 1 minute' })
  @Max(1440, { message: 'Session inactivity timeout cannot exceed 1440 minutes (24 hours)' })
  session_inactivity_timeout?: number;
}

/**
 * Security settings response DTO
 * STORY-013A: In-App Settings Backend
 */
export class SecuritySettingsResponseDto {
  @ApiProperty({
    description: 'Maximum failed login attempts before account lockout',
    example: 5,
  })
  max_login_attempts: number;

  @ApiProperty({
    description: 'Minimum password length',
    example: 8,
  })
  password_min_length: number;

  @ApiProperty({
    description: 'Require at least one uppercase letter in passwords',
    example: true,
  })
  password_require_uppercase: boolean;

  @ApiProperty({
    description: 'Require at least one lowercase letter in passwords',
    example: true,
  })
  password_require_lowercase: boolean;

  @ApiProperty({
    description: 'Require at least one number in passwords',
    example: true,
  })
  password_require_numbers: boolean;

  @ApiProperty({
    description: 'Require at least one special character in passwords',
    example: true,
  })
  password_require_special_chars: boolean;

  @ApiProperty({
    description: 'Session inactivity timeout in minutes',
    example: 15,
  })
  session_inactivity_timeout: number;

  constructor(settings: SecuritySettings) {
    this.max_login_attempts = settings.max_login_attempts;
    this.password_min_length = settings.password_min_length;
    this.password_require_uppercase = settings.password_require_uppercase;
    this.password_require_lowercase = settings.password_require_lowercase;
    this.password_require_numbers = settings.password_require_numbers;
    this.password_require_special_chars = settings.password_require_special_chars;
    this.session_inactivity_timeout = settings.session_inactivity_timeout;
  }

  static fromEntity(settings: SecuritySettings): SecuritySettingsResponseDto {
    return new SecuritySettingsResponseDto(settings);
  }
}

/**
 * Password policy response DTO
 * STORY-013A: In-App Settings Backend
 */
export class PasswordPolicyResponseDto {
  @ApiProperty({ description: 'Minimum password length', example: 8 })
  minLength: number;

  @ApiProperty({ description: 'Require uppercase letters', example: true })
  requireUppercase: boolean;

  @ApiProperty({ description: 'Require lowercase letters', example: true })
  requireLowercase: boolean;

  @ApiProperty({ description: 'Require numbers', example: true })
  requireNumbers: boolean;

  @ApiProperty({ description: 'Require special characters', example: true })
  requireSpecialChars: boolean;
}
