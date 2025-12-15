/**
 * Version Controller Unit Tests
 * STORY-030: Application Versioning
 *
 * Tests for the VersionController class.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { VersionController } from '../../src/version/version.controller';
import { VersionService } from '../../src/version/version.service';
import { VersionResponseDto } from '../../src/version/dto';

describe('VersionController', () => {
  let controller: VersionController;
  let versionService: VersionService;

  const mockVersionResponse: VersionResponseDto = {
    version: '1.0.0',
    name: 'core-app-backend',
    description: 'Core Application Backend API',
    timestamp: '2025-12-08T10:00:00.000Z',
    build: '12345',
    commit: 'abc123def456',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VersionController],
      providers: [
        {
          provide: VersionService,
          useValue: {
            getVersion: jest.fn().mockReturnValue(mockVersionResponse),
            getVersionString: jest.fn().mockReturnValue('1.0.0'),
            getApplicationName: jest.fn().mockReturnValue('core-app-backend'),
          },
        },
      ],
    }).compile();

    controller = module.get<VersionController>(VersionController);
    versionService = module.get<VersionService>(VersionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getVersion', () => {
    it('should return version information', () => {
      const result = controller.getVersion();

      expect(result).toEqual(mockVersionResponse);
      expect(versionService.getVersion).toHaveBeenCalled();
    });

    it('should return version with semantic versioning format', () => {
      const result = controller.getVersion();

      expect(result.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should return response with required fields', () => {
      const result = controller.getVersion();

      expect(result.version).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should return response with optional fields when available', () => {
      const result = controller.getVersion();

      expect(result.build).toBe('12345');
      expect(result.commit).toBe('abc123def456');
    });

    it('should handle missing optional fields', () => {
      const responseWithoutOptional: VersionResponseDto = {
        version: '1.0.0',
        name: 'core-app-backend',
        description: 'Core Application Backend API',
        timestamp: '2025-12-08T10:00:00.000Z',
      };

      jest.spyOn(versionService, 'getVersion').mockReturnValue(responseWithoutOptional);

      const result = controller.getVersion();

      expect(result.build).toBeUndefined();
      expect(result.commit).toBeUndefined();
    });
  });
});
