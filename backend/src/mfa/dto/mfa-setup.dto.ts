/**
 * MFA Setup DTOs
 * STORY-005A: MFA Setup (Backend)
 *
 * DTOs for MFA setup initiation
 */

import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for MFA setup initiation
 * Contains the secret, QR code URL, and backup codes
 */
export class MFASetupResponseDto {
  @ApiProperty({
    description: 'Base32-encoded TOTP secret',
    example: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
  })
  secret: string;

  @ApiProperty({
    description: 'otpauth:// URL for QR code generation',
    example: 'otpauth://totp/CoreApp:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=CoreApp',
  })
  qrCodeUrl: string;

  @ApiProperty({
    description: 'List of 10 backup codes (8 characters each)',
    example: ['A1B2C3D4', 'E5F6G7H8', 'I9J0K1L2'],
    type: [String],
  })
  backupCodes: string[];

  constructor(partial?: Partial<MFASetupResponseDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
