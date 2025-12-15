/**
 * Version Service Unit Tests
 * STORY-030: Application Versioning
 *
 * Tests for the VersionService class.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { VersionService } from '../../src/version/version.service';

describe('VersionService', () => {
  let service: VersionService;
  const originalEnv = process.env;

  beforeEach(async () => {
    // Reset environment before each test
    process.env = { ...originalEnv };

    const module: TestingModule = await Test.createTestingModule({
      providers: [VersionService],
    }).compile();

    service = module.get<VersionService>(VersionService);
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getVersion', () => {
    it('should return version information', () => {
      const result = service.getVersion();

      expect(result).toBeDefined();
      expect(result.version).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should return semantic version format', () => {
      const result = service.getVersion();

      // Check semantic version format (MAJOR.MINOR.PATCH)
      expect(result.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should return valid ISO timestamp', () => {
      const result = service.getVersion();
      const timestamp = new Date(result.timestamp);

      expect(timestamp.toISOString()).toBe(result.timestamp);
    });

    it('should include build number when BUILD_NUMBER env is set', () => {
      // Set build number environment variable
      process.env.BUILD_NUMBER = '12345';

      // Create new service instance to pick up env var
      const serviceWithBuild = new VersionService();
      const result = serviceWithBuild.getVersion();

      expect(result.build).toBe('12345');
    });

    it('should not include build number when BUILD_NUMBER env is not set', () => {
      delete process.env.BUILD_NUMBER;

      const serviceWithoutBuild = new VersionService();
      const result = serviceWithoutBuild.getVersion();

      expect(result.build).toBeUndefined();
    });

    it('should include git commit when GIT_COMMIT env is set', () => {
      // Set git commit environment variable
      process.env.GIT_COMMIT = 'abc123def456789ghijkl';

      const serviceWithCommit = new VersionService();
      const result = serviceWithCommit.getVersion();

      // Should be truncated to 12 characters
      expect(result.commit).toBe('abc123def456');
    });

    it('should not include git commit when GIT_COMMIT env is not set', () => {
      delete process.env.GIT_COMMIT;

      const serviceWithoutCommit = new VersionService();
      const result = serviceWithoutCommit.getVersion();

      expect(result.commit).toBeUndefined();
    });

    it('should include all optional fields when both env vars are set', () => {
      process.env.BUILD_NUMBER = '99999';
      process.env.GIT_COMMIT = 'deadbeef1234567890';

      const serviceWithAll = new VersionService();
      const result = serviceWithAll.getVersion();

      expect(result.build).toBe('99999');
      expect(result.commit).toBe('deadbeef1234');
    });
  });

  describe('getVersionString', () => {
    it('should return just the version string', () => {
      const result = service.getVersionString();

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('getApplicationName', () => {
    it('should return the application name', () => {
      const result = service.getApplicationName();

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
