/**
 * FeedbackDeleteDialog Component
 * STORY-041H: Feedback Admin Page
 *
 * Confirmation dialog for feedback deletion.
 * Shows feedback summary and requires confirmation before deleting.
 *
 * @example
 * ```tsx
 * <FeedbackDeleteDialog
 *   isOpen={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   feedback={selectedFeedback}
 *   onSuccess={() => handleFeedbackDeleted()}
 * />
 * ```
 */

import React, { useState } from 'react';
import { ResponsiveModal } from '../responsive';
import { feedbackAdminService, FeedbackListItem } from '../../services/feedbackAdminService';
import { logger } from '../../services/loggerService';
import './FeedbackDeleteDialog.css';

/**
 * Props for FeedbackDeleteDialog component
 */
export interface FeedbackDeleteDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Feedback to delete */
  feedback: FeedbackListItem | null;
  /** Callback when feedback is successfully deleted */
  onSuccess?: () => void;
}

/**
 * Format date for display
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * FeedbackDeleteDialog Component
 */
export const FeedbackDeleteDialog: React.FC<FeedbackDeleteDialogProps> = ({
  isOpen,
  onClose,
  feedback,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle delete confirmation
   */
  const handleDelete = async () => {
    if (!feedback) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await feedbackAdminService.delete(feedback.id);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      logger.error('Failed to delete feedback', err);
      const apiError = err as { response?: { data?: { message?: string } } };
      setError(
        apiError.response?.data?.message ||
          'Feedback konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle dialog close (reset error state)
   */
  const handleClose = () => {
    setError(null);
    onClose();
  };

  /**
   * Render footer buttons
   */
  const renderFooter = () => (
    <div className="feedback-delete-dialog__footer">
      <button
        type="button"
        className="feedback-delete-dialog__btn feedback-delete-dialog__btn--secondary"
        onClick={handleClose}
        disabled={isLoading}
        data-testid="feedback-delete-cancel"
      >
        Abbrechen
      </button>
      <button
        type="button"
        className="feedback-delete-dialog__btn feedback-delete-dialog__btn--danger"
        onClick={handleDelete}
        disabled={isLoading}
        data-testid="feedback-delete-confirm"
      >
        {isLoading ? 'Lösche...' : 'Bestätigen'}
      </button>
    </div>
  );

  if (!feedback) {
    return null;
  }

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Feedback löschen"
      size="sm"
      footer={renderFooter()}
      data-testid="feedback-delete-dialog"
    >
      <div className="feedback-delete-dialog__content">
        {/* Warning icon */}
        <div className="feedback-delete-dialog__icon" aria-hidden="true">
          <svg
            className="feedback-delete-dialog__icon-svg"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Error message */}
        {error && (
          <div className="feedback-delete-dialog__error" role="alert" data-testid="feedback-delete-error">
            {error}
          </div>
        )}

        {/* Confirmation message */}
        <p className="feedback-delete-dialog__message">
          Sind Sie sicher, dass Sie dieses Feedback löschen möchten?
        </p>

        {/* Feedback info */}
        <div className="feedback-delete-dialog__info">
          <div className="feedback-delete-dialog__info-row">
            <span className="feedback-delete-dialog__info-label">Von:</span>
            <span className="feedback-delete-dialog__info-value">{feedback.userName}</span>
          </div>
          <div className="feedback-delete-dialog__info-row">
            <span className="feedback-delete-dialog__info-label">E-Mail:</span>
            <span className="feedback-delete-dialog__info-value">{feedback.userEmail}</span>
          </div>
          <div className="feedback-delete-dialog__info-row">
            <span className="feedback-delete-dialog__info-label">Datum:</span>
            <span className="feedback-delete-dialog__info-value">{formatDate(feedback.createdAt)}</span>
          </div>
          {feedback.commentPreview && (
            <div className="feedback-delete-dialog__info-row feedback-delete-dialog__info-row--comment">
              <span className="feedback-delete-dialog__info-label">Kommentar:</span>
              <span className="feedback-delete-dialog__info-value feedback-delete-dialog__comment-preview">
                {feedback.commentPreview}
              </span>
            </div>
          )}
        </div>

        {/* Warning note */}
        <p className="feedback-delete-dialog__note">
          Diese Aktion kann nicht rückgängig gemacht werden. Das Feedback und der zugehörige Screenshot werden dauerhaft gelöscht.
        </p>
      </div>
    </ResponsiveModal>
  );
};

export default FeedbackDeleteDialog;
