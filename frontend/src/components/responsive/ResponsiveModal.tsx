/**
 * ResponsiveModal Component
 * STORY-017B: Component Responsiveness
 *
 * A responsive modal that displays as a centered modal on desktop
 * and fullscreen on mobile devices.
 *
 * @example
 * ```tsx
 * <ResponsiveModal
 *   isOpen={modalOpen}
 *   onClose={() => setModalOpen(false)}
 *   title="Edit Profile"
 * >
 *   <form>...</form>
 * </ResponsiveModal>
 * ```
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { useResponsive } from '../../hooks';

/**
 * Modal size options for desktop
 */
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

/**
 * Props for ResponsiveModal component
 */
export interface ResponsiveModalProps {
  /** Modal content */
  children: React.ReactNode;
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal description for accessibility */
  description?: string;
  /** Modal size on desktop */
  size?: ModalSize;
  /** Whether to show close button */
  showCloseButton?: boolean;
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Whether clicking backdrop closes modal */
  closeOnBackdropClick?: boolean;
  /** Whether pressing Escape closes modal */
  closeOnEscape?: boolean;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/**
 * Size classes for desktop modal
 */
const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
} as const;

/**
 * ResponsiveModal Component
 *
 * Desktop: Centered modal with backdrop
 * Mobile: Fullscreen modal
 */
export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  children,
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  showCloseButton = true,
  footer,
  className = '',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  'data-testid': testId = 'responsive-modal',
}) => {
  const { isMobile } = useResponsive();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape' && isOpen) {
        onClose();
      }
    },
    [closeOnEscape, isOpen, onClose]
  );

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (closeOnBackdropClick && event.target === event.currentTarget) {
        onClose();
      }
    },
    [closeOnBackdropClick, onClose]
  );

  // Focus management and body scroll lock
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Lock body scroll
      document.body.style.overflow = 'hidden';

      // Focus the modal
      setTimeout(() => {
        modalRef.current?.focus();
      }, 0);
    } else {
      // Unlock body scroll
      document.body.style.overflow = '';

      // Restore focus to previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Add escape key listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Don't render anything if closed
  if (!isOpen) {
    return null;
  }

  const titleId = `${testId}-title`;
  const descriptionId = `${testId}-description`;

  // Mobile: Fullscreen modal
  if (isMobile) {
    return (
      <div
        className="fixed inset-0 z-[var(--z-modal)] flex flex-col"
        style={{ backgroundColor: 'var(--color-background-modal, #ffffff)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        data-testid={testId}
        data-variant="mobile"
        ref={modalRef}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-border-default, #e5e7eb)' }}>
          {title && (
            <h2
              id={titleId}
              className="text-lg font-semibold"
              style={{ color: 'var(--color-text-primary, #111827)' }}
              data-testid={`${testId}-title`}
            >
              {title}
            </h2>
          )}
          {showCloseButton && (
            <button
              type="button"
              className="
                min-w-[44px] min-h-[44px]
                flex items-center justify-center
                focus:outline-none focus:ring-2 focus:ring-primary-500
                rounded-md
                -mr-2
              "
              style={{ color: 'var(--color-text-secondary, #6b7280)' }}
              onClick={onClose}
              aria-label="Close modal"
              data-testid={`${testId}-close-button`}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto p-4"
          data-testid={`${testId}-content`}
        >
          {description && (
            <p id={descriptionId} className="sr-only">
              {description}
            </p>
          )}
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="flex-shrink-0 p-4 border-t"
            style={{
              borderColor: 'var(--color-border-default, #e5e7eb)',
              backgroundColor: 'var(--color-background-surface, #f9fafb)'
            }}
            data-testid={`${testId}-footer`}
          >
            {footer}
          </div>
        )}
      </div>
    );
  }

  // Desktop: Centered modal with backdrop
  return (
    <>
      {/* Backdrop */}
      <div
        className="
          fixed inset-0
          bg-black bg-opacity-50
          z-[var(--z-modal-backdrop)]
          transition-opacity duration-300
        "
        aria-hidden="true"
        data-testid={`${testId}-backdrop`}
        onClick={handleBackdropClick}
      />

      {/* Modal container */}
      <div
        className="
          fixed inset-0
          z-[var(--z-modal)]
          overflow-y-auto
          flex items-center justify-center
          p-4
        "
        onClick={handleBackdropClick}
      >
        {/* Modal */}
        <div
          className={`
            relative
            w-full
            ${sizeClasses[size]}
            rounded-lg
            shadow-xl
            transform
            transition-all duration-300
            ${className}
          `}
          style={{ backgroundColor: 'var(--color-background-modal, #ffffff)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descriptionId : undefined}
          data-testid={testId}
          data-variant="desktop"
          ref={modalRef}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-border-default, #e5e7eb)' }}>
              {title && (
                <h2
                  id={titleId}
                  className="text-lg font-semibold"
                  style={{ color: 'var(--color-text-primary, #111827)' }}
                  data-testid={`${testId}-title`}
                >
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  type="button"
                  className="
                    min-w-[44px] min-h-[44px]
                    flex items-center justify-center
                    focus:outline-none focus:ring-2 focus:ring-primary-500
                    rounded-md
                    -mr-2 ml-auto
                  "
                  style={{ color: 'var(--color-text-secondary, #6b7280)' }}
                  onClick={onClose}
                  aria-label="Close modal"
                  data-testid={`${testId}-close-button`}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div
            className="p-4 max-h-[60vh] overflow-y-auto"
            data-testid={`${testId}-content`}
          >
            {description && (
              <p id={descriptionId} className="sr-only">
                {description}
              </p>
            )}
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div
              className="p-4 border-t rounded-b-lg"
              style={{
                borderColor: 'var(--color-border-default, #e5e7eb)',
                backgroundColor: 'var(--color-background-surface, #f9fafb)'
              }}
              data-testid={`${testId}-footer`}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ResponsiveModal;
