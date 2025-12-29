/**
 * AboutDialog Component
 * STORY-030: Application Versioning
 *
 * Modal dialog displaying application version information.
 * Uses ResponsiveModal for consistent mobile/desktop behavior.
 *
 * @example
 * ```tsx
 * <AboutDialog
 *   isOpen={showAbout}
 *   onClose={() => setShowAbout(false)}
 * />
 * ```
 */

import React, { useState, useEffect } from 'react';
import { ResponsiveModal } from '../responsive/ResponsiveModal';
import { versionService, VersionInfo } from '../../services';
import { logger } from '../../services/loggerService';

/**
 * AboutDialog props
 */
export interface AboutDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/**
 * AboutDialog Component
 *
 * Displays detailed application version information including:
 * - Application name
 * - Version number (semantic versioning)
 * - Build number (if available)
 * - Git commit hash (if available)
 * - Description
 */
export const AboutDialog: React.FC<AboutDialogProps> = ({
  isOpen,
  onClose,
  'data-testid': testId = 'about-dialog',
}) => {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch version info when dialog opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);

      versionService
        .getVersion()
        .then((info) => {
          setVersionInfo(info);
          setLoading(false);
        })
        .catch((err) => {
          logger.error('Failed to fetch version info', err);
          setError('Failed to load version information');
          setLoading(false);
        });
    }
  }, [isOpen]);

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="About"
      size="sm"
      data-testid={testId}
    >
      <div className="space-y-4" data-testid={`${testId}-content`}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : error ? (
          <div className="text-center py-4 text-error">
            <p>{error}</p>
          </div>
        ) : versionInfo ? (
          <>
            {/* Application Logo/Icon */}
            <div className="flex justify-center mb-4">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--color-background-surface, #dbeafe)',
                  color: 'var(--color-primary, #2563eb)',
                }}
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                  />
                </svg>
              </div>
            </div>

            {/* Application Name */}
            <div className="text-center">
              <h3
                className="text-lg font-semibold"
                style={{ color: 'var(--color-text-primary, #111827)' }}
                data-testid={`${testId}-name`}
              >
                {versionInfo.name || 'Core App'}
              </h3>
              <p
                className="text-sm mt-1"
                style={{ color: 'var(--color-text-secondary, #6b7280)' }}
                data-testid={`${testId}-description`}
              >
                {versionInfo.description}
              </p>
            </div>

            {/* Version Information */}
            <div
              className="rounded-lg p-4 space-y-2"
              style={{ backgroundColor: 'var(--color-background-surface, #f9fafb)' }}
            >
              {/* Version Number */}
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: 'var(--color-text-secondary, #6b7280)' }}>Version</span>
                <span
                  className="text-sm font-mono font-medium"
                  style={{ color: 'var(--color-text-primary, #111827)' }}
                  data-testid={`${testId}-version`}
                >
                  {versionInfo.version}
                </span>
              </div>

              {/* Build Number (if available) */}
              {versionInfo.build && (
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary, #6b7280)' }}>Build</span>
                  <span
                    className="text-sm font-mono"
                    style={{ color: 'var(--color-text-primary, #374151)' }}
                    data-testid={`${testId}-build`}
                  >
                    {versionInfo.build}
                  </span>
                </div>
              )}

              {/* Git Commit (if available) */}
              {versionInfo.commit && (
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary, #6b7280)' }}>Commit</span>
                  <span
                    className="text-sm font-mono"
                    style={{ color: 'var(--color-text-primary, #374151)' }}
                    data-testid={`${testId}-commit`}
                  >
                    {versionInfo.commit}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center text-xs pt-2" style={{ color: 'var(--color-text-muted, #9ca3af)' }}>
              <p>&copy; {new Date().getFullYear()} Core App. All rights reserved.</p>
            </div>
          </>
        ) : null}
      </div>
    </ResponsiveModal>
  );
};

export default AboutDialog;
