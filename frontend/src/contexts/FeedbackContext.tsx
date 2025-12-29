/**
 * Feedback Context
 * STORY-041F: Feedback Trigger UI
 *
 * Provides feedback feature state and methods throughout the application.
 * Manages feature flag checking, screenshot capture state, and feedback modal state.
 *
 * @example
 * ```tsx
 * function FeedbackButton() {
 *   const { isFeedbackEnabled, captureScreenshot, isCapturing } = useFeedback();
 *
 *   if (!isFeedbackEnabled) return null;
 *
 *   return (
 *     <button onClick={captureScreenshot} disabled={isCapturing}>
 *       {isCapturing ? 'Capturing...' : 'Feedback'}
 *     </button>
 *   );
 * }
 * ```
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { feedbackService } from '../services/feedbackService';

/**
 * Feedback context state
 */
export interface FeedbackContextState {
  /** Whether the feedback feature is enabled */
  isFeedbackEnabled: boolean;
  /** Whether we're currently checking the feature status */
  isCheckingFeature: boolean;
  /** Whether we're currently capturing a screenshot */
  isCapturing: boolean;
  /** The captured screenshot as base64 data URL */
  screenshot: string | null;
  /** Whether the feedback modal is open */
  isModalOpen: boolean;
  /** Error message if any */
  error: string | null;
  /** Capture a screenshot of the current page */
  captureScreenshot: () => Promise<void>;
  /** Clear the captured screenshot */
  clearScreenshot: () => void;
  /** Open the feedback modal */
  openModal: () => void;
  /** Close the feedback modal */
  closeModal: () => void;
  /** Refresh the feature flag status */
  refreshFeatureStatus: () => Promise<void>;
}

/**
 * Default context value
 */
const defaultContextValue: FeedbackContextState = {
  isFeedbackEnabled: false,
  isCheckingFeature: true,
  isCapturing: false,
  screenshot: null,
  isModalOpen: false,
  error: null,
  captureScreenshot: async () => {
    throw new Error('FeedbackContext not initialized');
  },
  clearScreenshot: () => {
    throw new Error('FeedbackContext not initialized');
  },
  openModal: () => {
    throw new Error('FeedbackContext not initialized');
  },
  closeModal: () => {
    throw new Error('FeedbackContext not initialized');
  },
  refreshFeatureStatus: async () => {
    throw new Error('FeedbackContext not initialized');
  },
};

/**
 * Feedback Context
 */
export const FeedbackContext = createContext<FeedbackContextState>(defaultContextValue);

/**
 * Feedback Provider Props
 */
export interface FeedbackProviderProps {
  children: React.ReactNode;
}

/**
 * Feedback Provider Component
 *
 * Wraps the application to provide feedback feature state and methods.
 */
export const FeedbackProvider: React.FC<FeedbackProviderProps> = ({ children }) => {
  const [isFeedbackEnabled, setIsFeedbackEnabled] = useState(false);
  const [isCheckingFeature, setIsCheckingFeature] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check feature flag status
   */
  const refreshFeatureStatus = useCallback(async () => {
    setIsCheckingFeature(true);
    try {
      const enabled = await feedbackService.isFeedbackEnabled();
      setIsFeedbackEnabled(enabled);
      setError(null);
    } catch (err) {
      console.error('Failed to check feedback feature status:', err);
      setIsFeedbackEnabled(false);
      setError('Failed to check feedback feature status');
    } finally {
      setIsCheckingFeature(false);
    }
  }, []);

  /**
   * Check feature status on mount and periodically
   */
  useEffect(() => {
    refreshFeatureStatus();

    // Re-check every 5 minutes in case admin toggles the feature
    const intervalId = setInterval(refreshFeatureStatus, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [refreshFeatureStatus]);

  /**
   * Capture a screenshot of the current page
   */
  const captureScreenshot = useCallback(async () => {
    if (isCapturing) return;

    setIsCapturing(true);
    setError(null);

    try {
      // Dynamically import html2canvas to avoid bundle size increase when not used
      const html2canvas = (await import('html2canvas')).default;

      // Hide feedback button during capture
      const feedbackButton = document.getElementById('feedback-button');
      if (feedbackButton) {
        feedbackButton.style.visibility = 'hidden';
      }

      // Capture the screenshot
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: Math.min(window.devicePixelRatio || 1, 2), // Cap at 2x for performance
        logging: false,
        // Ignore the feedback button element
        ignoreElements: (element) => {
          return element.id === 'feedback-button' ||
                 element.classList.contains('feedback-button');
        },
      });

      // Convert to base64 data URL
      const dataUrl = canvas.toDataURL('image/png');
      setScreenshot(dataUrl);

      // Show button again
      if (feedbackButton) {
        feedbackButton.style.visibility = 'visible';
      }

      // Open the modal after capture
      setIsModalOpen(true);
    } catch (err) {
      console.error('Screenshot capture failed:', err);
      setError('Failed to capture screenshot. Please try again.');

      // Show button again even on error
      const feedbackButton = document.getElementById('feedback-button');
      if (feedbackButton) {
        feedbackButton.style.visibility = 'visible';
      }
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing]);

  /**
   * Clear the captured screenshot
   */
  const clearScreenshot = useCallback(() => {
    setScreenshot(null);
  }, []);

  /**
   * Open the feedback modal
   */
  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  /**
   * Close the feedback modal
   */
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setScreenshot(null);
    setError(null);
  }, []);

  /**
   * Memoized context value
   */
  const contextValue = useMemo<FeedbackContextState>(
    () => ({
      isFeedbackEnabled,
      isCheckingFeature,
      isCapturing,
      screenshot,
      isModalOpen,
      error,
      captureScreenshot,
      clearScreenshot,
      openModal,
      closeModal,
      refreshFeatureStatus,
    }),
    [
      isFeedbackEnabled,
      isCheckingFeature,
      isCapturing,
      screenshot,
      isModalOpen,
      error,
      captureScreenshot,
      clearScreenshot,
      openModal,
      closeModal,
      refreshFeatureStatus,
    ]
  );

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}
    </FeedbackContext.Provider>
  );
};

/**
 * Hook to access feedback context
 *
 * @throws Error if used outside FeedbackProvider
 */
export function useFeedback(): FeedbackContextState {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
}

/**
 * Hook to check if feedback feature is enabled
 *
 * @returns boolean indicating if feedback is enabled
 */
export function useIsFeedbackEnabled(): boolean {
  const { isFeedbackEnabled } = useFeedback();
  return isFeedbackEnabled;
}

export default FeedbackContext;
