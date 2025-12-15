/**
 * MFA Login DTOs
 * STORY-005B: MFA Login-Flow (Backend)
 *
 * DTOs for MFA verification during login process.
 * Handles temporary tokens, TOTP verification, and backup code validation.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Length, Matches, IsNotEmpty } from 'class-validator';
import { UserResponseDto } from '../../users/dto/user-response.dto';

/**
 * Response when MFA is required during login
 * Contains temporary token for completing MFA verification
 */
export class MFARequiredResponseDto {
  @ApiProperty({
    description: 'Indicates MFA verification is required',
    example: true,
  })
  mfaRequired: boolean = true;

  @ApiProperty({
    description: 'Temporary token for MFA verification (valid for 5 minutes)',
    example: 'mfa_temp_abc123def456...',
  })
  tempToken: string;

  @ApiProperty({
    description: 'Message indicating MFA is required',
    example: 'MFA verification required',
  })
  message: string = 'MFA verification required';

  constructor(partial?: Partial<MFARequiredResponseDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

/**
 * Request DTO for verifying TOTP code during login
 */
export class MFAVerifyLoginDto {
  @ApiProperty({
    description: 'Temporary token received from login endpoint',
    example: 'mfa_temp_abc123def456...',
  })
  @IsString()
  @IsNotEmpty({ message: 'Temporary token is required' })
  tempToken: string;

  @ApiProperty({
    description: '6-digit TOTP code from authenticator app',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Code must contain only digits' })
  code: string;
}

/**
 * Request DTO for verifying backup code during login
 */
export class MFAVerifyBackupCodeDto {
  @ApiProperty({
    description: 'Temporary token received from login endpoint',
    example: 'mfa_temp_abc123def456...',
  })
  @IsString()
  @IsNotEmpty({ message: 'Temporary token is required' })
  tempToken: string;

  @ApiProperty({
    description: '8-character backup code',
    example: 'A1B2C3D4',
    minLength: 8,
    maxLength: 8,
  })
  @IsString()
  @Length(8, 8, { message: 'Backup code must be exactly 8 characters' })
  @Matches(/^[A-Z0-9]{8}$/i, { message: 'Backup code must contain only letters and numbers' })
  backupCode: string;
}

/**
 * Response after successful MFA verification
 * Contains final JWT tokens and user information
 */
export class MFALoginSuccessResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'Refresh token for obtaining new access tokens',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refresh_token: string;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
    default: 'Bearer',
  })
  token_type: string = 'Bearer';

  @ApiProperty({
    description: 'Access token expiration time in seconds',
    example: 900,
  })
  expires_in: number;

  @ApiProperty({
    description: 'Authenticated user details',
    type: () => UserResponseDto,
  })
  user: UserResponseDto;

  @ApiPropertyOptional({
    description: 'Optional message (e.g., backup code remaining count)',
    example: 'Backup code used. 9 remaining.',
  })
  message?: string;

  constructor(partial?: Partial<MFALoginSuccessResponseDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

/**
 * Error response for MFA verification failures
 */
export class MFAVerifyErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 401,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Invalid MFA code',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Remaining verification attempts before lockout',
    example: 3,
  })
  remainingAttempts?: number;

  @ApiPropertyOptional({
    description: 'Whether the account is locked due to too many failed attempts',
    example: false,
  })
  locked?: boolean;
}
