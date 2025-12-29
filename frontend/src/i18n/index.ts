/**
 * i18n Configuration
 * Multi-Language Support
 *
 * Configures react-i18next for internationalization.
 * Loads translations from the backend API.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

// Get API base URL - ensure we don't double the /api/v1 prefix
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:14102/api/v1';
const API_BASE_URL = BASE_URL.replace(/\/api\/v1\/?$/, '');

/**
 * Initialize i18next
 */
i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    // Default language is German
    lng: localStorage.getItem('language') || 'de',

    // Fallback language
    fallbackLng: 'de',

    // Namespaces
    ns: ['common', 'navigation', 'validation', 'errors', 'auth', 'dashboard', 'settings', 'help'],
    defaultNS: 'common',

    // Backend configuration - load from API
    backend: {
      loadPath: `${API_BASE_URL}/api/v1/languages/{{lng}}/translations/{{ns}}`,
      parse: (data: string) => {
        try {
          const parsed = JSON.parse(data);
          // API returns { language, namespace, translations }
          return parsed.translations || parsed;
        } catch {
          return {};
        }
      },
    },

    // Interpolation settings
    interpolation: {
      escapeValue: false, // React already escapes
    },

    // Key handling
    keySeparator: '.',
    nsSeparator: ':',

    // Return key when translation is missing
    returnEmptyString: false,
    returnNull: false,

    // Debug mode in development
    debug: import.meta.env.DEV,

    // React settings - disable Suspense to prevent focus loss during re-renders
    react: {
      useSuspense: false,
    },
  });

/**
 * Change the current language
 */
export const changeLanguage = async (languageCode: string): Promise<void> => {
  await i18n.changeLanguage(languageCode);
  localStorage.setItem('language', languageCode);
  // Dispatch event for other components to react
  window.dispatchEvent(new CustomEvent('language-changed', { detail: languageCode }));
};

/**
 * Get the current language code
 */
export const getCurrentLanguage = (): string => {
  return i18n.language || 'de';
};

/**
 * Get all loaded namespaces
 */
export const getLoadedNamespaces = (): string[] => {
  return i18n.options.ns as string[] || [];
};

/**
 * Reload translations (useful after editing)
 */
export const reloadTranslations = async (): Promise<void> => {
  await i18n.reloadResources();
};

export default i18n;
