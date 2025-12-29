/**
 * SessionItem Component
 * STORY-008: Session Management mit "Remember Me"
 * STORY-002-004: Sessions Page - i18n Support
 *
 * Displays a single session row in the sessions list.
 * Shows device, browser, IP, location, and last activity.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  username?: string;
  onTerminate: (sessionId: number) => Promise<void>;
  disabled?: boolean;
}

/**
 * Format date to human-readable relative time using i18n
 * @param dateString - ISO date string
 * @param t - Translation function from useTranslation hook
 * @param language - Current language code for date formatting
 */
const formatRelativeTime = (
  dateString: string,
  t: (key: string, options?: Record<string, unknown>) => string,
  language: string
): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return t('item.justNow');
  if (diffMins < 60) return t('item.minutesAgo', { count: diffMins });
  if (diffHours < 24) return t('item.hoursAgo', { count: diffHours });
  if (diffDays < 7) return t('item.daysAgo', { count: diffDays });

  // Use locale-appropriate date format
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  return date.toLocaleDateString(locale, {
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
  username,
  onTerminate,
  disabled = false,
}) => {
  const { t, i18n } = useTranslation('sessions');
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
              {t('item.currentBrowser')}
            </span>
          )}
        </div>
        <div className="session-item__details">
          {username && (
            <>
              <span className="session-item__username">{username}</span>
              <span className="session-item__separator">•</span>
            </>
          )}
          <span className="session-item__ip">{session.ip}</span>
          {session.location && (
            <>
              <span className="session-item__separator">•</span>
              <span className="session-item__location">{session.location}</span>
            </>
          )}
        </div>
        <div className="session-item__details session-item__activity-row">
          <span>{t('item.lastActivity')} {formatRelativeTime(session.lastActivity, t, i18n.language)}</span>
        </div>
      </div>

      <div className="session-item__actions">
        {!session.current && (
          <button
            type="button"
            className="session-item__logout-btn"
            onClick={handleTerminate}
            disabled={disabled || isTerminating}
            aria-label={t('item.terminateAriaLabel', { device: session.device })}
          >
            {isTerminating ? t('item.terminating') : t('item.logout')}
          </button>
        )}
      </div>
    </div>
  );
};

export default SessionItem;
