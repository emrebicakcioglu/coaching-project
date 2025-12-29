/**
 * Security Settings Component
 * STORY-013B: In-App Settings Frontend UI
 * STORY-002-003: Settings Page i18n Support
 *
 * Form component for managing security settings.
 * Includes password policy and login attempt configuration.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField } from './FormField';
import {
  settingsService,
  SecuritySettings as SecuritySettingsType,
  UpdateSecuritySettingsDto,
} from '../../services/settingsService';
import { logger } from '../../services/loggerService';

/**
 * Form errors interface
 */
interface FormErrors {
  max_login_attempts?: string;
  password_min_length?: string;
  session_inactivity_timeout?: string;
  general?: string;
}

/**
 * Props for SecuritySettings component
 */
export interface SecuritySettingsProps {
  /** Callback when save is successful */
  onSaveSuccess?: (message: string) => void;
  /** Callback when save fails */
  onSaveError?: (message: string) => void;
  /** Callback when unsaved changes state changes */
  onUnsavedChanges?: (hasChanges: boolean) => void;
}

/**
 * Default security settings
 */
const DEFAULT_SETTINGS: SecuritySettingsType = {
  max_login_attempts: 5,
  password_min_length: 8,
  password_require_uppercase: true,
  password_require_lowercase: true,
  password_require_numbers: true,
  password_require_special_chars: true,
  session_inactivity_timeout: 15,
};

/**
 * SecuritySettings Component
 *
 * Renders form for security settings with validation and save/reset functionality.
 */
export const SecuritySettings: React.FC<SecuritySettingsProps> = ({
  onSaveSuccess,
  onSaveError,
  onUnsavedChanges,
}) => {
  const { t } = useTranslation('settings');

  // Form state
  const [formData, setFormData] = useState<SecuritySettingsType>(DEFAULT_SETTINGS);
  const [originalData, setOriginalData] = useState<SecuritySettingsType | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  /**
   * Load settings on mount
   */
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const settings = await settingsService.getSecuritySettings();
        setFormData(settings);
        setOriginalData(settings);
        setErrors({});
      } catch (error) {
        logger.error('Failed to load security settings', error);
        onSaveError?.(t('admin.security.loadError'));
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [onSaveError, t]);

  /**
   * Check for unsaved changes
   */
  useEffect(() => {
    if (!originalData) return;

    const hasChanges =
      formData.max_login_attempts !== originalData.max_login_attempts ||
      formData.password_min_length !== originalData.password_min_length ||
      formData.password_require_uppercase !== originalData.password_require_uppercase ||
      formData.password_require_lowercase !== originalData.password_require_lowercase ||
      formData.password_require_numbers !== originalData.password_require_numbers ||
      formData.password_require_special_chars !== originalData.password_require_special_chars ||
      formData.session_inactivity_timeout !== originalData.session_inactivity_timeout;

    setHasUnsavedChanges(hasChanges);
    onUnsavedChanges?.(hasChanges);
  }, [formData, originalData, onUnsavedChanges]);

  /**
   * Validate form data
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Validate max login attempts
    if (formData.max_login_attempts < 1 || formData.max_login_attempts > 100) {
      newErrors.max_login_attempts = t('admin.security.validation.maxLoginAttemptsRange');
    }

    // Validate password min length
    if (formData.password_min_length < 6 || formData.password_min_length > 128) {
      newErrors.password_min_length = t('admin.security.validation.passwordMinLengthRange');
    }

    // Validate session inactivity timeout
    if (
      formData.session_inactivity_timeout < 1 ||
      formData.session_inactivity_timeout > 1440
    ) {
      newErrors.session_inactivity_timeout = t('admin.security.validation.inactivityTimeoutRange');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, t]);

  /**
   * Handle field change
   */
  const handleFieldChange = (field: keyof SecuritySettingsType) => (
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof FormErrors];
        return newErrors;
      });
    }
  };

  /**
   * Handle form submit
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setErrors({});

    try {
      const updateData: UpdateSecuritySettingsDto = {
        max_login_attempts: formData.max_login_attempts,
        password_min_length: formData.password_min_length,
        password_require_uppercase: formData.password_require_uppercase,
        password_require_lowercase: formData.password_require_lowercase,
        password_require_numbers: formData.password_require_numbers,
        password_require_special_chars: formData.password_require_special_chars,
        session_inactivity_timeout: formData.session_inactivity_timeout,
      };

      const updatedSettings = await settingsService.updateSecuritySettings(updateData);
      setFormData(updatedSettings);
      setOriginalData(updatedSettings);
      setHasUnsavedChanges(false);
      onSaveSuccess?.(t('admin.security.saveSuccess'));
    } catch (error) {
      logger.error('Failed to save security settings', error);
      setErrors({ general: t('admin.security.saveError') });
      onSaveError?.(t('admin.security.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle reset to original values (undo changes)
   */
  const handleUndoChanges = () => {
    if (originalData) {
      setFormData(originalData);
      setErrors({});
      setHasUnsavedChanges(false);
    }
  };

  /**
   * Handle reset to default values
   */
  const handleResetToDefaults = async () => {
    setIsResetting(true);
    setErrors({});

    try {
      const resetSettings = await settingsService.resetSecuritySettings();
      setFormData(resetSettings);
      setOriginalData(resetSettings);
      setHasUnsavedChanges(false);
      setShowResetConfirm(false);
      onSaveSuccess?.(t('admin.security.resetSuccess'));
    } catch (error) {
      logger.error('Failed to reset security settings', error);
      setErrors({ general: t('admin.security.resetError') });
      onSaveError?.(t('admin.security.resetError'));
    } finally {
      setIsResetting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-12"
        data-testid="security-settings-loading"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        <span className="ml-3 text-neutral-600">{t('admin.loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="security-settings">
      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          data-testid="reset-confirm-dialog"
        >
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              {t('admin.security.resetConfirmTitle')}
            </h3>
            <p className="text-sm text-neutral-600 mb-4">
              {t('admin.security.resetConfirmMessage')}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                {t('admin.buttons.cancel')}
              </button>
              <button
                type="button"
                onClick={handleResetToDefaults}
                disabled={isResetting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                data-testid="confirm-reset"
              >
                {isResetting ? t('admin.buttons.resetting') : t('admin.buttons.reset')}
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General error */}
        {errors.general && (
          <div
            className="p-4 bg-red-50 border border-red-200 rounded-md"
            role="alert"
            data-testid="general-error"
          >
            <p className="text-sm text-red-600">{errors.general}</p>
          </div>
        )}

        {/* Login Security Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
            {t('admin.security.title')}
          </h3>

          <FormField
            label={t('admin.security.maxLoginAttempts')}
            description={t('admin.security.maxLoginAttemptsDescription')}
            name="max_login_attempts"
            type="number"
            value={formData.max_login_attempts}
            onChange={handleFieldChange('max_login_attempts')}
            error={errors.max_login_attempts}
            min={1}
            max={100}
            required
            data-testid="setting-input-max-login-attempts"
          />

          <FormField
            label={t('admin.security.inactivityTimeout')}
            description={t('admin.security.inactivityTimeoutDescription')}
            name="session_inactivity_timeout"
            type="number"
            value={formData.session_inactivity_timeout}
            onChange={handleFieldChange('session_inactivity_timeout')}
            error={errors.session_inactivity_timeout}
            min={1}
            max={1440}
            required
            data-testid="setting-input-inactivity-timeout"
          />
        </div>

        {/* Password Policy Section */}
        <div className="space-y-4 pt-4 border-t border-neutral-200">
          <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
            {t('admin.security.passwordPolicy')}
          </h3>

          <FormField
            label={t('admin.security.passwordMinLength')}
            description={t('admin.security.passwordMinLengthDescription')}
            name="password_min_length"
            type="number"
            value={formData.password_min_length}
            onChange={handleFieldChange('password_min_length')}
            error={errors.password_min_length}
            min={6}
            max={128}
            required
            data-testid="setting-input-password-min-length"
          />

          <FormField
            label={t('admin.security.requireUppercase')}
            description={t('admin.security.requireUppercaseDescription')}
            name="password_require_uppercase"
            type="toggle"
            value={formData.password_require_uppercase}
            onChange={handleFieldChange('password_require_uppercase')}
            data-testid="setting-toggle-require-uppercase"
          />

          <FormField
            label={t('admin.security.requireLowercase')}
            description={t('admin.security.requireLowercaseDescription')}
            name="password_require_lowercase"
            type="toggle"
            value={formData.password_require_lowercase}
            onChange={handleFieldChange('password_require_lowercase')}
            data-testid="setting-toggle-require-lowercase"
          />

          <FormField
            label={t('admin.security.requireNumbers')}
            description={t('admin.security.requireNumbersDescription')}
            name="password_require_numbers"
            type="toggle"
            value={formData.password_require_numbers}
            onChange={handleFieldChange('password_require_numbers')}
            data-testid="setting-toggle-require-numbers"
          />

          <FormField
            label={t('admin.security.requireSpecialChars')}
            description={t('admin.security.requireSpecialCharsDescription')}
            name="password_require_special_chars"
            type="toggle"
            value={formData.password_require_special_chars}
            onChange={handleFieldChange('password_require_special_chars')}
            data-testid="setting-toggle-require-special"
          />
        </div>

        {/* Unsaved changes indicator */}
        {hasUnsavedChanges && (
          <div
            className="flex items-center gap-2 text-sm text-amber-600"
            data-testid="unsaved-indicator"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>{t('admin.unsavedChanges')}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between gap-3 pt-4 border-t border-neutral-200">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            disabled={isSaving || isResetting}
            className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="reset-to-defaults-button"
          >
            {t('admin.buttons.resetToDefaults')}
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleUndoChanges}
              disabled={!hasUnsavedChanges || isSaving}
              className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="reset-button"
            >
              {t('admin.buttons.discardChanges')}
            </button>
            <button
              type="submit"
              disabled={!hasUnsavedChanges || isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="save-button"
            >
              {isSaving ? t('admin.buttons.saving') : t('admin.buttons.save')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SecuritySettings;
