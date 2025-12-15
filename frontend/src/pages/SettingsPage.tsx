/**
 * Settings Page
 * STORY-016A: Context Menu Core Navigation
 * STORY-005C: MFA UI (Frontend) - Added MFA setup section
 * STORY-013B: In-App Settings Frontend UI - Admin settings with tabs
 * STORY-034: Maintenance Mode - Maintenance mode settings tab
 * BUG-003: Fixed Security button navigation with proper tab state management
 *
 * System settings and user preferences page.
 * Admin users see tabbed admin settings (General, Security, Email).
 * All users see personal settings section.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Container } from '../components/layout';
import { Toast, ToastType } from '../components/feedback';
import { useAuth } from '../contexts';
import {
  SettingsTabs,
  SettingsTab,
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
// CSS variable styles for theming
  const cardStyle = { backgroundColor: 'var(--color-background-card, #ffffff)' };  const textPrimaryStyle = { color: 'var(--color-text-primary, #111827)' };  const textSecondaryStyle = { color: 'var(--color-text-secondary, #6b7280)' };  const borderStyle = { borderColor: 'var(--color-border-default, #e5e7eb)' };

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
    <Container className="py-6">
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={textPrimaryStyle}>{t('title')}</h1>
        <p className="mt-1 text-sm" style={textSecondaryStyle}>
          {t('subtitle')}
        </p>
      </div>

      {/* Admin Settings Section */}
      {isAdmin && (
        <section className="mb-8">
          <div className="rounded-lg shadow-sm border" style={{ ...cardStyle, ...borderStyle }}>
            <div className="p-6 border-b" style={borderStyle}>
              <h2 className="text-lg font-semibold" style={textPrimaryStyle}>
                {t('admin.title')}
              </h2>
              <p className="mt-1 text-sm" style={textSecondaryStyle}>
                {t('admin.subtitle')}
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="px-6 pt-4">
              <SettingsTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                hasUnsavedChanges={hasUnsavedChanges}
                data-testid="settings-tabs"
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
          </div>
        </section>
      )}

      {/* Personal Settings Section */}
      <section className="space-y-6">
        <div className="rounded-lg shadow-sm border" style={{ ...cardStyle, ...borderStyle }}>
          <div className="p-6 border-b" style={borderStyle}>
            <h2 className="text-lg font-semibold" style={textPrimaryStyle}>
              {t('personal.title')}
            </h2>
            <p className="mt-1 text-sm" style={textSecondaryStyle}>
              {t('personal.subtitle')}
            </p>
          </div>

          {/* Personal Settings Navigation Tabs - BUG-003 FIX */}
          <div className="px-6 pt-4 border-b" style={borderStyle}>
            <nav className="-mb-px flex space-x-8" aria-label={t('personal.title')}>
              <button
                type="button"
                onClick={() => {
                  setActivePersonalTab('profile');
                  window.history.pushState(null, '', '#profile');
                  document.getElementById('profile')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activePersonalTab === 'profile'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
                data-testid="personal-settings-profile-tab"
              >
                {t('personal.tabs.profile')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePersonalTab('security');
                  window.history.pushState(null, '', '#security');
                  document.getElementById('security')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activePersonalTab === 'security'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
                data-testid="personal-settings-security-tab"
              >
                {t('personal.tabs.security')}
              </button>
            </nav>
          </div>

          {/* Settings Content */}
          <div className="p-6 space-y-8">
            {/* Profile Section */}
            <section id="profile">
              <h3 className="text-base font-semibold mb-2" style={textPrimaryStyle}>{t('profile.title')}</h3>
              <p className="text-sm mb-4" style={textSecondaryStyle}>
                {t('profile.subtitle')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1" style={textSecondaryStyle}>
                    {t('profile.name')}
                  </label>
                  <input
                    type="text"
                    defaultValue={user?.name || ''}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={textSecondaryStyle}>
                    {t('profile.email')}
                  </label>
                  <input
                    type="email"
                    defaultValue={user?.email || ''}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    readOnly
                  />
                </div>
              </div>
            </section>

            {/* Divider */}
            <hr style={borderStyle} />

            {/* Security Section */}
            <section id="security">
              <h3 className="text-base font-semibold mb-2" style={textPrimaryStyle}>{t('security.title')}</h3>
              <p className="text-sm mb-4" style={textSecondaryStyle}>
                {t('security.subtitle')}
              </p>
              <div className="space-y-6">
                {/* Two-Factor Authentication (STORY-005C) */}
                <div className="pb-6 border-b" style={borderStyle}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-medium mb-1" style={textPrimaryStyle}>
                        {t('security.mfa.title')}
                      </h4>
                      <p className="text-sm" style={textSecondaryStyle}>
                        {t('security.mfa.description')}
                      </p>
                    </div>
                    <Link
                      to="/settings/security/mfa"
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      data-testid="mfa-setup-link"
                    >
                      {t('security.mfa.setup')}
                    </Link>
                  </div>
                </div>

                {/* Change Password */}
                <div>
                  <h4 className="text-sm font-medium mb-3" style={textPrimaryStyle}>
                    {t('security.password.title')}
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={textSecondaryStyle}>
                        {t('security.password.current')}
                      </label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={textSecondaryStyle}>
                        {t('security.password.new')}
                      </label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={textSecondaryStyle}>
                        {t('security.password.confirm')}
                      </label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    >
                      {t('security.password.update')}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </Container>
  );
};

export default SettingsPage;
