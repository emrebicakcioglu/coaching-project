/**
 * FeedbackDetailModal Component
 * STORY-041H: Feedback Admin Page
 *
 * Modal for displaying detailed feedback information including:
 * - Full screenshot
 * - Complete comment
 * - User information
 * - Browser/OS details
 * - Jira ticket information
 *
 * @example
 * ```tsx
 * <FeedbackDetailModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   feedbackId={selectedFeedbackId}
 *   onDelete={() => handleDelete()}
 *   onCreateJira={() => handleJira()}
 *   jiraConfigured={true}
 * />
 * ```
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ResponsiveModal } from '../responsive';
import { Button } from '../ui';
import { feedbackAdminService, FeedbackDetail } from '../../services/feedbackAdminService';
import { logger } from '../../services/loggerService';
import './FeedbackDetailModal.css';

/**
 * Props for FeedbackDetailModal component
 */
export interface FeedbackDetailModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** ID of the feedback to display */
  feedbackId: number | null;
  /** Callback when delete button is clicked */
  onDelete: () => void;
  /** Callback when Jira button is clicked */
  onCreateJira: (deleteAfter: boolean) => void;
  /** Whether Jira is configured */
  jiraConfigured: boolean;
}

/**
 * Format date for display
 */
const formatFullDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * FeedbackDetailModal Component
 */
export const FeedbackDetailModal: React.FC<FeedbackDetailModalProps> = ({
  isOpen,
  onClose,
  feedbackId,
  onDelete,
  onCreateJira,
  jiraConfigured,
}) => {
  const [feedback, setFeedback] = useState<FeedbackDetail | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [deleteAfterJira, setDeleteAfterJira] = useState(false);
  const [isCreatingJira, setIsCreatingJira] = useState(false);

  /**
   * Load feedback details
   */
  const loadFeedback = useCallback(async () => {
    if (!feedbackId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [feedbackData, screenshotData] = await Promise.all([
        feedbackAdminService.getOne(feedbackId),
        feedbackAdminService.getScreenshotUrl(feedbackId).catch(() => ({ url: '' })),
      ]);

      setFeedback(feedbackData);
      setScreenshotUrl(screenshotData.url);
    } catch (err) {
      logger.error('Failed to load feedback details', err);
      setError('Feedback-Details konnten nicht geladen werden.');
    } finally {
      setIsLoading(false);
    }
  }, [feedbackId]);

  useEffect(() => {
    if (isOpen && feedbackId) {
      loadFeedback();
    }
    // Reset state when modal closes
    if (!isOpen) {
      setFeedback(null);
      setScreenshotUrl('');
      setError(null);
      setDeleteAfterJira(false);
    }
  }, [isOpen, feedbackId, loadFeedback]);

  /**
   * Handle screenshot download
   */
  const handleDownloadScreenshot = async () => {
    if (!screenshotUrl) return;

    setIsDownloading(true);
    try {
      const response = await fetch(screenshotUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `feedback-screenshot-${feedbackId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      logger.error('Failed to download screenshot', err);
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * Handle Jira ticket creation
   */
  const handleCreateJira = async () => {
    setIsCreatingJira(true);
    try {
      await onCreateJira(deleteAfterJira);
    } finally {
      setIsCreatingJira(false);
    }
  };

  /**
   * Render footer buttons
   */
  const renderFooter = () => (
    <div className="feedback-detail-modal__footer">
      <div className="feedback-detail-modal__footer-left">
        <Button
          variant="destructive"
          onClick={onDelete}
          disabled={isLoading}
          data-testid="feedback-detail-delete-button"
        >
          Löschen
        </Button>
      </div>
      <div className="feedback-detail-modal__footer-right">
        {jiraConfigured && !feedback?.jiraIssueKey && (
          <div className="feedback-detail-modal__jira-action">
            <label className="feedback-detail-modal__checkbox-label">
              <input
                type="checkbox"
                checked={deleteAfterJira}
                onChange={(e) => setDeleteAfterJira(e.target.checked)}
                className="feedback-detail-modal__checkbox"
                data-testid="feedback-detail-delete-after-checkbox"
              />
              <span>Nach Erstellung löschen</span>
            </label>
            <Button
              variant="primary"
              onClick={handleCreateJira}
              disabled={isCreatingJira}
              isLoading={isCreatingJira}
              data-testid="feedback-detail-jira-button"
            >
              {isCreatingJira ? 'Erstelle...' : 'Jira Ticket'}
            </Button>
          </div>
        )}
        {feedback?.hasScreenshot && screenshotUrl && (
          <Button
            variant="secondary"
            onClick={handleDownloadScreenshot}
            disabled={isDownloading}
            isLoading={isDownloading}
            data-testid="feedback-detail-download-button"
          >
            {isDownloading ? 'Lade...' : 'Screenshot ⬇️'}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Feedback Details"
      size="lg"
      footer={!isLoading && !error && feedback ? renderFooter() : undefined}
      data-testid="feedback-detail-modal"
    >
      <div className="feedback-detail-modal__content">
        {/* Loading state */}
        {isLoading && (
          <div className="feedback-detail-modal__loading" data-testid="feedback-detail-loading">
            <svg className="feedback-detail-modal__spinner" viewBox="0 0 24 24" aria-hidden="true">
              <circle
                className="feedback-detail-modal__spinner-circle"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
            </svg>
            <span>Lade Details...</span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="feedback-detail-modal__error" role="alert" data-testid="feedback-detail-error">
            {error}
          </div>
        )}

        {/* Content */}
        {!isLoading && !error && feedback && (
          <>
            {/* User info row */}
            <div className="feedback-detail-modal__info-row">
              <span className="feedback-detail-modal__info-label">Von:</span>
              <span className="feedback-detail-modal__info-value" data-testid="feedback-detail-user">
                {feedback.userName} ({feedback.userEmail})
              </span>
            </div>

            <div className="feedback-detail-modal__info-row">
              <span className="feedback-detail-modal__info-label">Datum:</span>
              <span className="feedback-detail-modal__info-value" data-testid="feedback-detail-date">
                {formatFullDate(feedback.createdAt)}
              </span>
            </div>

            <div className="feedback-detail-modal__info-row">
              <span className="feedback-detail-modal__info-label">Route:</span>
              <span className="feedback-detail-modal__info-value feedback-detail-modal__route" data-testid="feedback-detail-route">
                {feedback.route}
              </span>
            </div>

            {/* Screenshot */}
            {feedback.hasScreenshot && screenshotUrl && (
              <div className="feedback-detail-modal__screenshot-section">
                <button
                  type="button"
                  className="feedback-detail-modal__screenshot-button"
                  onClick={handleDownloadScreenshot}
                  disabled={isDownloading}
                  aria-label="Screenshot herunterladen"
                  data-testid="feedback-detail-screenshot"
                >
                  <img
                    src={screenshotUrl}
                    alt="Feedback Screenshot"
                    className="feedback-detail-modal__screenshot"
                  />
                  <div className="feedback-detail-modal__screenshot-overlay">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Klicken zum Herunterladen</span>
                  </div>
                </button>
              </div>
            )}

            {/* Comment */}
            <div className="feedback-detail-modal__section">
              <h3 className="feedback-detail-modal__section-title">Kommentar:</h3>
              <div className="feedback-detail-modal__comment" data-testid="feedback-detail-comment">
                {feedback.comment}
              </div>
            </div>

            {/* Browser/OS info */}
            <div className="feedback-detail-modal__section">
              <h3 className="feedback-detail-modal__section-title">System-Informationen:</h3>
              <div className="feedback-detail-modal__system-info" data-testid="feedback-detail-system-info">
                <div className="feedback-detail-modal__system-row">
                  <span className="feedback-detail-modal__system-label">Browser:</span>
                  <span className="feedback-detail-modal__system-value">
                    {feedback.browserName} {feedback.browserVersion} auf {feedback.osName} {feedback.osVersion}
                  </span>
                </div>
                <div className="feedback-detail-modal__system-row">
                  <span className="feedback-detail-modal__system-label">Auflösung:</span>
                  <span className="feedback-detail-modal__system-value">{feedback.screenResolution}</span>
                </div>
                <div className="feedback-detail-modal__system-row">
                  <span className="feedback-detail-modal__system-label">Sprache:</span>
                  <span className="feedback-detail-modal__system-value">{feedback.language}</span>
                </div>
                <div className="feedback-detail-modal__system-row">
                  <span className="feedback-detail-modal__system-label">Zeitzone:</span>
                  <span className="feedback-detail-modal__system-value">{feedback.timezone}</span>
                </div>
                <div className="feedback-detail-modal__system-row">
                  <span className="feedback-detail-modal__system-label">Gerät:</span>
                  <span className="feedback-detail-modal__system-value">{feedback.deviceType}</span>
                </div>
              </div>
            </div>

            {/* Jira info */}
            {feedback.jiraIssueKey && (
              <div className="feedback-detail-modal__section feedback-detail-modal__section--jira">
                <h3 className="feedback-detail-modal__section-title">Jira:</h3>
                <div className="feedback-detail-modal__jira-info" data-testid="feedback-detail-jira-info">
                  <a
                    href={feedback.jiraIssueUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="feedback-detail-modal__jira-link"
                  >
                    {feedback.jiraIssueKey}
                  </a>
                  {feedback.jiraCreatedAt && (
                    <span className="feedback-detail-modal__jira-date">
                      (erstellt am {formatFullDate(feedback.jiraCreatedAt)})
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Jira not configured warning */}
            {!jiraConfigured && !feedback.jiraIssueKey && (
              <div className="feedback-detail-modal__warning" data-testid="feedback-detail-jira-warning">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Jira ist nicht konfiguriert. Konfigurieren Sie Jira in den Einstellungen, um Tickets zu erstellen.</span>
              </div>
            )}
          </>
        )}
      </div>
    </ResponsiveModal>
  );
};

export default FeedbackDetailModal;
