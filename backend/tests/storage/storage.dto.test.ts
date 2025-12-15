/**
 * Storage DTO Unit Tests
 * STORY-026A: MinIO Setup
 *
 * Tests for the Storage DTOs and validation.
 */

import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  BucketName,
  FileUploadDto,
  FileListQueryDto,
  PresignedUrlQueryDto,
  PresignedUploadRequestDto,
} from '../../src/storage/dto';

describe('Storage DTOs (STORY-026A)', () => {
  describe('BucketName Enum', () => {
    it('should have correct bucket values', () => {
      expect(BucketName.UPLOADS).toBe('uploads');
      expect(BucketName.LOGOS).toBe('logos');
      expect(BucketName.FEEDBACK).toBe('feedback');
    });
  });

  describe('FileUploadDto', () => {
    it('should accept valid bucket', async () => {
      const dto = plainToClass(FileUploadDto, {
        bucket: BucketName.UPLOADS,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept optional customName', async () => {
      const dto = plainToClass(FileUploadDto, {
        bucket: BucketName.UPLOADS,
        customName: 'my-custom-file.pdf',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.customName).toBe('my-custom-file.pdf');
    });

    it('should accept optional path', async () => {
      const dto = plainToClass(FileUploadDto, {
        bucket: BucketName.UPLOADS,
        path: 'users/123/documents',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.path).toBe('users/123/documents');
    });

    it('should reject invalid bucket', async () => {
      const dto = plainToClass(FileUploadDto, {
        bucket: 'invalid-bucket',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('bucket');
    });

    it('should reject customName exceeding max length', async () => {
      const dto = plainToClass(FileUploadDto, {
        bucket: BucketName.UPLOADS,
        customName: 'a'.repeat(256),
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('customName');
    });
  });

  describe('FileListQueryDto', () => {
    it('should accept valid bucket and prefix', async () => {
      const dto = plainToClass(FileListQueryDto, {
        bucket: BucketName.LOGOS,
        prefix: 'company/',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should default bucket to undefined if not provided', async () => {
      const dto = plainToClass(FileListQueryDto, {});

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject prefix exceeding max length', async () => {
      const dto = plainToClass(FileListQueryDto, {
        prefix: 'a'.repeat(256),
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('prefix');
    });
  });

  describe('PresignedUrlQueryDto', () => {
    it('should accept valid parameters', async () => {
      const dto = plainToClass(PresignedUrlQueryDto, {
        bucket: BucketName.UPLOADS,
        expiry: 3600,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should default expiry to 3600 if not provided', async () => {
      const dto = plainToClass(PresignedUrlQueryDto, {
        bucket: BucketName.UPLOADS,
      });

      expect(dto.expiry).toBe(3600);
    });

    it('should reject expiry less than 60 seconds', async () => {
      const dto = plainToClass(PresignedUrlQueryDto, {
        bucket: BucketName.UPLOADS,
        expiry: 30,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('expiry');
    });

    it('should reject expiry greater than 7 days', async () => {
      const dto = plainToClass(PresignedUrlQueryDto, {
        bucket: BucketName.UPLOADS,
        expiry: 604801, // 7 days + 1 second
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('expiry');
    });
  });

  describe('PresignedUploadRequestDto', () => {
    it('should accept valid parameters', async () => {
      const dto = plainToClass(PresignedUploadRequestDto, {
        fileName: 'document.pdf',
        bucket: BucketName.UPLOADS,
        contentType: 'application/pdf',
        expiry: 3600,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should require fileName', async () => {
      const dto = plainToClass(PresignedUploadRequestDto, {
        bucket: BucketName.UPLOADS,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('fileName');
    });

    it('should accept optional contentType', async () => {
      const dto = plainToClass(PresignedUploadRequestDto, {
        fileName: 'image.png',
        contentType: 'image/png',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.contentType).toBe('image/png');
    });

    it('should default bucket and expiry', async () => {
      const dto = plainToClass(PresignedUploadRequestDto, {
        fileName: 'test.txt',
      });

      expect(dto.bucket).toBe(BucketName.UPLOADS);
      expect(dto.expiry).toBe(3600);
    });
  });
});
