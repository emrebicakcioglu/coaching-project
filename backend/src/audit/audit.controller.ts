/**
 * Audit Controller
 * STORY-028: System Logging (Audit Trail)
 * STORY-022: Swagger/OpenAPI Documentation
 *
 * REST API controller for accessing audit logs.
 * Provides endpoints for administrators to query and view audit logs.
 *
 * Endpoints:
 * - GET /api/admin/audit-logs - List audit logs with filtering/pagination
 * - GET /api/admin/audit-logs/:id - Get specific audit log entry
 *
 * Note: These endpoints should be protected by authentication/authorization
 * middleware in production. The actual auth implementation depends on
 * your authentication system (JWT guards, role-based access, etc.)
 */

import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  HttpStatus,
  HttpException,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuditService, PaginatedAuditLogs } from '../common/services/audit.service';
import { AuditLog, AuditAction, AuditLogLevel } from '../database/types';

@ApiTags('Audit')
@ApiBearerAuth('bearerAuth')
@Controller('api/admin/audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * List audit logs with filtering and pagination
   */
  @Get()
  @ApiOperation({
    summary: 'List audit logs',
    description: 'Retrieve a paginated list of audit logs with optional filtering.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-indexed)', example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Number of results per page (max: 100)', example: 50 })
  @ApiQuery({ name: 'userId', required: false, type: Number, description: 'Filter by user ID' })
  @ApiQuery({ name: 'action', required: false, type: String, description: 'Filter by action type (e.g., USER_LOGIN)' })
  @ApiQuery({ name: 'resource', required: false, type: String, description: 'Filter by resource type' })
  @ApiQuery({ name: 'resourceId', required: false, type: Number, description: 'Filter by resource ID' })
  @ApiQuery({ name: 'logLevel', required: false, enum: ['info', 'warn', 'error'], description: 'Filter by log level' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Filter by start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Filter by end date (ISO format)' })
  @ApiQuery({ name: 'ipAddress', required: false, type: String, description: 'Filter by IP address' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(50), ParseIntPipe) pageSize: number,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('resourceId') resourceId?: string,
    @Query('logLevel') logLevel?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('ipAddress') ipAddress?: string,
  ): Promise<PaginatedAuditLogs> {
    // Validate and constrain page size
    const constrainedPageSize = Math.min(Math.max(pageSize, 1), 100);
    const constrainedPage = Math.max(page, 1);
    const offset = (constrainedPage - 1) * constrainedPageSize;

    // Validate log level if provided
    if (logLevel && !['info', 'warn', 'error'].includes(logLevel)) {
      throw new HttpException(
        'Invalid logLevel. Must be one of: info, warn, error',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Parse dates if provided
    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;

    if (startDate) {
      parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        throw new HttpException(
          'Invalid startDate format. Use ISO 8601 format (e.g., 2024-01-15T00:00:00Z)',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (endDate) {
      parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        throw new HttpException(
          'Invalid endDate format. Use ISO 8601 format (e.g., 2024-01-15T23:59:59Z)',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    return this.auditService.findAll({
      user_id: userId ? parseInt(userId, 10) : undefined,
      action: action as AuditAction,
      resource,
      resource_id: resourceId ? parseInt(resourceId, 10) : undefined,
      log_level: logLevel as AuditLogLevel,
      start_date: parsedStartDate,
      end_date: parsedEndDate,
      ip_address: ipAddress,
      limit: constrainedPageSize,
      offset,
    });
  }

  /**
   * Get a specific audit log entry by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get audit log by ID',
    description: 'Retrieve a specific audit log entry by its ID.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Audit log ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Audit log retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AuditLog> {
    const auditLog = await this.auditService.findById(id);

    if (!auditLog) {
      throw new HttpException(
        `Audit log with ID ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return auditLog;
  }

  /**
   * Get audit logs for a specific user
   */
  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get audit logs by user',
    description: 'Retrieve audit logs for a specific user.',
  })
  @ApiParam({ name: 'userId', type: Number, description: 'User ID', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of results (default: 100, max: 500)', example: 100 })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findByUserId(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ): Promise<AuditLog[]> {
    const constrainedLimit = Math.min(Math.max(limit, 1), 500);
    return this.auditService.findByUserId(userId, constrainedLimit);
  }

  /**
   * Get audit logs by action type
   */
  @Get('action/:action')
  @ApiOperation({
    summary: 'Get audit logs by action',
    description: 'Retrieve audit logs filtered by action type.',
  })
  @ApiParam({ name: 'action', type: String, description: 'Action type (e.g., USER_LOGIN, USER_LOGOUT)', example: 'USER_LOGIN' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of results (default: 100, max: 500)', example: 100 })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findByAction(
    @Param('action') action: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ): Promise<AuditLog[]> {
    const constrainedLimit = Math.min(Math.max(limit, 1), 500);
    return this.auditService.findByAction(action as AuditAction, constrainedLimit);
  }
}
