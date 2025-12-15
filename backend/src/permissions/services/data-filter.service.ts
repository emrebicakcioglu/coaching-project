/**
 * Data Filter Service
 * STORY-027B: Permission Guards & Data Filtering
 *
 * Provides data-level filtering based on user roles and permissions.
 * Implements the DataFilter interface from the story requirements.
 *
 * Features:
 * - Manager sees only team data
 * - User sees only own data
 * - Admin sees all data
 * - Consistent filtering across all endpoints
 * - Query builder integration
 */

import {
  Injectable,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { WinstonLoggerService } from '../../common/services/logger.service';
import { DataLevelContext, DataScope, PermissionsService } from '../permissions.service';

/**
 * Query builder type for applying filters
 */
export interface FilterableQuery {
  where?: Record<string, unknown>;
  params?: unknown[];
  text?: string;
}

/**
 * Data scope types for different access levels
 */
export type DataScopeType = 'all' | 'team' | 'own' | 'none';

/**
 * Extended data scope with additional metadata
 */
export interface ExtendedDataScope extends DataScope {
  type: DataScopeType;
  userId: number;
  teamIds?: number[];
}

/**
 * Filter configuration for a resource
 */
export interface FilterConfig {
  /** Table name or alias */
  table?: string;
  /** Column that identifies the owner */
  ownerColumn?: string;
  /** Column that identifies the team */
  teamColumn?: string;
  /** Whether to include the user's own data in team scope */
  includeOwnInTeamScope?: boolean;
}

/**
 * Filter result with SQL and parameters
 */
export interface FilterResult {
  /** SQL WHERE clause condition */
  whereClause: string;
  /** SQL parameters */
  params: unknown[];
  /** Description for logging */
  description: string;
  /** Scope type applied */
  scopeType: DataScopeType;
}

@Injectable()
export class DataFilterService {
  constructor(
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => PermissionsService))
    private readonly permissionsService: PermissionsService,
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
  ) {}

  /**
   * Apply data-level filter to a query based on user context
   *
   * @param userId - User ID for context
   * @param config - Filter configuration
   * @returns Filter result with WHERE clause and parameters
   */
  async applyFilter(userId: number, config: FilterConfig = {}): Promise<FilterResult> {
    const {
      table = '',
      ownerColumn = 'user_id',
      teamColumn = 'team_id',
      includeOwnInTeamScope = true,
    } = config;

    // Build data level context
    const context = await this.permissionsService.buildDataLevelContext(userId);

    return this.buildFilterFromContext(context, {
      table,
      ownerColumn,
      teamColumn,
      includeOwnInTeamScope,
    });
  }

  /**
   * Build filter from existing data level context
   *
   * @param context - Data level context
   * @param config - Filter configuration
   * @returns Filter result
   */
  buildFilterFromContext(context: DataLevelContext, config: FilterConfig = {}): FilterResult {
    const {
      table = '',
      ownerColumn = 'user_id',
      teamColumn = 'team_id',
      includeOwnInTeamScope = true,
    } = config;

    const prefix = table ? `${table}.` : '';

    switch (context.userRole) {
      case 'admin':
        return this.buildAdminFilter();

      case 'manager':
        return this.buildManagerFilter(context, prefix, ownerColumn, teamColumn, includeOwnInTeamScope);

      case 'user':
      default:
        return this.buildUserFilter(context, prefix, ownerColumn);
    }
  }

  /**
   * Build admin filter (full access)
   */
  private buildAdminFilter(): FilterResult {
    this.logger.debug('Building admin filter: full access', 'DataFilterService');
    return {
      whereClause: '1=1',
      params: [],
      description: 'Admin: full access to all records',
      scopeType: 'all',
    };
  }

  /**
   * Build manager filter (team-based access)
   */
  private buildManagerFilter(
    context: DataLevelContext,
    prefix: string,
    ownerColumn: string,
    _teamColumn: string,
    includeOwnInTeamScope: boolean,
  ): FilterResult {
    // If manager has team IDs, filter by team members
    if (context.teamIds && context.teamIds.length > 0) {
      const placeholders = context.teamIds.map((_, i) => `$${i + 1}`).join(', ');
      const ownDataParam = includeOwnInTeamScope ? context.teamIds.length + 1 : -1;

      let condition: string;
      let params: unknown[];

      if (includeOwnInTeamScope) {
        // Include team members AND own data
        condition = `(${prefix}${ownerColumn} IN (
          SELECT user_id FROM team_members WHERE team_id IN (${placeholders})
        ) OR ${prefix}${ownerColumn} = $${ownDataParam})`;
        params = [...context.teamIds, context.userId];
      } else {
        // Only team members
        condition = `${prefix}${ownerColumn} IN (
          SELECT user_id FROM team_members WHERE team_id IN (${placeholders})
        )`;
        params = [...context.teamIds];
      }

      this.logger.debug(
        `Building manager filter: teams [${context.teamIds.join(', ')}]`,
        'DataFilterService',
      );

      return {
        whereClause: condition,
        params,
        description: `Manager: access to team members (teams: ${context.teamIds.join(', ')})${includeOwnInTeamScope ? ' and own data' : ''}`,
        scopeType: 'team',
      };
    }

    // Manager without teams - only own data
    this.logger.debug('Building manager filter: own data only (no teams)', 'DataFilterService');
    return {
      whereClause: `${prefix}${ownerColumn} = $1`,
      params: [context.userId],
      description: 'Manager (no team): access to own data only',
      scopeType: 'own',
    };
  }

  /**
   * Build user filter (own data only)
   */
  private buildUserFilter(
    context: DataLevelContext,
    prefix: string,
    ownerColumn: string,
  ): FilterResult {
    this.logger.debug(`Building user filter: own data only (user ${context.userId})`, 'DataFilterService');
    return {
      whereClause: `${prefix}${ownerColumn} = $1`,
      params: [context.userId],
      description: 'User: access to own data only',
      scopeType: 'own',
    };
  }

  /**
   * Get data scope for a user
   * Convenience method matching the DataFilter interface
   *
   * @param userId - User ID
   * @returns Extended data scope
   */
  async getScope(userId: number): Promise<ExtendedDataScope> {
    const context = await this.permissionsService.buildDataLevelContext(userId);
    const baseScope = this.permissionsService.getDataScope(context);

    let scopeType: DataScopeType;
    switch (context.userRole) {
      case 'admin':
        scopeType = 'all';
        break;
      case 'manager':
        scopeType = context.teamIds && context.teamIds.length > 0 ? 'team' : 'own';
        break;
      default:
        scopeType = 'own';
    }

    return {
      ...baseScope,
      type: scopeType,
      userId: context.userId,
      teamIds: context.teamIds,
    };
  }

  /**
   * Check if a user can access a specific resource
   *
   * @param userId - User requesting access
   * @param resourceOwnerId - Owner of the resource
   * @param resourceTeamId - Team ID of the resource (optional)
   * @returns True if user can access the resource
   */
  async canAccessResource(
    userId: number,
    resourceOwnerId: number,
    resourceTeamId?: number,
  ): Promise<boolean> {
    const context = await this.permissionsService.buildDataLevelContext(userId);

    // Admin can access everything
    if (context.userRole === 'admin') {
      return true;
    }

    // User can access own resources
    if (resourceOwnerId === userId) {
      return true;
    }

    // Manager can access team resources
    if (context.userRole === 'manager' && context.teamIds && resourceTeamId) {
      if (context.teamIds.includes(resourceTeamId)) {
        return true;
      }
    }

    // Check if resource owner is in manager's team
    if (context.userRole === 'manager' && context.teamIds && context.teamIds.length > 0) {
      const isTeamMember = await this.isUserInTeams(resourceOwnerId, context.teamIds);
      if (isTeamMember) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a user is a member of any of the specified teams
   *
   * @param userId - User ID to check
   * @param teamIds - Team IDs to check against
   * @returns True if user is in any of the teams
   */
  private async isUserInTeams(userId: number, teamIds: number[]): Promise<boolean> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      this.logger.warn('Database pool not available for team check', 'DataFilterService');
      return false;
    }

    try {
      const placeholders = teamIds.map((_, i) => `$${i + 2}`).join(', ');
      const result = await pool.query<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM team_members
         WHERE user_id = $1 AND team_id IN (${placeholders})`,
        [userId, ...teamIds],
      );

      return parseInt(result.rows[0]?.count || '0', 10) > 0;
    } catch {
      // Table might not exist
      this.logger.warn('team_members table query failed', 'DataFilterService');
      return false;
    }
  }

  /**
   * Build SQL query with data filter applied
   *
   * @param baseQuery - Base SQL query (must include WHERE or have no WHERE)
   * @param userId - User ID for filtering
   * @param config - Filter configuration
   * @returns Modified query with filter and combined parameters
   */
  async buildFilteredQuery(
    baseQuery: string,
    baseParams: unknown[],
    userId: number,
    config: FilterConfig = {},
  ): Promise<{ query: string; params: unknown[] }> {
    const filter = await this.applyFilter(userId, config);

    // If full access, return base query
    if (filter.scopeType === 'all') {
      return { query: baseQuery, params: baseParams };
    }

    // Adjust parameter placeholders in filter
    const paramOffset = baseParams.length;
    let adjustedWhereClause = filter.whereClause;

    // Replace $1, $2, etc. with $offset+1, $offset+2, etc.
    filter.params.forEach((_, i) => {
      const originalPlaceholder = `$${i + 1}`;
      const newPlaceholder = `$${paramOffset + i + 1}`;
      adjustedWhereClause = adjustedWhereClause.replace(
        new RegExp(`\\${originalPlaceholder}(?![0-9])`, 'g'),
        newPlaceholder,
      );
    });

    // Combine query with filter
    const hasWhere = baseQuery.toLowerCase().includes('where');
    const connector = hasWhere ? ' AND ' : ' WHERE ';
    const filteredQuery = baseQuery + connector + `(${adjustedWhereClause})`;

    return {
      query: filteredQuery,
      params: [...baseParams, ...filter.params],
    };
  }

  /**
   * Get team members for a manager
   *
   * @param managerId - Manager user ID
   * @returns Array of team member user IDs
   */
  async getTeamMemberIds(managerId: number): Promise<number[]> {
    const context = await this.permissionsService.buildDataLevelContext(managerId);

    if (context.userRole !== 'manager' || !context.teamIds || context.teamIds.length === 0) {
      return [managerId]; // Only self
    }

    const pool = this.databaseService.getPool();
    if (!pool) {
      return [managerId];
    }

    try {
      const placeholders = context.teamIds.map((_, i) => `$${i + 1}`).join(', ');
      const result = await pool.query<{ user_id: number }>(
        `SELECT DISTINCT user_id
         FROM team_members
         WHERE team_id IN (${placeholders})`,
        context.teamIds,
      );

      const memberIds = result.rows.map(row => row.user_id);
      // Include self if not already included
      if (!memberIds.includes(managerId)) {
        memberIds.push(managerId);
      }

      return memberIds;
    } catch {
      this.logger.warn('Failed to get team member IDs', 'DataFilterService');
      return [managerId];
    }
  }
}
