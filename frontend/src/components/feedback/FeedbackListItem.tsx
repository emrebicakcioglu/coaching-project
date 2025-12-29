/**
 * FeedbackListItem Component
 * STORY-041H: Feedback Admin Page
 *
 * Displays a single feedback item in the admin list.
 * Shows thumbnail, user info, comment preview, date, and action buttons.
 *
 * @example
 * ```tsx
 * <FeedbackListItem
 *   feedback={feedbackItem}
 *   onView={() => handleView(feedbackItem)}
 *   onDelete={() => handleDelete(feedbackItem)}
 *   onCreateJira={() => handleJira(feedbackItem)}
 *   jiraConfigured={true}
 * />
 * ```
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../ui';
import { feedbackAdminService, FeedbackListItem as FeedbackListItemType } from '../../services/feedbackAdminService';
import './FeedbackListItem.css';

/**
 * Props for FeedbackListItem component
 */
export interface FeedbackListItemProps {
  /** Feedback data to display */
  feedback: FeedbackListItemType;
  /** Callback when view button is clicked */
  onView: () => void;
  /** Callback when delete button is clicked */
  onDelete: () => void;
  /** Callback when Jira button is clicked */
  onCreateJira: () => void;
  /** Whether Jira is configured */
  jiraConfigured: boolean;
}

/**
 * Format date for display
 */
const formatDate = (dateString: string): { date: string; time: string } => {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    }),
    time: date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
};

/**
 * FeedbackListItem Component
 */
export const FeedbackListItem: React.FC<FeedbackListItemProps> = ({
  feedback,
  onView,
  onDelete,
  onCreateJira,
  jiraConfigured,
}) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [thumbnailLoading, setThumbnailLoading] = useState(true);
  const formattedDate = formatDate(feedback.createdAt);

  useEffect(() => {
    if (feedback.hasScreenshot) {
      setThumbnailLoading(true);
      feedbackAdminService
        .getThumbnailUrl(feedback.id)
        .then((url) => {
          setThumbnailUrl(url);
        })
        .catch(() => {
          setThumbnailUrl('');
        })
        .finally(() => {
          setThumbnailLoading(false);
        });
    } else {
      setThumbnailLoading(false);
    }
  }, [feedback.id, feedback.hasScreenshot]);

  return (
    <tr className="feedback-list-item" data-testid={`feedback-row-${feedback.id}`}>
      {/* Thumbnail */}
      <td className="feedback-list-item__cell feedback-list-item__cell--thumbnail">
        <div className="feedback-list-item__thumbnail-container">
          {thumbnailLoading ? (
            <div className="feedback-list-item__thumbnail-loading" aria-label="Lade Vorschau...">
              <svg className="feedback-list-item__loading-spinner" viewBox="0 0 24 24" aria-hidden="true">
                <circle
                  className="feedback-list-item__loading-circle"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </div>
          ) : thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt="Screenshot Vorschau"
              className="feedback-list-item__thumbnail"
              loading="lazy"
              data-testid={`feedback-thumbnail-${feedback.id}`}
            />
          ) : (
            <div className="feedback-list-item__thumbnail-placeholder" aria-label="Kein Screenshot">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                <path d="M21 15l-5-5L5 21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>
      </td>

      {/* User Info */}
      <td className="feedback-list-item__cell feedback-list-item__cell--user">
        <div className="feedback-list-item__user">
          <span className="feedback-list-item__user-name" data-testid={`feedback-user-name-${feedback.id}`}>
            {feedback.userName}
          </span>
          <span className="feedback-list-item__user-email" data-testid={`feedback-user-email-${feedback.id}`}>
            {feedback.userEmail}
          </span>
        </div>
      </td>

      {/* Comment Preview */}
      <td className="feedback-list-item__cell feedback-list-item__cell--comment">
        <span className="feedback-list-item__comment" data-testid={`feedback-comment-${feedback.id}`}>
          {feedback.commentPreview}
        </span>
        {feedback.jiraIssueKey && (
          <a
            href={feedback.jiraIssueUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="feedback-list-item__jira-badge"
            data-testid={`feedback-jira-badge-${feedback.id}`}
          >
            {feedback.jiraIssueKey}
          </a>
        )}
      </td>

      {/* Date */}
      <td className="feedback-list-item__cell feedback-list-item__cell--date">
        <div className="feedback-list-item__date">
          <span className="feedback-list-item__date-day">{formattedDate.date}</span>
          <span className="feedback-list-item__date-time">{formattedDate.time}</span>
        </div>
      </td>

      {/* Actions */}
      <td className="feedback-list-item__cell feedback-list-item__cell--actions">
        <div className="feedback-list-item__actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={onView}
            title="Details anzeigen"
            aria-label="Details anzeigen"
            data-testid={`feedback-view-${feedback.id}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="feedback-list-item__action-icon" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="3" strokeWidth="2" />
            </svg>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            title="Löschen"
            aria-label="Löschen"
            data-testid={`feedback-delete-${feedback.id}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="feedback-list-item__action-icon" aria-hidden="true">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreateJira}
            title={jiraConfigured ? 'Jira Ticket erstellen' : 'Jira nicht konfiguriert'}
            aria-label={jiraConfigured ? 'Jira Ticket erstellen' : 'Jira nicht konfiguriert'}
            disabled={!jiraConfigured || !!feedback.jiraIssueKey}
            data-testid={`feedback-jira-${feedback.id}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="feedback-list-item__action-icon" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Button>
        </div>
      </td>
    </tr>
  );
};

export default FeedbackListItem;
