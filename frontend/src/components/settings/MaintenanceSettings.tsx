/**
 * Maintenance Settings Component
 * STORY-034: Maintenance Mode
 * STORY-002-003: Settings Page i18n Support
 *
 * Admin settings panel for enabling/disabling maintenance mode.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { maintenanceService, MaintenanceStatus } from '../../services/maintenanceService';

/**
 * Props for MaintenanceSettings component
 */
export interface MaintenanceSettingsProps {
  onSaveSuccess?: (message: string) => void;
  onSaveError?: (message: string) => void;
  onUnsavedChanges?: (hasChanges: boolean) => void;
}

/**
 * MaintenanceSettings Component
 *
 * Allows administrators to enable/disable maintenance mode,
 * customize the maintenance message, and set an estimated duration.
 */
export const MaintenanceSettings: React.FC<MaintenanceSettingsProps> = ({
  onSaveSuccess,
  onSaveError,
  onUnsavedChanges,
}) => {
  const { t } = useTranslation('settings');

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [currentStatus, setCurrentStatus] = useState<MaintenanceStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Default maintenance message
  const defaultMessage =
    'We are currently performing scheduled maintenance. Please check back soon.';

  /**
   * Load current maintenance status
   */
  const loadMaintenanceStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await maintenanceService.getMaintenanceStatus();
      setCurrentStatus(status);
      setEnabled(status.enabled);
      setMessage(status.message || defaultMessage);
    } catch (err) {
      setError(t('admin.maintenance.loadError'));
      onSaveError?.(t('admin.maintenance.loadError'));
    } finally {
      setLoading(false);
    }
  }, [onSaveError, t]);

  // Load status on mount
  useEffect(() => {
    loadMaintenanceStatus();
  }, [loadMaintenanceStatus]);

  /**
   * Handle toggle maintenance mode
   */
  const handleToggle = async () => {
    const newEnabled = !enabled;

    try {
      setSaving(true);
      setError(null);

      const result = await maintenanceService.updateMaintenanceMode({
        enabled: newEnabled,
        message: message || defaultMessage,
        estimatedDurationMinutes: newEnabled ? durationMinutes : undefined,
      });

      setEnabled(result.enabled);
      setCurrentStatus(result);

      if (newEnabled) {
        onSaveSuccess?.(t('admin.maintenance.enableSuccess'));
      } else {
        onSaveSuccess?.(t('admin.maintenance.disableSuccess'));
      }
    } catch (err) {
      setError(t('admin.maintenance.updateError'));
      onSaveError?.(t('admin.maintenance.updateError'));
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle message change
   */
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    onUnsavedChanges?.(true);
  };

  /**
   * Handle duration change
   */
  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0 && value <= 1440) {
      setDurationMinutes(value);
      onUnsavedChanges?.(true);
    }
  };

  /**
   * Calculate remaining time for countdown
   */
  const calculateRemainingTime = (): string => {
    if (!currentStatus?.estimatedEndTime) return '';

    const endTime = new Date(currentStatus.estimatedEndTime).getTime();
    const now = Date.now();
    const diff = endTime - now;

    if (diff <= 0) return t('admin.maintenance.soon');

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        <span className="ml-2 text-neutral-600">{t('admin.maintenance.loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-neutral-900">{t('admin.maintenance.title')}</h3>
        <p className="mt-1 text-sm text-neutral-600">
          {t('admin.maintenance.description')}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Status indicator */}
      {enabled && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-yellow-500 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800">
                {t('admin.maintenance.statusActive')}
              </p>
              <p className="text-sm text-yellow-700">
                {t('admin.maintenance.statusActiveDescription')}
              </p>
              {currentStatus?.estimatedEndTime && (
                <p className="text-sm text-yellow-700 mt-1">
                  {t('admin.maintenance.remainingTime')} <strong>{calculateRemainingTime()}</strong>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toggle switch */}
      <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200">
        <div className="flex-1">
          <label
            htmlFor="maintenance-toggle"
            className="text-sm font-medium text-neutral-900"
          >
            {enabled ? t('admin.maintenance.toggleDisable') : t('admin.maintenance.toggleEnable')}
          </label>
          <p className="text-sm text-neutral-500">
            {enabled
              ? t('admin.maintenance.toggleDisableHint')
              : t('admin.maintenance.toggleEnableHint')}
          </p>
        </div>
        <button
          id="maintenance-toggle"
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={saving}
          onClick={handleToggle}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
            border-2 border-transparent transition-colors duration-200 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
            ${enabled ? 'bg-yellow-500' : 'bg-neutral-200'}
            ${saving ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          data-testid="maintenance-toggle"
        >
          <span
            aria-hidden="true"
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full
              bg-white shadow ring-0 transition duration-200 ease-in-out
              ${enabled ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>

      {/* Message input */}
      <div>
        <label
          htmlFor="maintenance-message"
          className="block text-sm font-medium text-neutral-700 mb-2"
        >
          {t('admin.maintenance.message')}
        </label>
        <textarea
          id="maintenance-message"
          value={message}
          onChange={handleMessageChange}
          placeholder={t('admin.maintenance.messagePlaceholder')}
          rows={4}
          maxLength={500}
          className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          data-testid="maintenance-message"
        />
        <p className="mt-1 text-sm text-neutral-500">
          {t('admin.maintenance.messageCharCount', { count: message.length })}
        </p>
      </div>

      {/* Duration input */}
      <div>
        <label
          htmlFor="maintenance-duration"
          className="block text-sm font-medium text-neutral-700 mb-2"
        >
          {t('admin.maintenance.duration')}
        </label>
        <input
          id="maintenance-duration"
          type="number"
          value={durationMinutes}
          onChange={handleDurationChange}
          min={1}
          max={1440}
          className="w-full max-w-xs px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          data-testid="maintenance-duration"
        />
        <p className="mt-1 text-sm text-neutral-500">
          {t('admin.maintenance.durationMax')}
        </p>
      </div>

      {/* Info section */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">{t('admin.maintenance.infoTitle')}</h4>
        <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
          <li>{t('admin.maintenance.infoItems.adminAccess')}</li>
          <li>{t('admin.maintenance.infoItems.apiError')}</li>
          <li>{t('admin.maintenance.infoItems.userMessage')}</li>
          <li>{t('admin.maintenance.infoItems.canDisable')}</li>
        </ul>
      </div>
    </div>
  );
};

export default MaintenanceSettings;
