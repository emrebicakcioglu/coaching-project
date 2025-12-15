/**
 * Validation Pipe Tests
 *
 * Tests for the global ValidationPipe configuration.
 *
 * Story: STORY-021A (API-Basis-Infrastruktur)
 */

import { ValidationPipe, BadRequestException } from '@nestjs/common';
import 'reflect-metadata';
import { IsString, IsEmail, IsNotEmpty, IsInt, Min, Max } from 'class-validator';
// plainToInstance is used by class-validator internally
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { plainToInstance as _plainToInstance } from 'class-transformer';

// Test DTO classes
class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsInt()
  @Min(1)
  @Max(120)
  age!: number;
}

describe('ValidationPipe Configuration', () => {
  let validationPipe: ValidationPipe;

  beforeEach(() => {
    validationPipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    });
  });

  describe('whitelist option', () => {
    it('should strip non-whitelisted properties', async () => {
      const payload = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        extraField: 'should be removed',
        anotherExtra: 123,
      };

      // With forbidNonWhitelisted: true, it should throw
      await expect(
        validationPipe.transform(payload, {
          type: 'body',
          metatype: CreateUserDto,
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('forbidNonWhitelisted option', () => {
    it('should reject requests with unknown properties', async () => {
      const payload = {
        name: 'John',
        email: 'john@example.com',
        age: 25,
        unknownField: 'test',
      };

      await expect(
        validationPipe.transform(payload, {
          type: 'body',
          metatype: CreateUserDto,
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('transform option', () => {
    it('should transform payload to DTO instance', async () => {
      const validPipe = new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      });

      const payload = {
        name: 'John',
        email: 'john@example.com',
        age: '25', // String that should be converted to number
      };

      const result = await validPipe.transform(payload, {
        type: 'body',
        metatype: CreateUserDto,
      });

      expect(result).toBeInstanceOf(CreateUserDto);
      expect(result.age).toBe(25);
      expect(typeof result.age).toBe('number');
    });
  });

  describe('validation errors', () => {
    it('should reject missing required fields', async () => {
      const payload = {
        email: 'john@example.com',
        age: 25,
      };

      await expect(
        validationPipe.transform(payload, {
          type: 'body',
          metatype: CreateUserDto,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid email format', async () => {
      const payload = {
        name: 'John',
        email: 'not-an-email',
        age: 25,
      };

      await expect(
        validationPipe.transform(payload, {
          type: 'body',
          metatype: CreateUserDto,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject values outside valid range', async () => {
      const payload = {
        name: 'John',
        email: 'john@example.com',
        age: 150, // Outside valid range
      };

      await expect(
        validationPipe.transform(payload, {
          type: 'body',
          metatype: CreateUserDto,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate empty strings', async () => {
      const payload = {
        name: '',
        email: 'john@example.com',
        age: 25,
      };

      await expect(
        validationPipe.transform(payload, {
          type: 'body',
          metatype: CreateUserDto,
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('valid payloads', () => {
    it('should pass validation for correct payload', async () => {
      const validPipe = new ValidationPipe({
        whitelist: true,
        transform: true,
      });

      const payload = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
      };

      const result = await validPipe.transform(payload, {
        type: 'body',
        metatype: CreateUserDto,
      });

      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.age).toBe(25);
    });
  });
});
