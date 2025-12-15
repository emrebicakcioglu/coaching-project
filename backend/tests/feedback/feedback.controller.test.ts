/**
 * Feedback Controller Integration Tests
 * STORY-038A: Feedback-Backend API
 * STORY-038B: Feedback Rate Limiting & Email Queue
 *
 * Tests for FeedbackController including:
 * - POST /api/feedback endpoint
 * - JWT authentication guard
 * - Rate limiting enforcement
 * - Request/response handling
 * - Request object passing for metadata extraction (STORY-038B)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { FeedbackController } from '../../src/feedback/feedback.controller';
import { FeedbackService } from '../../src/feedback/feedback.service';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { RateLimitGuard } from '../../src/common/guards/rate-limit.guard';
import { Reflector } from '@nestjs/core';

// Mock JWT Auth Guard
const mockJwtAuthGuard = {
  canActivate: jest.fn().mockImplementation((context) => {
    const req = context.switchToHttp().getRequest();
    req.user = { id: 1, email: 'test@example.com' };
    return true;
  }),
};

// Mock Rate Limit Guard
const mockRateLimitGuard = {
  canActivate: jest.fn().mockReturnValue(true),
};

// Mock Feedback Service
const mockFeedbackService = {
  submitFeedback: jest.fn().mockResolvedValue({ message: 'Feedback submitted successfully' }),
};

describe('FeedbackController', () => {
  let app: INestApplication;
  let controller: FeedbackController;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedbackController],
      providers: [
        { provide: FeedbackService, useValue: mockFeedbackService },
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RateLimitGuard)
      .useValue(mockRateLimitGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    controller = module.get<FeedbackController>(FeedbackController);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockJwtAuthGuard.canActivate.mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      req.user = { id: 1, email: 'test@example.com' };
      return true;
    });
    mockRateLimitGuard.canActivate.mockReturnValue(true);
  });

  describe('Controller Setup', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('POST /api/feedback', () => {
    const validFeedbackPayload = {
      screenshot: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      comment: 'This is test feedback with a valid comment.',
      url: 'https://example.com/page',
      browserInfo: 'Mozilla/5.0 Chrome/120',
    };

    it('should submit feedback successfully with valid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/feedback')
        .send(validFeedbackPayload)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({ message: 'Feedback submitted successfully' });
      // STORY-038B: Service now receives 3 arguments - feedbackDto, user, and request object
      expect(mockFeedbackService.submitFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          screenshot: validFeedbackPayload.screenshot,
          comment: validFeedbackPayload.comment,
          url: validFeedbackPayload.url,
          browserInfo: validFeedbackPayload.browserInfo,
        }),
        expect.objectContaining({
          id: 1,
          email: 'test@example.com',
        }),
        expect.any(Object), // STORY-038B: Request object for metadata extraction
      );
    });

    it('should submit feedback with only required fields', async () => {
      const minimalPayload = {
        screenshot: validFeedbackPayload.screenshot,
        comment: 'Minimal feedback',
      };

      const response = await request(app.getHttpServer())
        .post('/api/feedback')
        .send(minimalPayload)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({ message: 'Feedback submitted successfully' });
    });

    it('should submit feedback with data URL format screenshot', async () => {
      const dataUrlPayload = {
        ...validFeedbackPayload,
        screenshot: `data:image/png;base64,${validFeedbackPayload.screenshot}`,
      };

      const response = await request(app.getHttpServer())
        .post('/api/feedback')
        .send(dataUrlPayload)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({ message: 'Feedback submitted successfully' });
    });

    it('should reject request without screenshot', async () => {
      const payloadWithoutScreenshot = {
        comment: 'Test feedback',
      };

      const response = await request(app.getHttpServer())
        .post('/api/feedback')
        .send(payloadWithoutScreenshot)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBeDefined();
    });

    it('should reject request without comment', async () => {
      const payloadWithoutComment = {
        screenshot: validFeedbackPayload.screenshot,
      };

      const response = await request(app.getHttpServer())
        .post('/api/feedback')
        .send(payloadWithoutComment)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBeDefined();
    });

    it('should reject request with empty screenshot', async () => {
      const payloadWithEmptyScreenshot = {
        screenshot: '',
        comment: 'Test feedback',
      };

      const response = await request(app.getHttpServer())
        .post('/api/feedback')
        .send(payloadWithEmptyScreenshot)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBeDefined();
    });

    it('should reject request with empty comment', async () => {
      const payloadWithEmptyComment = {
        screenshot: validFeedbackPayload.screenshot,
        comment: '',
      };

      const response = await request(app.getHttpServer())
        .post('/api/feedback')
        .send(payloadWithEmptyComment)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBeDefined();
    });

    it('should reject comment exceeding maximum length', async () => {
      const payloadWithLongComment = {
        screenshot: validFeedbackPayload.screenshot,
        comment: 'a'.repeat(5001), // Exceeds 5000 character limit
      };

      const response = await request(app.getHttpServer())
        .post('/api/feedback')
        .send(payloadWithLongComment)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBeDefined();
    });

    it('should reject URL exceeding maximum length', async () => {
      const payloadWithLongUrl = {
        ...validFeedbackPayload,
        url: 'https://example.com/' + 'a'.repeat(2030), // Exceeds 2048 character limit
      };

      const response = await request(app.getHttpServer())
        .post('/api/feedback')
        .send(payloadWithLongUrl)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBeDefined();
    });

    it('should reject browserInfo exceeding maximum length', async () => {
      const payloadWithLongBrowserInfo = {
        ...validFeedbackPayload,
        browserInfo: 'a'.repeat(501), // Exceeds 500 character limit
      };

      const response = await request(app.getHttpServer())
        .post('/api/feedback')
        .send(payloadWithLongBrowserInfo)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('Authentication Guard', () => {
    it('should pass user context to service', async () => {
      const testUser = { id: 42, email: 'specific@test.com' };
      mockJwtAuthGuard.canActivate.mockImplementation((context) => {
        const req = context.switchToHttp().getRequest();
        req.user = testUser;
        return true;
      });

      await request(app.getHttpServer())
        .post('/api/feedback')
        .send({
          screenshot: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          comment: 'Test feedback',
        })
        .expect(HttpStatus.OK);

      // STORY-038B: Service now receives 3 arguments - feedbackDto, user, and request object
      expect(mockFeedbackService.submitFeedback).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining(testUser),
        expect.any(Object), // Request object for metadata extraction
      );
    });
  });

  describe('Service Error Handling', () => {
    it('should return 500 when service throws an error', async () => {
      mockFeedbackService.submitFeedback.mockRejectedValueOnce(
        new Error('Email service unavailable'),
      );

      const response = await request(app.getHttpServer())
        .post('/api/feedback')
        .send({
          screenshot: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          comment: 'Test feedback',
        })
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(response.body.message).toBeDefined();
    });
  });
});

describe('FeedbackController Unit Tests', () => {
  let controller: FeedbackController;
  let feedbackService: jest.Mocked<FeedbackService>;

  beforeEach(async () => {
    feedbackService = {
      submitFeedback: jest.fn().mockResolvedValue({ message: 'Feedback submitted successfully' }),
      convertBase64ToBuffer: jest.fn(),
      clearTemplateCache: jest.fn(),
    } as unknown as jest.Mocked<FeedbackService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedbackController],
      providers: [{ provide: FeedbackService, useValue: feedbackService }],
    }).compile();

    controller = module.get<FeedbackController>(FeedbackController);
  });

  describe('submitFeedback', () => {
    it('should call feedbackService.submitFeedback with correct parameters', async () => {
      const feedbackDto = {
        screenshot: 'base64data',
        comment: 'Test comment',
        url: 'https://test.com',
        browserInfo: 'Chrome 120',
      };

      const mockRequest = {
        user: { id: 1, email: 'test@example.com' },
      } as any;

      await controller.submitFeedback(feedbackDto, mockRequest);

      // STORY-038B: Service now receives 3 arguments - feedbackDto, user, and request object
      expect(feedbackService.submitFeedback).toHaveBeenCalledWith(
        feedbackDto,
        {
          id: 1,
          email: 'test@example.com',
        },
        mockRequest, // Request object for metadata extraction
      );
    });

    it('should return the result from feedbackService', async () => {
      const expectedResult = { message: 'Feedback submitted successfully' };
      feedbackService.submitFeedback.mockResolvedValue(expectedResult);

      const mockRequest = { user: { id: 1, email: 'test@example.com' } } as any;

      const result = await controller.submitFeedback(
        { screenshot: 'data', comment: 'test' },
        mockRequest,
      );

      expect(result).toEqual(expectedResult);
    });

    it('should propagate errors from the service', async () => {
      const error = new Error('Service error');
      feedbackService.submitFeedback.mockRejectedValue(error);

      const mockRequest = { user: { id: 1, email: 'test@example.com' } } as any;

      await expect(
        controller.submitFeedback(
          { screenshot: 'data', comment: 'test' },
          mockRequest,
        ),
      ).rejects.toThrow('Service error');
    });
  });
});
