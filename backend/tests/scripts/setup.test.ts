/**
 * Setup Script Tests
 *
 * Tests for the setup script functionality.
 * These are integration-style tests that verify the setup behavior.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('Setup Script', () => {
  const backendDir = path.resolve(__dirname, '../..');
  const envPath = path.join(backendDir, '.env');
  const envExamplePath = path.join(backendDir, '.env.example');
  const envBackupPath = path.join(backendDir, '.env.backup');
  const logsPath = path.join(backendDir, 'logs');

  // Backup existing .env if present
  beforeAll(() => {
    if (fs.existsSync(envPath)) {
      fs.copyFileSync(envPath, envBackupPath);
    }
  });

  // Restore .env after tests
  afterAll(() => {
    if (fs.existsSync(envBackupPath)) {
      fs.copyFileSync(envBackupPath, envPath);
      fs.unlinkSync(envBackupPath);
    }
  });

  // Clean up before each test
  beforeEach(() => {
    // Remove .env if it exists
    if (fs.existsSync(envPath)) {
      fs.unlinkSync(envPath);
    }
  });

  describe('.env.example existence', () => {
    it('should have .env.example file', () => {
      expect(fs.existsSync(envExamplePath)).toBe(true);
    });

    it('.env.example should contain required sections', () => {
      const content = fs.readFileSync(envExamplePath, 'utf-8');

      // Check for required sections
      expect(content).toContain('Application');
      expect(content).toContain('Database');
      expect(content).toContain('JWT');
      expect(content).toContain('Email');
      expect(content).toContain('Security');
      expect(content).toContain('Logging');
    });

    it('.env.example should contain all required variables', () => {
      const content = fs.readFileSync(envExamplePath, 'utf-8');

      // Application
      expect(content).toContain('NODE_ENV=');
      expect(content).toContain('APP_PORT=');
      expect(content).toContain('APP_HOST=');
      expect(content).toContain('APP_URL=');

      // Database
      expect(content).toContain('DB_HOST=');
      expect(content).toContain('DB_PORT=');
      expect(content).toContain('DB_USER=');
      expect(content).toContain('DB_PASSWORD=');
      expect(content).toContain('DB_NAME=');
      expect(content).toContain('DB_SSL=');

      // JWT
      expect(content).toContain('JWT_SECRET=');
      expect(content).toContain('JWT_EXPIRES_IN=');

      // Email
      expect(content).toContain('RESEND_API_KEY=');
      expect(content).toContain('EMAIL_FROM_NAME=');
      expect(content).toContain('EMAIL_FROM_ADDRESS=');

      // Security
      expect(content).toContain('BCRYPT_ROUNDS=');

      // Logging
      expect(content).toContain('LOG_LEVEL=');
    });

    it('.env.example should have placeholder values for secrets', () => {
      const content = fs.readFileSync(envExamplePath, 'utf-8');

      // Should have placeholder text for passwords
      expect(content).toContain('your_secure_password');
      expect(content).toContain('your_super_secret_jwt_key');
      expect(content).toContain('re_');
    });
  });

  describe('Setup script execution', () => {
    it('should create .env from .env.example when .env does not exist', () => {
      // Ensure .env doesn't exist
      if (fs.existsSync(envPath)) {
        fs.unlinkSync(envPath);
      }

      // Run setup with CI=true to avoid interactive prompt
      execSync('node scripts/setup.js', {
        cwd: backendDir,
        env: { ...process.env, CI: 'true' },
        stdio: 'pipe',
      });

      // Verify .env was created
      expect(fs.existsSync(envPath)).toBe(true);

      // Verify content matches .env.example
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const exampleContent = fs.readFileSync(envExamplePath, 'utf-8');
      expect(envContent).toBe(exampleContent);
    });

    it('should skip creation if .env already exists in CI mode', () => {
      // Create a test .env file
      const testContent = '# Test .env file\nTEST_VAR=test';
      fs.writeFileSync(envPath, testContent);

      // Run setup with CI=true
      execSync('node scripts/setup.js', {
        cwd: backendDir,
        env: { ...process.env, CI: 'true' },
        stdio: 'pipe',
      });

      // Verify .env was not overwritten
      const envContent = fs.readFileSync(envPath, 'utf-8');
      expect(envContent).toBe(testContent);
    });

    it('should create logs directory', () => {
      // Remove logs directory if it exists
      if (fs.existsSync(logsPath)) {
        fs.rmSync(logsPath, { recursive: true });
      }

      // Run setup
      execSync('node scripts/setup.js', {
        cwd: backendDir,
        env: { ...process.env, CI: 'true' },
        stdio: 'pipe',
      });

      // Verify logs directory was created
      expect(fs.existsSync(logsPath)).toBe(true);
    });
  });

  describe('.gitignore configuration', () => {
    it('should have .gitignore file', () => {
      const gitignorePath = path.join(backendDir, '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);
    });

    it('.gitignore should exclude .env files', () => {
      const gitignorePath = path.join(backendDir, '.gitignore');
      const content = fs.readFileSync(gitignorePath, 'utf-8');

      expect(content).toContain('.env');
      expect(content).toContain('.env.local');
      expect(content).toContain('.env.development');
      expect(content).toContain('.env.production');
      expect(content).toContain('.env.staging');
    });

    it('.gitignore should NOT exclude .env.example', () => {
      const gitignorePath = path.join(backendDir, '.gitignore');
      const content = fs.readFileSync(gitignorePath, 'utf-8');

      expect(content).toContain('!.env.example');
    });

    it('.gitignore should exclude sensitive files', () => {
      const gitignorePath = path.join(backendDir, '.gitignore');
      const content = fs.readFileSync(gitignorePath, 'utf-8');

      expect(content).toContain('*.pem');
      expect(content).toContain('*.key');
      expect(content).toContain('secrets/');
    });
  });
});
