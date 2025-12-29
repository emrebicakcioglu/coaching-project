/**
 * FeedbackButton Component
 * STORY-041F: Feedback Trigger UI
 *
 * Floating feedback button that allows users to submit feedback with screenshots.
 * Features:
 * - Fixed position (bottom-right corner)
 * - Keyboard shortcut (Ctrl+Shift+F / Cmd+Shift+F)
 * - html2canvas screenshot capture
 * - Feature flag integration
 * - Loading state during capture
 * - Responsive design (larger on mobile)
 *
 * @example
 * ```tsx
 * function App() {
 *   const handleCapture = (screenshot: string) => {
 *     // Open modal with screenshot
 *   };
 *
 *   return <FeedbackButton onCapture={handleCapture} />;
 * }
 * ```
 */

import React, { useEffect, useCallback } from 'react';
import { useFeedback } from '../../contexts';
import './FeedbackButton.css';

/**
 * FeedbackButton Props
 */
export interface FeedbackButtonProps {
  /** Callback when screenshot is captured */
  onCapture?: (screenshot: string) => void;
  /** Custom class name */
  className?: string;
  /** Data test ID for testing */
  'data-testid'?: string;
}

/**
 * FeedbackButton Component
 *
 * Floating button for triggering feedback with screenshot capture.
 * Only visible when the feedback feature is enabled.
 */
export const FeedbackButton: React.FC<FeedbackButtonProps> = ({
  onCapture,
  className = '',
  'data-testid': testId = 'feedback-button',
}) => {
  const {
    isFeedbackEnabled,
    isCheckingFeature,
    isCapturing,
    captureScreenshot,
    screenshot,
  } = useFeedback();

  /**
   * Handle capture and callback
   */
  const handleCapture = useCallback(async () => {
    await captureScreenshot();
  }, [captureScreenshot]);

  /**
   * Call onCapture callback when screenshot is captured
   */
  useEffect(() => {
    if (screenshot && onCapture) {
      onCapture(screenshot);
    }
  }, [screenshot, onCapture]);

  /**
   * Keyboard shortcut handler (Ctrl+Shift+F / Cmd+Shift+F)
   */
  useEffect(() => {
    if (!isFeedbackEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+Shift+F (Windows/Linux) or Cmd+Shift+F (macOS)
      const isModifierPressed = event.ctrlKey || event.metaKey;
      const isShiftPressed = event.shiftKey;
      const isFKey = event.key === 'F' || event.key === 'f';

      if (isModifierPressed && isShiftPressed && isFKey) {
        // Prevent default browser behavior
        event.preventDefault();

        // Check if any modal is open (don't trigger if modal is open)
        const hasOpenModal = document.querySelector('[role="dialog"]') !== null ||
                            document.querySelector('.modal-overlay') !== null ||
                            document.querySelector('[data-modal-open="true"]') !== null;

        if (!hasOpenModal && !isCapturing) {
          handleCapture();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFeedbackEnabled, isCapturing, handleCapture]);

  // Don't render while checking feature status
  if (isCheckingFeature) {
    return null;
  }

  // Don't render if feature is disabled
  if (!isFeedbackEnabled) {
    return null;
  }

  const buttonClasses = [
    'feedback-button',
    isCapturing ? 'feedback-button--capturing' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      id="feedback-button"
      className={buttonClasses}
      onClick={handleCapture}
      disabled={isCapturing}
      title="Feedback senden (Ctrl+Shift+F)"
      aria-label="Feedback senden"
      data-testid={testId}
    >
      {isCapturing ? (
        <span className="feedback-button__spinner" aria-hidden="true" />
      ) : (
        <svg
          viewBox="0 0 24 24"
          className="feedback-button__icon"
          aria-hidden="true"
        >
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        </svg>
      )}
      <span className="sr-only">
        {isCapturing ? 'Screenshot wird erstellt...' : 'Feedback senden'}
      </span>
    </button>
  );
};

export default FeedbackButton;
