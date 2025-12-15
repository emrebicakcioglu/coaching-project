/**
 * Toast Component
 * STORY-006B: User CRUD Frontend UI
 *
 * Displays temporary notification messages (success, error, info, warning).
 * Auto-dismisses after a configurable duration.
 *
 * @example
 * ```tsx
 * <Toast
 *   message="Benutzer erfolgreich erstellt"
 *   type="success"
 *   onClose={() => setToast(null)}
 * />
 * ```
 */

import React, { useEffect, useCallback } from 'react';
import './Toast.css';

/**
 * Toast type variants
 */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

/**
 * Props for Toast component
 */
export interface ToastProps {
  /** Message to display */
  message: string;
  /** Type of toast (affects styling) */
  type?: ToastType;
  /** Duration in ms before auto-dismiss (0 = no auto-dismiss) */
  duration?: number;
  /** Callback when toast is dismissed */
  onClose: () => void;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/**
 * Toast Component
 */
export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 5000,
  onClose,
  'data-testid': testId = 'toast',
}) => {
  /**
   * Auto-dismiss effect
   */
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [duration, onClose]);

  /**
   * Handle close button click
   */
  const handleClose = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onClose();
    },
    [onClose]
  );

  /**
   * Get icon based on type
   */
  const renderIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="toast__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case 'error':
        return (
          <svg className="toast__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        );
      case 'warning':
        return (
          <svg className="toast__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className="toast__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  return (
    <div
      className={`toast toast--${type}`}
      role="alert"
      aria-live="polite"
      data-testid={testId}
    >
      <div className="toast__icon-container">{renderIcon()}</div>
      <p className="toast__message">{message}</p>
      <button
        type="button"
        className="toast__close"
        onClick={handleClose}
        aria-label="Meldung schließen"
        data-testid={`${testId}-close`}
      >
        <svg className="toast__close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
};

/**
 * Toast data interface for managing multiple toasts
 */
export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

/**
 * ToastContainer Component
 *
 * Container for rendering multiple toasts.
 */
export interface ToastContainerProps {
  /** Array of toast data */
  toasts: ToastData[];
  /** Callback when a toast is dismissed */
  onClose: (id: string) => void;
  /** Position on screen */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onClose,
  position = 'top-right',
}) => {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className={`toast-container toast-container--${position}`} aria-live="polite">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => onClose(toast.id)}
          data-testid={`toast-${toast.id}`}
        />
      ))}
    </div>
  );
};

export default Toast;
