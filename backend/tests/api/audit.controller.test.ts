/**
 * Audit Controller Unit Tests
 * STORY-028: System Logging (Audit Trail)
 *
 * Tests for the AuditController REST API endpoints.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { AuditController } from '../../src/audit/audit.controller';
import { AuditService, PaginatedAuditLogs } from '../../src/common/services/audit.service';
import { AuditLog } from '../../src/database/types';

describe('AuditController (STORY-028)', () => {
  let controller: AuditController;
  let auditService: jest.Mocked<AuditService>;

  const mockAuditLog: AuditLog = {
    id: 1,
    user_id: 1,
    action: 'USER_LOGIN',
    resource: 'user',
    resource_id: 1,
    details: { email: 'test@example.com' },
    ip_address: '127.0.0.1',
    user_agent: 'Mozilla/5.0',
    request_id: 'test-request-id',
    log_level: 'info',
    created_at: new Date('2024-01-15T10:00:00Z'),
  };

  const mockPaginatedResponse: PaginatedAuditLogs = {
    data: [mockAuditLog],
    total: 1,
    page: 1,
    pageSize: 50,
    totalPages: 1,
  };

  beforeEach(async () => {
    const mockAuditService = {
      findAll: jest.fn().mockResolvedValue(mockPaginatedResponse),
      findById: jest.fn().mockResolvedValue(mockAuditLog),
      findByUserId: jest.fn().mockResolvedValue([mockAuditLog]),
      findByAction: jest.fn().mockResolvedValue([mockAuditLog]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    controller = module.get<AuditController>(AuditController);
    auditService = module.get(AuditService);
  });

  describe('findAll()', () => {
    it('should return paginated audit logs with default parameters', async () => {
      const result = await controller.findAll(1, 50);

      expect(result).toEqual(mockPaginatedResponse);
      expect(auditService.findAll).toHaveBeenCalledWith({
        user_id: undefined,
        action: undefined,
        resource: undefined,
        resource_id: undefined,
        log_level: undefined,
        start_date: undefined,
        end_date: undefined,
        ip_address: undefined,
        limit: 50,
        offset: 0,
      });
    });

    it('should apply query filters', async () => {
      await controller.findAll(
        1,
        25,
        '1', // userId
        'USER_LOGIN', // action
        'user', // resource
        '1', // resourceId
        'info', // logLevel
        '2024-01-01T00:00:00Z', // startDate
        '2024-01-31T23:59:59Z', // endDate
        '127.0.0.1' // ipAddress
      );

      expect(auditService.findAll).toHaveBeenCalledWith({
        user_id: 1,
        action: 'USER_LOGIN',
        resource: 'user',
        resource_id: 1,
        log_level: 'info',
        start_date: expect.any(Date),
        end_date: expect.any(Date),
        ip_address: '127.0.0.1',
        limit: 25,
        offset: 0,
      });
    });

    it('should constrain pageSize to maximum of 100', async () => {
      await controller.findAll(1, 200);

      expect(auditService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 })
      );
    });

    it('should constrain pageSize to minimum of 1', async () => {
      await controller.findAll(1, 0);

      expect(auditService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 1 })
      );
    });

    it('should constrain page to minimum of 1', async () => {
      await controller.findAll(0, 50);

      expect(auditService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 0 })
      );
    });

    it('should calculate correct offset for pagination', async () => {
      await controller.findAll(3, 25);

      expect(auditService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 50 }) // (3-1) * 25
      );
    });

    it('should throw error for invalid logLevel', async () => {
      await expect(
        controller.findAll(1, 50, undefined, undefined, undefined, undefined, 'invalid')
      ).rejects.toThrow(HttpException);
    });

    it('should throw error for invalid startDate format', async () => {
      await expect(
        controller.findAll(1, 50, undefined, undefined, undefined, undefined, undefined, 'invalid-date')
      ).rejects.toThrow(HttpException);
    });

    it('should throw error for invalid endDate format', async () => {
      await expect(
        controller.findAll(1, 50, undefined, undefined, undefined, undefined, undefined, undefined, 'invalid-date')
      ).rejects.toThrow(HttpException);
    });
  });

  describe('findById()', () => {
    it('should return audit log by ID', async () => {
      const result = await controller.findById(1);

      expect(result).toEqual(mockAuditLog);
      expect(auditService.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when audit log not found', async () => {
      auditService.findById.mockResolvedValue(null);

      await expect(controller.findById(999)).rejects.toThrow(HttpException);
    });
  });

  describe('findByUserId()', () => {
    it('should return audit logs for a user', async () => {
      const result = await controller.findByUserId(1, 100);

      expect(result).toEqual([mockAuditLog]);
      expect(auditService.findByUserId).toHaveBeenCalledWith(1, 100);
    });

    it('should constrain limit to maximum of 500', async () => {
      await controller.findByUserId(1, 1000);

      expect(auditService.findByUserId).toHaveBeenCalledWith(1, 500);
    });

    it('should constrain limit to minimum of 1', async () => {
      await controller.findByUserId(1, 0);

      expect(auditService.findByUserId).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('findByAction()', () => {
    it('should return audit logs by action type', async () => {
      const result = await controller.findByAction('USER_LOGIN', 100);

      expect(result).toEqual([mockAuditLog]);
      expect(auditService.findByAction).toHaveBeenCalledWith('USER_LOGIN', 100);
    });

    it('should constrain limit to maximum of 500', async () => {
      await controller.findByAction('USER_LOGIN', 1000);

      expect(auditService.findByAction).toHaveBeenCalledWith('USER_LOGIN', 500);
    });

    it('should constrain limit to minimum of 1', async () => {
      await controller.findByAction('USER_LOGIN', 0);

      expect(auditService.findByAction).toHaveBeenCalledWith('USER_LOGIN', 1);
    });
  });
});
