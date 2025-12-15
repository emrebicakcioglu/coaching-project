/**
 * Settings Tabs Component
 * STORY-013B: In-App Settings Frontend UI
 *
 * Tab navigation component for settings categories.
 * Provides smooth tab switching with clear visual indication of active tab.
 */

import React from 'react';

/**
 * Settings Tab type
 */
export type SettingsTab = 'general' | 'security' | 'email' | 'maintenance';

/**
 * Tab configuration
 */
interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ReactNode;
  description: string;
}

/**
 * Props for SettingsTabs component
 */
export interface SettingsTabsProps {
  /** Currently active tab */
  activeTab: SettingsTab;
  /** Callback when tab is changed */
  onTabChange: (tab: SettingsTab) => void;
  /** Whether there are unsaved changes */
  hasUnsavedChanges?: boolean;
  /** Test ID prefix */
  'data-testid'?: string;
}

/**
 * Tab configurations
 */
const TABS: TabConfig[] = [
  {
    id: 'general',
    label: 'Allgemein',
    description: 'Allgemeine Einstellungen',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    id: 'security',
    label: 'Sicherheit',
    description: 'Sicherheitseinstellungen',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    ),
  },
  {
    id: 'email',
    label: 'E-Mail',
    description: 'E-Mail-Einstellungen',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    id: 'maintenance',
    label: 'Wartung',
    description: 'Wartungsmodus',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
];

/**
 * SettingsTabs Component
 *
 * Renders tab navigation for settings categories with accessibility support.
 */
export const SettingsTabs: React.FC<SettingsTabsProps> = ({
  activeTab,
  onTabChange,
  hasUnsavedChanges = false,
  'data-testid': testId = 'settings-tabs',
}) => {
  /**
   * Handle tab click
   */
  const handleTabClick = (tab: SettingsTab) => {
    if (hasUnsavedChanges) {
      // Could show a confirmation dialog here
      const confirmed = window.confirm(
        'Sie haben ungespeicherte Änderungen. Möchten Sie trotzdem wechseln?'
      );
      if (!confirmed) return;
    }
    onTabChange(tab);
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e: React.KeyboardEvent, tab: SettingsTab, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTabClick(tab);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % TABS.length;
      handleTabClick(TABS[nextIndex].id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (index - 1 + TABS.length) % TABS.length;
      handleTabClick(TABS[prevIndex].id);
    }
  };

  return (
    <div className="border-b border-neutral-200" data-testid={testId}>
      <nav className="-mb-px flex space-x-8" aria-label="Einstellungen Tabs" role="tablist">
        {TABS.map((tab, index) => {
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
                transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                ${
                  isActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }
              `}
              onClick={() => handleTabClick(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, tab.id, index)}
              data-testid={`tab-${tab.id}`}
            >
              <span
                className={`${
                  isActive ? 'text-primary-500' : 'text-neutral-400 group-hover:text-neutral-500'
                }`}
              >
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default SettingsTabs;
