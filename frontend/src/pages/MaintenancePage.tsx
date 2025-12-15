/**
 * Maintenance Page
 * STORY-034: Maintenance Mode
 *
 * Full-page display shown to users when maintenance mode is active.
 * Shows maintenance message, estimated time remaining, and refresh button.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MaintenanceStatus } from '../services/maintenanceService';

/**
 * Props for MaintenancePage component
 */
export interface MaintenancePageProps {
  info: MaintenanceStatus;
  onCheckStatus?: () => void;
}

/**
 * MaintenancePage Component
 *
 * Displays maintenance information to users when the app is in maintenance mode.
 */
export const MaintenancePage: React.FC<MaintenancePageProps> = ({
  info,
  onCheckStatus,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  /**
   * Calculate remaining time from estimated end time
   */
  const calculateTimeRemaining = useCallback((endTime: string): string => {
    const diff = new Date(endTime).getTime() - Date.now();
    if (diff <= 0) return 'Bald';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }, []);

  /**
   * Update countdown timer
   */
  useEffect(() => {
    if (!info.estimatedEndTime) {
      setTimeRemaining('');
      return;
    }

    // Initial calculation
    setTimeRemaining(calculateTimeRemaining(info.estimatedEndTime));

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining(info.estimatedEndTime!);
      setTimeRemaining(remaining);

      // Auto-refresh when timer reaches zero
      if (remaining === 'Bald') {
        clearInterval(interval);
        // Wait a bit and then check status
        setTimeout(() => {
          onCheckStatus?.();
        }, 5000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [info.estimatedEndTime, calculateTimeRemaining, onCheckStatus]);

  /**
   * Handle refresh button click
   */
  const handleRefresh = () => {
    if (onCheckStatus) {
      onCheckStatus();
    } else {
      window.location.reload();
    }
  };

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

  return (
    <div
      className="min-h-screen bg-neutral-100 flex items-center justify-center px-4"
      data-testid="maintenance-page"
    >
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Maintenance Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-yellow-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-neutral-900 mb-4">
          Wir sind bald zurueck!
        </h1>

        {/* Maintenance Message */}
        <p className="text-neutral-600 mb-6" data-testid="maintenance-message">
          {info.message}
        </p>

        {/* Time Remaining */}
        {info.estimatedEndTime && timeRemaining && (
          <div
            className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6"
            data-testid="estimated-time"
          >
            <p className="text-sm text-yellow-700 mb-1">
              Geschaetzte verbleibende Zeit:
            </p>
            <p className="text-2xl font-bold text-yellow-800">{timeRemaining}</p>
          </div>
        )}

        {/* Details */}
        <div className="text-sm text-neutral-500 space-y-2 mb-6">
          {info.startedAt && (
            <p>
              Wartung gestartet: <span className="font-medium">{formatDate(info.startedAt)}</span>
            </p>
          )}
          {info.estimatedEndTime && (
            <p>
              Erwartetes Ende: <span className="font-medium">{formatDate(info.estimatedEndTime)}</span>
            </p>
          )}
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
          data-testid="check-status-button"
        >
          Status ueberpruefen
        </button>

        {/* Footer */}
        <p className="mt-6 text-xs text-neutral-400">
          Diese Seite aktualisiert sich automatisch sobald die Wartung abgeschlossen ist.
        </p>
      </div>
    </div>
  );
};

export default MaintenancePage;
