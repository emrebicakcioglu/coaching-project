/**
 * List Users Query DTO
 * STORY-021B: Resource Endpoints
 * STORY-022: Swagger/OpenAPI Documentation
 * STORY-003A: User CRUD Backend API
 */

import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../../database/types';

/**
 * Allowed sort fields for users list
 */
export const ALLOWED_USER_SORT_FIELDS = [
  'id',
  'email',
  'name',
  'status',
  'created_at',
  'updated_at',
  'last_login',
] as const;

export type UserSortField = (typeof ALLOWED_USER_SORT_FIELDS)[number];

/**
 * DTO for listing users with pagination, filtering, and sorting
 *
 * Usage:
 * GET /api/v1/users?page=1&limit=20&status=active&sort=createdAt:desc&search=john
 */
export class ListUsersQueryDto {
  /**
   * Page number (1-indexed)
   * @default 1
   */
  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * Number of items per page
   * @default 20
   * @max 100
   */
  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  /**
   * Sort parameter in format "field:direction"
   * Allowed fields: id, email, name, status, created_at, updated_at, last_login
   * Directions: asc, desc
   * @example "createdAt:desc"
   */
  @ApiPropertyOptional({
    description: 'Sort parameter in format "field:direction". Allowed fields: id, email, name, status, created_at, updated_at, last_login. Directions: asc, desc',
    example: 'created_at:desc',
  })
  @IsOptional()
  @IsString()
  sort?: string;

  /**
   * Filter by user status
   */
  @ApiPropertyOptional({
    description: 'Filter by user status',
    enum: ['active', 'inactive', 'suspended'],
    example: 'active',
  })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'suspended'], { message: 'Invalid status filter' })
  status?: UserStatus;

  /**
   * Search query for email or name (partial match)
   */
  @ApiPropertyOptional({
    description: 'Search query for email or name (partial match)',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * Filter by MFA enabled status
   */
  @ApiPropertyOptional({
    description: 'Filter by MFA enabled status',
    example: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  mfa_enabled?: boolean;

  /**
   * Filter by role name
   */
  @ApiPropertyOptional({
    description: 'Filter by role name (e.g., admin, user)',
    example: 'admin',
  })
  @IsOptional()
  @IsString()
  role?: string;

  /**
   * Include deleted users in the results
   * @default false
   */
  @ApiPropertyOptional({
    description: 'Include soft-deleted users in the results',
    default: false,
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  include_deleted?: boolean;
}

/**
 * Filter options derived from query parameters
 */
export interface UserFilterOptions {
  status?: UserStatus;
  search?: string;
  mfa_enabled?: boolean;
  role?: string;
  include_deleted?: boolean;
}
