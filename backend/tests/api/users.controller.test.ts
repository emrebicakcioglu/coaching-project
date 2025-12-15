/**
 * Users Controller Unit Tests
 * STORY-021B: Resource Endpoints
 * STORY-003A: User CRUD Backend API
 *
 * Tests for user CRUD endpoints.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UsersController } from '../../src/users/users.controller';
import { UsersService } from '../../src/users/users.service';
import { CreateUserDto } from '../../src/users/dto/create-user.dto';
import { UpdateUserDto } from '../../src/users/dto/update-user.dto';
import { ListUsersQueryDto } from '../../src/users/dto/list-users-query.dto';
import { UserResponseDto } from '../../src/users/dto/user-response.dto';
import { AuthenticatedRequest } from '../../src/common/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/common/guards/roles.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockRequest = {
    user: { id: 1, email: 'admin@example.com' },
    requestId: 'test-request-id',
  } as AuthenticatedRequest;

  const mockUserResponse: UserResponseDto = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    status: 'active',
    mfa_enabled: false,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    last_login: null,
    deleted_at: null,
    roles: [{ id: 1, name: 'user', description: 'Standard user' }],
  };

  const mockPaginatedResponse = {
    data: [mockUserResponse],
    pagination: {
      page: 1,
      limit: 20,
      total: 1,
      pages: 1,
    },
  };

  const mockUsersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    restore: jest.fn(),
    adminResetPassword: jest.fn(),
    assignRoles: jest.fn(),
    removeRoles: jest.fn(),
  };

  // Mock guards that always allow access
  const mockJwtAuthGuard = { canActivate: jest.fn().mockReturnValue(true) };
  const mockRolesGuard = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated list of users', async () => {
      mockUsersService.findAll.mockResolvedValue(mockPaginatedResponse);

      const query: ListUsersQueryDto = {};
      const result = await controller.findAll(query);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should pass query parameters to service', async () => {
      mockUsersService.findAll.mockResolvedValue(mockPaginatedResponse);

      const query: ListUsersQueryDto = {
        page: 2,
        limit: 10,
        status: 'active',
        search: 'test',
        sort: 'email:asc',
      };
      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('should return a single user', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUserResponse);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockUserResponse);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersService.findOne.mockRejectedValue(
        new NotFoundException('User with ID 999 not found'),
      );

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      mockUsersService.create.mockResolvedValue(mockUserResponse);

      const createDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      };
      const result = await controller.create(createDto, mockRequest);

      expect(result).toEqual(mockUserResponse);
      expect(service.create).toHaveBeenCalledWith(createDto, mockRequest);
    });

    it('should throw ConflictException when email already exists', async () => {
      mockUsersService.create.mockRejectedValue(
        new ConflictException('User with email test@example.com already exists'),
      );

      const createDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      };

      await expect(controller.create(createDto, mockRequest)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updatedUser = { ...mockUserResponse, name: 'Updated Name' };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const updateDto: UpdateUserDto = { name: 'Updated Name' };
      const result = await controller.update(1, updateDto, mockRequest);

      expect(result).toEqual(updatedUser);
      expect(service.update).toHaveBeenCalledWith(1, updateDto, mockRequest);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersService.update.mockRejectedValue(
        new NotFoundException('User with ID 999 not found'),
      );

      await expect(controller.update(999, { name: 'Test' }, mockRequest)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should soft delete a user', async () => {
      const deletedUser = { ...mockUserResponse, status: 'deleted' as const };
      mockUsersService.delete.mockResolvedValue(deletedUser);

      const result = await controller.delete(1, mockRequest);

      expect(result).toEqual(deletedUser);
      expect(service.delete).toHaveBeenCalledWith(1, mockRequest);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersService.delete.mockRejectedValue(
        new NotFoundException('User with ID 999 not found'),
      );

      await expect(controller.delete(999, mockRequest)).rejects.toThrow(NotFoundException);
    });
  });

  describe('restore', () => {
    it('should restore a soft-deleted user', async () => {
      const restoredUser = { ...mockUserResponse, status: 'inactive' as const, deleted_at: null };
      mockUsersService.restore.mockResolvedValue(restoredUser);

      const result = await controller.restore(1, mockRequest);

      expect(result).toEqual(restoredUser);
      expect(service.restore).toHaveBeenCalledWith(1, mockRequest);
    });
  });

  describe('resetPassword', () => {
    it('should reset user password', async () => {
      mockUsersService.adminResetPassword.mockResolvedValue(mockUserResponse);

      const result = await controller.resetPassword(
        1,
        { new_password: 'NewPassword123' },
        mockRequest,
      );

      expect(result).toEqual(mockUserResponse);
      expect(service.adminResetPassword).toHaveBeenCalledWith(1, 'NewPassword123', mockRequest);
    });
  });

  describe('assignRoles', () => {
    it('should assign roles to user', async () => {
      mockUsersService.assignRoles.mockResolvedValue(undefined);

      const result = await controller.assignRoles(1, ['admin'], mockRequest);

      expect(result).toEqual({ message: 'Roles assigned successfully' });
      expect(service.assignRoles).toHaveBeenCalledWith(1, ['admin'], mockRequest);
    });
  });

  describe('removeRoles', () => {
    it('should remove roles from user', async () => {
      mockUsersService.removeRoles.mockResolvedValue(undefined);

      const result = await controller.removeRoles(1, ['admin'], mockRequest);

      expect(result).toEqual({ message: 'Roles removed successfully' });
      expect(service.removeRoles).toHaveBeenCalledWith(1, ['admin'], mockRequest);
    });
  });
});
