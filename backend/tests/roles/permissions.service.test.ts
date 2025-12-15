/**
 * Permissions Service Unit Tests
 * STORY-007A: Rollen-Management Backend
 *
 * Tests for PermissionsService operations.
 */

import { PermissionsService } from '../../src/roles/permissions.service';
import { NotFoundException } from '@nestjs/common';

// Mock dependencies
const mockPool = {
  query: jest.fn(),
};

const mockDatabaseService = {
  getPool: jest.fn(() => mockPool),
};

const mockLogger = {
  log: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
};

describe('PermissionsService', () => {
  let service: PermissionsService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new PermissionsService(
      mockDatabaseService as any,
      mockLogger as any,
    );
  });

  describe('findAll', () => {
    it('should return all permissions', async () => {
      const mockPermissions = [
        { id: 1, name: 'users.read', description: 'Read users', category: 'users' },
        { id: 2, name: 'users.create', description: 'Create users', category: 'users' },
        { id: 3, name: 'roles.read', description: 'Read roles', category: 'roles' },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockPermissions });

      const result = await service.findAll();

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('users.read');
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM permissions ORDER BY category, name',
      );
    });

    it('should return empty array when no permissions exist', async () => {
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
    it('should return a single permission', async () => {
      const mockPermission = { id: 1, name: 'users.read', description: 'Read users', category: 'users' };

      mockPool.query.mockResolvedValueOnce({ rows: [mockPermission] });

      const result = await service.findOne(1);

      expect(result.id).toBe(1);
      expect(result.name).toBe('users.read');
    });

    it('should throw NotFoundException if permission does not exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByName', () => {
    it('should return permission by name', async () => {
      const mockPermission = { id: 1, name: 'users.read', description: 'Read users', category: 'users' };

      mockPool.query.mockResolvedValueOnce({ rows: [mockPermission] });

      const result = await service.findByName('users.read');

      expect(result).toBeDefined();
      expect(result?.name).toBe('users.read');
    });

    it('should return null if permission not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.findByName('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAllGroupedByCategory', () => {
    it('should return permissions grouped by category', async () => {
      const mockPermissions = [
        { id: 1, name: 'users.read', description: 'Read users', category: 'users' },
        { id: 2, name: 'users.create', description: 'Create users', category: 'users' },
        { id: 3, name: 'roles.read', description: 'Read roles', category: 'roles' },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockPermissions });

      const result = await service.findAllGroupedByCategory();

      expect(result.total).toBe(3);
      expect(Object.keys(result.categories)).toContain('users');
      expect(Object.keys(result.categories)).toContain('roles');
      expect(result.categories['users']).toHaveLength(2);
      expect(result.categories['roles']).toHaveLength(1);
    });

    it('should group permissions with null category as "other"', async () => {
      const mockPermissions = [
        { id: 1, name: 'custom.permission', description: 'Custom', category: null },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockPermissions });

      const result = await service.findAllGroupedByCategory();

      expect(result.categories['other']).toHaveLength(1);
    });
  });

  describe('findByCategory', () => {
    it('should return permissions in a specific category', async () => {
      const mockPermissions = [
        { id: 1, name: 'users.read', description: 'Read users', category: 'users' },
        { id: 2, name: 'users.create', description: 'Create users', category: 'users' },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockPermissions });

      const result = await service.findByCategory('users');

      expect(result).toHaveLength(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM permissions WHERE category = $1 ORDER BY name',
        ['users'],
      );
    });

    it('should return empty array for category with no permissions', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.findByCategory('nonexistent');

      expect(result).toHaveLength(0);
    });
  });

  describe('getCategories', () => {
    it('should return all unique categories', async () => {
      const mockCategories = [
        { category: 'permissions' },
        { category: 'roles' },
        { category: 'settings' },
        { category: 'system' },
        { category: 'users' },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockCategories });

      const result = await service.getCategories();

      expect(result).toHaveLength(5);
      expect(result).toContain('users');
      expect(result).toContain('roles');
    });

    it('should filter out null categories', async () => {
      const mockCategories = [
        { category: 'users' },
        { category: null },
        { category: 'roles' },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockCategories });

      const result = await service.getCategories();

      expect(result).toHaveLength(2);
      expect(result).not.toContain(null);
    });
  });

  describe('userHasPermission', () => {
    it('should return true if user has the permission', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const result = await service.userHasPermission(1, 'users.read');

      expect(result).toBe(true);
    });

    it('should return false if user does not have the permission', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const result = await service.userHasPermission(1, 'admin.delete');

      expect(result).toBe(false);
    });
  });

  describe('getUserPermissions', () => {
    it('should return all permissions for a user', async () => {
      const mockPermissions = [
        { id: 1, name: 'users.read', description: 'Read users', category: 'users' },
        { id: 2, name: 'roles.read', description: 'Read roles', category: 'roles' },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockPermissions });

      const result = await service.getUserPermissions(1);

      expect(result).toHaveLength(2);
    });

    it('should return empty array if user has no permissions', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getUserPermissions(1);

      expect(result).toHaveLength(0);
    });
  });
});
