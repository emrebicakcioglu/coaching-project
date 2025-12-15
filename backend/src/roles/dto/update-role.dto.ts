/**
 * Update Role DTO
 * STORY-007A: Rollen-Management Backend
 *
 * Data transfer object for updating an existing role.
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateRoleDto {
  @ApiPropertyOptional({
    description: 'Role name (unique)',
    example: 'moderator',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Updated description for the moderator role',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Array of permission IDs to assign to this role (replaces existing)',
    type: [Number],
    example: [1, 2, 3, 4],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  permissionIds?: number[];
}
