/**
 * Refresh Token DTO
 * STORY-021B: Resource Endpoints
 * STORY-022: Swagger/OpenAPI Documentation
 */

import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for token refresh
 */
export class RefreshTokenDto {
  /**
   * Refresh token to exchange for new access token
   */
  @ApiProperty({
    description: 'Refresh token to exchange for new access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refresh_token: string;
}
