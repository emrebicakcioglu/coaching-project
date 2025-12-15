/**
 * Email Controller
 * STORY-023B: E-Mail Templates & Queue
 *
 * REST API endpoints for email template management and queue operations.
 *
 * Endpoints:
 * - POST   /api/v1/email/send              - Send email (queued)
 * - GET    /api/v1/email/templates         - List all templates
 * - GET    /api/v1/email/templates/:id     - Get template by ID
 * - POST   /api/v1/email/templates         - Create new template
 * - PUT    /api/v1/email/templates/:id     - Update template
 * - DELETE /api/v1/email/templates/:id     - Delete template
 * - POST   /api/v1/email/templates/:id/preview - Preview template
 * - GET    /api/v1/email/queue/status      - Get queue status
 * - GET    /api/v1/email/queue             - List queue items
 * - GET    /api/v1/email/queue/:id         - Get queue item by ID
 * - POST   /api/v1/email/queue/:id/cancel  - Cancel pending queue item
 * - POST   /api/v1/email/queue/:id/retry   - Retry failed queue item
 * - GET    /api/v1/email/logs              - Get email logs
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { EmailTemplateService } from './email-template.service';
import { EmailQueueService } from './email-queue.service';
import { DatabaseService } from '../database/database.service';
import { WinstonLoggerService } from '../common/services/logger.service';
import {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  EmailTemplateResponseDto,
  PreviewTemplateDto,
  TemplatePreviewResponseDto,
  QueueEmailDto,
  QueueFilterDto,
  QueueItemResponseDto,
  QueueStatusResponseDto,
  QueuedEmailResponseDto,
} from './dto';

@ApiTags('Email')
@Controller('api/v1/email')
export class EmailController {
  constructor(
    private readonly templateService: EmailTemplateService,
    private readonly queueService: EmailQueueService,
    private readonly databaseService: DatabaseService,
    private readonly logger: WinstonLoggerService,
  ) {}

  // =====================================
  // Email Sending (Queue)
  // =====================================

  @Post('send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Send email (queued)',
    description: 'Queue an email for async sending with template rendering',
  })
  @ApiResponse({
    status: 202,
    description: 'Email queued successfully',
    type: QueuedEmailResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async sendEmail(@Body() dto: QueueEmailDto): Promise<QueuedEmailResponseDto> {
    try {
      const queueItem = await this.queueService.enqueue({
        template_name: dto.template_name,
        recipient: dto.recipient,
        subject: '', // Will be rendered from template
        variables: dto.variables,
        priority: dto.priority,
        max_retries: dto.max_retries,
        scheduled_at: dto.scheduled_at ? new Date(dto.scheduled_at) : undefined,
      });

      this.logger.log(`Email queued: ${queueItem.id} to ${dto.recipient}`, 'EmailController');

      return {
        success: true,
        queueId: queueItem.id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to queue email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'EmailController',
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException(error instanceof Error ? error.message : 'Failed to queue email');
    }
  }

  // =====================================
  // Template Management
  // =====================================

  @Get('templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all email templates',
    description: 'Get all email templates with optional active filter',
  })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    type: Boolean,
    description: 'Filter to active templates only',
  })
  @ApiResponse({
    status: 200,
    description: 'List of email templates',
    type: [EmailTemplateResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getTemplates(
    @Query('activeOnly') activeOnly?: string,
  ): Promise<EmailTemplateResponseDto[]> {
    const activeOnlyBool = activeOnly === 'true';
    return this.templateService.findAll(activeOnlyBool);
  }

  @Get('templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get email template by ID',
    description: 'Get a specific email template by its ID',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Template ID' })
  @ApiResponse({
    status: 200,
    description: 'Email template details',
    type: EmailTemplateResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getTemplate(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<EmailTemplateResponseDto> {
    const template = await this.templateService.findById(id);
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return template;
  }

  @Post('templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create email template',
    description: 'Create a new email template with Handlebars syntax',
  })
  @ApiResponse({
    status: 201,
    description: 'Template created successfully',
    type: EmailTemplateResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid template syntax or duplicate name' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async createTemplate(
    @Body() dto: CreateEmailTemplateDto,
  ): Promise<EmailTemplateResponseDto> {
    return this.templateService.create(dto);
  }

  @Put('templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update email template',
    description: 'Update an existing email template',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Template ID' })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
    type: EmailTemplateResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid template syntax' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async updateTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmailTemplateDto,
  ): Promise<EmailTemplateResponseDto> {
    return this.templateService.update(id, dto);
  }

  @Delete('templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete email template',
    description: 'Permanently delete an email template',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Template ID' })
  @ApiResponse({ status: 204, description: 'Template deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async deleteTemplate(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.templateService.delete(id);
  }

  @Post('templates/:id/preview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Preview email template',
    description: 'Render a template with sample or provided data',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Template ID' })
  @ApiResponse({
    status: 200,
    description: 'Rendered template preview',
    type: TemplatePreviewResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async previewTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PreviewTemplateDto,
  ): Promise<TemplatePreviewResponseDto> {
    const template = await this.templateService.findById(id);
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return this.templateService.previewTemplate(template.name, dto.data);
  }

  // =====================================
  // Queue Management
  // =====================================

  @Get('queue/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get queue status',
    description: 'Get current email queue status and statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue status',
    type: QueueStatusResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getQueueStatus(): Promise<QueueStatusResponseDto> {
    const status = this.queueService.getStatus();
    const stats = await this.queueService.getQueueStats();
    return {
      ...status,
      stats,
    };
  }

  @Get('queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List queue items',
    description: 'Get queue items with optional filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'List of queue items',
    type: [QueueItemResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getQueueItems(@Query() filter: QueueFilterDto): Promise<QueueItemResponseDto[]> {
    return this.queueService.getQueueItems({
      status: filter.status as any,
      template_name: filter.template_name,
      recipient: filter.recipient,
      start_date: filter.start_date ? new Date(filter.start_date) : undefined,
      end_date: filter.end_date ? new Date(filter.end_date) : undefined,
      limit: filter.limit,
      offset: filter.offset,
    });
  }

  @Get('queue/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get queue item by ID',
    description: 'Get a specific queue item by its ID',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Queue item ID' })
  @ApiResponse({
    status: 200,
    description: 'Queue item details',
    type: QueueItemResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Queue item not found' })
  async getQueueItem(@Param('id', ParseIntPipe) id: number): Promise<QueueItemResponseDto> {
    const item = await this.queueService.getQueueItem(id);
    if (!item) {
      throw new NotFoundException(`Queue item with ID ${id} not found`);
    }
    return item;
  }

  @Post('queue/:id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel queue item',
    description: 'Cancel a pending queue item',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Queue item ID' })
  @ApiResponse({
    status: 200,
    description: 'Queue item cancelled',
    schema: { type: 'object', properties: { success: { type: 'boolean' } } },
  })
  @ApiResponse({ status: 400, description: 'Cannot cancel item (not pending)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async cancelQueueItem(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ success: boolean }> {
    const success = await this.queueService.cancelQueueItem(id);
    if (!success) {
      throw new BadRequestException('Cannot cancel item - not found or not pending');
    }
    return { success };
  }

  @Post('queue/:id/retry')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retry queue item',
    description: 'Retry a failed queue item',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Queue item ID' })
  @ApiResponse({
    status: 200,
    description: 'Queue item retry requested',
    schema: { type: 'object', properties: { success: { type: 'boolean' } } },
  })
  @ApiResponse({ status: 400, description: 'Cannot retry item (not failed)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async retryQueueItem(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ success: boolean }> {
    const success = await this.queueService.retryQueueItem(id);
    if (!success) {
      throw new BadRequestException('Cannot retry item - not found or not failed');
    }
    return { success };
  }

  // =====================================
  // Email Logs
  // =====================================

  @Get('logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get email logs',
    description: 'Get email send logs with filtering',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['sent', 'failed', 'pending'] })
  @ApiQuery({ name: 'template', required: false, type: String })
  @ApiQuery({ name: 'recipient', required: false, type: String })
  @ApiQuery({ name: 'start_date', required: false, type: String })
  @ApiQuery({ name: 'end_date', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of email logs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getEmailLogs(
    @Query('status') status?: string,
    @Query('template') template?: string,
    @Query('recipient') recipient?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<any[]> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    if (template) {
      conditions.push(`template = $${paramIndex++}`);
      params.push(template);
    }
    if (recipient) {
      conditions.push(`recipient ILIKE $${paramIndex++}`);
      params.push(`%${recipient}%`);
    }
    if (startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(new Date(startDate));
    }
    if (endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(new Date(endDate));
    }

    let query = 'SELECT * FROM email_logs';
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';

    const limitNum = parseInt(limit || '50', 10);
    const offsetNum = parseInt(offset || '0', 10);
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limitNum, offsetNum);

    const result = await pool.query(query, params);
    return result.rows;
  }
}
