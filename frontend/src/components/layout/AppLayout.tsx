/**
 * AppLayout Component
 * STORY-016A: Context Menu Core Navigation
 *
 * Main application layout with sidebar navigation.
 * Wraps authenticated pages with consistent navigation.
 *
 * Features:
 * - Sidebar navigation with permission filtering
 * - Collapsible sidebar state persistence
 * - Responsive behavior (mobile hamburger menu)
 * - Main content area with proper spacing
 *
 * @example
 * ```tsx
 * <AppLayout>
 *   <DashboardPage />
 * </AppLayout>
 * ```
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '../navigation';
import { useResponsive } from '../../hooks';

/**
 * Storage key for sidebar collapsed state
 */
const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed';

/**
 * AppLayout props
 */
export interface AppLayoutProps {
  /** Page content */
  children: React.ReactNode;
  /** Company name for sidebar header */
  companyName?: string;
  /** Additional CSS classes for main content */
  className?: string;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/**
 * AppLayout Component
 *
 * Provides consistent layout structure for authenticated pages:
 * - Desktop: Sidebar + main content
 * - Mobile/Tablet: Header bar + overlay sidebar + main content
 */
export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  companyName = 'Core App',
  className = '',
  'data-testid': testId = 'app-layout',
}) => {
  const { isMobile, isTablet } = useResponsive();

  // Load collapsed state from storage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      return stored === 'true';
    }
    return false;
  });

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  // Toggle collapsed state
  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  // Mobile/Tablet layout
  if (isMobile || isTablet) {
    return (
      <div
        className="min-h-screen"
        style={{ backgroundColor: 'var(--color-background-page, #f9fafb)' }}
        data-testid={testId}
      >
        {/* Sidebar handles its own mobile header and overlay */}
        <Sidebar
          companyName={companyName}
          data-testid="sidebar"
        />

        {/* Main content with top padding for mobile header */}
        <main
          className={`pt-14 min-h-screen ${className}`}
          data-testid={`${testId}-main`}
        >
          {children}
        </main>
      </div>
    );
  }

  // Desktop layout
  return (
    <div
      className="flex min-h-screen"
      style={{ backgroundColor: 'var(--color-background-page, #f9fafb)' }}
      data-testid={testId}
    >
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        companyName={companyName}
        data-testid="sidebar"
      />

      {/* Main content */}
      <main
        className={`flex-1 min-h-screen overflow-x-hidden ${className}`}
        data-testid={`${testId}-main`}
      >
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
