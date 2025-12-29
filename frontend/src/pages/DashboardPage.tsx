/**
 * Dashboard Page
 * STORY-016A: Context Menu Core Navigation
 * STORY-103: Dashboard Page UI Audit
 *
 * Main dashboard page displayed after login.
 * Shows overview of system status and quick actions.
 *
 * Icon Color Semantics (STORY-103):
 * - Pink (primary-100/600): User-related statistics
 * - Green (green-100/600): Time/activity-related statistics (sessions)
 * - Purple (purple-100/600): Security/access-related statistics (roles)
 * - Emerald (emerald-100/600): System health/status indicators
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Container } from '../components/layout';
import { useAuth } from '../contexts';
import { dashboardService, DashboardStats } from '../services/dashboardService';
import { logger } from '../services/loggerService';

/**
 * Loading skeleton component for stat cards
 */
const StatSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-12"></div>
  </div>
);

/**
 * DashboardPage Component
 *
 * Main dashboard with welcome message and system overview.
 */
export const DashboardPage: React.FC = () => {
  const { t } = useTranslation('dashboard');
  const { user } = useAuth();

  // State for dashboard statistics
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard statistics on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await dashboardService.getStats();
        setStats(data);
      } catch (err) {
        logger.error('Failed to fetch dashboard stats', err);
        setError('Failed to load statistics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // CSS variable styles for theming
  const cardStyle = { backgroundColor: 'var(--color-background-card, #ffffff)' };
  const textPrimaryStyle = { color: 'var(--color-text-primary, #111827)' };
  const textSecondaryStyle = { color: 'var(--color-text-secondary, #6b7280)' };
  const borderStyle = { borderColor: 'var(--color-border-default, #e5e7eb)' };

  /**
   * Render stat value with loading state
   */
  const renderStatValue = (value: number | undefined, isHealthStatus = false) => {
    if (isLoading) {
      return <StatSkeleton />;
    }

    if (isHealthStatus) {
      const isHealthy = stats?.systemHealthy ?? true;
      return (
        <p className={`text-lg font-semibold ${isHealthy ? 'text-emerald-600' : 'text-red-600'}`}>
          {isHealthy ? t('cards.healthy') : t('cards.unhealthy', 'Unhealthy')}
        </p>
      );
    }

    return (
      <p className="text-2xl font-semibold" style={textPrimaryStyle}>
        {value ?? 0}
      </p>
    );
  };

  return (
    <Container className="py-8">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">
          {t('title')}
        </h1>
        <p className="page-subtitle">
          {t('welcomeBack')}{user?.name ? `, ${user.name}` : ''}!
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Users Card - Pink: User-related statistics */}
        <div
          className="rounded-lg shadow-sm p-6 border"
          style={{ ...cardStyle, ...borderStyle }}
          data-testid="stat-card-users"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium" style={textSecondaryStyle}>{t('cards.totalUsers')}</p>
              {renderStatValue(stats?.totalUsers)}
            </div>
          </div>
        </div>

        {/* Active Sessions Card - Green: Time/activity-related statistics */}
        <div
          className="rounded-lg shadow-sm p-6 border"
          style={{ ...cardStyle, ...borderStyle }}
          data-testid="stat-card-sessions"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium" style={textSecondaryStyle}>{t('cards.activeSessions')}</p>
              {renderStatValue(stats?.activeSessions)}
            </div>
          </div>
        </div>

        {/* Roles Card - Purple: Security/access-related statistics */}
        <div
          className="rounded-lg shadow-sm p-6 border"
          style={{ ...cardStyle, ...borderStyle }}
          data-testid="stat-card-roles"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium" style={textSecondaryStyle}>{t('cards.roles')}</p>
              {renderStatValue(stats?.totalRoles)}
            </div>
          </div>
        </div>

        {/* System Status Card - Emerald: System health/status indicators */}
        <div
          className="rounded-lg shadow-sm p-6 border"
          style={{ ...cardStyle, ...borderStyle }}
          data-testid="stat-card-status"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium" style={textSecondaryStyle}>{t('cards.systemStatus')}</p>
              {renderStatValue(undefined, true)}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - Full width distribution */}
      <div className="rounded-lg shadow-sm border" style={{ ...cardStyle, ...borderStyle }}>
        <div className="p-6 border-b" style={borderStyle}>
          <h2 className="card-title">{t('quickActions.title')}</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <a
              href="/users"
              className="flex items-center p-4 rounded-lg border transition-colors hover:opacity-80 flex-1"
              style={borderStyle}
              data-testid="quick-action-users"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium" style={textPrimaryStyle}>{t('quickActions.manageUsers')}</p>
                <p className="text-xs" style={textSecondaryStyle}>{t('quickActions.manageUsersDesc')}</p>
              </div>
            </a>

            <a
              href="/sessions"
              className="flex items-center p-4 rounded-lg border transition-colors hover:opacity-80 flex-1"
              style={borderStyle}
              data-testid="quick-action-sessions"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium" style={textPrimaryStyle}>{t('quickActions.manageSessions')}</p>
                <p className="text-xs" style={textSecondaryStyle}>{t('quickActions.manageSessionsDesc')}</p>
              </div>
            </a>

            <a
              href="/settings"
              className="flex items-center p-4 rounded-lg border transition-colors hover:opacity-80 flex-1"
              style={borderStyle}
              data-testid="quick-action-settings"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium" style={textPrimaryStyle}>{t('quickActions.settings')}</p>
                <p className="text-xs" style={textSecondaryStyle}>{t('quickActions.settingsDesc')}</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default DashboardPage;
