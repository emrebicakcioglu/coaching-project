/**
 * MFA Controller Unit Tests
 * STORY-005A: MFA Setup (Backend)
 *
 * Tests for MFA controller endpoints.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { MFAController } from '../../src/mfa/mfa.controller';
import { MFAService } from '../../src/mfa/mfa.service';
import { AuthService } from '../../src/auth/auth.service';

describe('MFAController', () => {
  let controller: MFAController;

  const mockMFAService = {
    setupMFA: jest.fn(),
    verifySetup: jest.fn(),
  };

  const mockAuthService = {
    decodeToken: jest.fn(),
  };

  const mockRequest: any = {
    headers: {
      'user-agent': 'Test Agent',
      'x-forwarded-for': '127.0.0.1',
    },
    ip: '127.0.0.1',
    requestId: 'test-request-id',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MFAController],
      providers: [
        {
          provide: MFAService,
          useValue: mockMFAService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<MFAController>(MFAController);

    jest.clearAllMocks();
  });

  describe('setupMFA', () => {
    const validAuthHeader = 'Bearer valid-token';
    const mockSetupResponse = {
      secret: 'TESTBASE32SECRET',
      qrCodeUrl: 'otpauth://totp/CoreApp:test@example.com?secret=TESTBASE32SECRET&issuer=CoreApp',
      backupCodes: ['CODE1234', 'CODE5678', 'CODE9012'],
    };

    it('should initiate MFA setup successfully', async () => {
      mockAuthService.decodeToken.mockReturnValue({
        sub: 1,
        email: 'test@example.com',
      });
      mockMFAService.setupMFA.mockResolvedValue(mockSetupResponse);

      const result = await controller.setupMFA(validAuthHeader, mockRequest);

      expect(result).toEqual(mockSetupResponse);
      expect(mockMFAService.setupMFA).toHaveBeenCalledWith(
        1,
        'test@example.com',
        mockRequest,
      );
    });

    it('should throw UnauthorizedException for missing auth header', async () => {
      await expect(
        controller.setupMFA('', mockRequest),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockAuthService.decodeToken.mockReturnValue(null);

      await expect(
        controller.setupMFA('Bearer invalid-token', mockRequest),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for token without Bearer prefix', async () => {
      await expect(
        controller.setupMFA('invalid-token', mockRequest),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ConflictException if MFA already enabled', async () => {
      mockAuthService.decodeToken.mockReturnValue({
        sub: 1,
        email: 'test@example.com',
      });
      mockMFAService.setupMFA.mockRejectedValue(
        new ConflictException('MFA is already enabled'),
      );

      await expect(
        controller.setupMFA(validAuthHeader, mockRequest),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('verifySetup', () => {
    const validAuthHeader = 'Bearer valid-token';
    const mockVerifyResponse = {
      message: 'MFA enabled successfully',
      enabled: true,
    };

    it('should verify MFA setup successfully', async () => {
      mockAuthService.decodeToken.mockReturnValue({
        sub: 1,
        email: 'test@example.com',
      });
      mockMFAService.verifySetup.mockResolvedValue(mockVerifyResponse);

      const result = await controller.verifySetup(
        { code: '123456' },
        validAuthHeader,
        mockRequest,
      );

      expect(result).toEqual(mockVerifyResponse);
      expect(mockMFAService.verifySetup).toHaveBeenCalledWith(
        1,
        '123456',
        mockRequest,
      );
    });

    it('should throw UnauthorizedException for missing auth header', async () => {
      await expect(
        controller.verifySetup({ code: '123456' }, '', mockRequest),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockAuthService.decodeToken.mockReturnValue(null);

      await expect(
        controller.verifySetup(
          { code: '123456' },
          'Bearer invalid-token',
          mockRequest,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException for invalid code', async () => {
      mockAuthService.decodeToken.mockReturnValue({
        sub: 1,
        email: 'test@example.com',
      });
      mockMFAService.verifySetup.mockRejectedValue(
        new BadRequestException('Invalid verification code'),
      );

      await expect(
        controller.verifySetup({ code: '000000' }, validAuthHeader, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if MFA already enabled', async () => {
      mockAuthService.decodeToken.mockReturnValue({
        sub: 1,
        email: 'test@example.com',
      });
      mockMFAService.verifySetup.mockRejectedValue(
        new ConflictException('MFA is already enabled'),
      );

      await expect(
        controller.verifySetup({ code: '123456' }, validAuthHeader, mockRequest),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if setup not initiated', async () => {
      mockAuthService.decodeToken.mockReturnValue({
        sub: 1,
        email: 'test@example.com',
      });
      mockMFAService.verifySetup.mockRejectedValue(
        new BadRequestException('MFA setup has not been initiated'),
      );

      await expect(
        controller.verifySetup({ code: '123456' }, validAuthHeader, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Authorization header extraction', () => {
    it('should extract user info from valid token', async () => {
      mockAuthService.decodeToken.mockReturnValue({
        sub: 42,
        email: 'user@test.com',
      });
      mockMFAService.setupMFA.mockResolvedValue({
        secret: 'SECRET',
        qrCodeUrl: 'URL',
        backupCodes: [],
      });

      await controller.setupMFA('Bearer test-token', mockRequest);

      expect(mockAuthService.decodeToken).toHaveBeenCalledWith('test-token');
      expect(mockMFAService.setupMFA).toHaveBeenCalledWith(
        42,
        'user@test.com',
        mockRequest,
      );
    });

    it('should throw if token has no sub claim', async () => {
      mockAuthService.decodeToken.mockReturnValue({
        email: 'test@example.com',
      });

      await expect(
        controller.setupMFA('Bearer token-without-sub', mockRequest),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if token has no email claim', async () => {
      mockAuthService.decodeToken.mockReturnValue({
        sub: 1,
      });

      await expect(
        controller.setupMFA('Bearer token-without-email', mockRequest),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
