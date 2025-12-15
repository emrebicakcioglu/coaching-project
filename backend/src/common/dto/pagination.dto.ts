/**
 * Pagination DTOs
 * STORY-021B: Resource Endpoints
 * STORY-022: Swagger/OpenAPI Documentation
 *
 * Common DTOs for pagination, filtering, and sorting across all endpoints.
 */

import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Sort order enum
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Base query DTO for pagination
 * Provides standard pagination parameters for list endpoints
 *
 * Usage:
 * GET /api/v1/users?page=1&limit=20
 */
export class PaginationQueryDto {
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
}

/**
 * Sort query DTO
 * Provides sorting parameters in format: field:direction
 *
 * Usage:
 * GET /api/v1/users?sort=createdAt:desc
 */
export class SortQueryDto {
  /**
   * Sort parameter in format "field:direction"
   * @example "createdAt:desc"
   */
  @ApiPropertyOptional({
    description: 'Sort parameter in format "field:direction"',
    example: 'created_at:desc',
  })
  @IsOptional()
  @IsString()
  sort?: string;
}

/**
 * Combined pagination and sort query DTO
 * Used for list endpoints that support both pagination and sorting
 *
 * Usage:
 * GET /api/v1/users?page=1&limit=20&sort=createdAt:desc
 */
export class PaginatedSortQueryDto extends PaginationQueryDto {
  /**
   * Sort parameter in format "field:direction"
   * @example "createdAt:desc"
   */
  @ApiPropertyOptional({
    description: 'Sort parameter in format "field:direction"',
    example: 'created_at:desc',
  })
  @IsOptional()
  @IsString()
  sort?: string;
}

/**
 * Pagination metadata schema for Swagger documentation
 */
export class PaginationMetaDto {
  @ApiProperty({ description: 'Current page number (1-indexed)', example: 1 })
  page: number;

  @ApiProperty({ description: 'Number of items per page', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Total number of items across all pages', example: 100 })
  total: number;

  @ApiProperty({ description: 'Total number of pages', example: 5 })
  pages: number;
}

/**
 * Parsed sort result
 */
export interface ParsedSort {
  field: string;
  order: SortOrder;
}

/**
 * Parse sort string into field and order
 * @param sort - Sort string in format "field:direction"
 * @param allowedFields - List of allowed sort fields
 * @param defaultField - Default field to sort by
 * @returns Parsed sort object
 *
 * @example
 * parseSort('createdAt:desc', ['createdAt', 'name', 'email'], 'createdAt')
 * // Returns: { field: 'createdAt', order: 'desc' }
 */
export function parseSort(
  sort: string | undefined,
  allowedFields: string[],
  defaultField: string,
): ParsedSort {
  if (!sort) {
    return { field: defaultField, order: SortOrder.DESC };
  }

  const [field, direction] = sort.split(':');

  // Validate field is allowed
  const validField = allowedFields.includes(field) ? field : defaultField;

  // Validate direction
  const validOrder =
    direction?.toLowerCase() === 'asc' ? SortOrder.ASC : SortOrder.DESC;

  return { field: validField, order: validOrder };
}

/**
 * Standard paginated response interface
 */
export interface PaginatedResponse<T> {
  /** Data items for current page */
  data: T[];
  /** Pagination metadata */
  pagination: {
    /** Current page number (1-indexed) */
    page: number;
    /** Number of items per page */
    limit: number;
    /** Total number of items across all pages */
    total: number;
    /** Total number of pages */
    pages: number;
  };
}

/**
 * Create a paginated response object
 * @param data - Array of items for current page
 * @param total - Total count of items
 * @param page - Current page number
 * @param limit - Items per page
 * @returns Paginated response object
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
