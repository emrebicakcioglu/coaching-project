/**
 * MFA Login Flow Integration Tests
 * STORY-005B: MFA Login-Flow (Backend)
 *
 * Integration tests for the complete MFA login flow including:
 * - Login with MFA-enabled user returning temp token
 * - TOTP code verification
 * - Backup code verification
 * - Rate limiting and lockout
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AuthModule } from '../../src/auth/auth.module';
import { MFAModule } from '../../src/mfa/mfa.module';
import { DatabaseModule } from '../../src/database/database.module';
import { UsersModule } from '../../src/users/users.module';
import { AuditModule } from '../../src/audit/audit.module';
import { EmailModule } from '../../src/email/email.module';
import { DatabaseService } from '../../src/database/database.service';
import { MFAService } from '../../src/mfa/mfa.service';
import * as bcrypt from 'bcrypt';

// Mock external dependencies
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed_password'),
}));

jest.mock('otplib', () => ({
  authenticator: {
    options: {},
    generateSecret: jest.fn().mockReturnValue('TESTBASE32SECRETKEY123456789012'),
    keyuri: jest.fn().mockReturnValue('otpauth://totp/CoreApp:test@example.com'),
    verify: jest.fn(),
  },
}));

import { authenticator } from 'otplib';

describe('MFA Login Flow Integration Tests (STORY-005B)', () => {
  let app: INestApplication;
  let mfaService: MFAService;

  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
  };

  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  const mockDatabaseService = {
    getPool: jest.fn().mockReturnValue(mockPool),
    isConnected: jest.fn().mockReturnValue(true),
    connect: jest.fn(),
    disconnect: jest.fn(),
  };

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    password_hash: 'hashed_password',
    name: 'Test User',
    status: 'active',
    mfa_enabled: true,
    mfa_secret: 'TESTSECRET123456789012345678901234',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockUserNoMFA = {
    ...mockUser,
    id: 2,
    email: 'nomfa@example.com',
    mfa_enabled: false,
    mfa_secret: null,
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test_jwt_secret_minimum_32_characters_long';
    process.env.MFA_TEMP_TOKEN_SECRET = 'test_mfa_temp_secret_minimum_32_characters';
    process.env.MFA_TEMP_TOKEN_EXPIRY = '300';
    process.env.MFA_LOCKOUT_DURATION = '900';
    process.env.NODE_ENV = 'test';

    mockPool.connect.mockResolvedValue(mockClient);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule, MFAModule],
    })
      .overrideProvider(DatabaseService)
      .useValue(mockDatabaseService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    await app.init();

    mfaService = moduleFixture.get<MFAService>(MFAService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);

    // Reset MFA attempts between tests
    if (mfaService) {
      mfaService.clearAttempts(1);
      mfaService.clearAttempts(2);
    }
  });

  describe('Login with MFA User', () => {
    it('should return mfaRequired=true and tempToken for MFA-enabled user', async () => {
      // Mock user lookup (findByEmail in UsersService)
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT') && query.includes('users')) {
          return Promise.resolve({ rows: [mockUser] });
        }
        return Promise.resolve({ rows: [] });
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.mfaRequired).toBe(true);
      expect(response.body.tempToken).toBeDefined();
      expect(response.body.tempToken).toMatch(/^mfa_/);
      expect(response.body.message).toBe('MFA verification required');
      // Should NOT have access_token yet
      expect(response.body.access_token).toBeUndefined();
    });

    it('should return tokens directly for non-MFA user', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT') && query.includes('users')) {
          return Promise.resolve({ rows: [mockUserNoMFA] });
        }
        if (query.includes('INSERT') && query.includes('refresh_tokens')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('UPDATE')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nomfa@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.mfaRequired).toBeUndefined();
      expect(response.body.access_token).toBeDefined();
      expect(response.body.refresh_token).toBeDefined();
      expect(response.body.user).toBeDefined();
    });
  });

  describe('POST /api/auth/mfa/verify-login', () => {
    it('should return final tokens on valid TOTP code', async () => {
      // Generate a valid temp token
      const tempToken = mfaService.generateTempToken(1, 'test@example.com');

      // Mock database queries
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('mfa_secret')) {
          return Promise.resolve({ rows: [{ mfa_secret: 'TESTSECRET' }] });
        }
        if (query.includes('SELECT') && query.includes('users') && query.includes('id = $1')) {
          return Promise.resolve({ rows: [mockUser] });
        }
        if (query.includes('INSERT') && query.includes('refresh_tokens')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('UPDATE')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('audit')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      (authenticator.verify as jest.Mock).mockReturnValue(true);

      const response = await request(app.getHttpServer())
        .post('/api/auth/mfa/verify-login')
        .send({
          tempToken,
          code: '123456',
        });

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.access_token).toBeDefined();
      expect(response.body.refresh_token).toBeDefined();
      expect(response.body.token_type).toBe('Bearer');
      expect(response.body.user).toBeDefined();
    });

    it('should return 401 on invalid TOTP code', async () => {
      const tempToken = mfaService.generateTempToken(1, 'test@example.com');

      mockPool.query.mockResolvedValue({
        rows: [{ mfa_secret: 'TESTSECRET' }],
      });

      (authenticator.verify as jest.Mock).mockReturnValue(false);

      const response = await request(app.getHttpServer())
        .post('/api/auth/mfa/verify-login')
        .send({
          tempToken,
          code: '000000',
        });

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body.message).toContain('Invalid MFA code');
    });

    it('should return 401 on invalid temp token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/mfa/verify-login')
        .send({
          tempToken: 'invalid_token',
          code: '123456',
        });

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should return 400 on invalid code format', async () => {
      const tempToken = mfaService.generateTempToken(1, 'test@example.com');

      const response = await request(app.getHttpServer())
        .post('/api/auth/mfa/verify-login')
        .send({
          tempToken,
          code: '12345', // Only 5 digits
        });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should return 403 after too many failed attempts', async () => {
      const tempToken = mfaService.generateTempToken(1, 'test@example.com');

      mockPool.query.mockResolvedValue({
        rows: [{ mfa_secret: 'TESTSECRET' }],
      });

      (authenticator.verify as jest.Mock).mockReturnValue(false);

      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/auth/mfa/verify-login')
          .send({
            tempToken,
            code: '000000',
          });
      }

      // 6th attempt should return 403
      const response = await request(app.getHttpServer())
        .post('/api/auth/mfa/verify-login')
        .send({
          tempToken,
          code: '123456',
        });

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
      expect(response.body.message).toContain('locked');
    });
  });

  describe('POST /api/auth/mfa/verify-backup-code', () => {
    it('should return final tokens and remaining count on valid backup code', async () => {
      const tempToken = mfaService.generateTempToken(1, 'test@example.com');

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('user_backup_codes') && query.includes('SELECT')) {
          return Promise.resolve({
            rows: [{ id: 1, code_hash: 'hashed_backup_code' }],
          });
        }
        if (query.includes('user_backup_codes') && query.includes('UPDATE')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('COUNT')) {
          return Promise.resolve({ rows: [{ count: '9' }] });
        }
        if (query.includes('SELECT') && query.includes('users')) {
          return Promise.resolve({ rows: [mockUser] });
        }
        if (query.includes('INSERT')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('UPDATE')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post('/api/auth/mfa/verify-backup-code')
        .send({
          tempToken,
          backupCode: 'ABCD1234',
        });

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.access_token).toBeDefined();
      expect(response.body.refresh_token).toBeDefined();
      expect(response.body.message).toContain('9 remaining');
    });

    it('should return 401 on invalid backup code', async () => {
      const tempToken = mfaService.generateTempToken(1, 'test@example.com');

      mockPool.query.mockResolvedValue({
        rows: [{ id: 1, code_hash: 'hashed_backup_code' }],
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const response = await request(app.getHttpServer())
        .post('/api/auth/mfa/verify-backup-code')
        .send({
          tempToken,
          backupCode: 'WRONGCOD',
        });

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body.message).toContain('Invalid backup code');
    });

    it('should return 400 on invalid backup code format', async () => {
      const tempToken = mfaService.generateTempToken(1, 'test@example.com');

      const response = await request(app.getHttpServer())
        .post('/api/auth/mfa/verify-backup-code')
        .send({
          tempToken,
          backupCode: 'SHORT', // Only 5 characters
        });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Complete MFA Login Flow', () => {
    it('should complete full login flow with TOTP', async () => {
      // Step 1: Initial login
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT') && query.includes('users')) {
          return Promise.resolve({ rows: [mockUser] });
        }
        return Promise.resolve({ rows: [] });
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(loginResponse.body.mfaRequired).toBe(true);
      const { tempToken } = loginResponse.body;

      // Step 2: Verify TOTP
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('mfa_secret')) {
          return Promise.resolve({ rows: [{ mfa_secret: 'TESTSECRET' }] });
        }
        if (query.includes('SELECT') && query.includes('users')) {
          return Promise.resolve({ rows: [mockUser] });
        }
        return Promise.resolve({ rows: [] });
      });

      (authenticator.verify as jest.Mock).mockReturnValue(true);

      const verifyResponse = await request(app.getHttpServer())
        .post('/api/auth/mfa/verify-login')
        .send({
          tempToken,
          code: '123456',
        });

      expect(verifyResponse.status).toBe(HttpStatus.OK);
      expect(verifyResponse.body.access_token).toBeDefined();
      expect(verifyResponse.body.user.email).toBe('test@example.com');
    });

    it('should complete full login flow with backup code', async () => {
      // Step 1: Initial login
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT') && query.includes('users')) {
          return Promise.resolve({ rows: [mockUser] });
        }
        return Promise.resolve({ rows: [] });
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(loginResponse.body.mfaRequired).toBe(true);
      const { tempToken } = loginResponse.body;

      // Step 2: Verify backup code
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('user_backup_codes') && query.includes('SELECT')) {
          return Promise.resolve({
            rows: [{ id: 1, code_hash: 'hashed_code' }],
          });
        }
        if (query.includes('user_backup_codes') && query.includes('UPDATE')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('COUNT')) {
          return Promise.resolve({ rows: [{ count: '9' }] });
        }
        if (query.includes('SELECT') && query.includes('users')) {
          return Promise.resolve({ rows: [mockUser] });
        }
        return Promise.resolve({ rows: [] });
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const verifyResponse = await request(app.getHttpServer())
        .post('/api/auth/mfa/verify-backup-code')
        .send({
          tempToken,
          backupCode: 'BACKUP12',
        });

      expect(verifyResponse.status).toBe(HttpStatus.OK);
      expect(verifyResponse.body.access_token).toBeDefined();
      expect(verifyResponse.body.message).toContain('9 remaining');
    });
  });
});
