/**
 * Role Response DTO
 * STORY-007A: Rollen-Management Backend
 *
 * Data transfer object for role API responses.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, Permission } from '../../database/types';

/**
 * Permission details for role response
 */
export class RolePermissionDto {
  @ApiProperty({ description: 'Permission ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Permission name', example: 'users.create' })
  name: string;

  @ApiPropertyOptional({ description: 'Permission description', example: 'Create new users' })
  description?: string | null;

  @ApiPropertyOptional({ description: 'Permission category', example: 'users' })
  category?: string | null;
}

/**
 * Extended role with permissions and user count
 */
export interface RoleWithDetails extends Role {
  is_system?: boolean;
  permissions?: Permission[];
  userCount?: number;
}

/**
 * Role response DTO
 */
export class RoleResponseDto {
  @ApiProperty({ description: 'Role ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Role name', example: 'admin' })
  name: string;

  @ApiPropertyOptional({ description: 'Role description', example: 'Full system administrator' })
  description?: string | null;

  @ApiProperty({ description: 'Whether this is a system role that cannot be deleted', example: true })
  is_system: boolean;

  @ApiProperty({ description: 'Role creation timestamp', example: '2024-01-01T00:00:00.000Z' })
  created_at: Date;

  @ApiPropertyOptional({
    description: 'Number of users assigned to this role',
    example: 5,
  })
  userCount?: number;

  @ApiPropertyOptional({
    description: 'Permissions assigned to this role',
    type: [RolePermissionDto],
  })
  permissions?: RolePermissionDto[];

  /**
   * Convert a database role entity to a response DTO
   */
  static fromEntity(role: RoleWithDetails): RoleResponseDto {
    const dto = new RoleResponseDto();
    dto.id = role.id;
    dto.name = role.name;
    dto.description = role.description ?? null;
    dto.is_system = role.is_system ?? false;
    dto.created_at = role.created_at;
    dto.userCount = role.userCount;

    if (role.permissions) {
      dto.permissions = role.permissions.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description ?? null,
        category: p.category ?? null,
      }));
    }

    return dto;
  }

  /**
   * Convert multiple database role entities to response DTOs
   */
  static fromEntities(roles: RoleWithDetails[]): RoleResponseDto[] {
    return roles.map((role) => RoleResponseDto.fromEntity(role));
  }
}

/**
 * Role list item DTO (minimal fields for list views)
 */
export class RoleListItemDto {
  @ApiProperty({ description: 'Role ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Role name', example: 'admin' })
  name: string;

  @ApiPropertyOptional({ description: 'Role description' })
  description?: string | null;

  @ApiProperty({ description: 'Whether this is a system role', example: true })
  is_system: boolean;

  @ApiProperty({ description: 'Number of users with this role', example: 5 })
  userCount: number;

  @ApiProperty({ description: 'Creation timestamp' })
  created_at: Date;
}
