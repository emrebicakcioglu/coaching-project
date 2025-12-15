/**
 * Maintenance Context
 * STORY-034: Maintenance Mode
 *
 * Provides maintenance mode state and status checking throughout the application.
 * Periodically checks maintenance status and triggers rerender when mode changes.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  maintenanceService,
  MaintenanceStatus,
} from '../services/maintenanceService';

/**
 * Maintenance context state
 */
export interface MaintenanceContextState {
  /** Whether maintenance mode is active */
  isMaintenanceMode: boolean;
  /** Current maintenance status info */
  maintenanceInfo: MaintenanceStatus | null;
  /** Whether we're currently checking status */
  isChecking: boolean;
  /** Check maintenance status manually */
  checkMaintenanceStatus: () => Promise<void>;
  /** Last error if any */
  error: Error | null;
}

/**
 * Default context value
 */
const defaultContextValue: MaintenanceContextState = {
  isMaintenanceMode: false,
  maintenanceInfo: null,
  isChecking: true,
  checkMaintenanceStatus: async () => {},
  error: null,
};

/**
 * Maintenance Context
 */
export const MaintenanceContext =
  createContext<MaintenanceContextState>(defaultContextValue);

/**
 * Maintenance Provider Props
 */
export interface MaintenanceProviderProps {
  children: React.ReactNode;
  /** Check interval in milliseconds (default: 60000 = 1 minute) */
  checkInterval?: number;
  /** Whether to skip maintenance check for this user (e.g., admin) */
  skipCheck?: boolean;
}

/**
 * Default maintenance status
 */
const DEFAULT_MAINTENANCE_STATUS: MaintenanceStatus = {
  enabled: false,
  message: 'We are currently performing scheduled maintenance. Please check back soon.',
  estimatedEndTime: null,
  startedAt: null,
};

/**
 * Maintenance Provider Component
 *
 * Wraps the application to provide maintenance status checking.
 * Periodically polls the maintenance endpoint to detect mode changes.
 */
export const MaintenanceProvider: React.FC<MaintenanceProviderProps> = ({
  children,
  checkInterval = 60000, // 1 minute default
  skipCheck = false,
}) => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceInfo, setMaintenanceInfo] = useState<MaintenanceStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Check maintenance status
   */
  const checkMaintenanceStatus = useCallback(async () => {
    if (skipCheck) {
      setIsMaintenanceMode(false);
      setMaintenanceInfo(null);
      setIsChecking(false);
      return;
    }

    try {
      setIsChecking(true);
      setError(null);

      const status = await maintenanceService.getMaintenanceStatus();
      setMaintenanceInfo(status);
      setIsMaintenanceMode(status.enabled);
    } catch (err) {
      // On error, assume maintenance mode is off to not block users
      console.error('Failed to check maintenance status:', err);
      setError(err instanceof Error ? err : new Error('Failed to check maintenance status'));
      setMaintenanceInfo(DEFAULT_MAINTENANCE_STATUS);
      setIsMaintenanceMode(false);
    } finally {
      setIsChecking(false);
    }
  }, [skipCheck]);

  /**
   * Initial check and interval setup
   */
  useEffect(() => {
    // Initial check
    checkMaintenanceStatus();

    // Set up polling interval
    const interval = setInterval(checkMaintenanceStatus, checkInterval);

    return () => clearInterval(interval);
  }, [checkMaintenanceStatus, checkInterval]);

  /**
   * Memoized context value
   */
  const contextValue = useMemo<MaintenanceContextState>(
    () => ({
      isMaintenanceMode,
      maintenanceInfo,
      isChecking,
      checkMaintenanceStatus,
      error,
    }),
    [isMaintenanceMode, maintenanceInfo, isChecking, checkMaintenanceStatus, error]
  );

  return (
    <MaintenanceContext.Provider value={contextValue}>
      {children}
    </MaintenanceContext.Provider>
  );
};

/**
 * Hook to access maintenance context
 *
 * @throws Error if used outside MaintenanceProvider
 */
export function useMaintenance(): MaintenanceContextState {
  const context = useContext(MaintenanceContext);
  if (!context) {
    throw new Error('useMaintenance must be used within a MaintenanceProvider');
  }
  return context;
}

/**
 * Hook to check if maintenance mode is active
 *
 * @returns boolean indicating if maintenance mode is active
 */
export function useIsMaintenanceMode(): boolean {
  const { isMaintenanceMode } = useMaintenance();
  return isMaintenanceMode;
}

export default MaintenanceContext;
