/**
 * Create User DTO
 * STORY-021B: Resource Endpoints
 * STORY-022: Swagger/OpenAPI Documentation
 * STORY-003A: User CRUD Backend API
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
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../../database/types';

/**
 * DTO for creating a new user
 */
export class CreateUserDto {
  /**
   * User email address (must be unique)
   */
  @ApiProperty({
    description: 'User email address (must be unique)',
    example: 'user@example.com',
    maxLength: 255,
    format: 'email',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255, { message: 'Email must be at most 255 characters' })
  email: string;

  /**
   * User password (will be hashed before storage)
   * Must be at least 8 characters with at least one uppercase, one lowercase, and one number
   */
  @ApiProperty({
    description: 'User password. Must be at least 8 characters with at least one uppercase, one lowercase, and one number',
    example: 'SecurePass123',
    minLength: 8,
    maxLength: 128,
    format: 'password',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must be at most 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  /**
   * User display name
   */
  @ApiProperty({
    description: 'User display name',
    example: 'John Doe',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(255, { message: 'Name must be at most 255 characters' })
  name: string;

  /**
   * User status
   * @default 'active'
   */
  @ApiPropertyOptional({
    description: 'User status',
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
    example: 'active',
  })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'suspended'], { message: 'Invalid status' })
  status?: UserStatus;

  /**
   * Whether MFA is enabled for this user
   * @default false
   */
  @ApiPropertyOptional({
    description: 'Whether MFA is enabled for this user',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  mfa_enabled?: boolean;

  /**
   * Role names to assign to the user
   * @default ['user']
   */
  @ApiPropertyOptional({
    description: 'Role names to assign to the user. Defaults to ["user"] if not specified.',
    type: [String],
    example: ['user'],
    default: ['user'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];
}
