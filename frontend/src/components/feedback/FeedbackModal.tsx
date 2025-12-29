/**
 * FeedbackModal Component
 * STORY-041G: Feedback Modal UI
 *
 * Modal dialog for previewing screenshot and adding feedback comment before submission.
 * Features:
 * - Screenshot preview with max height constraint
 * - Textarea with character counter (10-2000 chars)
 * - Loading state during submission
 * - Error handling with validation messages
 * - Success toast on completion
 *
 * @example
 * ```tsx
 * const { isModalOpen, screenshot, closeModal } = useFeedback();
 *
 * return (
 *   <FeedbackModal
 *     isOpen={isModalOpen}
 *     onClose={closeModal}
 *     screenshot={screenshot}
 *   />
 * );
 * ```
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ResponsiveModal } from '../responsive/ResponsiveModal';
import { feedbackService } from '../../services/feedbackService';
import { Toast } from './Toast';
import './FeedbackModal.css';

/**
 * FeedbackModal Props
 */
export interface FeedbackModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Screenshot data URL (base64) */
  screenshot: string | null;
  /** Data test ID for testing */
  'data-testid'?: string;
}

/**
 * FeedbackModal Component
 *
 * Displays screenshot preview and comment input for feedback submission.
 */
export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  screenshot,
  'data-testid': testId = 'feedback-modal',
}) => {
  // Form state
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toast state
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Textarea ref for focus management
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Character limits
  const MAX_CHARS = 2000;
  const MIN_CHARS = 10;

  /**
   * Focus textarea when modal opens
   */
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      // Small delay to ensure modal is fully rendered
      const timeoutId = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  /**
   * Reset form when modal closes
   */
  useEffect(() => {
    if (!isOpen) {
      setComment('');
      setError(null);
    }
  }, [isOpen]);

  /**
   * Handle comment change with character limit
   */
  const handleCommentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (value.length <= MAX_CHARS) {
        setComment(value);
        // Clear error when user starts typing valid content
        if (error && value.length >= MIN_CHARS) {
          setError(null);
        }
      }
    },
    [error]
  );

  /**
   * Validate form before submission
   */
  const validate = useCallback((): boolean => {
    if (comment.length < MIN_CHARS) {
      setError(`Bitte mindestens ${MIN_CHARS} Zeichen eingeben`);
      return false;
    }
    if (!screenshot) {
      setError('Screenshot fehlt');
      return false;
    }
    return true;
  }, [comment.length, screenshot]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await feedbackService.submitFeedback({
        screenshot: screenshot!,
        comment,
        url: window.location.href,
        screenResolution: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        browserInfo: navigator.userAgent,
      });

      // Show success toast
      setToast({
        message: 'Feedback erfolgreich gesendet!',
        type: 'success',
      });

      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      setError('Fehler beim Senden. Bitte erneut versuchen.');
      setToast({
        message: 'Feedback konnte nicht gesendet werden',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, screenshot, comment, onClose]);

  /**
   * Handle close with confirmation if form has content
   */
  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  /**
   * Dismiss toast
   */
  const handleToastClose = useCallback(() => {
    setToast(null);
  }, []);

  /**
   * Calculate remaining characters hint
   */
  const remainingCharsHint = (): string | null => {
    if (comment.length === 0) return null;
    if (comment.length < MIN_CHARS) {
      return `Noch ${MIN_CHARS - comment.length} Zeichen erforderlich`;
    }
    return null;
  };

  /**
   * Check if submit button should be disabled
   */
  const isSubmitDisabled = isSubmitting || comment.length < MIN_CHARS;

  /**
   * Footer with action buttons
   */
  const footer = (
    <div className="feedback-modal__footer" data-testid={`${testId}-footer`}>
      <button
        type="button"
        className="btn btn--secondary"
        onClick={handleClose}
        disabled={isSubmitting}
        data-testid={`${testId}-cancel-button`}
      >
        Abbrechen
      </button>
      <button
        type="button"
        className="btn btn--primary"
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        data-testid={`${testId}-submit-button`}
      >
        {isSubmitting ? (
          <>
            <span className="feedback-modal__spinner" aria-hidden="true" />
            Senden...
          </>
        ) : (
          'Senden'
        )}
      </button>
    </div>
  );

  return (
    <>
      <ResponsiveModal
        isOpen={isOpen}
        onClose={handleClose}
        title="Feedback senden"
        footer={footer}
        size="md"
        closeOnEscape={!isSubmitting}
        closeOnBackdropClick={!isSubmitting}
        data-testid={testId}
      >
        <div className="feedback-modal" data-testid={`${testId}-content`}>
          {/* Screenshot Preview */}
          {screenshot && (
            <div
              className="feedback-modal__preview"
              data-testid={`${testId}-preview`}
            >
              <img
                src={screenshot}
                alt="Screenshot Vorschau"
                className="feedback-modal__screenshot"
                data-testid={`${testId}-screenshot`}
              />
            </div>
          )}

          {/* Comment Input */}
          <div className="feedback-modal__input-group">
            <label
              htmlFor="feedback-comment"
              className="feedback-modal__label"
            >
              Beschreiben Sie Ihr Feedback:
            </label>
            <textarea
              id="feedback-comment"
              ref={textareaRef}
              className={`feedback-modal__textarea ${
                error ? 'feedback-modal__textarea--error' : ''
              }`}
              value={comment}
              onChange={handleCommentChange}
              placeholder="Was möchten Sie uns mitteilen?"
              rows={4}
              disabled={isSubmitting}
              aria-describedby="char-count feedback-hint"
              aria-invalid={!!error}
              data-testid={`${testId}-textarea`}
            />
            <div className="feedback-modal__meta">
              <span
                id="char-count"
                className="feedback-modal__char-count"
                data-testid={`${testId}-char-count`}
              >
                {comment.length}/{MAX_CHARS} Zeichen
              </span>
              {remainingCharsHint() && (
                <span
                  id="feedback-hint"
                  className="feedback-modal__hint"
                  data-testid={`${testId}-hint`}
                >
                  {remainingCharsHint()}
                </span>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="feedback-modal__error"
              role="alert"
              data-testid={`${testId}-error`}
            >
              {error}
            </div>
          )}
        </div>
      </ResponsiveModal>

      {/* Toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={handleToastClose}
          data-testid={`${testId}-toast`}
        />
      )}
    </>
  );
};

export default FeedbackModal;
