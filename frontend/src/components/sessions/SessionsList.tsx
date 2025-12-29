/**
 * SessionsList Component
 * STORY-008: Session Management mit "Remember Me"
 * STORY-002-004: Sessions Page - i18n Support
 *
 * Displays a list of active sessions with the ability to terminate them.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { SessionItem, Session } from './SessionItem';

export interface SessionsListProps {
  sessions: Session[];
  username?: string;
  onTerminateSession: (sessionId: number) => Promise<void>;
  onTerminateAll: () => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

/**
 * SessionsList Component
 */
export const SessionsList: React.FC<SessionsListProps> = ({
  sessions,
  username,
  onTerminateSession,
  onTerminateAll,
  isLoading = false,
  error = null,
}) => {
  const { t } = useTranslation('sessions');
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [isTerminatingAll, setIsTerminatingAll] = React.useState(false);

  const handleTerminateAllClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmTerminateAll = async () => {
    setIsTerminatingAll(true);
    try {
      await onTerminateAll();
      setShowConfirmDialog(false);
    } finally {
      setIsTerminatingAll(false);
    }
  };

  const handleCancelDialog = () => {
    setShowConfirmDialog(false);
  };

  if (isLoading) {
    return (
      <div className="sessions-list sessions-list--loading">
        <div className="sessions-list__spinner" aria-label={t('list.loading')}>
          <span className="spinner" />
        </div>
        <p>{t('list.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sessions-list sessions-list--error" role="alert">
        <p className="sessions-list__error-message">{error}</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="sessions-list sessions-list--empty">
        <p>{t('list.empty')}</p>
      </div>
    );
  }

  const otherSessions = sessions.filter((s) => !s.current);

  return (
    <div className="sessions-list">
      <div className="sessions-list__header">
        <h2 className="sessions-list__title">{t('list.title')}</h2>
        <p className="sessions-list__subtitle">
          {t('list.count', { count: sessions.length })}
        </p>
      </div>

      <div className="sessions-list__items" role="list">
        {sessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            username={username}
            onTerminate={onTerminateSession}
            disabled={isLoading || isTerminatingAll}
          />
        ))}
      </div>

      {otherSessions.length > 0 && (
        <div className="sessions-list__actions">
          <button
            type="button"
            className="sessions-list__logout-all-btn"
            onClick={handleTerminateAllClick}
            disabled={isLoading || isTerminatingAll}
            id="logout-all-btn"
          >
            {isTerminatingAll ? t('list.terminating') : t('list.logoutAll')}
          </button>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div
          className="confirm-dialog-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div className="confirm-dialog">
            <h3 id="confirm-dialog-title" className="confirm-dialog__title">
              {t('dialog.title')}
            </h3>
            <p className="confirm-dialog__message">
              {t('dialog.message')}
            </p>
            <div className="confirm-dialog__actions">
              <button
                type="button"
                className="confirm-dialog__cancel-btn"
                onClick={handleCancelDialog}
                disabled={isTerminatingAll}
              >
                {t('dialog.cancel')}
              </button>
              <button
                type="button"
                className="confirm-dialog__confirm-btn confirm-btn"
                onClick={handleConfirmTerminateAll}
                disabled={isTerminatingAll}
              >
                {isTerminatingAll ? t('list.terminating') : t('dialog.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionsList;
