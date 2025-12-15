/**
 * SessionItem Component
 * STORY-008: Session Management mit "Remember Me"
 *
 * Displays a single session row in the sessions list.
 * Shows device, browser, IP, location, and last activity.
 */

import React, { useState } from 'react';

export interface Session {
  id: number;
  device: string;
  browser: string;
  ip: string;
  location: string | null;
  lastActivity: string;
  createdAt: string;
  current: boolean;
}

export interface SessionItemProps {
  session: Session;
  onTerminate: (sessionId: number) => Promise<void>;
  disabled?: boolean;
}

/**
 * Format date to human-readable relative time
 */
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Gerade eben';
  if (diffMins < 60) return `Vor ${diffMins} Minuten`;
  if (diffHours < 24) return `Vor ${diffHours} Stunden`;
  if (diffDays < 7) return `Vor ${diffDays} Tagen`;

  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Get device icon based on device string
 */
const getDeviceIcon = (device: string): string => {
  const deviceLower = device.toLowerCase();
  if (deviceLower.includes('iphone') || deviceLower.includes('android')) {
    return '📱';
  }
  if (deviceLower.includes('ipad') || deviceLower.includes('tablet')) {
    return '📱';
  }
  if (deviceLower.includes('mac')) {
    return '💻';
  }
  if (deviceLower.includes('windows')) {
    return '🖥️';
  }
  if (deviceLower.includes('linux')) {
    return '🐧';
  }
  return '💻';
};

/**
 * SessionItem Component
 */
export const SessionItem: React.FC<SessionItemProps> = ({
  session,
  onTerminate,
  disabled = false,
}) => {
  const [isTerminating, setIsTerminating] = useState(false);

  const handleTerminate = async () => {
    if (disabled || isTerminating || session.current) return;

    setIsTerminating(true);
    try {
      await onTerminate(session.id);
    } finally {
      setIsTerminating(false);
    }
  };

  return (
    <div
      className={`session-item ${session.current ? 'session-item--current' : ''}`}
      role="row"
    >
      <div className="session-item__icon" aria-hidden="true">
        {getDeviceIcon(session.device)}
      </div>

      <div className="session-item__info">
        <div className="session-item__device">
          {session.device}
          {session.current && (
            <span className="session-item__current-badge">
              Dieser Browser
            </span>
          )}
        </div>
        <div className="session-item__details">
          <span className="session-item__ip">{session.ip}</span>
          {session.location && (
            <>
              <span className="session-item__separator">•</span>
              <span className="session-item__location">{session.location}</span>
            </>
          )}
        </div>
        <div className="session-item__activity">
          Letzte Aktivität: {formatRelativeTime(session.lastActivity)}
        </div>
      </div>

      <div className="session-item__actions">
        {!session.current && (
          <button
            type="button"
            className="session-item__logout-btn"
            onClick={handleTerminate}
            disabled={disabled || isTerminating}
            aria-label={`Session auf ${session.device} beenden`}
          >
            {isTerminating ? 'Wird beendet...' : 'Abmelden'}
          </button>
        )}
      </div>
    </div>
  );
};

export default SessionItem;
