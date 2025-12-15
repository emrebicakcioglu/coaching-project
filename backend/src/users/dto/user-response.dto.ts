/**
 * User Response DTO
 * STORY-021B: Resource Endpoints
 * STORY-022: Swagger/OpenAPI Documentation
 * STORY-003A: User CRUD Backend API
 *
 * Response DTOs for user endpoints that exclude sensitive data
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User, UserStatus } from '../../database/types';

/**
 * Role information in user response
 */
export class UserRoleDto {
  @ApiProperty({ description: 'Role ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Role name', example: 'admin' })
  name: string;

  @ApiPropertyOptional({ description: 'Role description', example: 'Administrator with full access' })
  description?: string | null;
}

/**
 * Extended User type with roles
 */
export interface UserWithRoles extends User {
  roles?: UserRoleDto[];
}

/**
 * User response DTO
 * Excludes sensitive fields like password_hash and mfa_secret
 */
export class UserResponseDto {
  @ApiProperty({ description: 'User ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  email: string;

  @ApiProperty({ description: 'User display name', example: 'John Doe' })
  name: string;

  @ApiProperty({
    description: 'User status',
    enum: ['active', 'inactive', 'suspended', 'deleted'],
    example: 'active',
  })
  status: UserStatus;

  @ApiProperty({ description: 'Whether MFA is enabled', example: false })
  mfa_enabled: boolean;

  @ApiProperty({ description: 'Account creation timestamp', example: '2024-01-15T12:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ description: 'Last update timestamp', example: '2024-01-15T12:00:00.000Z' })
  updated_at: Date;

  @ApiPropertyOptional({
    description: 'Last login timestamp',
    example: '2024-01-15T14:30:00.000Z',
    nullable: true,
  })
  last_login: Date | null;

  @ApiPropertyOptional({
    description: 'Soft delete timestamp (null if user is not deleted)',
    example: null,
    nullable: true,
  })
  deleted_at: Date | null;

  @ApiPropertyOptional({
    description: 'User roles',
    type: [UserRoleDto],
    example: [{ id: 1, name: 'user', description: 'Standard user' }],
  })
  roles?: UserRoleDto[];

  constructor(user: UserWithRoles) {
    this.id = user.id;
    this.email = user.email;
    this.name = user.name;
    this.status = user.status;
    this.mfa_enabled = user.mfa_enabled;
    this.created_at = user.created_at;
    this.updated_at = user.updated_at;
    this.last_login = user.last_login || null;
    this.deleted_at = user.deleted_at || null;
    this.roles = user.roles || undefined;
  }

  /**
   * Convert a User entity to UserResponseDto
   * Excludes password_hash and mfa_secret
   */
  static fromEntity(user: UserWithRoles): UserResponseDto {
    return new UserResponseDto(user);
  }

  /**
   * Convert multiple User entities to UserResponseDto array
   */
  static fromEntities(users: UserWithRoles[]): UserResponseDto[] {
    return users.map((user) => UserResponseDto.fromEntity(user));
  }
}

/**
 * User response DTO with aggregated permissions
 * STORY-007B: User Role Assignment
 *
 * Extends UserResponseDto with permissions collected from all user roles
 */
export class UserWithPermissionsDto extends UserResponseDto {
  @ApiProperty({
    description: 'Aggregated permissions from all user roles',
    type: [String],
    example: ['users.read', 'users.update', 'roles.read'],
  })
  permissions: string[];

  constructor(user: UserWithRoles, permissions: string[]) {
    super(user);
    this.permissions = permissions;
  }

  /**
   * Create from UserResponseDto and permissions array
   */
  static fromUserResponse(user: UserResponseDto, permissions: string[]): UserWithPermissionsDto {
    const dto = new UserWithPermissionsDto(user as unknown as UserWithRoles, permissions);
    // Copy all properties from the user response
    dto.id = user.id;
    dto.email = user.email;
    dto.name = user.name;
    dto.status = user.status;
    dto.mfa_enabled = user.mfa_enabled;
    dto.created_at = user.created_at;
    dto.updated_at = user.updated_at;
    dto.last_login = user.last_login;
    dto.deleted_at = user.deleted_at;
    dto.roles = user.roles;
    dto.permissions = permissions;
    return dto;
  }
}
