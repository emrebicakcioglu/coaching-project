/**
 * MFA Verify DTOs
 * STORY-005A: MFA Setup (Backend)
 *
 * DTOs for MFA verification and enabling
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

/**
 * Request DTO for MFA setup verification
 * User submits a 6-digit TOTP code to verify and enable MFA
 */
export class MFAVerifySetupDto {
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
 * Response DTO for successful MFA verification/enabling
 */
export class MFAVerifyResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'MFA enabled successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Whether MFA is now enabled',
    example: true,
  })
  enabled: boolean;

  constructor(partial?: Partial<MFAVerifyResponseDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
