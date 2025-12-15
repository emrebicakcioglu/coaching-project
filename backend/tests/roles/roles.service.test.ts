/**
 * Roles Service Unit Tests
 * STORY-007A: Rollen-Management Backend
 *
 * Tests for RolesService CRUD operations, permission validation,
 * and system role protection.
 */

import { RolesService } from '../../src/roles/roles.service';
import { NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';

// Mock dependencies
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
};

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

const mockDatabaseService = {
  getPool: jest.fn(() => mockPool),
};

const mockLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
};

const mockAuditService = {
  log: jest.fn(),
};

describe('RolesService', () => {
  let service: RolesService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

    service = new RolesService(
      mockDatabaseService as any,
      mockLogger as any,
      mockAuditService as any,
    );
  });

  describe('findAll', () => {
    it('should return all roles with user counts and permissions', async () => {
      const mockRoles = [
        { id: 1, name: 'admin', description: 'Admin role', is_system: true, user_count: '5', created_at: new Date() },
        { id: 2, name: 'user', description: 'User role', is_system: true, user_count: '10', created_at: new Date() },
      ];

      const mockPermissions = [
        { id: 1, name: 'users.read', description: 'Read users', category: 'users' },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockRoles })
        .mockResolvedValue({ rows: mockPermissions });

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('admin');
      expect(result[0].userCount).toBe(5);
      expect(result[0].is_system).toBe(true);
      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should handle empty roles list', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.findAll();

      expect(result).toHaveLength(0);
    });

    it('should throw error if database pool is not available', async () => {
      mockDatabaseService.getPool.mockReturnValueOnce(null as never);

      await expect(service.findAll()).rejects.toThrow('Database pool not available');
    });
  });

  describe('findOne', () => {
    it('should return a single role with permissions', async () => {
      const mockRole = {
        id: 1,
        name: 'admin',
        description: 'Admin role',
        is_system: true,
        user_count: '5',
        created_at: new Date(),
      };

      const mockPermissions = [
        { id: 1, name: 'users.read', description: 'Read users', category: 'users' },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockRole] })
        .mockResolvedValueOnce({ rows: mockPermissions });

      const result = await service.findOne(1);

      expect(result.id).toBe(1);
      expect(result.name).toBe('admin');
      expect(result.is_system).toBe(true);
      expect(result.permissions).toBeDefined();
    });

    it('should throw NotFoundException if role does not exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByName', () => {
    it('should return role by name', async () => {
      const mockRole = { id: 1, name: 'admin', description: 'Admin', created_at: new Date() };
      mockPool.query.mockResolvedValueOnce({ rows: [mockRole] });

      const result = await service.findByName('admin');

      expect(result).toBeDefined();
      expect(result?.name).toBe('admin');
    });

    it('should return null if role not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.findByName('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new role', async () => {
      const createDto = { name: 'moderator', description: 'Moderator role' };
      const mockRole = { id: 3, name: 'moderator', description: 'Moderator role', is_system: false, created_at: new Date() };

      // findByName returns null (role doesn't exist)
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      // Transaction queries
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockRole] }) // INSERT
        .mockResolvedValueOnce({}); // COMMIT

      // findOne queries for return
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ ...mockRole, user_count: '0' }] })
        .mockResolvedValueOnce({ rows: [] }); // permissions

      const result = await service.create(createDto);

      expect(result.name).toBe('moderator');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should throw ConflictException if role name exists', async () => {
      const createDto = { name: 'admin', description: 'Admin role' };

      // findByName returns existing role
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'admin', created_at: new Date() }],
      });

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should validate permission IDs if provided', async () => {
      const createDto = { name: 'newrole', permissionIds: [1, 2, 999] };

      // findByName returns null
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      // Permission validation returns only 2 valid IDs
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] });

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should rollback transaction on error', async () => {
      const createDto = { name: 'newrole' };

      mockPool.query.mockResolvedValueOnce({ rows: [] }); // findByName
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // INSERT fails

      await expect(service.create(createDto)).rejects.toThrow('Database error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('update', () => {
    it('should update an existing role', async () => {
      const updateDto = { name: 'updated-name', description: 'Updated description' };
      const existingRole = { id: 1, name: 'oldrole', description: 'Old', is_system: false, created_at: new Date() };
      const updatedRole = { ...existingRole, name: 'updated-name', description: 'Updated description' };

      // findOneRaw
      mockPool.query.mockResolvedValueOnce({ rows: [existingRole] });
      // findByName for name conflict check
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      // Transaction
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [updatedRole] }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      // findOne for return
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ ...updatedRole, user_count: '0' }] })
        .mockResolvedValueOnce({ rows: [] }); // permissions

      const result = await service.update(1, updateDto);

      expect(result.name).toBe('updated-name');
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException if role does not exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.update(999, { name: 'newname' })).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if new name conflicts', async () => {
      const existingRole = { id: 1, name: 'oldrole', created_at: new Date() };
      const conflictingRole = { id: 2, name: 'existingrole', created_at: new Date() };

      mockPool.query
        .mockResolvedValueOnce({ rows: [existingRole] }) // findOneRaw
        .mockResolvedValueOnce({ rows: [conflictingRole] }); // findByName - conflict

      await expect(service.update(1, { name: 'existingrole' })).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('should delete a non-system role', async () => {
      const mockRole = {
        id: 3,
        name: 'custom-role',
        description: 'Custom',
        is_system: false,
        user_count: '0',
        created_at: new Date(),
      };

      // findOne
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockRole] })
        .mockResolvedValueOnce({ rows: [] }); // permissions

      // DELETE
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.delete(3);

      expect(result.message).toContain('custom-role');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ROLE_DELETE' }),
      );
    });

    it('should throw ForbiddenException for system roles', async () => {
      const systemRole = {
        id: 1,
        name: 'admin',
        description: 'Admin',
        is_system: true,
        user_count: '5',
        created_at: new Date(),
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [systemRole] })
        .mockResolvedValueOnce({ rows: [] }); // permissions

      await expect(service.delete(1)).rejects.toThrow(ForbiddenException);
    });

    it('should warn when deleting role with assigned users', async () => {
      const roleWithUsers = {
        id: 3,
        name: 'custom-role',
        is_system: false,
        user_count: '5',
        created_at: new Date(),
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [roleWithUsers] })
        .mockResolvedValueOnce({ rows: [] }) // permissions
        .mockResolvedValueOnce({ rowCount: 1 }); // DELETE

      await service.delete(3);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('5 assigned users'),
        'RolesService',
      );
    });
  });

  describe('assignPermissions', () => {
    it('should assign permissions to a role', async () => {
      const mockRole = { id: 1, name: 'admin', created_at: new Date() };

      // Setup mock chain: findOneRaw -> validatePermissionIds -> INSERT x2 -> findOne (2 queries)
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockRole] }) // findOneRaw
        .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] }) // validatePermissionIds
        .mockResolvedValueOnce({ rowCount: 1 }) // INSERT permission 1
        .mockResolvedValueOnce({ rowCount: 1 }) // INSERT permission 2
        .mockResolvedValueOnce({ rows: [{ ...mockRole, user_count: '0' }] }) // findOne main query
        .mockResolvedValueOnce({ rows: [] }); // findOne permissions query

      const result = await service.assignPermissions(1, [1, 2]);

      expect(result).toBeDefined();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PERMISSION_CHANGE' }),
      );
    });

    it('should throw NotFoundException if role does not exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.assignPermissions(999, [1, 2])).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid permission IDs', async () => {
      const mockRole = { id: 1, name: 'admin', created_at: new Date() };

      mockPool.query.mockResolvedValueOnce({ rows: [mockRole] }); // findOneRaw
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // only 1 valid

      await expect(service.assignPermissions(1, [1, 999])).rejects.toThrow(BadRequestException);
    });
  });

  describe('removePermissions', () => {
    it('should remove permissions from a role', async () => {
      const mockRole = { id: 1, name: 'admin', created_at: new Date() };

      // Setup mock chain: findOneRaw -> DELETE x2 -> findOne (2 queries)
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockRole] }) // findOneRaw
        .mockResolvedValueOnce({ rowCount: 1 }) // DELETE permission 1
        .mockResolvedValueOnce({ rowCount: 1 }) // DELETE permission 2
        .mockResolvedValueOnce({ rows: [{ ...mockRole, user_count: '0' }] }) // findOne main query
        .mockResolvedValueOnce({ rows: [] }); // findOne permissions query

      const result = await service.removePermissions(1, [1, 2]);

      expect(result).toBeDefined();
      expect(mockAuditService.log).toHaveBeenCalled();
    });
  });

  describe('getRolePermissions', () => {
    it('should return permissions for a role', async () => {
      const mockPermissions = [
        { id: 1, name: 'users.read', description: 'Read users', category: 'users' },
        { id: 2, name: 'users.create', description: 'Create users', category: 'users' },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockPermissions });

      const result = await service.getRolePermissions(1);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('users.read');
    });

    it('should return empty array if no permissions', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getRolePermissions(1);

      expect(result).toHaveLength(0);
    });
  });
});
