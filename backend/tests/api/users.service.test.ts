/**
 * Users Service Unit Tests
 * STORY-021B: Resource Endpoints
 * STORY-003A: User CRUD Backend API
 *
 * Tests for user CRUD operations, pagination, filtering, sorting,
 * soft delete, role management, and audit logging.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../../src/users/users.service';
import { DatabaseService } from '../../src/database/database.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';
import { AuditService } from '../../src/common/services/audit.service';
import { CreateUserDto } from '../../src/users/dto/create-user.dto';
import { UpdateUserDto } from '../../src/users/dto/update-user.dto';
import { ListUsersQueryDto } from '../../src/users/dto/list-users-query.dto';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('UsersService', () => {
  let service: UsersService;

  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  const mockPool = {
    query: jest.fn(),
    connect: jest.fn().mockResolvedValue(mockClient),
  };

  const mockDatabaseService = {
    getPool: jest.fn().mockReturnValue(mockPool),
    query: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(null),
    logRoleAssignment: jest.fn().mockResolvedValue(null),
  };

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    password_hash: 'hashed_password',
    name: 'Test User',
    status: 'active',
    mfa_enabled: false,
    mfa_secret: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    last_login: null,
    deleted_at: null,
  };

  const mockRole = {
    id: 1,
    name: 'user',
    description: 'Standard user',
  };

  beforeEach(async () => {
    process.env.BCRYPT_ROUNDS = '12';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: WinstonLoggerService,
          useValue: mockLogger,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated users with default parameters', async () => {
      const mockUsers = [mockUser];
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // Count query
        .mockResolvedValueOnce({ rows: mockUsers }) // Data query
        .mockResolvedValueOnce({ rows: [] }); // Roles query

      const query: ListUsersQueryDto = {};
      const result = await service.findAll(query);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].email).toBe('test@example.com');
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.pages).toBe(1);
    });

    it('should filter users by status', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [] });

      const query: ListUsersQueryDto = { status: 'active' };
      const result = await service.findAll(query);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('u.status = $'),
        expect.arrayContaining(['active']),
      );
      expect(result.data).toHaveLength(1);
    });

    it('should search users by email or name', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [] });

      const query: ListUsersQueryDto = { search: 'test' };
      const result = await service.findAll(query);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['%test%']),
      );
      expect(result.data).toHaveLength(1);
    });

    it('should filter by role', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [] });

      const query: ListUsersQueryDto = { role: 'admin' };
      await service.findAll(query);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INNER JOIN user_roles'),
        expect.arrayContaining(['admin']),
      );
    });

    it('should exclude deleted users by default', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [] });

      const query: ListUsersQueryDto = {};
      await service.findAll(query);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('u.deleted_at IS NULL'),
        expect.any(Array),
      );
    });

    it('should include deleted users when requested', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [] });

      const query: ListUsersQueryDto = { include_deleted: true };
      await service.findAll(query);

      // The query should NOT contain deleted_at IS NULL
      const countCall = mockPool.query.mock.calls[0];
      expect(countCall[0]).not.toContain('deleted_at IS NULL');
    });

    it('should sort users by specified field', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [] });

      const query: ListUsersQueryDto = { sort: 'email:asc' };
      const result = await service.findAll(query);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY u.email ASC'),
        expect.any(Array),
      );
      expect(result.data).toHaveLength(1);
    });

    it('should handle pagination correctly', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [] });

      const query: ListUsersQueryDto = { page: 2, limit: 10 };
      const result = await service.findAll(query);

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(100);
      expect(result.pagination.pages).toBe(10);
    });

    it('should throw error when database pool is not available', async () => {
      mockDatabaseService.getPool.mockReturnValueOnce(null);

      await expect(service.findAll({})).rejects.toThrow('Database pool not available');
    });
  });

  describe('findOne', () => {
    it('should return a user by ID with roles', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [mockRole] });

      const result = await service.findOne(1);

      expect(result.id).toBe(1);
      expect(result.email).toBe('test@example.com');
      expect(result.roles).toEqual([mockRole]);
      // Should not include password_hash
      expect((result as any).password_hash).toBeUndefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await service.findByEmail('test@example.com');

      expect(result?.email).toBe('test@example.com');
    });

    it('should return null when user not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });

    it('should lowercase email for case-insensitive search', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });

      await service.findByEmail('TEST@EXAMPLE.COM');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['test@example.com'],
      );
    });
  });

  describe('create', () => {
    it('should create a new user with default role', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // findByEmail
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockUser] }) // INSERT user
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // SELECT role
        .mockResolvedValueOnce({}) // INSERT user_role
        .mockResolvedValueOnce({}); // COMMIT
      mockPool.query.mockResolvedValueOnce({ rows: [mockRole] }); // attachRolesToUser

      const createDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      };

      const result = await service.create(createDto);

      expect(result.email).toBe('test@example.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123', 12);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_CREATE',
          resource: 'user',
        }),
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] }); // findByEmail

      const createDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      };

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should create user with specified roles', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // findByEmail
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockUser] }) // INSERT user
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // SELECT admin role
        .mockResolvedValueOnce({}) // INSERT user_role admin
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // SELECT user role
        .mockResolvedValueOnce({}) // INSERT user_role user
        .mockResolvedValueOnce({}); // COMMIT
      mockPool.query.mockResolvedValueOnce({ rows: [mockRole] }); // attachRolesToUser

      const createDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
        roles: ['admin', 'user'],
      };

      await service.create(createDto);

      // Verify role lookups were performed
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM roles'),
        ['admin'],
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM roles'),
        ['user'],
      );
    });

    it('should lowercase email before storing', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // findByEmail
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockUser] }) // INSERT
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // SELECT role
        .mockResolvedValueOnce({}) // INSERT user_role
        .mockResolvedValueOnce({}); // COMMIT
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // attachRolesToUser

      const createDto: CreateUserDto = {
        email: 'TEST@EXAMPLE.COM',
        password: 'Password123',
        name: 'Test User',
      };

      await service.create(createDto);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['test@example.com']),
      );
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // findById
        .mockResolvedValueOnce({ rows: [updatedUser] }) // UPDATE
        .mockResolvedValueOnce({ rows: [mockRole] }); // attachRolesToUser

      const updateDto: UpdateUserDto = { name: 'Updated Name' };
      const result = await service.update(1, updateDto);

      expect(result.name).toBe('Updated Name');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_UPDATE',
          resource: 'user',
        }),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.update(999, { name: 'Test' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when updating deleted user', async () => {
      const deletedUser = { ...mockUser, deleted_at: new Date() };
      mockPool.query.mockResolvedValue({ rows: [deletedUser] });

      await expect(service.update(1, { name: 'Test' })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with correct message when updating deleted user', async () => {
      const deletedUser = { ...mockUser, deleted_at: new Date() };
      mockPool.query.mockResolvedValue({ rows: [deletedUser] });

      await expect(service.update(1, { name: 'Test' })).rejects.toThrow('Cannot update a deleted user');
    });

    it('should throw ConflictException when updating to existing email', async () => {
      const existingUser = { ...mockUser, id: 2 };
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // findById
        .mockResolvedValueOnce({ rows: [existingUser] }); // findByEmail

      const updateDto: UpdateUserDto = { email: 'existing@example.com' };

      await expect(service.update(1, updateDto)).rejects.toThrow(ConflictException);
    });

    it('should hash password when updating password', async () => {
      const updatedUser = { ...mockUser };
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [updatedUser] })
        .mockResolvedValueOnce({ rows: [] });

      const updateDto: UpdateUserDto = { password: 'NewPassword123' };
      await service.update(1, updateDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123', 12);
    });
  });

  describe('delete (soft delete)', () => {
    it('should soft delete a user', async () => {
      const deletedUser = { ...mockUser, deleted_at: new Date(), status: 'deleted' };
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // findById
        .mockResolvedValueOnce({ rows: [deletedUser] }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }); // attachRolesToUser

      const result = await service.delete(1);

      expect(result.status).toBe('deleted');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at = NOW()'),
        [1],
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_DELETE',
          resource: 'user',
        }),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user is already deleted', async () => {
      const deletedUser = { ...mockUser, deleted_at: new Date() };
      mockPool.query.mockResolvedValue({ rows: [deletedUser] });

      await expect(service.delete(1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with message when user is already deleted', async () => {
      const deletedUser = { ...mockUser, deleted_at: new Date() };
      mockPool.query.mockResolvedValue({ rows: [deletedUser] });

      await expect(service.delete(1)).rejects.toThrow('User is already deleted');
    });
  });

  describe('restore', () => {
    it('should restore a soft-deleted user', async () => {
      const deletedUser = { ...mockUser, deleted_at: new Date(), status: 'deleted' };
      const restoredUser = { ...mockUser, deleted_at: null, status: 'inactive' };
      mockPool.query
        .mockResolvedValueOnce({ rows: [deletedUser] }) // findById
        .mockResolvedValueOnce({ rows: [restoredUser] }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }); // attachRolesToUser

      const result = await service.restore(1);

      expect(result.status).toBe('inactive');
      expect(result.deleted_at).toBeNull();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_RESTORE',
          resource: 'user',
        }),
      );
    });

    it('should throw BadRequestException when user is not deleted', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockUser] });

      await expect(service.restore(1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with message when user is not deleted', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockUser] });

      await expect(service.restore(1)).rejects.toThrow('User is not deleted');
    });
  });

  describe('adminResetPassword', () => {
    it('should reset user password', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // findById
        .mockResolvedValueOnce({ rows: [mockUser] }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }); // attachRolesToUser

      await service.adminResetPassword(1, 'NewTempPass123');

      expect(bcrypt.hash).toHaveBeenCalledWith('NewTempPass123', 12);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_PASSWORD_RESET_BY_ADMIN',
        }),
      );
    });

    it('should throw BadRequestException for deleted user', async () => {
      const deletedUser = { ...mockUser, deleted_at: new Date() };
      mockPool.query.mockResolvedValueOnce({ rows: [deletedUser] });

      await expect(service.adminResetPassword(1, 'NewPass123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('hasRole', () => {
    it('should return true when user has role', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const result = await service.hasRole(1, 'admin');

      expect(result).toBe(true);
    });

    it('should return false when user does not have role', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const result = await service.hasRole(1, 'admin');

      expect(result).toBe(false);
    });
  });

  describe('assignRoles', () => {
    it('should assign roles to user', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // findById
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'admin' }] }) // SELECT role
        .mockResolvedValueOnce({}); // INSERT user_role

      await service.assignRoles(1, ['admin']);

      expect(mockAuditService.logRoleAssignment).toHaveBeenCalled();
    });

    it('should throw BadRequestException for non-existent role', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // findById
        .mockResolvedValueOnce({ rows: [] }); // SELECT role (not found)

      await expect(service.assignRoles(1, ['nonexistent'])).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeRoles', () => {
    it('should remove roles from user', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // findById
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'admin' }] }) // SELECT role
        .mockResolvedValueOnce({}); // DELETE user_role

      await service.removeRoles(1, ['admin']);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ROLE_REVOKE',
        }),
      );
    });

    it('should skip non-existent roles silently', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // findById
        .mockResolvedValueOnce({ rows: [] }); // SELECT role (not found)

      // Should not throw
      await expect(service.removeRoles(1, ['nonexistent'])).resolves.not.toThrow();
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.updateLastLogin(1);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET last_login = NOW()'),
        [1],
      );
    });
  });
});
