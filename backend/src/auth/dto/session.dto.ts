/**
 * Session Management DTOs
 * STORY-008: Session Management mit "Remember Me"
 *
 * DTOs for session management endpoints including:
 * - Session list response
 * - Session termination responses
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Single session item in the sessions list
 */
export class SessionItemDto {
  @ApiProperty({
    description: 'Session ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Device description (e.g., "Chrome on Windows")',
    example: 'Chrome on Windows',
  })
  device: string;

  @ApiProperty({
    description: 'Browser name',
    example: 'Chrome',
  })
  browser: string;

  @ApiProperty({
    description: 'Client IP address',
    example: '192.168.1.1',
  })
  ip: string;

  @ApiPropertyOptional({
    description: 'Location based on IP (optional)',
    example: 'Berlin, Germany',
    nullable: true,
  })
  location: string | null;

  @ApiProperty({
    description: 'Last activity timestamp (ISO 8601)',
    example: '2025-11-19T10:30:00Z',
  })
  lastActivity: string;

  @ApiProperty({
    description: 'Session creation timestamp (ISO 8601)',
    example: '2025-11-18T08:15:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Whether this is the current session',
    example: true,
  })
  current: boolean;
}

/**
 * Response for GET /api/auth/sessions
 */
export class SessionsListResponseDto {
  @ApiProperty({
    description: 'List of active sessions',
    type: [SessionItemDto],
  })
  sessions: SessionItemDto[];
}

/**
 * Response for DELETE /api/auth/sessions/:id
 */
export class SessionTerminatedResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Session terminated',
  })
  message: string;
}

/**
 * Response for DELETE /api/auth/sessions/all
 */
export class AllSessionsTerminatedResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'All sessions terminated',
  })
  message: string;

  @ApiProperty({
    description: 'Number of sessions terminated',
    example: 3,
  })
  count: number;
}
