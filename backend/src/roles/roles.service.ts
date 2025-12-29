/**
 * Roles Service
 * STORY-007A: Rollen-Management Backend
 *
 * Business logic for role management including CRUD operations,
 * permission assignment, and system role protection.
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { WinstonLoggerService } from '../common/services/logger.service';
import { AuditService } from '../common/services/audit.service';
import { Role, Permission } from '../database/types';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleResponseDto, RoleWithDetails } from './dto/role-response.dto';
import { Request } from 'express';

/**
 * Extended Request interface with user and requestId
 */
interface AuthRequest extends Request {
  user?: { id?: number; email?: string };
  requestId?: string;
}

/**
 * Database row with role and user count
 */
interface RoleWithUserCount extends Role {
  is_system?: boolean;
  user_count?: string;
}

/**
 * Roles Service
 * Handles all role-related business logic
 */
@Injectable()
export class RolesService {
  constructor(
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
  ) {}

  /**
   * Find all roles with user counts and permissions
   *
   * @returns List of all roles with their details
   */
  async findAll(): Promise<RoleResponseDto[]> {
    const pool = this.databaseService.ensurePool();

    // Get all roles with user counts
    const rolesResult = await pool.query<RoleWithUserCount>(
      `SELECT r.*, COALESCE(uc.user_count, 0) as user_count
       FROM roles r
       LEFT JOIN (
         SELECT role_id, COUNT(*) as user_count
         FROM user_roles
         GROUP BY role_id
       ) uc ON r.id = uc.role_id
       ORDER BY r.name`,
    );

    // Get all permissions for each role
    const rolesWithDetails = await Promise.all(
      rolesResult.rows.map(async (role) => {
        const permissions = await this.getRolePermissions(role.id);
        return {
          ...role,
          is_system: role.is_system ?? false,
          userCount: parseInt(role.user_count || '0', 10),
          permissions,
        } as RoleWithDetails;
      }),
    );

    this.logger.debug(`Found ${rolesWithDetails.length} roles`, 'RolesService');

    return RoleResponseDto.fromEntities(rolesWithDetails);
  }

  /**
   * Find a single role by ID
   *
   * @param id - Role ID
   * @returns Role or throws NotFoundException
   */
  async findOne(id: number): Promise<RoleResponseDto> {
    const pool = this.databaseService.ensurePool();

    const result = await pool.query<RoleWithUserCount>(
      `SELECT r.*, COALESCE(uc.user_count, 0) as user_count
       FROM roles r
       LEFT JOIN (
         SELECT role_id, COUNT(*) as user_count
         FROM user_roles
         GROUP BY role_id
       ) uc ON r.id = uc.role_id
       WHERE r.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    const role = result.rows[0];
    const permissions = await this.getRolePermissions(id);

    const roleWithDetails: RoleWithDetails = {
      ...role,
      is_system: role.is_system ?? false,
      userCount: parseInt(role.user_count || '0', 10),
      permissions,
    };

    return RoleResponseDto.fromEntity(roleWithDetails);
  }

  /**
   * Find a role by name
   *
   * @param name - Role name
   * @returns Role or null
   */
  async findByName(name: string): Promise<Role | null> {
    const pool = this.databaseService.ensurePool();

    const result = await pool.query<Role>(
      'SELECT * FROM roles WHERE LOWER(name) = LOWER($1)',
      [name],
    );

    return result.rows[0] || null;
  }

  /**
   * Create a new role
   *
   * @param createRoleDto - Role data
   * @param request - Optional request for audit logging
   * @returns Created role
   */
  async create(createRoleDto: CreateRoleDto, request?: AuthRequest): Promise<RoleResponseDto> {
    const pool = this.databaseService.ensurePool();

    const { name, description, permissionIds } = createRoleDto;

    // Check if role name already exists
    const existingRole = await this.findByName(name);
    if (existingRole) {
      throw new ConflictException(`Role with name "${name}" already exists`);
    }

    // Validate permission IDs if provided
    if (permissionIds && permissionIds.length > 0) {
      await this.validatePermissionIds(permissionIds);
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert role (is_system defaults to false for new roles)
      const result = await client.query<Role>(
        `INSERT INTO roles (name, description, is_system)
         VALUES ($1, $2, FALSE)
         RETURNING *`,
        [name, description || null],
      );

      const role = result.rows[0];

      // Assign permissions if provided
      if (permissionIds && permissionIds.length > 0) {
        for (const permId of permissionIds) {
          await client.query(
            `INSERT INTO role_permissions (role_id, permission_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [role.id, permId],
          );
        }
      }

      await client.query('COMMIT');

      // Audit log
      await this.auditService.log({
        action: 'ROLE_CREATE',
        userId: request?.user?.id || null,
        resource: 'role',
        resourceId: role.id,
        details: {
          name: role.name,
          description: role.description,
          permissionIds,
          createdBy: request?.user?.email,
        },
        request: request as AuthRequest,
      });

      this.logger.log(`Created role: ${role.name} (ID: ${role.id})`, 'RolesService');

      // Return the role with permissions
      return this.findOne(role.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing role
   *
   * @param id - Role ID
   * @param updateRoleDto - Update data
   * @param request - Optional request for audit logging
   * @returns Updated role
   */
  async update(id: number, updateRoleDto: UpdateRoleDto, request?: AuthRequest): Promise<RoleResponseDto> {
    const pool = this.databaseService.ensurePool();

    // Check if role exists
    const existingRole = await this.findOneRaw(id);
    if (!existingRole) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    const { name, description, permissionIds } = updateRoleDto;

    // Check if name is being changed and already exists
    if (name && name.toLowerCase() !== existingRole.name.toLowerCase()) {
      const nameExists = await this.findByName(name);
      if (nameExists) {
        throw new ConflictException(`Role with name "${name}" already exists`);
      }
    }

    // Validate permission IDs if provided
    if (permissionIds !== undefined && permissionIds.length > 0) {
      await this.validatePermissionIds(permissionIds);
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Build update query dynamically
      const updates: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;
      const changes: Record<string, { old: unknown; new: unknown }> = {};

      if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        params.push(name);
        changes.name = { old: existingRole.name, new: name };
      }

      if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        params.push(description);
        changes.description = { old: existingRole.description, new: description };
      }

      // Execute update if there are changes
      let updatedRole = existingRole;
      if (updates.length > 0) {
        params.push(id);
        const result = await client.query<Role>(
          `UPDATE roles SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
          params,
        );
        updatedRole = result.rows[0];
      }

      // Update permissions if provided
      if (permissionIds !== undefined) {
        // Get current permissions for audit
        const currentPerms = await this.getRolePermissionIds(id);

        // Remove all existing permissions
        await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);

        // Add new permissions
        for (const permId of permissionIds) {
          await client.query(
            `INSERT INTO role_permissions (role_id, permission_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [id, permId],
          );
        }

        changes.permissions = { old: currentPerms, new: permissionIds };
      }

      await client.query('COMMIT');

      // Audit log
      if (Object.keys(changes).length > 0) {
        await this.auditService.log({
          action: 'ROLE_UPDATE',
          userId: request?.user?.id || null,
          resource: 'role',
          resourceId: id,
          details: { changes, updatedBy: request?.user?.email },
          request: request as AuthRequest,
        });
      }

      this.logger.log(`Updated role: ${updatedRole.name} (ID: ${id})`, 'RolesService');

      // Return the role with updated permissions
      return this.findOne(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a role
   *
   * @param id - Role ID
   * @param request - Optional request for audit logging
   * @returns Deleted role info
   */
  async delete(id: number, request?: AuthRequest): Promise<{ message: string; role: RoleResponseDto }> {
    const pool = this.databaseService.ensurePool();

    // Get the role first (with details for response)
    const role = await this.findOne(id);

    // Check if it's a system role
    if (role.is_system) {
      throw new ForbiddenException('Cannot delete system roles');
    }

    // Check if role has assigned users (warning but allow deletion)
    if (role.userCount && role.userCount > 0) {
      this.logger.warn(
        `Deleting role "${role.name}" which has ${role.userCount} assigned users`,
        'RolesService',
      );
    }

    // Delete the role (cascade will handle role_permissions)
    await pool.query('DELETE FROM roles WHERE id = $1', [id]);

    // Audit log
    await this.auditService.log({
      action: 'ROLE_DELETE',
      userId: request?.user?.id || null,
      resource: 'role',
      resourceId: id,
      details: {
        name: role.name,
        userCount: role.userCount,
        deletedBy: request?.user?.email,
      },
      level: 'warn',
      request: request as AuthRequest,
    });

    this.logger.log(`Deleted role: ${role.name} (ID: ${id})`, 'RolesService');

    return {
      message: `Role "${role.name}" deleted successfully`,
      role,
    };
  }

  /**
   * Get permissions for a role
   *
   * @param roleId - Role ID
   * @returns List of permissions
   */
  async getRolePermissions(roleId: number): Promise<Permission[]> {
    const pool = this.databaseService.ensurePool();

    const result = await pool.query<Permission>(
      `SELECT p.*
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = $1
       ORDER BY p.category, p.name`,
      [roleId],
    );

    return result.rows;
  }

  /**
   * Get permission IDs for a role
   *
   * @param roleId - Role ID
   * @returns List of permission IDs
   */
  private async getRolePermissionIds(roleId: number): Promise<number[]> {
    const pool = this.databaseService.ensurePool();

    const result = await pool.query<{ permission_id: number }>(
      'SELECT permission_id FROM role_permissions WHERE role_id = $1',
      [roleId],
    );

    return result.rows.map((r) => r.permission_id);
  }

  /**
   * Assign permissions to a role
   *
   * @param roleId - Role ID
   * @param permissionIds - Permission IDs to assign
   * @param request - Optional request for audit logging
   */
  async assignPermissions(
    roleId: number,
    permissionIds: number[],
    request?: AuthRequest,
  ): Promise<RoleResponseDto> {
    const pool = this.databaseService.ensurePool();

    // Check if role exists
    const role = await this.findOneRaw(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Validate permission IDs
    await this.validatePermissionIds(permissionIds);

    // Add permissions
    for (const permId of permissionIds) {
      await pool.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [roleId, permId],
      );
    }

    // Audit log
    await this.auditService.log({
      action: 'PERMISSION_CHANGE',
      userId: request?.user?.id || null,
      resource: 'role',
      resourceId: roleId,
      details: {
        action: 'assign',
        permissionIds,
        assignedBy: request?.user?.email,
      },
      request: request as AuthRequest,
    });

    this.logger.log(
      `Assigned ${permissionIds.length} permissions to role ID: ${roleId}`,
      'RolesService',
    );

    return this.findOne(roleId);
  }

  /**
   * Remove permissions from a role
   *
   * @param roleId - Role ID
   * @param permissionIds - Permission IDs to remove
   * @param request - Optional request for audit logging
   */
  async removePermissions(
    roleId: number,
    permissionIds: number[],
    request?: AuthRequest,
  ): Promise<RoleResponseDto> {
    const pool = this.databaseService.ensurePool();

    // Check if role exists
    const role = await this.findOneRaw(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Remove permissions
    for (const permId of permissionIds) {
      await pool.query(
        'DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
        [roleId, permId],
      );
    }

    // Audit log
    await this.auditService.log({
      action: 'PERMISSION_CHANGE',
      userId: request?.user?.id || null,
      resource: 'role',
      resourceId: roleId,
      details: {
        action: 'remove',
        permissionIds,
        removedBy: request?.user?.email,
      },
      request: request as AuthRequest,
    });

    this.logger.log(
      `Removed ${permissionIds.length} permissions from role ID: ${roleId}`,
      'RolesService',
    );

    return this.findOne(roleId);
  }

  /**
   * Get raw role data (internal use)
   */
  private async findOneRaw(id: number): Promise<(Role & { is_system?: boolean }) | null> {
    const pool = this.databaseService.ensurePool();

    const result = await pool.query<Role & { is_system?: boolean }>(
      'SELECT * FROM roles WHERE id = $1',
      [id],
    );

    return result.rows[0] || null;
  }

  /**
   * Validate that all permission IDs exist
   */
  private async validatePermissionIds(permissionIds: number[]): Promise<void> {
    const pool = this.databaseService.ensurePool();

    const result = await pool.query<{ id: number }>(
      'SELECT id FROM permissions WHERE id = ANY($1)',
      [permissionIds],
    );

    const foundIds = new Set(result.rows.map((r) => r.id));
    const invalidIds = permissionIds.filter((id) => !foundIds.has(id));

    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Invalid permission ID(s): ${invalidIds.join(', ')}`,
      );
    }
  }
}
