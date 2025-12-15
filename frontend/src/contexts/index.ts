/**
 * Contexts Index
 * STORY-007B: Login System Frontend UI
 * STORY-016A: Context Menu Core Navigation
 * STORY-017B: Theme-System Frontend
 *
 * Exports all context providers and hooks.
 */

export {
  AuthContext,
  AuthProvider,
  useAuth,
  usePermission,
  type AuthContextState,
  type AuthProviderProps,
  type User,
} from './AuthContext';

export {
  ThemeContext,
  ThemeProvider,
  useTheme,
  useThemeColor,
  type ThemeContextState,
  type ThemeProviderProps,
} from './ThemeContext';

export {
  MaintenanceContext,
  MaintenanceProvider,
  useMaintenance,
  useIsMaintenanceMode,
  type MaintenanceContextState,
  type MaintenanceProviderProps,
} from './MaintenanceContext';

export {
  DarkModeContext,
  DarkModeProvider,
  useDarkMode,
  type DarkModeContextState,
  type DarkModeProviderProps,
} from './DarkModeContext';

export {
  LanguageContext,
  LanguageProvider,
  useLanguage,
  type LanguageContextState,
  type LanguageProviderProps,
  type Language,
} from './LanguageContext';
