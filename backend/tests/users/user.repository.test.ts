/**
 * User Repository Unit Tests
 * STORY-025: Benutzerdaten (User Data Storage)
 *
 * Unit tests for UserRepository with mocked database.
 */

import { UserRepository, UserFilter, PaginationOptions } from '../../src/users/user.repository';
import { DatabaseService } from '../../src/database/database.service';
import { User, UserStatus } from '../../src/database/types';

// Mock the DatabaseService
const mockQuery = jest.fn();
const mockPool = {
  query: mockQuery,
};

const mockDatabaseService = {
  getPool: jest.fn().mockReturnValue(mockPool),
} as unknown as DatabaseService;

describe('UserRepository', () => {
  let repository: UserRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new UserRepository(mockDatabaseService);
  });

  // Sample user data for testing
  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    password_hash: '$2b$12$hashedpassword',
    name: 'Test User',
    status: 'active' as UserStatus,
    mfa_enabled: false,
    mfa_secret: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    last_login: null,
    deleted_at: null,
  };

  describe('findById', () => {
    it('should return user when found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await repository.findById(1);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [1],
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email (case-insensitive)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await repository.findByEmail('TEST@EXAMPLE.COM');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
        ['TEST@EXAMPLE.COM'],
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when email not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated results with defaults', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: [mockUser] });

      const result = await repository.findAll();

      expect(result).toEqual({
        data: [mockUser],
        total: 10,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should apply status filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [] });

      const filter: UserFilter = { status: 'active' };
      await repository.findAll(filter);

      expect(mockQuery.mock.calls[0][0]).toContain('status = $');
      expect(mockQuery.mock.calls[0][1]).toContain('active');
    });

    it('should apply search filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({ rows: [] });

      const filter: UserFilter = { search: 'john' };
      await repository.findAll(filter);

      expect(mockQuery.mock.calls[0][0]).toContain('email ILIKE');
      expect(mockQuery.mock.calls[0][0]).toContain('name ILIKE');
      expect(mockQuery.mock.calls[0][1]).toContain('%john%');
    });

    it('should include deleted users when requested', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '15' }] })
        .mockResolvedValueOnce({ rows: [] });

      const filter: UserFilter = { include_deleted: true };
      await repository.findAll(filter);

      // Should NOT contain deleted_at IS NULL
      expect(mockQuery.mock.calls[0][0]).not.toContain('deleted_at IS NULL');
    });

    it('should apply pagination options', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({ rows: [] });

      const pagination: PaginationOptions = {
        page: 3,
        limit: 10,
        sortField: 'email',
        sortOrder: 'asc',
      };
      const result = await repository.findAll({}, pagination);

      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(10);
      expect(mockQuery.mock.calls[1][0]).toContain('ORDER BY email ASC');
      expect(mockQuery.mock.calls[1][1]).toContain(10); // limit
      expect(mockQuery.mock.calls[1][1]).toContain(20); // offset (page 3, 10 per page = 20)
    });

    it('should use default sort field for invalid field', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: [] });

      const pagination: PaginationOptions = {
        sortField: 'invalid_field', // SQL injection attempt
      };
      await repository.findAll({}, pagination);

      expect(mockQuery.mock.calls[1][0]).toContain('ORDER BY created_at');
    });
  });

  describe('create', () => {
    it('should create a user with default values', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });

      const userData = {
        email: 'new@example.com',
        password_hash: '$2b$12$newhash',
        name: 'New User',
      };

      const result = await repository.create(userData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        [
          'new@example.com',
          '$2b$12$newhash',
          'New User',
          'active',
          false,
          null,
        ],
      );
      expect(result).toEqual(mockUser);
    });

    it('should lowercase email on create', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });

      const userData = {
        email: 'NEW@EXAMPLE.COM',
        password_hash: '$2b$12$hash',
        name: 'New User',
      };

      await repository.create(userData);

      expect(mockQuery.mock.calls[0][1][0]).toBe('new@example.com');
    });

    it('should accept custom status and mfa settings', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });

      const userData = {
        email: 'new@example.com',
        password_hash: '$2b$12$hash',
        name: 'New User',
        status: 'inactive' as UserStatus,
        mfa_enabled: true,
        mfa_secret: 'secret123',
      };

      await repository.create(userData);

      expect(mockQuery.mock.calls[0][1]).toEqual([
        'new@example.com',
        '$2b$12$hash',
        'New User',
        'inactive',
        true,
        'secret123',
      ]);
    });
  });

  describe('update', () => {
    it('should update specified fields only', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      mockQuery.mockResolvedValueOnce({ rows: [updatedUser] });

      const result = await repository.update(1, { name: 'Updated Name' });

      expect(mockQuery.mock.calls[0][0]).toContain('name = $1');
      expect(mockQuery.mock.calls[0][0]).toContain('updated_at = NOW()');
      expect(result).toEqual(updatedUser);
    });

    it('should return existing user if no updates provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await repository.update(1, {});

      // Should call findById instead of update
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [1],
      );
      expect(result).toEqual(mockUser);
    });

    it('should lowercase email on update', async () => {
      const updatedUser = { ...mockUser, email: 'updated@example.com' };
      mockQuery.mockResolvedValueOnce({ rows: [updatedUser] });

      await repository.update(1, { email: 'UPDATED@EXAMPLE.COM' });

      expect(mockQuery.mock.calls[0][1][0]).toBe('updated@example.com');
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.update(999, { name: 'New Name' });

      expect(result).toBeNull();
    });
  });

  describe('updateLastLogin', () => {
    it('should update last_login timestamp', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      await repository.updateLastLogin(1);

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1',
        [1],
      );
    });
  });

  describe('softDelete', () => {
    it('should set deleted_at and status', async () => {
      const deletedUser = { ...mockUser, status: 'deleted' as UserStatus, deleted_at: new Date() };
      mockQuery.mockResolvedValueOnce({ rows: [deletedUser] });

      const result = await repository.softDelete(1);

      expect(mockQuery.mock.calls[0][0]).toContain('deleted_at = NOW()');
      expect(mockQuery.mock.calls[0][0]).toContain("status = 'deleted'");
      expect(result?.status).toBe('deleted');
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.softDelete(999);

      expect(result).toBeNull();
    });
  });

  describe('restore', () => {
    it('should clear deleted_at and set status to inactive', async () => {
      const restoredUser = { ...mockUser, status: 'inactive' as UserStatus, deleted_at: null };
      mockQuery.mockResolvedValueOnce({ rows: [restoredUser] });

      const result = await repository.restore(1);

      expect(mockQuery.mock.calls[0][0]).toContain('deleted_at = NULL');
      expect(mockQuery.mock.calls[0][0]).toContain("status = 'inactive'");
      expect(result?.status).toBe('inactive');
    });
  });

  describe('hardDelete', () => {
    it('should permanently delete user', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await repository.hardDelete(1);

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = $1',
        [1],
      );
      expect(result).toBe(true);
    });

    it('should return false when user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await repository.hardDelete(999);

      expect(result).toBe(false);
    });
  });

  describe('isEmailUnique', () => {
    it('should return true for unique email', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const result = await repository.isEmailUnique('unique@example.com');

      expect(result).toBe(true);
    });

    it('should return false for duplicate email', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const result = await repository.isEmailUnique('existing@example.com');

      expect(result).toBe(false);
    });

    it('should exclude specific user ID when checking', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await repository.isEmailUnique('test@example.com', 1);

      expect(mockQuery.mock.calls[0][0]).toContain('id != $2');
      expect(mockQuery.mock.calls[0][1]).toContain(1);
    });
  });

  describe('countByStatus', () => {
    it('should return counts by status', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { status: 'active', count: '10' },
          { status: 'inactive', count: '5' },
          { status: 'deleted', count: '2' },
        ],
      });

      const result = await repository.countByStatus();

      expect(result).toEqual({
        active: 10,
        inactive: 5,
        suspended: 0,
        deleted: 2,
      });
    });
  });

  describe('count', () => {
    it('should return count excluding deleted by default', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '100' }] });

      const result = await repository.count();

      expect(mockQuery.mock.calls[0][0]).toContain('WHERE deleted_at IS NULL');
      expect(result).toBe(100);
    });

    it('should include deleted when requested', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '120' }] });

      const result = await repository.count(true);

      expect(mockQuery.mock.calls[0][0]).not.toContain('WHERE');
      expect(result).toBe(120);
    });
  });

  describe('error handling', () => {
    it('should throw error when pool is not available', async () => {
      const badDatabaseService = {
        getPool: jest.fn().mockReturnValue(null),
      } as unknown as DatabaseService;

      const badRepository = new UserRepository(badDatabaseService);

      await expect(badRepository.findById(1)).rejects.toThrow('Database pool not available');
    });
  });
});
