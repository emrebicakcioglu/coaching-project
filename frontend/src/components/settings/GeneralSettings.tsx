/**
 * General Settings Component
 * STORY-013B: In-App Settings Frontend UI
 *
 * Form component for managing general application settings.
 * Includes support email and session timeout configuration.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormField } from './FormField';
import {
  settingsService,
  GeneralSettings as GeneralSettingsType,
  UpdateGeneralSettingsDto,
} from '../../services/settingsService';

/**
 * Form errors interface
 */
interface FormErrors {
  support_email?: string;
  session_timeout_minutes?: string;
  warning_before_timeout_minutes?: string;
  general?: string;
}

/**
 * Props for GeneralSettings component
 */
export interface GeneralSettingsProps {
  /** Callback when save is successful */
  onSaveSuccess?: (message: string) => void;
  /** Callback when save fails */
  onSaveError?: (message: string) => void;
  /** Callback when unsaved changes state changes */
  onUnsavedChanges?: (hasChanges: boolean) => void;
}

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GeneralSettings Component
 *
 * Renders form for general settings with validation and save/reset functionality.
 */
export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  onSaveSuccess,
  onSaveError,
  onUnsavedChanges,
}) => {
  // Form state
  const [formData, setFormData] = useState<GeneralSettingsType>({
    support_email: null,
    session_timeout_minutes: 30,
    show_timeout_warning: true,
    warning_before_timeout_minutes: 5,
  });
  const [originalData, setOriginalData] = useState<GeneralSettingsType | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  /**
   * Load settings on mount
   */
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const settings = await settingsService.getGeneralSettings();
        setFormData(settings);
        setOriginalData(settings);
        setErrors({});
      } catch (error) {
        console.error('Failed to load general settings:', error);
        onSaveError?.('Fehler beim Laden der Einstellungen');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [onSaveError]);

  /**
   * Check for unsaved changes
   */
  useEffect(() => {
    if (!originalData) return;

    const hasChanges =
      formData.support_email !== originalData.support_email ||
      formData.session_timeout_minutes !== originalData.session_timeout_minutes ||
      formData.show_timeout_warning !== originalData.show_timeout_warning ||
      formData.warning_before_timeout_minutes !== originalData.warning_before_timeout_minutes;

    setHasUnsavedChanges(hasChanges);
    onUnsavedChanges?.(hasChanges);
  }, [formData, originalData, onUnsavedChanges]);

  /**
   * Validate form data
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Validate email (if provided)
    if (formData.support_email && !EMAIL_REGEX.test(formData.support_email)) {
      newErrors.support_email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
    }

    // Validate session timeout
    if (
      formData.session_timeout_minutes < 1 ||
      formData.session_timeout_minutes > 1440
    ) {
      newErrors.session_timeout_minutes =
        'Session-Timeout muss zwischen 1 und 1440 Minuten liegen';
    }

    // Validate warning time
    if (
      formData.warning_before_timeout_minutes < 1 ||
      formData.warning_before_timeout_minutes > 60
    ) {
      newErrors.warning_before_timeout_minutes =
        'Warnzeit muss zwischen 1 und 60 Minuten liegen';
    }

    // Warning time should be less than session timeout
    if (formData.warning_before_timeout_minutes >= formData.session_timeout_minutes) {
      newErrors.warning_before_timeout_minutes =
        'Warnzeit muss kleiner als Session-Timeout sein';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  /**
   * Handle field change
   */
  const handleFieldChange = (field: keyof GeneralSettingsType) => (
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
      const updateData: UpdateGeneralSettingsDto = {
        support_email: formData.support_email || null,
        session_timeout_minutes: formData.session_timeout_minutes,
        show_timeout_warning: formData.show_timeout_warning,
        warning_before_timeout_minutes: formData.warning_before_timeout_minutes,
      };

      const updatedSettings = await settingsService.updateGeneralSettings(updateData);
      setFormData(updatedSettings);
      setOriginalData(updatedSettings);
      setHasUnsavedChanges(false);
      onSaveSuccess?.('Allgemeine Einstellungen wurden gespeichert');
    } catch (error) {
      console.error('Failed to save general settings:', error);
      setErrors({ general: 'Fehler beim Speichern der Einstellungen' });
      onSaveError?.('Fehler beim Speichern der Einstellungen');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle reset to original values
   */
  const handleReset = () => {
    if (originalData) {
      setFormData(originalData);
      setErrors({});
      setHasUnsavedChanges(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-12"
        data-testid="general-settings-loading"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        <span className="ml-3 text-neutral-600">Einstellungen werden geladen...</span>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      data-testid="general-settings"
    >
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

      {/* Support Email */}
      <FormField
        label="Support E-Mail"
        description="E-Mail-Adresse für Support-Anfragen (wird im Footer angezeigt)"
        name="support_email"
        type="email"
        value={formData.support_email || ''}
        onChange={handleFieldChange('support_email')}
        error={errors.support_email}
        placeholder="support@example.com"
        data-testid="setting-input-support-email"
      />

      {/* Session Timeout */}
      <FormField
        label="Session-Timeout"
        description="Zeit in Minuten bis zur automatischen Abmeldung (1-1440)"
        name="session_timeout_minutes"
        type="number"
        value={formData.session_timeout_minutes}
        onChange={handleFieldChange('session_timeout_minutes')}
        error={errors.session_timeout_minutes}
        min={1}
        max={1440}
        required
        data-testid="setting-input-session-timeout"
      />

      {/* Show Timeout Warning */}
      <FormField
        label="Timeout-Warnung anzeigen"
        description="Warnung vor automatischer Abmeldung anzeigen"
        name="show_timeout_warning"
        type="toggle"
        value={formData.show_timeout_warning}
        onChange={handleFieldChange('show_timeout_warning')}
        data-testid="setting-toggle-show-warning"
      />

      {/* Warning Time */}
      {formData.show_timeout_warning && (
        <FormField
          label="Warnzeit vor Timeout"
          description="Minuten vor Timeout, um Warnung anzuzeigen (1-60)"
          name="warning_before_timeout_minutes"
          type="number"
          value={formData.warning_before_timeout_minutes}
          onChange={handleFieldChange('warning_before_timeout_minutes')}
          error={errors.warning_before_timeout_minutes}
          min={1}
          max={60}
          required
          data-testid="setting-input-warning-time"
        />
      )}

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
          <span>Sie haben ungespeicherte Änderungen</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
        <button
          type="button"
          onClick={handleReset}
          disabled={!hasUnsavedChanges || isSaving}
          className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="reset-button"
        >
          Zurücksetzen
        </button>
        <button
          type="submit"
          disabled={!hasUnsavedChanges || isSaving}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="save-button"
        >
          {isSaving ? 'Wird gespeichert...' : 'Speichern'}
        </button>
      </div>
    </form>
  );
};

export default GeneralSettings;
