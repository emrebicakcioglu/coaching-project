/**
 * Language Context
 * Multi-Language Support
 *
 * Provides language state management throughout the application.
 * Integrates with react-i18next and syncs with user preferences API.
 *
 * @example
 * ```tsx
 * function LanguageSelector() {
 *   const { currentLanguage, languages, changeLanguage } = useLanguage();
 *
 *   return (
 *     <select value={currentLanguage} onChange={e => changeLanguage(e.target.value)}>
 *       {languages.map(lang => (
 *         <option key={lang.code} value={lang.code}>
 *           {lang.emoji_flag} {lang.native_name}
 *         </option>
 *       ))}
 *     </select>
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
import { useTranslation } from 'react-i18next';
import { changeLanguage as i18nChangeLanguage, getCurrentLanguage } from '../i18n';
import { logger } from '../services/loggerService';

/**
 * Language metadata interface
 */
export interface Language {
  id: number;
  code: string;
  name: string;
  native_name: string;
  emoji_flag: string;
  is_default: boolean;
  is_active: boolean;
}

/**
 * Language context state interface
 */
export interface LanguageContextState {
  /** Current language code */
  currentLanguage: string;
  /** Available languages */
  languages: Language[];
  /** Whether languages are loading */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Change the current language */
  changeLanguage: (code: string) => Promise<void>;
  /** Reload available languages */
  reloadLanguages: () => Promise<void>;
  /** Get current language metadata */
  getCurrentLanguageData: () => Language | undefined;
}

/**
 * Default context value
 */
const defaultContextValue: LanguageContextState = {
  currentLanguage: 'de',
  languages: [],
  isLoading: true,
  error: null,
  changeLanguage: async () => {
    throw new Error('LanguageContext not initialized');
  },
  reloadLanguages: async () => {
    throw new Error('LanguageContext not initialized');
  },
  getCurrentLanguageData: () => undefined,
};

/**
 * Language Context
 */
export const LanguageContext = createContext<LanguageContextState>(defaultContextValue);

/**
 * Language Provider Props
 */
export interface LanguageProviderProps {
  children: React.ReactNode;
}

// API base URL - ensure we don't double the /api/v1 prefix
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:14102/api/v1';
const API_BASE_URL = BASE_URL.replace(/\/api\/v1\/?$/, '');

/**
 * Language Provider Component
 *
 * Wraps the application to provide language state management.
 * Loads available languages from the API and syncs with i18next.
 */
export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage());
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load available languages from API
   */
  const loadLanguages = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/v1/languages`);
      if (!response.ok) {
        throw new Error('Failed to load languages');
      }

      const data = await response.json();
      setLanguages(data);
    } catch (err) {
      logger.error('Failed to load languages', err);
      setError('Failed to load available languages');
      // Set default languages as fallback
      setLanguages([
        {
          id: 1,
          code: 'de',
          name: 'German',
          native_name: 'Deutsch',
          emoji_flag: '🇩🇪',
          is_default: true,
          is_active: true,
        },
        {
          id: 2,
          code: 'en',
          name: 'English',
          native_name: 'English',
          emoji_flag: '🇬🇧',
          is_default: false,
          is_active: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    loadLanguages();
  }, [loadLanguages]);

  /**
   * Sync with i18next language changes
   */
  useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLanguage(i18n.language);
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  /**
   * Change the current language
   */
  const handleChangeLanguage = useCallback(async (code: string) => {
    try {
      setIsLoading(true);
      await i18nChangeLanguage(code);
      setCurrentLanguage(code);
    } catch (err) {
      logger.error('Failed to change language', err);
      setError('Failed to change language');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get current language metadata
   */
  const getCurrentLanguageData = useCallback(() => {
    return languages.find(lang => lang.code === currentLanguage);
  }, [languages, currentLanguage]);

  /**
   * Memoized context value
   */
  const contextValue = useMemo<LanguageContextState>(
    () => ({
      currentLanguage,
      languages,
      isLoading,
      error,
      changeLanguage: handleChangeLanguage,
      reloadLanguages: loadLanguages,
      getCurrentLanguageData,
    }),
    [currentLanguage, languages, isLoading, error, handleChangeLanguage, loadLanguages, getCurrentLanguageData]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

/**
 * Hook to access language context
 *
 * @throws Error if used outside LanguageProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { currentLanguage, changeLanguage } = useLanguage();
 *   return (
 *     <button onClick={() => changeLanguage('en')}>
 *       Switch to English
 *     </button>
 *   );
 * }
 * ```
 */
export function useLanguage(): LanguageContextState {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageContext;
