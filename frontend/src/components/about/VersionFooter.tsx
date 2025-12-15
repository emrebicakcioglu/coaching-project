/**
 * VersionFooter Component
 * STORY-030: Application Versioning
 *
 * Displays the application version in the sidebar footer.
 * Clicking on the version opens the About dialog.
 *
 * @example
 * ```tsx
 * <VersionFooter isCollapsed={false} />
 * ```
 */

import React, { useState, useEffect } from 'react';
import { versionService } from '../../services';
import { AboutDialog } from './AboutDialog';

/**
 * VersionFooter props
 */
export interface VersionFooterProps {
  /** Whether the sidebar is collapsed */
  isCollapsed?: boolean;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/**
 * VersionFooter Component
 *
 * Displays a clickable version number that opens the About dialog.
 * Adapts to collapsed sidebar mode by showing only a minimal indicator.
 */
export const VersionFooter: React.FC<VersionFooterProps> = ({
  isCollapsed = false,
  'data-testid': testId = 'version-footer',
}) => {
  const [version, setVersion] = useState<string>('');
  const [showAbout, setShowAbout] = useState(false);

  // Fetch version on mount
  useEffect(() => {
    versionService
      .getVersion()
      .then((info) => {
        setVersion(`v${info.version}`);
      })
      .catch(() => {
        setVersion('v1.0.0');
      });
  }, []);

  const handleClick = () => {
    setShowAbout(true);
  };

  const handleClose = () => {
    setShowAbout(false);
  };

  // Collapsed mode: Show only icon with tooltip
  if (isCollapsed) {
    return (
      <>
        <button
          type="button"
          className="
            w-full
            min-h-[32px]
            flex items-center justify-center
            text-xs text-neutral-400 hover:text-neutral-600
            hover:bg-neutral-100
            focus:outline-none focus:ring-2 focus:ring-primary-500
            rounded-md
            transition-colors
          "
          onClick={handleClick}
          title={version || 'Version'}
          aria-label={`Application version: ${version}. Click to show more details`}
          data-testid={testId}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>

        <AboutDialog
          isOpen={showAbout}
          onClose={handleClose}
          data-testid="about-dialog"
        />
      </>
    );
  }

  // Expanded mode: Show full version with about button
  return (
    <>
      <button
        type="button"
        className="
          w-full
          flex items-center justify-between
          px-2 py-1.5
          text-xs text-neutral-400 hover:text-neutral-600
          hover:bg-neutral-100
          focus:outline-none focus:ring-2 focus:ring-primary-500
          rounded-md
          transition-colors
        "
        onClick={handleClick}
        aria-label={`Application version: ${version}. Click to show more details`}
        data-testid={testId}
      >
        <span className="flex items-center gap-1.5">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span data-testid={`${testId}-version`}>{version}</span>
        </span>
        <span className="text-neutral-300">About</span>
      </button>

      <AboutDialog
        isOpen={showAbout}
        onClose={handleClose}
        data-testid="about-dialog"
      />
    </>
  );
};

export default VersionFooter;
