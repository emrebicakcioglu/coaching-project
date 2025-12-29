/**
 * Jira Ticket Service Tests
 * STORY-041E: Jira Ticket Creation
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  BadGatewayException,
} from '@nestjs/common';
import { JiraTicketService } from '../../src/jira/jira-ticket.service';
import { JiraSettingsService } from '../../src/jira/jira-settings.service';
import { DatabaseService } from '../../src/database/database.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';
import { FeedbackAdminService } from '../../src/feedback/feedback-admin.service';
import { StorageService } from '../../src/storage/storage.service';
import { AuditService } from '../../src/common/services/audit.service';
import { Readable } from 'stream';

global.fetch = jest.fn();

describe('JiraTicketService', () => {
  let service: JiraTicketService;
  let mockPoolQuery: jest.Mock;
  let mockPool: { query: jest.Mock };
  let mockGetJiraSettingsDecrypted: jest.Mock;
  let mockFeedbackDelete: jest.Mock;
  let mockStorageGetFile: jest.Mock;
  let mockStorageIsConfigured: jest.Mock;
  let mockAuditLog: jest.Mock;

  const mockJiraSettings = {
    enabled: true,
    url: 'company.atlassian.net',
    email: 'jira@company.com',
    apiToken: 'test-api-token',
    projectKey: 'FEEDBACK',
    issueType: 'Bug',
  };

  const mockFeedback = {
    id: 123,
    user_id: 1,
    user_email: 'user@example.com',
    user_name: 'John Doe',
    comment: 'This is a test feedback comment for testing Jira integration.',
    route: '/dashboard',
    url: 'https://app.example.com/dashboard',
    has_screenshot: true,
    screenshot_path: 'screenshot-123.png',
    created_at: new Date('2025-01-15T10:30:00Z'),
    browser_name: 'Chrome',
    browser_version: '120',
    os_name: 'Windows',
    os_version: '10',
    device_type: 'Desktop',
    screen_resolution: '1920x1080',
    language: 'en-US',
    timezone: 'Europe/Berlin',
    jira_issue_key: null,
  };

  const mockAdminUser = { id: 1, email: 'admin@example.com' };
  const mockRequest = { ip: '127.0.0.1', headers: {}, requestId: 'test-request-id' } as any;

  beforeEach(async () => {
    mockPoolQuery = jest.fn();
    mockPool = { query: mockPoolQuery };
    mockGetJiraSettingsDecrypted = jest.fn();
    mockFeedbackDelete = jest.fn();
    mockStorageGetFile = jest.fn();
    mockStorageIsConfigured = jest.fn().mockReturnValue(true);
    mockAuditLog = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JiraTicketService,
        { provide: DatabaseService, useValue: { ensurePool: jest.fn(() => mockPool) } },
        { provide: WinstonLoggerService, useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } },
        { provide: JiraSettingsService, useValue: { getJiraSettingsDecrypted: mockGetJiraSettingsDecrypted } },
        { provide: FeedbackAdminService, useValue: { delete: mockFeedbackDelete } },
        { provide: StorageService, useValue: { isConfigured: mockStorageIsConfigured, getFile: mockStorageGetFile } },
        { provide: AuditService, useValue: { log: mockAuditLog } },
      ],
    }).compile();
    service = module.get<JiraTicketService>(JiraTicketService);
  });

  afterEach(() => { jest.clearAllMocks(); });

  describe('createTicketFromFeedback', () => {
    beforeEach(() => {
      mockGetJiraSettingsDecrypted.mockResolvedValue(mockJiraSettings);
      mockPoolQuery.mockResolvedValue({ rows: [mockFeedback] });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: '10001', key: 'FEEDBACK-123', self: 'https://company.atlassian.net/rest/api/3/issue/10001' }),
      });
    });

    it('should create Jira ticket from feedback successfully', async () => {
      mockPoolQuery.mockReset();
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [{ ...mockFeedback, has_screenshot: false }] })
        .mockResolvedValueOnce({ rows: [] });
      const result = await service.createTicketFromFeedback(123, false, mockAdminUser, mockRequest);
      expect(result.success).toBe(true);
      expect(result.issueKey).toBe('FEEDBACK-123');
      expect(result.issueUrl).toBe('https://company.atlassian.net/browse/FEEDBACK-123');
      expect(result.feedbackDeleted).toBe(false);
      expect(result.feedbackId).toBe(123);
    });

    it('should throw BadRequestException when Jira is not configured', async () => {
      mockGetJiraSettingsDecrypted.mockResolvedValue(null);
      await expect(service.createTicketFromFeedback(123, false, mockAdminUser, mockRequest)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when Jira is disabled', async () => {
      mockGetJiraSettingsDecrypted.mockResolvedValue({ ...mockJiraSettings, enabled: false });
      await expect(service.createTicketFromFeedback(123, false, mockAdminUser, mockRequest)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when Jira configuration is incomplete', async () => {
      mockGetJiraSettingsDecrypted.mockResolvedValue({ ...mockJiraSettings, projectKey: '' });
      await expect(service.createTicketFromFeedback(123, false, mockAdminUser, mockRequest)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when feedback does not exist', async () => {
      mockPoolQuery.mockResolvedValue({ rows: [] });
      await expect(service.createTicketFromFeedback(999, false, mockAdminUser, mockRequest)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when feedback already has Jira ticket', async () => {
      mockPoolQuery.mockResolvedValue({ rows: [{ ...mockFeedback, jira_issue_key: 'FEEDBACK-100' }] });
      await expect(service.createTicketFromFeedback(123, false, mockAdminUser, mockRequest)).rejects.toThrow(BadRequestException);
    });

    it('should delete feedback after creation when deleteAfterCreation is true', async () => {
      mockPoolQuery.mockReset();
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [{ ...mockFeedback, has_screenshot: false }] })
        .mockResolvedValueOnce({ rows: [] });
      mockFeedbackDelete.mockResolvedValue({ message: 'Feedback deleted successfully', screenshotDeleted: false });
      const result = await service.createTicketFromFeedback(123, true, mockAdminUser, mockRequest);
      expect(result.feedbackDeleted).toBe(true);
      expect(mockFeedbackDelete).toHaveBeenCalledWith(123, mockAdminUser, mockRequest);
    });

    it('should handle Jira API authentication error', async () => {
      mockPoolQuery.mockReset();
      mockPoolQuery.mockResolvedValue({ rows: [{ ...mockFeedback, has_screenshot: false }] });
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401, text: async () => 'Unauthorized' });
      await expect(service.createTicketFromFeedback(123, false, mockAdminUser, mockRequest)).rejects.toThrow(BadRequestException);
    });

    it('should handle Jira API project not found error', async () => {
      mockPoolQuery.mockReset();
      mockPoolQuery.mockResolvedValue({ rows: [{ ...mockFeedback, has_screenshot: false }] });
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404, text: async () => JSON.stringify({ errorMessages: ['Project does not exist'] }) });
      await expect(service.createTicketFromFeedback(123, false, mockAdminUser, mockRequest)).rejects.toThrow(BadRequestException);
    });

    it('should handle Jira API server error', async () => {
      mockPoolQuery.mockReset();
      mockPoolQuery.mockResolvedValue({ rows: [{ ...mockFeedback, has_screenshot: false }] });
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500, text: async () => 'Internal Server Error' });
      await expect(service.createTicketFromFeedback(123, false, mockAdminUser, mockRequest)).rejects.toThrow(BadGatewayException);
    });

    it('should log audit entry when creating ticket', async () => {
      mockPoolQuery.mockReset();
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [{ ...mockFeedback, has_screenshot: false }] })
        .mockResolvedValueOnce({ rows: [] });
      await service.createTicketFromFeedback(123, false, mockAdminUser, mockRequest);
      expect(mockAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: 'JIRA_TICKET_CREATE', userId: mockAdminUser.id, resource: 'jira_ticket', resourceId: 123 }));
    });

    it('should continue if feedback deletion fails after ticket creation', async () => {
      mockPoolQuery.mockReset();
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [{ ...mockFeedback, has_screenshot: false }] })
        .mockResolvedValueOnce({ rows: [] });
      mockFeedbackDelete.mockRejectedValue(new Error('Delete failed'));
      const result = await service.createTicketFromFeedback(123, true, mockAdminUser, mockRequest);
      expect(result.success).toBe(true);
      expect(result.issueKey).toBe('FEEDBACK-123');
      expect(result.feedbackDeleted).toBe(false);
    });
  });

  describe('screenshot attachment', () => {
    it('should attach screenshot when feedback has one', async () => {
      mockGetJiraSettingsDecrypted.mockResolvedValue(mockJiraSettings);
      mockPoolQuery.mockReset();
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [mockFeedback] })
        .mockResolvedValueOnce({ rows: [] });
      const mockStream = Readable.from([Buffer.from('fake-image-data')]);
      mockStorageGetFile.mockResolvedValue({ stream: mockStream, stat: { size: 1000, metaData: { 'content-type': 'image/png' } } });
      (global.fetch as jest.Mock).mockReset();
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: '10001', key: 'FEEDBACK-123', self: 'https://company.atlassian.net/rest/api/3/issue/10001' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => [{ id: '10002', filename: 'screenshot.png' }] });
      const result = await service.createTicketFromFeedback(123, false, mockAdminUser, mockRequest);
      expect(result.success).toBe(true);
      expect(mockStorageGetFile).toHaveBeenCalledWith('screenshot-123.png', expect.any(String));
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should continue if screenshot attachment fails', async () => {
      mockGetJiraSettingsDecrypted.mockResolvedValue(mockJiraSettings);
      mockPoolQuery.mockReset();
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [mockFeedback] })
        .mockResolvedValueOnce({ rows: [] });
      mockStorageGetFile.mockRejectedValue(new Error('File not found'));
      (global.fetch as jest.Mock).mockReset();
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ id: '10001', key: 'FEEDBACK-123' }) });
      const result = await service.createTicketFromFeedback(123, false, mockAdminUser, mockRequest);
      expect(result.success).toBe(true);
      expect(result.issueKey).toBe('FEEDBACK-123');
    });

    it('should skip attachment when storage is not configured', async () => {
      mockGetJiraSettingsDecrypted.mockResolvedValue(mockJiraSettings);
      mockPoolQuery.mockReset();
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [{ ...mockFeedback, has_screenshot: false }] })
        .mockResolvedValueOnce({ rows: [] });
      mockStorageIsConfigured.mockReturnValue(false);
      (global.fetch as jest.Mock).mockReset();
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ id: '10001', key: 'FEEDBACK-123' }) });
      const result = await service.createTicketFromFeedback(123, false, mockAdminUser, mockRequest);
      expect(result.success).toBe(true);
      expect(mockStorageGetFile).not.toHaveBeenCalled();
    });
  });

  describe('ADF description building', () => {
    it('should create proper Jira API payload with ADF description', async () => {
      mockGetJiraSettingsDecrypted.mockResolvedValue(mockJiraSettings);
      mockPoolQuery.mockReset();
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [{ ...mockFeedback, has_screenshot: false }] })
        .mockResolvedValueOnce({ rows: [] });
      let capturedBody: string | undefined;
      (global.fetch as jest.Mock).mockImplementation(async (url: string, options: any) => {
        if (url.includes('/rest/api/3/issue') && options.method === 'POST') capturedBody = options.body;
        return { ok: true, json: async () => ({ id: '10001', key: 'FEEDBACK-123' }) };
      });
      await service.createTicketFromFeedback(123, false, mockAdminUser, mockRequest);
      expect(capturedBody).toBeDefined();
      const payload = JSON.parse(capturedBody as string);
      expect(payload.fields.project.key).toBe('FEEDBACK');
      expect(payload.fields.summary).toContain('Feedback:');
      expect(payload.fields.issuetype.name).toBe('Bug');
      expect(payload.fields.description.type).toBe('doc');
      expect(payload.fields.description.version).toBe(1);
      expect(Array.isArray(payload.fields.description.content)).toBe(true);
    });

    it('should truncate long comments in summary', async () => {
      const longComment = 'A'.repeat(100);
      mockGetJiraSettingsDecrypted.mockResolvedValue(mockJiraSettings);
      mockPoolQuery.mockReset();
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [{ ...mockFeedback, comment: longComment, has_screenshot: false }] })
        .mockResolvedValueOnce({ rows: [] });
      let capturedBody: string | undefined;
      (global.fetch as jest.Mock).mockImplementation(async (_url: string, options: any) => {
        capturedBody = options.body;
        return { ok: true, json: async () => ({ id: '10001', key: 'FEEDBACK-123' }) };
      });
      await service.createTicketFromFeedback(123, false, mockAdminUser, mockRequest);
      const payload = JSON.parse(capturedBody as string);
      expect(payload.fields.summary.length).toBeLessThanOrEqual(60);
      expect(payload.fields.summary).toContain('...');
    });
  });

  describe('updateFeedbackJiraKey', () => {
    it('should update feedback record with Jira issue key', async () => {
      mockGetJiraSettingsDecrypted.mockResolvedValue(mockJiraSettings);
      mockPoolQuery.mockReset();
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [{ ...mockFeedback, has_screenshot: false }] })
        .mockResolvedValueOnce({ rows: [] });
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ id: '10001', key: 'FEEDBACK-123' }) });
      await service.createTicketFromFeedback(123, false, mockAdminUser, mockRequest);
      expect(mockPoolQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE feedback_submissions'), expect.arrayContaining(['FEEDBACK-123', 123]));
    });
  });
});
