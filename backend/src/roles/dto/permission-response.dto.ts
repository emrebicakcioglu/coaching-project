/**
 * Permission Response DTO
 * STORY-007A: Rollen-Management Backend
 *
 * Data transfer object for permission API responses.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Permission } from '../../database/types';

/**
 * Permission response DTO
 */
export class PermissionResponseDto {
  @ApiProperty({ description: 'Permission ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Permission name', example: 'users.create' })
  name: string;

  @ApiPropertyOptional({ description: 'Permission description', example: 'Create new users' })
  description?: string | null;

  @ApiPropertyOptional({ description: 'Permission category', example: 'users' })
  category?: string | null;

  /**
   * Convert a database permission entity to a response DTO
   */
  static fromEntity(permission: Permission): PermissionResponseDto {
    const dto = new PermissionResponseDto();
    dto.id = permission.id;
    dto.name = permission.name;
    dto.description = permission.description ?? null;
    dto.category = permission.category ?? null;
    return dto;
  }

  /**
   * Convert multiple database permission entities to response DTOs
   */
  static fromEntities(permissions: Permission[]): PermissionResponseDto[] {
    return permissions.map((p) => PermissionResponseDto.fromEntity(p));
  }
}

/**
 * Permissions grouped by category
 * Note: This is a type alias for documentation, not a decorated class
 */
export type PermissionsByCategoryDto = Record<string, PermissionResponseDto[]>;

/**
 * Response with permissions grouped by category
 */
export class GroupedPermissionsResponseDto {
  @ApiProperty({
    description: 'Permissions grouped by category',
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: { $ref: '#/components/schemas/PermissionResponseDto' },
    },
  })
  categories: Record<string, PermissionResponseDto[]>;

  @ApiProperty({
    description: 'Total number of permissions',
    example: 19,
  })
  total: number;
}
