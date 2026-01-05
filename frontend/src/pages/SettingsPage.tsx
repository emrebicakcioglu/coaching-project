/**
 * Settings Page
 * STORY-016A: Context Menu Core Navigation
 * STORY-005C: MFA UI (Frontend) - Added MFA setup section
 * STORY-013B: In-App Settings Frontend UI - Admin settings with tabs
 * STORY-034: Maintenance Mode - Maintenance mode settings tab
 * BUG-003: Fixed Security button navigation with proper tab state management
 * STORY-106: Settings Page UI Audit - Unified tab styles, consistent card styling, improved spacing
 * BUG-005: Wrapped password fields in form element for browser autofill and password manager support
 *
 * System settings and user preferences page.
 * Admin users see tabbed admin settings (General, Security, Email).
 * All users see personal settings section.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Container } from '../components/layout';
import { Toast, ToastType } from '../components/feedback';
import { Card } from '../components/ui';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts';
import {
  SettingsTabs,
  SettingsTab,
  TabNavigation,
  TabItem,
  GeneralSettings,
  SecuritySettings,
  EmailSettings,
  MaintenanceSettings,
} from '../components/settings';

/**
 * Personal settings tab type
 */
type PersonalSettingsTab = 'profile' | 'security';

/**
 * Toast state interface
 */
interface ToastState {
  message: string;
  type: ToastType;
}

/**
 * SettingsPage Component
 *
 * Settings page with admin settings tabs and personal user settings.
 */
export const SettingsPage: React.FC = () => {
  const { t } = useTranslation('settings');
  const { user, hasPermission } = useAuth();
  const location = useLocation();

  // Admin settings state
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // BUG-003 FIX: Personal settings tab state
  const [activePersonalTab, setActivePersonalTab] = useState<PersonalSettingsTab>('profile');

  // Check if user has admin settings permission
  const isAdmin = hasPermission('settings.update');

  // CSS variable styles for theming (STORY-106: Consistent styling)
  const textPrimaryStyle = { color: 'var(--color-text-primary, #111827)' };
  const textSecondaryStyle = { color: 'var(--color-text-secondary, #6b7280)' };
  const borderStyle = { borderColor: 'var(--color-border-default, #e5e7eb)' };
  const inputStyle = {
    backgroundColor: 'var(--color-background-input, #ffffff)',
    borderColor: 'var(--color-border-default, #d1d5db)',
    color: 'var(--color-text-primary, #111827)',
  };

  // STORY-106: Personal settings tabs configuration with icons for unified styling
  const personalTabs: TabItem[] = useMemo(() => [
    {
      id: 'profile',
      label: t('personal.tabs.profile'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      id: 'security',
      label: t('personal.tabs.security'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
  ], [t]);

  /**
   * Handle personal tab change with URL hash update
   */
  const handlePersonalTabChange = useCallback((tabId: string) => {
    setActivePersonalTab(tabId as PersonalSettingsTab);
    window.history.pushState(null, '', `#${tabId}`);
    // Scroll to section after brief delay
    setTimeout(() => {
      const element = document.getElementById(tabId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }, []);

  // BUG-003 FIX: Handle URL hash for direct navigation to security section
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash === 'security' || hash === 'profile') {
      setActivePersonalTab(hash as PersonalSettingsTab);
      // Scroll to section after a brief delay to ensure DOM is ready
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [location.hash]);

  /**
   * Handle save success
   */
  const handleSaveSuccess = useCallback((message: string) => {
    setToast({ message, type: 'success' });
  }, []);

  /**
   * Handle save error
   */
  const handleSaveError = useCallback((message: string) => {
    setToast({ message, type: 'error' });
  }, []);

  /**
   * Handle unsaved changes
   */
  const handleUnsavedChanges = useCallback((hasChanges: boolean) => {
    setHasUnsavedChanges(hasChanges);
  }, []);

  /**
   * Handle password change form submission
   * BUG-005 FIX: Added form submit handler for password change form
   */
  const handlePasswordChange = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: Implement actual password change API call
    // For now, just show a placeholder message
    setToast({ message: t('security.password.updateSuccess', 'Password update functionality coming soon'), type: 'info' });
  }, [t]);

  /**
   * Render active tab content
   */
  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <GeneralSettings
            onSaveSuccess={handleSaveSuccess}
            onSaveError={handleSaveError}
            onUnsavedChanges={handleUnsavedChanges}
          />
        );
      case 'security':
        return (
          <SecuritySettings
            onSaveSuccess={handleSaveSuccess}
            onSaveError={handleSaveError}
            onUnsavedChanges={handleUnsavedChanges}
          />
        );
      case 'email':
        return (
          <EmailSettings
            onSaveSuccess={handleSaveSuccess}
            onSaveError={handleSaveError}
            onUnsavedChanges={handleUnsavedChanges}
          />
        );
      case 'maintenance':
        return (
          <MaintenanceSettings
            onSaveSuccess={handleSaveSuccess}
            onSaveError={handleSaveError}
            onUnsavedChanges={handleUnsavedChanges}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Container className="py-8">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          data-testid="settings-toast"
        />
      )}

      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">{t('title')}</h1>
        <p className="page-subtitle">
          {t('subtitle')}
        </p>
      </div>

      {/* Admin Settings Section - STORY-106: Using Card component for consistent styling */}
      {isAdmin && (
        <section className="mb-8" data-testid="admin-settings-section">
          <Card variant="default" data-testid="admin-settings-card">
            <Card.Header>
              <h2 className="card-title">
                {t('admin.title')}
              </h2>
              <p className="card-description">
                {t('admin.subtitle')}
              </p>
            </Card.Header>

            {/* Tab Navigation - Using SettingsTabs for Admin (maintains existing behavior) */}
            <div className="px-6 pt-4">
              <SettingsTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                hasUnsavedChanges={hasUnsavedChanges}
                data-testid="admin-settings-tabs"
              />
            </div>

            {/* Tab Content */}
            <div
              className="p-6"
              role="tabpanel"
              id={`tabpanel-${activeTab}`}
              aria-labelledby={`tab-${activeTab}`}
            >
              {renderTabContent()}
            </div>
          </Card>
        </section>
      )}

      {/* Personal Settings Section - STORY-106: Using Card component and unified TabNavigation */}
      <section className="space-y-6" data-testid="personal-settings-section">
        <Card variant="default" data-testid="personal-settings-card">
          <Card.Header>
            <h2 className="card-title">
              {t('personal.title')}
            </h2>
            <p className="card-description">
              {t('personal.subtitle')}
            </p>
          </Card.Header>

          {/* Personal Settings Navigation Tabs - STORY-106: Using unified TabNavigation */}
          <div className="px-6 pt-4">
            <TabNavigation
              tabs={personalTabs}
              activeTab={activePersonalTab}
              onTabChange={handlePersonalTabChange}
              ariaLabel={t('personal.title')}
              data-testid="personal-settings-tabs"
            />
          </div>

          {/* Settings Content - STORY-106: Standardized spacing */}
          <div className="p-6 space-y-8">
            {/* Profile Section - STORY-106: Improved section hierarchy */}
            <section id="profile" data-testid="profile-section">
              <div className="pb-4 mb-4 border-b" style={borderStyle}>
                <h3 className="text-base font-semibold" style={textPrimaryStyle}>{t('profile.title')}</h3>
                <p className="text-sm mt-1" style={textSecondaryStyle}>
                  {t('profile.subtitle')}
                </p>
              </div>
              {/* STORY-106: Standardized form field spacing (24px between groups) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium" style={textPrimaryStyle}>
                    {t('profile.name')}
                  </label>
                  <input
                    type="text"
                    defaultValue={user?.name || ''}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    style={inputStyle}
                    readOnly
                    data-testid="profile-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium" style={textPrimaryStyle}>
                    {t('profile.email')}
                  </label>
                  <input
                    type="email"
                    defaultValue={user?.email || ''}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    style={inputStyle}
                    readOnly
                    data-testid="profile-email-input"
                  />
                </div>
              </div>
            </section>

            {/* Divider - STORY-106: Clear visual separator */}
            <hr style={borderStyle} className="my-6" />

            {/* Security Section - STORY-106: Improved section hierarchy */}
            <section id="security" data-testid="security-section">
              <div className="pb-4 mb-4 border-b" style={borderStyle}>
                <h3 className="text-base font-semibold" style={textPrimaryStyle}>{t('security.title')}</h3>
                <p className="text-sm mt-1" style={textSecondaryStyle}>
                  {t('security.subtitle')}
                </p>
              </div>
              <div className="space-y-6">
                {/* Two-Factor Authentication (STORY-005C, STORY-106: Changed to outline button) */}
                <div className="pb-6 border-b" style={borderStyle}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold mb-1" style={textPrimaryStyle}>
                        {t('security.mfa.title')}
                      </h4>
                      <p className="text-sm" style={textSecondaryStyle}>
                        {t('security.mfa.description')}
                      </p>
                    </div>
                    {/* STORY-106: Changed from primary filled to outline button (navigates to another page) */}
                    <Link
                      to="/settings/security/mfa"
                      data-testid="mfa-setup-link"
                    >
                      <Button
                        variant="outline"
                        size="md"
                        data-testid="mfa-setup-button"
                        rightIcon={
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        }
                      >
                        {t('security.mfa.setup')}
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Change Password - STORY-106: Standardized spacing */}
                {/* BUG-005 FIX: Wrapped password fields in form element for browser autofill and password manager support */}
                <form onSubmit={handlePasswordChange} data-testid="password-change-form">
                  <h4 className="text-sm font-semibold mb-4" style={textPrimaryStyle}>
                    {t('security.password.title')}
                  </h4>
                  {/* Hidden username field for accessibility and password manager support */}
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    value={user?.email || ''}
                    readOnly
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                  {/* STORY-106: Consistent form field spacing (space-y-6 = 24px) */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label htmlFor="current-password" className="block text-sm font-medium" style={textPrimaryStyle}>
                        {t('security.password.current')}
                      </label>
                      <input
                        id="current-password"
                        name="currentPassword"
                        type="password"
                        autoComplete="current-password"
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        style={inputStyle}
                        data-testid="password-current-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="new-password" className="block text-sm font-medium" style={textPrimaryStyle}>
                        {t('security.password.new')}
                      </label>
                      <input
                        id="new-password"
                        name="newPassword"
                        type="password"
                        autoComplete="new-password"
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        style={inputStyle}
                        data-testid="password-new-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="confirm-password" className="block text-sm font-medium" style={textPrimaryStyle}>
                        {t('security.password.confirm')}
                      </label>
                      <input
                        id="confirm-password"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        style={inputStyle}
                        data-testid="password-confirm-input"
                      />
                    </div>
                  </div>
                  {/* STORY-106: Visual separator before action buttons */}
                  <div className="mt-6 pt-4 border-t" style={borderStyle}>
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        variant="primary"
                        data-testid="password-update-button"
                      >
                        {t('security.password.update')}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </Card>
      </section>
    </Container>
  );
};

export default SettingsPage;
