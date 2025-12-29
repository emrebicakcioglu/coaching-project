/**
 * Dark Mode Context
 * Dark Mode Toggle Feature
 *
 * Provides dark mode state management throughout the application.
 * Loads preference from localStorage and switches between light/dark color schemes.
 *
 * @example
 * ```tsx
 * function DarkModeButton() {
 *   const { isDarkMode, toggleDarkMode, isLoading } = useDarkMode();
 *
 *   return (
 *     <button onClick={toggleDarkMode} disabled={isLoading}>
 *       {isDarkMode ? 'Light Mode' : 'Dark Mode'}
 *     </button>
 *   );
 * }
 * ```
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { themeService } from '../services/themeService';
import { designService } from '../services/designService';

/**
 * Dark mode context state interface
 */
export interface DarkModeContextState {
  /** Whether dark mode is currently active */
  isDarkMode: boolean;
  /** Whether a theme switch is in progress */
  isLoading: boolean;
  /** Whether both light and dark schemes are configured */
  isConfigured: boolean;
  /** Toggle between light and dark mode */
  toggleDarkMode: () => Promise<void>;
  /** Set dark mode explicitly */
  setDarkMode: (isDark: boolean) => Promise<void>;
  /** Error message if theme switch failed */
  error: string | null;
}

/**
 * Default context value
 */
const defaultContextValue: DarkModeContextState = {
  isDarkMode: false,
  isLoading: true,
  isConfigured: false,
  toggleDarkMode: async () => {
    throw new Error('DarkModeContext not initialized');
  },
  setDarkMode: async () => {
    throw new Error('DarkModeContext not initialized');
  },
  error: null,
};

/**
 * Dark Mode Context
 */
export const DarkModeContext = createContext<DarkModeContextState>(defaultContextValue);

/**
 * Dark Mode Provider Props
 */
export interface DarkModeProviderProps {
  children: React.ReactNode;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/**
 * Dark Mode Provider Component
 *
 * Wraps the application to provide dark mode state management.
 * Loads preference from localStorage on mount and applies the appropriate scheme.
 */
export const DarkModeProvider: React.FC<DarkModeProviderProps> = ({
  children,
  'data-testid': testId = 'dark-mode-provider',
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemeModes, setSchemeModes] = useState<{
    lightSchemeId: number | null;
    darkSchemeId: number | null;
  }>({ lightSchemeId: null, darkSchemeId: null });

  /**
   * Apply CSS class for dark mode (works without backend schemes)
   * IMPORTANT: This is the fallback that ensures dark mode always works,
   * even if backend schemes are not configured. This prevents the toggle
   * from disappearing or becoming non-functional.
   */
  const applyCssClass = useCallback((dark: boolean) => {
    const htmlElement = document.documentElement;
    if (dark) {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  }, []);

  /**
   * Load scheme modes and preference on mount
   * IMPORTANT: The toggle now ALWAYS works, even without backend schemes.
   * This prevents the recurring bug where the toggle disappears.
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load preference from localStorage first (always works)
        const preferDark = themeService.getDarkModePreference();
        setIsDarkMode(preferDark);

        // ALWAYS apply CSS class based on preference - this works without backend
        applyCssClass(preferDark);

        // Check if user has an access token (likely authenticated)
        const hasToken = !!localStorage.getItem('access_token');

        if (hasToken) {
          try {
            // Load scheme mode assignments
            const modes = await designService.getSchemeModes();
            setSchemeModes(modes);

            // Check if both modes are configured
            const configured = modes.lightSchemeId !== null && modes.darkSchemeId !== null;
            setIsConfigured(configured);

            // If configured, apply the appropriate backend scheme
            if (configured && preferDark && modes.darkSchemeId) {
              await designService.applyScheme(modes.darkSchemeId);
              window.dispatchEvent(new CustomEvent('theme-changed'));
            } else if (configured && !preferDark && modes.lightSchemeId) {
              await designService.applyScheme(modes.lightSchemeId);
              window.dispatchEvent(new CustomEvent('theme-changed'));
            }
          } catch (err) {
            // API call failed - but CSS class is already applied, toggle still works
            console.warn('Failed to load scheme modes (possibly not authenticated):', err);
            setIsConfigured(false);
          }
        } else {
          // Not authenticated - toggle still works with CSS class fallback
          setIsConfigured(false);
        }
      } catch (err) {
        console.error('Failed to initialize dark mode:', err);
        setError('Failed to initialize dark mode settings');
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [applyCssClass]);

  /**
   * Apply a specific mode
   * IMPORTANT: This now always works - even without backend schemes configured.
   * If schemes are available, they are applied. Otherwise, only CSS class is toggled.
   * This prevents the recurring bug where the toggle stops working.
   */
  const applyMode = useCallback(
    async (dark: boolean) => {
      setIsLoading(true);
      setError(null);

      try {
        // Always apply CSS class and save preference - this works without backend
        applyCssClass(dark);
        setIsDarkMode(dark);
        themeService.setDarkModePreference(dark);

        // If schemes are configured, also apply the backend scheme
        if (isConfigured) {
          const schemeId = dark ? schemeModes.darkSchemeId : schemeModes.lightSchemeId;
          if (schemeId) {
            await designService.applyScheme(schemeId);
          }
        }

        window.dispatchEvent(new CustomEvent('theme-changed'));
      } catch (err) {
        console.error('Failed to apply theme:', err);
        setError(`Failed to switch to ${dark ? 'dark' : 'light'} mode`);
        // Even if backend fails, the CSS class and localStorage are already applied
      } finally {
        setIsLoading(false);
      }
    },
    [isConfigured, schemeModes, applyCssClass]
  );

  /**
   * Toggle dark mode
   */
  const toggleDarkMode = useCallback(async () => {
    await applyMode(!isDarkMode);
  }, [applyMode, isDarkMode]);

  /**
   * Set dark mode explicitly
   */
  const setDarkModeValue = useCallback(
    async (isDark: boolean) => {
      if (isDark !== isDarkMode) {
        await applyMode(isDark);
      }
    },
    [applyMode, isDarkMode]
  );

  /**
   * Listen for scheme mode changes from Design System page
   */
  useEffect(() => {
    const handleSchemeModeChanged = async () => {
      try {
        const modes = await designService.getSchemeModes();
        setSchemeModes(modes);
        setIsConfigured(modes.lightSchemeId !== null && modes.darkSchemeId !== null);
      } catch (err) {
        console.error('Failed to refresh scheme modes:', err);
      }
    };

    window.addEventListener('scheme-modes-changed', handleSchemeModeChanged);
    return () => {
      window.removeEventListener('scheme-modes-changed', handleSchemeModeChanged);
    };
  }, []);

  /**
   * Memoized context value
   */
  const contextValue = useMemo<DarkModeContextState>(
    () => ({
      isDarkMode,
      isLoading,
      isConfigured,
      toggleDarkMode,
      setDarkMode: setDarkModeValue,
      error,
    }),
    [isDarkMode, isLoading, isConfigured, toggleDarkMode, setDarkModeValue, error]
  );

  return (
    <DarkModeContext.Provider value={contextValue}>
      <div data-testid={testId}>{children}</div>
    </DarkModeContext.Provider>
  );
};

/**
 * Hook to access dark mode context
 *
 * @throws Error if used outside DarkModeProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isDarkMode, toggleDarkMode } = useDarkMode();
 *   return (
 *     <button onClick={toggleDarkMode}>
 *       {isDarkMode ? 'Switch to Light' : 'Switch to Dark'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useDarkMode(): DarkModeContextState {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
}

export default DarkModeContext;
