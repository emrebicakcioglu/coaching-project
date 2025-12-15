/**
 * Version Service
 *
 * Service for retrieving application version information.
 * Reads version from package.json and optionally includes
 * build number and git commit hash from environment variables.
 *
 * Stories:
 * - STORY-030: Application Versioning
 *
 * Environment Variables:
 * - BUILD_NUMBER: Optional build number (e.g., CI build number)
 * - GIT_COMMIT: Optional git commit hash for traceability
 */

import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { VersionResponseDto } from './dto';

/**
 * Package.json structure (partial)
 */
interface PackageJson {
  name: string;
  version: string;
  description: string;
}

@Injectable()
export class VersionService {
  private readonly packageInfo: PackageJson;

  constructor() {
    // Load package.json at startup
    this.packageInfo = this.loadPackageJson();
  }

  /**
   * Load package.json from project root
   */
  private loadPackageJson(): PackageJson {
    try {
      // Try multiple paths to find package.json
      const possiblePaths = [
        path.join(__dirname, '../../package.json'), // From dist/version
        path.join(__dirname, '../../../package.json'), // From src/version
        path.join(process.cwd(), 'package.json'), // Current working directory
      ];

      for (const packagePath of possiblePaths) {
        if (fs.existsSync(packagePath)) {
          const content = fs.readFileSync(packagePath, 'utf-8');
          return JSON.parse(content);
        }
      }

      // Default fallback if package.json not found
      return {
        name: 'core-app-backend',
        version: '1.0.0',
        description: 'Core Application Backend API',
      };
    } catch (error) {
      // Fallback values if reading fails
      return {
        name: 'core-app-backend',
        version: '1.0.0',
        description: 'Core Application Backend API',
      };
    }
  }

  /**
   * Get application version information
   *
   * Returns version from package.json with optional build and commit info
   * from environment variables.
   *
   * @returns Version information DTO
   */
  getVersion(): VersionResponseDto {
    const response: VersionResponseDto = {
      version: this.packageInfo.version,
      name: this.packageInfo.name,
      description: this.packageInfo.description,
      timestamp: new Date().toISOString(),
    };

    // Add optional build number from environment
    // Environment variable: BUILD_NUMBER (set during CI/CD builds)
    const buildNumber = process.env.BUILD_NUMBER;
    if (buildNumber) {
      response.build = buildNumber;
    }

    // Add optional git commit hash from environment
    // Environment variable: GIT_COMMIT (set during CI/CD builds)
    const gitCommit = process.env.GIT_COMMIT;
    if (gitCommit) {
      // Truncate to first 12 characters for readability
      response.commit = gitCommit.substring(0, 12);
    }

    return response;
  }

  /**
   * Get just the version string
   *
   * @returns Version string (e.g., "1.0.0")
   */
  getVersionString(): string {
    return this.packageInfo.version;
  }

  /**
   * Get application name
   *
   * @returns Application name
   */
  getApplicationName(): string {
    return this.packageInfo.name;
  }
}
