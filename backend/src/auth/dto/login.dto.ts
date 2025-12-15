/**
 * Login DTO
 * STORY-021B: Resource Endpoints
 * STORY-022: Swagger/OpenAPI Documentation
 * STORY-008: Session Management mit "Remember Me"
 * STORY-CAPTCHA: Login Security with CAPTCHA
 */

import { IsEmail, IsString, MinLength, MaxLength, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for user login
 */
export class LoginDto {
  /**
   * User email address
   */
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    format: 'email',
    maxLength: 255,
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255, { message: 'Email must be at most 255 characters' })
  email: string;

  /**
   * User password
   */
  @ApiProperty({
    description: 'User password',
    example: 'SecurePass123',
    format: 'password',
    minLength: 1,
    maxLength: 128,
  })
  @IsString()
  @MinLength(1, { message: 'Password is required' })
  @MaxLength(128, { message: 'Password must be at most 128 characters' })
  password: string;

  /**
   * Remember Me option (STORY-008)
   * When true: Session valid for 30 days
   * When false: Session valid for 24 hours (standard timeout)
   * Default: false (security best practice)
   */
  @ApiPropertyOptional({
    description: 'Remember Me option - extends session to 30 days when enabled',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'rememberMe must be a boolean' })
  rememberMe?: boolean;

  /**
   * CAPTCHA ID (STORY-CAPTCHA)
   * Required after 2 failed login attempts
   */
  @ApiPropertyOptional({
    description: 'CAPTCHA challenge ID (required after 2 failed attempts)',
    example: 'a1b2c3d4e5f6g7h8',
  })
  @IsOptional()
  @IsString({ message: 'captchaId must be a string' })
  captchaId?: string;

  /**
   * CAPTCHA answer (STORY-CAPTCHA)
   * Required when captchaId is provided
   */
  @ApiPropertyOptional({
    description: 'CAPTCHA answer (required when captchaId is provided)',
    example: '42',
  })
  @IsOptional()
  @IsString({ message: 'captchaAnswer must be a string' })
  captchaAnswer?: string;
}
