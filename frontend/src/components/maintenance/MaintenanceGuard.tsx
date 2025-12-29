/**
 * Maintenance Guard Component
 * STORY-034: Maintenance Mode
 *
 * Wrapper component that checks maintenance status and shows
 * maintenance page if mode is active and user is not an admin.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts';
import { maintenanceService, MaintenanceStatus } from '../../services/maintenanceService';
import { MaintenancePage } from '../../pages/MaintenancePage';
import { logger } from '../../services/loggerService';

/**
 * Props for MaintenanceGuard component
 */
interface MaintenanceGuardProps {
  children: React.ReactNode;
}

/**
 * MaintenanceGuard Component
 *
 * Checks maintenance status on mount and periodically.
 * Shows MaintenancePage if maintenance is active and user is not admin.
 * Admin users see a warning banner but can still use the app.
 */
export const MaintenanceGuard: React.FC<MaintenanceGuardProps> = ({ children }) => {
  const { isAuthenticated, hasPermission, isLoading: authLoading } = useAuth();
  const [maintenanceStatus, setMaintenanceStatus] = useState<MaintenanceStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [showAdminBanner, setShowAdminBanner] = useState(false);

  // Check if user is admin (can bypass maintenance)
  const isAdmin = hasPermission('settings.update') || hasPermission('admin.*');

  /**
   * Check maintenance status
   */
  const checkMaintenanceStatus = useCallback(async () => {
    try {
      setIsChecking(true);
      const status = await maintenanceService.getMaintenanceStatus();
      setMaintenanceStatus(status);

      // Show admin banner if maintenance is active and user is admin
      if (status.enabled && isAdmin) {
        setShowAdminBanner(true);
      } else {
        setShowAdminBanner(false);
      }
    } catch (error) {
      // On error, assume no maintenance to not block users
      logger.error('Failed to check maintenance status', error);
      setMaintenanceStatus(null);
      setShowAdminBanner(false);
    } finally {
      setIsChecking(false);
    }
  }, [isAdmin]);

  /**
   * Check on mount and set up interval
   */
  useEffect(() => {
    // Don't check during auth loading
    if (authLoading) return;

    checkMaintenanceStatus();

    // Check every 5 minutes to reduce unnecessary re-renders
    const interval = setInterval(checkMaintenanceStatus, 300000);

    return () => clearInterval(interval);
  }, [checkMaintenanceStatus, authLoading]);

  /**
   * Re-check when auth state changes
   */
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      checkMaintenanceStatus();
    }
  }, [isAuthenticated, authLoading, checkMaintenanceStatus]);

  // Still loading
  if (authLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  // Show maintenance page for non-admin users
  if (maintenanceStatus?.enabled && !isAdmin && !isAuthenticated) {
    return (
      <MaintenancePage
        info={maintenanceStatus}
        onCheckStatus={checkMaintenanceStatus}
      />
    );
  }

  // Show maintenance page for authenticated non-admin users
  if (maintenanceStatus?.enabled && isAuthenticated && !isAdmin) {
    return (
      <MaintenancePage
        info={maintenanceStatus}
        onCheckStatus={checkMaintenanceStatus}
      />
    );
  }

  // Show app with admin banner if maintenance is active
  return (
    <>
      {showAdminBanner && maintenanceStatus && (
        <div className="bg-yellow-500 text-white px-4 py-2 text-center text-sm font-medium">
          <span className="mr-2">Wartungsmodus aktiv</span>
          <span className="text-yellow-100">
            - Nur fuer Administratoren sichtbar. Normale Benutzer sehen die Wartungsseite.
          </span>
        </div>
      )}
      {children}
    </>
  );
};

export default MaintenanceGuard;
