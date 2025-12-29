/**
 * SessionsPage Component
 * STORY-008: Session Management mit "Remember Me"
 *
 * Page component for displaying and managing user sessions.
 * Located at /settings/sessions in the application.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Container } from '../components/layout';
import { SessionsList } from '../components/sessions/SessionsList';
import { Session } from '../components/sessions/SessionItem';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import '../components/sessions/Sessions.css';

/**
 * SessionsPage Component
 */
export const SessionsPage: React.FC = () => {
  const { t } = useTranslation('sessions');
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch sessions from the API
   */
  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.getSessions();
      setSessions(response.sessions);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t('error');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Terminate a single session
   */
  const handleTerminateSession = useCallback(async (sessionId: number) => {
    try {
      await authService.terminateSession(sessionId);
      // Remove the session from the list
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t('terminateError');
      setError(message);
      throw err;
    }
  }, [t]);

  /**
   * Terminate all sessions except current
   */
  const handleTerminateAll = useCallback(async () => {
    try {
      await authService.terminateAllSessions({ keepCurrent: true });
      // Keep only the current session
      setSessions((prev) => prev.filter((s) => s.current));
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t('terminateAllError');
      setError(message);
      throw err;
    }
  }, [t]);

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return (
    <Container className="py-8">
      <div className="page-header">
        <h1 className="page-title">{t('title')}</h1>
        <p className="page-subtitle">
          {t('description')}
        </p>
      </div>

      <SessionsList
        sessions={sessions}
        username={user?.name}
        onTerminateSession={handleTerminateSession}
        onTerminateAll={handleTerminateAll}
        isLoading={isLoading}
        error={error}
      />

      {!isLoading && !error && sessions.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>{t('securityTip.label')}</strong> {t('securityTip.text')}
          </p>
        </div>
      )}
    </Container>
  );
};

export default SessionsPage;
