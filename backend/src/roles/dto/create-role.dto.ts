/**
 * Create Role DTO
 * STORY-007A: Rollen-Management Backend
 *
 * Data transfer object for creating a new role.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Role name (unique)',
    example: 'moderator',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Content moderator with limited admin access',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Array of permission IDs to assign to this role',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  permissionIds?: number[];
}
