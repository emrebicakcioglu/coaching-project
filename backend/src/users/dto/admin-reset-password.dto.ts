/**
 * Admin Reset Password DTO
 * STORY-003A: User CRUD Backend API
 */

import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for admin-initiated password reset
 */
export class AdminResetPasswordDto {
  /**
   * New password for the user
   * Must be at least 8 characters with at least one uppercase, one lowercase, and one number
   */
  @ApiProperty({
    description: 'New password. Must be at least 8 characters with uppercase, lowercase, and number',
    example: 'TempPass123',
    minLength: 8,
    maxLength: 128,
    format: 'password',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must be at most 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  new_password: string;
}
