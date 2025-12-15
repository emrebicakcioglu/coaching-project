/**
 * Database Module
 *
 * NestJS module for database connection management.
 * Provides DatabaseService as a global provider.
 *
 * Story: STORY-021A (API-Basis-Infrastruktur)
 */

import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
