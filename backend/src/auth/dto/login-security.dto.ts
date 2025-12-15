/**
 * Login Security DTOs
 * STORY-CAPTCHA: Login Security with CAPTCHA and Delay
 *
 * Data Transfer Objects for login security features including
 * CAPTCHA generation and login status checking.
 */

import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for login security status
 */
export class LoginSecurityStatusDto {
  @ApiProperty({
    description: 'Whether CAPTCHA is required for login',
    example: true,
  })
  requiresCaptcha: boolean;

  @ApiProperty({
    description: 'Number of seconds delay applied to login attempts',
    example: 10,
  })
  delaySeconds: number;

  @ApiProperty({
    description: 'Number of failed login attempts',
    example: 3,
  })
  failedAttempts: number;
}

/**
 * Response DTO for CAPTCHA generation
 */
export class CaptchaResponseDto {
  @ApiProperty({
    description: 'Unique CAPTCHA challenge ID',
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  })
  captchaId: string;

  @ApiProperty({
    description: 'CAPTCHA question to display to user',
    example: 'Was ist 7 + 5?',
  })
  question: string;

  @ApiProperty({
    description: 'When the CAPTCHA challenge expires',
    example: '2024-01-15T10:30:00.000Z',
  })
  expiresAt: Date;
}

/**
 * Extended auth response with CAPTCHA requirement info
 */
export class AuthResponseWithSecurityDto {
  @ApiProperty({
    description: 'Whether CAPTCHA is required for next login attempt',
    example: true,
    required: false,
  })
  requiresCaptcha?: boolean;

  @ApiProperty({
    description: 'CAPTCHA challenge data (when CAPTCHA is required)',
    type: CaptchaResponseDto,
    required: false,
  })
  captcha?: CaptchaResponseDto;

  @ApiProperty({
    description: 'Number of seconds delay on next attempt',
    example: 10,
    required: false,
  })
  delaySeconds?: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Invalid email or password',
    required: false,
  })
  message?: string;
}
