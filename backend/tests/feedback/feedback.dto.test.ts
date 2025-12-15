/**
 * Feedback DTO Validation Tests
 * STORY-038A: Feedback-Backend API
 *
 * Tests for SubmitFeedbackDto validation rules
 */

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SubmitFeedbackDto } from '../../src/feedback/dto/feedback.dto';

describe('SubmitFeedbackDto', () => {
  describe('screenshot validation', () => {
    it('should pass with valid Base64 screenshot', async () => {
      const dto = plainToInstance(SubmitFeedbackDto, {
        screenshot: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        comment: 'Test feedback',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass with data URL format screenshot', async () => {
      const dto = plainToInstance(SubmitFeedbackDto, {
        screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        comment: 'Test feedback',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when screenshot is empty', async () => {
      const dto = plainToInstance(SubmitFeedbackDto, {
        screenshot: '',
        comment: 'Test feedback',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail when screenshot is missing', async () => {
      const dto = plainToInstance(SubmitFeedbackDto, {
        comment: 'Test feedback',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const screenshotError = errors.find((e) => e.property === 'screenshot');
      expect(screenshotError).toBeDefined();
    });
  });

  describe('comment validation', () => {
    it('should pass with valid comment', async () => {
      const dto = plainToInstance(SubmitFeedbackDto, {
        screenshot: 'base64data',
        comment: 'This is a valid feedback comment.',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when comment is empty', async () => {
      const dto = plainToInstance(SubmitFeedbackDto, {
        screenshot: 'base64data',
        comment: '',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail when comment is missing', async () => {
      const dto = plainToInstance(SubmitFeedbackDto, {
        screenshot: 'base64data',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const commentError = errors.find((e) => e.property === 'comment');
      expect(commentError).toBeDefined();
    });

    it('should fail when comment exceeds 5000 characters', async () => {
      const dto = plainToInstance(SubmitFeedbackDto, {
        screenshot: 'base64data',
        comment: 'a'.repeat(5001),
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });

    it('should pass with comment of exactly 5000 characters', async () => {
      const dto = plainToInstance(SubmitFeedbackDto, {
        screenshot: 'base64data',
        comment: 'a'.repeat(5000),
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('url validation', () => {
    it('should pass with valid URL', async () => {
      const dto = plainToInstance(SubmitFeedbackDto, {
        screenshot: 'base64data',
        comment: 'Test feedback',
        url: 'https://example.com/page/path?query=value',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass when url is omitted (optional)', async () => {
      const dto = plainToInstance(SubmitFeedbackDto, {
        screenshot: 'base64data',
        comment: 'Test feedback',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when url exceeds 2048 characters', async () => {
      const dto = plainToInstance(SubmitFeedbackDto, {
        screenshot: 'base64data',
        comment: 'Test feedback',
        url: 'https://example.com/' + 'a'.repeat(2030),
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const urlError = errors.find((e) => e.property === 'url');
      expect(urlError).toBeDefined();
      expect(urlError!.constraints).toHaveProperty('maxLength');
    });

    it('should pass with url of exactly 2048 characters', async () => {
      // URL exactly 2048 characters
      const prefix = 'https://e.co/'; // 13 characters
      const dto = plainToInstance(SubmitFeedbackDto, {
        screenshot: 'base64data',
        comment: 'Test feedback',
        url: prefix + 'a'.repeat(2048 - prefix.length), // Exactly 2048 characters
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('browserInfo validation', () => {
    it('should pass with valid browserInfo', async () => {
      const dto = plainToInstance(SubmitFeedbackDto, {
        screenshot: 'base64data',
        comment: 'Test feedback',
        browserInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass when browserInfo is omitted (optional)', async () => {
      const dto = plainToInstance(SubmitFeedbackDto, {
        screenshot: 'base64data',
        comment: 'Test feedback',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when browserInfo exceeds 500 characters', async () => {
      const dto = plainToInstance(SubmitFeedbackDto, {
        screenshot: 'base64data',
        comment: 'Test feedback',
        browserInfo: 'a'.repeat(501),
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const browserInfoError = errors.find((e) => e.property === 'browserInfo');
      expect(browserInfoError).toBeDefined();
      expect(browserInfoError!.constraints).toHaveProperty('maxLength');
    });

    it('should pass with browserInfo of exactly 500 characters', async () => {
      const dto = plainToInstance(SubmitFeedbackDto, {
        screenshot: 'base64data',
        comment: 'Test feedback',
        browserInfo: 'a'.repeat(500),
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('complete DTO validation', () => {
    it('should pass with all fields provided', async () => {
      const dto = plainToInstance(SubmitFeedbackDto, {
        screenshot: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        comment: 'This is detailed feedback about the application.',
        url: 'https://app.example.com/dashboard/settings',
        browserInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass with only required fields', async () => {
      const dto = plainToInstance(SubmitFeedbackDto, {
        screenshot: 'base64data',
        comment: 'Minimal feedback',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with completely empty object', async () => {
      const dto = plainToInstance(SubmitFeedbackDto, {});

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThanOrEqual(2); // At least screenshot and comment
    });
  });
});
