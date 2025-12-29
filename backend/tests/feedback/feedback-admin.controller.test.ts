/**
 * Feedback Admin Controller Unit Tests
 * STORY-041C: Feedback Admin API
 *
 * Tests for FeedbackAdminController including:
 * - List feedbacks endpoint
 * - Get feedback details endpoint
 * - Get screenshot URL endpoint
 * - Delete feedback endpoint
 * - Authorization (Admin role required)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeedbackAdminController } from '../../src/feedback/feedback-admin.controller';
import { FeedbackAdminService } from '../../src/feedback/feedback-admin.service';
import { JwtAuthGuard, AuthenticatedRequest } from '../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/common/guards/roles.guard';
import { FeedbackStatus } from '../../src/feedback/dto/feedback-list.dto';
import { Request } from 'express';

describe('FeedbackAdminController', () => {
  let controller: FeedbackAdminController;
  let mockFeedbackAdminService: jest.Mocked<FeedbackAdminService>;

  const mockFeedbackListItem = {
    id: 1,
    userId: 10,
    userEmail: 'user@test.com',
    userName: 'Test User',
    comment: 'Test feedback comment',
    commentPreview: 'Test feedback comment',
    route: '/dashboard',
    hasScreenshot: true,
    createdAt: new Date('2025-01-15T10:30:00.000Z'),
  };

  const mockFeedbackDetail = {
    ...mockFeedbackListItem,
    url: 'https://app.test.com/dashboard',
    browserName: 'Chrome',
    browserVersion: '120',
    osName: 'Windows',
    osVersion: '10/11',
    deviceType: 'Desktop',
    screenResolution: '1920x1080',
    language: 'en-US',
    timezone: 'Europe/Berlin',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    screenshotUrl: 'https://minio.test.com/feedback/screenshot.png?presigned',
  };

  const mockRequest = {
    user: { id: 1, email: 'admin@test.com' },
  } as unknown as AuthenticatedRequest;

  beforeEach(async () => {
    mockFeedbackAdminService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      getScreenshotUrl: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<FeedbackAdminService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedbackAdminController],
      providers: [
        { provide: FeedbackAdminService, useValue: mockFeedbackAdminService },
        { provide: Reflector, useValue: new Reflector() },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<FeedbackAdminController>(FeedbackAdminController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('list', () => {
    it('should return paginated feedback list', async () => {
      const mockResponse = {
        data: [mockFeedbackListItem],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 },
      };
      mockFeedbackAdminService.findAll.mockResolvedValueOnce(mockResponse);

      const result = await controller.list({ page: 1, limit: 10 });

      expect(result).toEqual(mockResponse);
      expect(mockFeedbackAdminService.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });

    it('should pass filter parameters to service', async () => {
      const mockResponse = {
        data: [mockFeedbackListItem],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 },
      };
      mockFeedbackAdminService.findAll.mockResolvedValueOnce(mockResponse);

      const query = {
        page: 1,
        limit: 10,
        status: FeedbackStatus.NEW,
        userId: 10,
        search: 'bug',
      };

      await controller.list(query);

      expect(mockFeedbackAdminService.findAll).toHaveBeenCalledWith(query);
    });

    it('should use default pagination values', async () => {
      const mockResponse = {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      };
      mockFeedbackAdminService.findAll.mockResolvedValueOnce(mockResponse);

      await controller.list({});

      expect(mockFeedbackAdminService.findAll).toHaveBeenCalledWith({});
    });
  });

  describe('findOne', () => {
    it('should return feedback details', async () => {
      mockFeedbackAdminService.findOne.mockResolvedValueOnce(mockFeedbackDetail);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockFeedbackDetail);
      expect(mockFeedbackAdminService.findOne).toHaveBeenCalledWith(1);
    });

    it('should propagate NotFoundException from service', async () => {
      mockFeedbackAdminService.findOne.mockRejectedValueOnce(
        new NotFoundException('Feedback with ID 999 not found'),
      );

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getScreenshotUrl', () => {
    it('should return presigned URL for screenshot', async () => {
      const mockUrlResponse = {
        url: 'https://minio.test.com/feedback/screenshot.png?presigned',
        expiresIn: 300,
        expiresAt: new Date(Date.now() + 300000),
      };
      mockFeedbackAdminService.getScreenshotUrl.mockResolvedValueOnce(mockUrlResponse);

      const result = await controller.getScreenshotUrl(1);

      expect(result).toEqual(mockUrlResponse);
      expect(mockFeedbackAdminService.getScreenshotUrl).toHaveBeenCalledWith(1);
    });

    it('should propagate NotFoundException for feedback without screenshot', async () => {
      mockFeedbackAdminService.getScreenshotUrl.mockRejectedValueOnce(
        new NotFoundException('Feedback 1 has no screenshot'),
      );

      await expect(controller.getScreenshotUrl(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete feedback and return success message', async () => {
      const mockDeleteResponse = {
        message: 'Feedback deleted successfully',
        screenshotDeleted: true,
      };
      mockFeedbackAdminService.delete.mockResolvedValueOnce(mockDeleteResponse);

      const result = await controller.delete(1, mockRequest as unknown as Request);

      expect(result).toEqual(mockDeleteResponse);
      expect(mockFeedbackAdminService.delete).toHaveBeenCalledWith(
        1,
        { id: 1, email: 'admin@test.com' },
        mockRequest,
      );
    });

    it('should propagate NotFoundException from service', async () => {
      mockFeedbackAdminService.delete.mockRejectedValueOnce(
        new NotFoundException('Feedback with ID 999 not found'),
      );

      await expect(controller.delete(999, mockRequest as unknown as Request)).rejects.toThrow(NotFoundException);
    });

    it('should pass request object to service for audit logging', async () => {
      const mockDeleteResponse = {
        message: 'Feedback deleted successfully',
        screenshotDeleted: false,
      };
      mockFeedbackAdminService.delete.mockResolvedValueOnce(mockDeleteResponse);

      await controller.delete(1, mockRequest as unknown as Request);

      expect(mockFeedbackAdminService.delete).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ id: 1, email: 'admin@test.com' }),
        expect.anything(),
      );
    });
  });

  describe('guards and decorators', () => {
    it('should have JwtAuthGuard applied', () => {
      const guards = Reflect.getMetadata('__guards__', FeedbackAdminController);
      expect(guards).toBeDefined();
      expect(guards.some((guard: unknown) => guard === JwtAuthGuard)).toBe(true);
    });

    it('should have RolesGuard applied', () => {
      const guards = Reflect.getMetadata('__guards__', FeedbackAdminController);
      expect(guards).toBeDefined();
      expect(guards.some((guard: unknown) => guard === RolesGuard)).toBe(true);
    });

    it('should have Admin role required', () => {
      const roles = Reflect.getMetadata('roles', FeedbackAdminController);
      expect(roles).toContain('admin');
    });
  });
});
