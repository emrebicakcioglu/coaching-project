/**
 * Email Template Service Tests
 * STORY-023B: E-Mail Templates & Queue
 *
 * Unit tests for EmailTemplateService
 */

import { EmailTemplateService } from '../../src/email/email-template.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';
import { DatabaseService } from '../../src/database/database.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import * as Handlebars from 'handlebars';

// Mock dependencies
jest.mock('../../src/common/services/logger.service');
jest.mock('../../src/database/database.service');

describe('EmailTemplateService', () => {
  let service: EmailTemplateService;
  let mockLogger: jest.Mocked<WinstonLoggerService>;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockPool: any;

  const mockTemplate = {
    id: 1,
    name: 'welcome',
    subject: 'Welcome to {{companyName}}!',
    html_content: '<h1>Welcome, {{name}}!</h1>',
    text_content: 'Welcome, {{name}}!',
    variables: ['name', 'companyName'],
    description: 'Welcome email',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock pool
    mockPool = {
      query: jest.fn(),
    };

    // Setup mock DatabaseService
    mockDatabaseService = {
      getPool: jest.fn().mockReturnValue(mockPool),
    } as any;

    // Setup mock Logger
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    // Create service instance
    service = new EmailTemplateService(mockLogger, mockDatabaseService);
  });

  describe('findAll', () => {
    it('should return all templates', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockTemplate] });

      const result = await service.findAll();

      expect(result).toEqual([mockTemplate]);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM email_templates ORDER BY name ASC',
        [],
      );
    });

    it('should return only active templates when activeOnly is true', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockTemplate] });

      const result = await service.findAll(true);

      expect(result).toEqual([mockTemplate]);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM email_templates WHERE is_active = $1 ORDER BY name ASC',
        [true],
      );
    });

    it('should throw error when database not available', async () => {
      mockDatabaseService.getPool.mockReturnValue(null);

      await expect(service.findAll()).rejects.toThrow('Database connection not available');
    });
  });

  describe('findById', () => {
    it('should return template by ID', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockTemplate] });

      const result = await service.findById(1);

      expect(result).toEqual(mockTemplate);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM email_templates WHERE id = $1',
        [1],
      );
    });

    it('should return null when template not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should return template by name', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockTemplate] });

      const result = await service.findByName('welcome');

      expect(result).toEqual(mockTemplate);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM email_templates WHERE name = $1',
        ['welcome'],
      );
    });
  });

  describe('create', () => {
    const createDto = {
      name: 'new-template',
      subject: 'New Template',
      html_content: '<h1>{{title}}</h1>',
      text_content: '{{title}}',
      variables: ['title'],
      description: 'A new template',
    };

    it('should create a new template', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // findByName check
        .mockResolvedValueOnce({ rows: [{ ...mockTemplate, ...createDto }] }); // insert

      const result = await service.create(createDto);

      expect(result.name).toBe(createDto.name);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException for duplicate name', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockTemplate] }); // findByName returns existing

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid Handlebars syntax', async () => {
      // Mock Handlebars.compile to throw an error for the html_content
      const originalCompile = Handlebars.compile;
      const mockCompile = jest.spyOn(Handlebars, 'compile').mockImplementation((template) => {
        if (template === 'invalid-template-content') {
          throw new Error('Parse error: Invalid template syntax');
        }
        return originalCompile(template);
      });

      mockPool.query.mockResolvedValueOnce({ rows: [] }); // findByName check

      const invalidDto = {
        ...createDto,
        html_content: 'invalid-template-content',
      };

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);

      mockCompile.mockRestore();
    });
  });

  describe('update', () => {
    const updateDto = {
      subject: 'Updated Subject',
    };

    it('should update an existing template', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockTemplate] }) // findById
        .mockResolvedValueOnce({ rows: [{ ...mockTemplate, ...updateDto }] }); // update

      const result = await service.update(1, updateDto);

      expect(result.subject).toBe(updateDto.subject);
    });

    it('should throw NotFoundException for non-existent template', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // findById returns nothing

      await expect(service.update(999, updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when renaming to existing name', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockTemplate] }) // findById
        .mockResolvedValueOnce({ rows: [{ ...mockTemplate, id: 2 }] }); // findByName returns existing

      await expect(service.update(1, { name: 'existing-name' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete an existing template', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockTemplate] }) // findById
        .mockResolvedValueOnce({ rowCount: 1 }); // delete

      const result = await service.delete(1);

      expect(result).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('deleted'),
        'EmailTemplateService',
      );
    });

    it('should throw NotFoundException for non-existent template', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // findById returns nothing

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('renderTemplate', () => {
    it('should render a template with data', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockTemplate] });

      const result = await service.renderTemplate('welcome', {
        name: 'John',
        companyName: 'Acme Inc',
      });

      expect(result.subject).toBe('Welcome to Acme Inc!');
      expect(result.html).toBe('<h1>Welcome, John!</h1>');
      expect(result.text).toBe('Welcome, John!');
    });

    it('should throw NotFoundException for non-existent template', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.renderTemplate('non-existent', {})).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for inactive template', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...mockTemplate, is_active: false }],
      });

      await expect(service.renderTemplate('welcome', {})).rejects.toThrow(BadRequestException);
    });

    it('should add default values for companyName, supportEmail, and year', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          ...mockTemplate,
          subject: '{{companyName}} - {{year}}',
          html_content: '{{supportEmail}}',
        }],
      });

      const result = await service.renderTemplate('welcome', {});

      expect(result.subject).toContain(new Date().getFullYear().toString());
    });
  });

  describe('clearTemplateCache', () => {
    it('should clear the template cache', () => {
      service.clearTemplateCache();

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Template cache cleared',
        'EmailTemplateService',
      );
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = service.getCacheStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('templates');
      expect(Array.isArray(stats.templates)).toBe(true);
    });
  });

  describe('previewTemplate', () => {
    it('should preview a template with sample data', async () => {
      // previewTemplate calls findByName, then renderTemplate calls getCompiledTemplate which calls findByName again
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockTemplate] }) // findByName in previewTemplate
        .mockResolvedValueOnce({ rows: [mockTemplate] }); // findByName in getCompiledTemplate

      const result = await service.previewTemplate('welcome');

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
    });

    it('should use provided sample data', async () => {
      // previewTemplate calls findByName, then renderTemplate calls getCompiledTemplate which calls findByName again
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockTemplate] }) // findByName in previewTemplate
        .mockResolvedValueOnce({ rows: [mockTemplate] }); // findByName in getCompiledTemplate

      const result = await service.previewTemplate('welcome', { name: 'Custom Name' });

      expect(result.html).toContain('Custom Name');
    });
  });
});
