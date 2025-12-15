/**
 * Email Settings Component
 * STORY-013B: In-App Settings Frontend UI
 *
 * Form component for managing email settings.
 * Includes email signature configuration.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormField } from './FormField';
import {
  settingsService,
  EmailSettings as EmailSettingsType,
  UpdateEmailSettingsDto,
} from '../../services/settingsService';

/**
 * Form errors interface
 */
interface FormErrors {
  signature?: string;
  general?: string;
}

/**
 * Props for EmailSettings component
 */
export interface EmailSettingsProps {
  /** Callback when save is successful */
  onSaveSuccess?: (message: string) => void;
  /** Callback when save fails */
  onSaveError?: (message: string) => void;
  /** Callback when unsaved changes state changes */
  onUnsavedChanges?: (hasChanges: boolean) => void;
}

/**
 * Default email settings
 */
const DEFAULT_SETTINGS: EmailSettingsType = {
  signature: 'Best regards,\nYour Team',
};

/**
 * EmailSettings Component
 *
 * Renders form for email settings with validation and save functionality.
 */
export const EmailSettings: React.FC<EmailSettingsProps> = ({
  onSaveSuccess,
  onSaveError,
  onUnsavedChanges,
}) => {
  // Form state
  const [formData, setFormData] = useState<EmailSettingsType>(DEFAULT_SETTINGS);
  const [originalData, setOriginalData] = useState<EmailSettingsType | null>(null);
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
        const settings = await settingsService.getEmailSettings();
        setFormData(settings);
        setOriginalData(settings);
        setErrors({});
      } catch (error) {
        console.error('Failed to load email settings:', error);
        // Use default settings if loading fails
        setFormData(DEFAULT_SETTINGS);
        setOriginalData(DEFAULT_SETTINGS);
        // Don't show error for initial load - email settings may not be configured yet
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  /**
   * Check for unsaved changes
   */
  useEffect(() => {
    if (!originalData) return;

    const hasChanges = formData.signature !== originalData.signature;

    setHasUnsavedChanges(hasChanges);
    onUnsavedChanges?.(hasChanges);
  }, [formData, originalData, onUnsavedChanges]);

  /**
   * Validate form data
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Validate signature length
    if (formData.signature && formData.signature.length > 1000) {
      newErrors.signature = 'Signatur darf maximal 1000 Zeichen lang sein';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  /**
   * Handle field change
   */
  const handleFieldChange = (field: keyof EmailSettingsType) => (
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: String(value),
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
      const updateData: UpdateEmailSettingsDto = {
        signature: formData.signature,
      };

      const updatedSettings = await settingsService.updateEmailSettings(updateData);
      setFormData(updatedSettings);
      setOriginalData(updatedSettings);
      setHasUnsavedChanges(false);
      onSaveSuccess?.('E-Mail-Einstellungen wurden gespeichert');
    } catch (error) {
      console.error('Failed to save email settings:', error);
      setErrors({ general: 'Fehler beim Speichern der E-Mail-Einstellungen' });
      onSaveError?.('Fehler beim Speichern der E-Mail-Einstellungen');
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
        data-testid="email-settings-loading"
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
      data-testid="email-settings"
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

      {/* Info Banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex">
          <svg
            className="h-5 w-5 text-blue-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="ml-3 text-sm text-blue-700">
            Diese Einstellungen betreffen alle vom System versendeten E-Mails wie
            Benachrichtigungen, Passwort-Reset-E-Mails und Registrierungsbestätigungen.
          </p>
        </div>
      </div>

      {/* Email Signature */}
      <FormField
        label="E-Mail-Signatur"
        description="Signatur, die am Ende jeder E-Mail angehängt wird (max. 1000 Zeichen)"
        name="signature"
        type="textarea"
        value={formData.signature}
        onChange={handleFieldChange('signature')}
        error={errors.signature}
        placeholder="Mit freundlichen Grüßen,&#10;Ihr Team"
        rows={5}
        data-testid="email-setting"
      />

      {/* Character count */}
      <div className="text-sm text-neutral-500">
        {formData.signature.length} / 1000 Zeichen
      </div>

      {/* Preview Section */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-neutral-900">Vorschau</h4>
        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-md">
          <div className="text-sm text-neutral-600 whitespace-pre-wrap">
            <p className="mb-4 text-neutral-500 italic">
              [E-Mail-Inhalt...]
            </p>
            <div className="border-t border-neutral-200 pt-4">
              {formData.signature || (
                <span className="text-neutral-400 italic">Keine Signatur definiert</span>
              )}
            </div>
          </div>
        </div>
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

export default EmailSettings;
