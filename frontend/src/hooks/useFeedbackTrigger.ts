/**
 * useFeedbackTrigger Hook
 * STORY-041F: Feedback Trigger UI
 *
 * Custom hook for triggering feedback with keyboard shortcuts and screenshot capture.
 * Provides programmatic access to feedback functionality.
 *
 * @example
 * ```tsx
 * function SomeComponent() {
 *   const { triggerFeedback, isEnabled, isCapturing } = useFeedbackTrigger();
 *
 *   return (
 *     <button onClick={triggerFeedback} disabled={!isEnabled || isCapturing}>
 *       Report Issue
 *     </button>
 *   );
 * }
 * ```
 */

import { useCallback, useEffect } from 'react';
import { useFeedback } from '../contexts';

/**
 * useFeedbackTrigger return type
 */
export interface UseFeedbackTriggerReturn {
  /** Trigger feedback capture */
  triggerFeedback: () => Promise<void>;
  /** Whether feedback feature is enabled */
  isEnabled: boolean;
  /** Whether currently capturing screenshot */
  isCapturing: boolean;
  /** Whether modal is open */
  isModalOpen: boolean;
  /** Current screenshot (base64 data URL) */
  screenshot: string | null;
  /** Open the feedback modal */
  openModal: () => void;
  /** Close the feedback modal */
  closeModal: () => void;
  /** Clear the current screenshot */
  clearScreenshot: () => void;
  /** Error message if any */
  error: string | null;
}

/**
 * useFeedbackTrigger options
 */
export interface UseFeedbackTriggerOptions {
  /**
   * Enable keyboard shortcut handling in this hook.
   * NOTE: By default this is disabled because FeedbackButton already handles
   * the default Ctrl+Shift+F shortcut. Only enable this if you need custom
   * shortcuts or are not using FeedbackButton.
   * @default false
   */
  enableKeyboardShortcut?: boolean;
  /** Custom keyboard shortcut (only used when enableKeyboardShortcut is true) */
  customShortcut?: {
    key: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
  };
  /** Callback when screenshot is captured */
  onCapture?: (screenshot: string) => void;
  /** Callback when modal opens */
  onModalOpen?: () => void;
  /** Callback when modal closes */
  onModalClose?: () => void;
}

/**
 * useFeedbackTrigger Hook
 *
 * Provides programmatic access to feedback functionality including
 * screenshot capture and keyboard shortcut handling.
 *
 * @param options - Configuration options
 * @returns Feedback trigger controls
 */
export function useFeedbackTrigger(
  options: UseFeedbackTriggerOptions = {}
): UseFeedbackTriggerReturn {
  const {
    // Default to disabled - FeedbackButton already handles Ctrl+Shift+F
    enableKeyboardShortcut = false,
    customShortcut,
    onCapture,
    onModalOpen,
    onModalClose,
  } = options;

  const {
    isFeedbackEnabled,
    isCapturing,
    isModalOpen,
    screenshot,
    error,
    captureScreenshot,
    openModal,
    closeModal,
    clearScreenshot,
  } = useFeedback();

  /**
   * Trigger feedback capture
   */
  const triggerFeedback = useCallback(async () => {
    if (!isFeedbackEnabled || isCapturing) return;
    await captureScreenshot();
  }, [isFeedbackEnabled, isCapturing, captureScreenshot]);

  /**
   * Handle onCapture callback
   */
  useEffect(() => {
    if (screenshot && onCapture) {
      onCapture(screenshot);
    }
  }, [screenshot, onCapture]);

  /**
   * Handle modal open/close callbacks
   */
  useEffect(() => {
    if (isModalOpen && onModalOpen) {
      onModalOpen();
    } else if (!isModalOpen && onModalClose) {
      onModalClose();
    }
  }, [isModalOpen, onModalOpen, onModalClose]);

  /**
   * Keyboard shortcut handler
   * Only active when enableKeyboardShortcut is true (default: false)
   * since FeedbackButton already handles the default Ctrl+Shift+F shortcut
   */
  useEffect(() => {
    if (!isFeedbackEnabled || !enableKeyboardShortcut) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      let shouldTrigger = false;

      if (customShortcut) {
        // Custom shortcut
        const keyMatches = event.key.toLowerCase() === customShortcut.key.toLowerCase();
        const ctrlMatches = customShortcut.ctrlKey ? event.ctrlKey : !event.ctrlKey;
        const metaMatches = customShortcut.metaKey ? event.metaKey : !event.metaKey;
        const shiftMatches = customShortcut.shiftKey ? event.shiftKey : !event.shiftKey;
        const altMatches = customShortcut.altKey ? event.altKey : !event.altKey;

        shouldTrigger = keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches;
      } else {
        // Default shortcut: Ctrl+Shift+F or Cmd+Shift+F
        const isModifierPressed = event.ctrlKey || event.metaKey;
        const isShiftPressed = event.shiftKey;
        const isFKey = event.key === 'F' || event.key === 'f';

        shouldTrigger = isModifierPressed && isShiftPressed && isFKey;
      }

      if (shouldTrigger) {
        event.preventDefault();

        // Check if any modal is open
        const hasOpenModal = document.querySelector('[role="dialog"]') !== null ||
                            document.querySelector('.modal-overlay') !== null ||
                            document.querySelector('[data-modal-open="true"]') !== null;

        if (!hasOpenModal && !isCapturing) {
          triggerFeedback();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFeedbackEnabled, enableKeyboardShortcut, customShortcut, isCapturing, triggerFeedback]);

  return {
    triggerFeedback,
    isEnabled: isFeedbackEnabled,
    isCapturing,
    isModalOpen,
    screenshot,
    openModal,
    closeModal,
    clearScreenshot,
    error,
  };
}

export default useFeedbackTrigger;
