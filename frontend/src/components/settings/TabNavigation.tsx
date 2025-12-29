/**
 * TabNavigation Component
 * STORY-106: Settings Page UI Audit
 *
 * Unified tab navigation component for consistent styling across all settings sections.
 * Uses pill-style tabs with icons for a modern look.
 */

import React from 'react';

/**
 * Tab item interface
 */
export interface TabItem {
  /** Unique tab identifier */
  id: string;
  /** Tab label */
  label: string;
  /** Tab icon (SVG element) */
  icon?: React.ReactNode;
}

/**
 * Props for TabNavigation component
 */
export interface TabNavigationProps {
  /** List of tabs */
  tabs: TabItem[];
  /** Currently active tab ID */
  activeTab: string;
  /** Callback when tab is changed */
  onTabChange: (tabId: string) => void;
  /** Whether there are unsaved changes (shows confirmation) */
  hasUnsavedChanges?: boolean;
  /** Confirmation message for unsaved changes */
  unsavedChangesMessage?: string;
  /** ARIA label for navigation */
  ariaLabel?: string;
  /** Test ID prefix */
  'data-testid'?: string;
}

/**
 * TabNavigation Component
 *
 * Renders a unified pill-style tab navigation with icons.
 * Provides consistent styling across Admin and Personal settings sections.
 */
export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  hasUnsavedChanges = false,
  unsavedChangesMessage = 'Sie haben ungespeicherte Änderungen. Möchten Sie trotzdem wechseln?',
  ariaLabel = 'Tab Navigation',
  'data-testid': testId = 'tab-navigation',
}) => {
  /**
   * Handle tab click with unsaved changes confirmation
   */
  const handleTabClick = (tabId: string) => {
    if (tabId === activeTab) return;

    if (hasUnsavedChanges) {
      const confirmed = window.confirm(unsavedChangesMessage);
      if (!confirmed) return;
    }
    onTabChange(tabId);
  };

  /**
   * Handle keyboard navigation (arrow keys)
   */
  const handleKeyDown = (e: React.KeyboardEvent, tabId: string, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTabClick(tabId);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % tabs.length;
      handleTabClick(tabs[nextIndex].id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (index - 1 + tabs.length) % tabs.length;
      handleTabClick(tabs[prevIndex].id);
    }
  };

  return (
    <div className="border-b border-[var(--color-border-default,#e5e7eb)]" data-testid={testId}>
      <nav
        className="-mb-px flex space-x-6"
        aria-label={ariaLabel}
        role="tablist"
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              className={`
                group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                ${
                  isActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-[var(--color-text-secondary,#6b7280)] hover:text-[var(--color-text-primary,#374151)] hover:border-[var(--color-border-default,#d1d5db)]'
                }
              `}
              onClick={() => handleTabClick(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, tab.id, index)}
              data-testid={`${testId}-tab-${tab.id}`}
            >
              {tab.icon && (
                <span
                  className={`flex-shrink-0 ${
                    isActive
                      ? 'text-primary-500'
                      : 'text-[var(--color-text-tertiary,#9ca3af)] group-hover:text-[var(--color-text-secondary,#6b7280)]'
                  }`}
                  aria-hidden="true"
                >
                  {tab.icon}
                </span>
              )}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default TabNavigation;
