/**
 * Update User DTO
 * STORY-021B: Resource Endpoints
 * STORY-022: Swagger/OpenAPI Documentation
 */

import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsBoolean,
  IsEnum,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../../database/types';

/**
 * DTO for updating an existing user
 * All fields are optional
 */
export class UpdateUserDto {
  /**
   * User email address (must be unique)
   */
  @ApiPropertyOptional({
    description: 'User email address (must be unique)',
    example: 'user@example.com',
    maxLength: 255,
    format: 'email',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255, { message: 'Email must be at most 255 characters' })
  email?: string;

  /**
   * User password (will be hashed before storage)
   * Must be at least 8 characters with at least one uppercase, one lowercase, and one number
   */
  @ApiPropertyOptional({
    description: 'User password. Must be at least 8 characters with at least one uppercase, one lowercase, and one number',
    example: 'NewSecurePass123',
    minLength: 8,
    maxLength: 128,
    format: 'password',
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must be at most 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password?: string;

  /**
   * User display name
   */
  @ApiPropertyOptional({
    description: 'User display name',
    example: 'John Doe',
    minLength: 1,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(255, { message: 'Name must be at most 255 characters' })
  name?: string;

  /**
   * User status
   */
  @ApiPropertyOptional({
    description: 'User status',
    enum: ['active', 'inactive', 'suspended'],
    example: 'active',
  })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'suspended'], { message: 'Invalid status' })
  status?: UserStatus;

  /**
   * Whether MFA is enabled for this user
   */
  @ApiPropertyOptional({
    description: 'Whether MFA is enabled for this user',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  mfa_enabled?: boolean;
}
