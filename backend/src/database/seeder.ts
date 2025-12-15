/**
 * Database Seeding System
 * STORY-024B: PostgreSQL Schema & Migrations
 * STORY-007A: Rollen-Management Backend (is_system flag, Guest role)
 *
 * Provides test data seeding capabilities for development and testing.
 */

import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

export interface SeedResult {
  success: boolean;
  message: string;
  counts?: {
    users: number;
    roles: number;
    permissions: number;
    userRoles: number;
    rolePermissions: number;
  };
  error?: string;
}

/**
 * Database Seeder
 *
 * Seeds the database with initial/test data.
 * Supports idempotent seeding (safe to run multiple times).
 */
export class Seeder {
  private pool: Pool;
  private bcryptRounds: number;

  constructor(pool: Pool, bcryptRounds: number = 12) {
    this.pool = pool;
    this.bcryptRounds = bcryptRounds;
  }

  /**
   * Hash a password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.bcryptRounds);
  }

  /**
   * Seed default permissions
   */
  async seedPermissions(): Promise<number> {
    const permissions = [
      // User management permissions
      { name: 'users.create', description: 'Create new users', category: 'users' },
      { name: 'users.read', description: 'View user details', category: 'users' },
      { name: 'users.update', description: 'Update user information', category: 'users' },
      { name: 'users.delete', description: 'Delete users', category: 'users' },
      { name: 'users.list', description: 'List all users', category: 'users' },

      // Role management permissions
      { name: 'roles.create', description: 'Create new roles', category: 'roles' },
      { name: 'roles.read', description: 'View role details', category: 'roles' },
      { name: 'roles.update', description: 'Update role information', category: 'roles' },
      { name: 'roles.delete', description: 'Delete roles', category: 'roles' },
      { name: 'roles.list', description: 'List all roles', category: 'roles' },
      { name: 'roles.assign', description: 'Assign roles to users', category: 'roles' },

      // Permission management
      { name: 'permissions.read', description: 'View permission details', category: 'permissions' },
      { name: 'permissions.list', description: 'List all permissions', category: 'permissions' },
      { name: 'permissions.assign', description: 'Assign permissions to roles', category: 'permissions' },

      // Settings management
      { name: 'settings.read', description: 'View application settings', category: 'settings' },
      { name: 'settings.update', description: 'Update application settings', category: 'settings' },

      // System permissions
      { name: 'system.admin', description: 'Full system administration', category: 'system' },
      { name: 'system.audit', description: 'View audit logs', category: 'system' },
      { name: 'system.maintenance', description: 'Manage maintenance mode', category: 'system' },

      // Design System permissions
      { name: 'design.read', description: 'View design system and color schemes', category: 'design' },
      { name: 'design.manage', description: 'Manage design system, create and apply color schemes', category: 'design' },

      // Language management permissions
      { name: 'languages.manage', description: 'Manage languages and translations', category: 'languages' },
    ];

    let inserted = 0;
    for (const perm of permissions) {
      const result = await this.pool.query(
        `INSERT INTO permissions (name, description, category)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING
         RETURNING id`,
        [perm.name, perm.description, perm.category]
      );
      if (result.rowCount && result.rowCount > 0) inserted++;
    }

    return inserted;
  }

  /**
   * Seed default roles
   * STORY-007A: Added is_system flag and Guest role
   */
  async seedRoles(): Promise<number> {
    const roles = [
      { name: 'admin', description: 'Full system administrator with all permissions', is_system: true },
      { name: 'manager', description: 'User and content manager', is_system: true },
      { name: 'user', description: 'Standard user with basic permissions', is_system: true },
      { name: 'viewer', description: 'Read-only access to the system', is_system: true },
      { name: 'guest', description: 'Guest access with minimal permissions', is_system: true },
    ];

    let inserted = 0;
    for (const role of roles) {
      const result = await this.pool.query(
        `INSERT INTO roles (name, description, is_system)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE SET is_system = $3
         RETURNING id`,
        [role.name, role.description, role.is_system]
      );
      if (result.rowCount && result.rowCount > 0) inserted++;
    }

    return inserted;
  }

  /**
   * Seed role-permission mappings
   * STORY-007A: Added guest role permissions
   */
  async seedRolePermissions(): Promise<number> {
    // Define role-permission mappings
    const rolePermissions: Record<string, string[]> = {
      admin: [
        'users.create', 'users.read', 'users.update', 'users.delete', 'users.list',
        'roles.create', 'roles.read', 'roles.update', 'roles.delete', 'roles.list', 'roles.assign',
        'permissions.read', 'permissions.list', 'permissions.assign',
        'settings.read', 'settings.update',
        'system.admin', 'system.audit', 'system.maintenance',
        'design.read', 'design.manage',
        'languages.manage',
      ],
      manager: [
        'users.create', 'users.read', 'users.update', 'users.list',
        'roles.read', 'roles.list', 'roles.assign',
        'permissions.read', 'permissions.list',
        'settings.read',
      ],
      user: [
        'users.read',
        'roles.read',
      ],
      viewer: [
        'users.read',
      ],
      guest: [
        // Guest has minimal read-only permissions
      ],
    };

    let inserted = 0;
    for (const [roleName, permissions] of Object.entries(rolePermissions)) {
      // Get role ID
      const roleResult = await this.pool.query(
        'SELECT id FROM roles WHERE name = $1',
        [roleName]
      );
      if (roleResult.rows.length === 0) continue;
      const roleId = roleResult.rows[0].id;

      for (const permName of permissions) {
        // Get permission ID
        const permResult = await this.pool.query(
          'SELECT id FROM permissions WHERE name = $1',
          [permName]
        );
        if (permResult.rows.length === 0) continue;
        const permId = permResult.rows[0].id;

        const result = await this.pool.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           VALUES ($1, $2)
           ON CONFLICT (role_id, permission_id) DO NOTHING
           RETURNING role_id`,
          [roleId, permId]
        );
        if (result.rowCount && result.rowCount > 0) inserted++;
      }
    }

    return inserted;
  }

  /**
   * Seed test users
   */
  async seedUsers(): Promise<number> {
    // Test users with hashed passwords
    // Default password for all test users: "TestPassword123!"
    const testPassword = await this.hashPassword('TestPassword123!');

    const users = [
      {
        email: 'admin@example.com',
        password_hash: testPassword,
        name: 'System Administrator',
        status: 'active',
        role: 'admin',
      },
      {
        email: 'manager@example.com',
        password_hash: testPassword,
        name: 'Test Manager',
        status: 'active',
        role: 'manager',
      },
      {
        email: 'user@example.com',
        password_hash: testPassword,
        name: 'Test User',
        status: 'active',
        role: 'user',
      },
      {
        email: 'viewer@example.com',
        password_hash: testPassword,
        name: 'Test Viewer',
        status: 'active',
        role: 'viewer',
      },
      {
        email: 'inactive@example.com',
        password_hash: testPassword,
        name: 'Inactive User',
        status: 'inactive',
        role: 'user',
      },
    ];

    let inserted = 0;
    for (const user of users) {
      const result = await this.pool.query(
        `INSERT INTO users (email, password_hash, name, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [user.email, user.password_hash, user.name, user.status]
      );

      if (result.rowCount && result.rowCount > 0) {
        inserted++;
        const userId = result.rows[0].id;

        // Assign role to user
        const roleResult = await this.pool.query(
          'SELECT id FROM roles WHERE name = $1',
          [user.role]
        );
        if (roleResult.rows.length > 0) {
          await this.pool.query(
            `INSERT INTO user_roles (user_id, role_id)
             VALUES ($1, $2)
             ON CONFLICT (user_id, role_id) DO NOTHING`,
            [userId, roleResult.rows[0].id]
          );
        }
      }
    }

    return inserted;
  }

  /**
   * Run all seeds
   */
  async run(): Promise<SeedResult> {
    console.log('Starting database seeding...');

    try {
      // Seed in order (respecting foreign key constraints)
      console.log('  Seeding permissions...');
      const permissionsCount = await this.seedPermissions();

      console.log('  Seeding roles...');
      const rolesCount = await this.seedRoles();

      console.log('  Seeding role-permissions...');
      const rolePermissionsCount = await this.seedRolePermissions();

      console.log('  Seeding users...');
      const usersCount = await this.seedUsers();

      // Count user_roles from users seeded
      const userRolesResult = await this.pool.query('SELECT COUNT(*) FROM user_roles');
      const userRolesCount = parseInt(userRolesResult.rows[0].count, 10);

      console.log('Seeding completed successfully.');

      return {
        success: true,
        message: 'Database seeded successfully',
        counts: {
          users: usersCount,
          roles: rolesCount,
          permissions: permissionsCount,
          userRoles: userRolesCount,
          rolePermissions: rolePermissionsCount,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Seeding failed:', errorMessage);

      return {
        success: false,
        message: 'Database seeding failed',
        error: errorMessage,
      };
    }
  }

  /**
   * Clear all seeded data (for testing)
   */
  async clear(): Promise<SeedResult> {
    console.log('Clearing seeded data...');

    try {
      // Delete in reverse order (respecting foreign key constraints)
      await this.pool.query('DELETE FROM user_roles');
      await this.pool.query('DELETE FROM role_permissions');
      await this.pool.query('DELETE FROM refresh_tokens');
      await this.pool.query('DELETE FROM users');
      await this.pool.query('DELETE FROM roles');
      await this.pool.query('DELETE FROM permissions');

      console.log('Seeded data cleared successfully.');

      return {
        success: true,
        message: 'Seeded data cleared successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Clear failed:', errorMessage);

      return {
        success: false,
        message: 'Failed to clear seeded data',
        error: errorMessage,
      };
    }
  }
}

export default Seeder;
