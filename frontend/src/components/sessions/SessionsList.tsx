/**
 * SessionsList Component
 * STORY-008: Session Management mit "Remember Me"
 *
 * Displays a list of active sessions with the ability to terminate them.
 */

import React from 'react';
import { SessionItem, Session } from './SessionItem';

export interface SessionsListProps {
  sessions: Session[];
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
  onTerminateSession,
  onTerminateAll,
  isLoading = false,
  error = null,
}) => {
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
        <div className="sessions-list__spinner" aria-label="Laden...">
          <span className="spinner" />
        </div>
        <p>Sessions werden geladen...</p>
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
        <p>Keine aktiven Sessions gefunden.</p>
      </div>
    );
  }

  const otherSessions = sessions.filter((s) => !s.current);

  return (
    <div className="sessions-list">
      <div className="sessions-list__header">
        <h2 className="sessions-list__title">Aktive Sessions</h2>
        <p className="sessions-list__subtitle">
          {sessions.length} {sessions.length === 1 ? 'aktive Session' : 'aktive Sessions'}
        </p>
      </div>

      <div className="sessions-list__items" role="list">
        {sessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
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
            {isTerminatingAll ? 'Wird beendet...' : 'Alle Geräte abmelden'}
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
              Alle Geräte abmelden?
            </h3>
            <p className="confirm-dialog__message">
              Sie werden auf allen anderen Geräten abgemeldet. Diese Aktion kann
              nicht rückgängig gemacht werden.
            </p>
            <div className="confirm-dialog__actions">
              <button
                type="button"
                className="confirm-dialog__cancel-btn"
                onClick={handleCancelDialog}
                disabled={isTerminatingAll}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="confirm-dialog__confirm-btn confirm-btn"
                onClick={handleConfirmTerminateAll}
                disabled={isTerminatingAll}
              >
                {isTerminatingAll ? 'Wird beendet...' : 'Ja, alle abmelden'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionsList;
