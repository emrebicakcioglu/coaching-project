/**
 * Jira Ticket Controller Tests
 * STORY-041E: Jira Ticket Creation
 *
 * Unit tests for JiraTicketController including:
 * - Create Jira ticket endpoint
 * - Request validation
 * - Error response handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  BadGatewayException,
} from '@nestjs/common';
import { JiraTicketController } from '../../src/jira/jira-ticket.controller';
import { JiraTicketService } from '../../src/jira/jira-ticket.service';
import { CreateJiraTicketDto, JiraTicketResponseDto } from '../../src/jira/dto/jira-ticket.dto';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/common/guards/roles.guard';
import { RateLimitGuard } from '../../src/common/guards/rate-limit.guard';

describe('JiraTicketController', () => {
  let controller: JiraTicketController;
  let createTicketMock: jest.Mock;

  const mockRequest = {
    user: {
      id: 1,
      email: 'admin@example.com',
      role: 'admin',
    },
    ip: '127.0.0.1',
    headers: {},
    requestId: 'test-request-id',
  } as any;

  const mockSuccessResponse: JiraTicketResponseDto = {
    success: true,
    issueKey: 'FEEDBACK-123',
    issueUrl: 'https://company.atlassian.net/browse/FEEDBACK-123',
    feedbackDeleted: false,
    feedbackId: 123,
  };

  beforeEach(async () => {
    createTicketMock = jest.fn().mockResolvedValue(mockSuccessResponse);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JiraTicketController],
      providers: [
        {
          provide: JiraTicketService,
          useValue: {
            createTicketFromFeedback: createTicketMock,
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<JiraTicketController>(JiraTicketController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createJiraTicket', () => {
    it('should create Jira ticket successfully', async () => {
      const dto: CreateJiraTicketDto = {};
      const result = await controller.createJiraTicket(123, dto, mockRequest);

      expect(result).toEqual(mockSuccessResponse);
      expect(createTicketMock).toHaveBeenCalledWith(
        123,
        false,
        { id: 1, email: 'admin@example.com' },
        mockRequest,
      );
    });

    it('should pass deleteAfterCreation flag to service', async () => {
      createTicketMock.mockResolvedValue({
        ...mockSuccessResponse,
        feedbackDeleted: true,
      });

      const dto: CreateJiraTicketDto = { deleteAfterCreation: true };
      const result = await controller.createJiraTicket(123, dto, mockRequest);

      expect(result.feedbackDeleted).toBe(true);
      expect(createTicketMock).toHaveBeenCalledWith(
        123,
        true,
        expect.any(Object),
        mockRequest,
      );
    });

    it('should handle empty dto body', async () => {
      const dto: CreateJiraTicketDto = {};
      await controller.createJiraTicket(123, dto, mockRequest);

      expect(createTicketMock).toHaveBeenCalledWith(
        123,
        false,
        expect.any(Object),
        mockRequest,
      );
    });

    it('should propagate BadRequestException from service', async () => {
      createTicketMock.mockRejectedValue(
        new BadRequestException('Jira integration is not configured'),
      );

      const dto: CreateJiraTicketDto = {};

      await expect(controller.createJiraTicket(123, dto, mockRequest)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should propagate NotFoundException from service', async () => {
      createTicketMock.mockRejectedValue(
        new NotFoundException('Feedback with ID 123 not found'),
      );

      const dto: CreateJiraTicketDto = {};

      await expect(controller.createJiraTicket(123, dto, mockRequest)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate BadGatewayException from service', async () => {
      createTicketMock.mockRejectedValue(
        new BadGatewayException('Jira API error (500): Internal Server Error'),
      );

      const dto: CreateJiraTicketDto = {};

      await expect(controller.createJiraTicket(123, dto, mockRequest)).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('should extract user id from sub when id is not present', async () => {
      const requestWithSub = {
        ...mockRequest,
        user: {
          sub: 2,
          email: 'admin2@example.com',
          role: 'admin',
        },
      };

      const dto: CreateJiraTicketDto = {};
      await controller.createJiraTicket(123, dto, requestWithSub);

      expect(createTicketMock).toHaveBeenCalledWith(
        123,
        false,
        { id: 2, email: 'admin2@example.com' },
        requestWithSub,
      );
    });

    it('should handle missing user information gracefully', async () => {
      const requestWithoutUser = {
        ...mockRequest,
        user: {},
      };

      const dto: CreateJiraTicketDto = {};
      await controller.createJiraTicket(123, dto, requestWithoutUser);

      expect(createTicketMock).toHaveBeenCalledWith(
        123,
        false,
        { id: 0, email: 'unknown' },
        requestWithoutUser,
      );
    });
  });
});
