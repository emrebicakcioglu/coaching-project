/**
 * Language Selector Component
 * Multi-Language Support
 *
 * Dropdown selector for switching between available languages.
 * Shows flag emoji and language name, integrates with LanguageContext.
 *
 * @example
 * ```tsx
 * // Icon only (for mobile header)
 * <LanguageSelector variant="icon" />
 *
 * // Full with label (for desktop sidebar)
 * <LanguageSelector variant="full" />
 * ```
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';
import { GlobeIcon, ChevronDownIcon } from '../icons/Icons';

/**
 * Language Selector Props
 */
export interface LanguageSelectorProps {
  /** Display variant: icon-only or full with label */
  variant: 'icon' | 'full';
  /** Additional CSS classes */
  className?: string;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/**
 * Language Selector Component
 *
 * Dropdown that allows users to switch between available languages.
 */
export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant,
  className = '',
  'data-testid': testId = 'language-selector',
}) => {
  const { t } = useTranslation('navigation');
  const { currentLanguage, languages, isLoading, changeLanguage, getCurrentLanguageData } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = getCurrentLanguageData();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleLanguageChange = async (code: string) => {
    await changeLanguage(code);
    setIsOpen(false);
  };

  const activeLanguages = languages.filter(lang => lang.is_active);

  // Don't render if no languages available
  if (activeLanguages.length === 0) {
    return null;
  }

  // Icon-only variant (for mobile header)
  if (variant === 'icon') {
    return (
      <div ref={dropdownRef} className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          aria-label={t('language.select')}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          title={t('language.select')}
          className={`
            min-w-[44px] min-h-[44px]
            flex items-center justify-center
            text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
            hover:bg-[var(--color-background-surface)]
            focus:outline-none focus:ring-2 focus:ring-primary-500
            rounded-md
            transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          data-testid={testId}
        >
          {currentLang ? (
            <span className="text-lg" aria-hidden="true">{currentLang.emoji_flag}</span>
          ) : (
            <GlobeIcon className="w-5 h-5" aria-hidden="true" />
          )}
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <ul
            role="listbox"
            aria-label={t('language.select')}
            className="
              absolute right-0 top-full mt-1
              min-w-[160px]
              bg-[var(--color-background-card)]
              border border-[var(--color-border-default)]
              rounded-md shadow-lg
              z-50
              py-1
              overflow-hidden
            "
            data-testid={`${testId}-dropdown`}
          >
            {activeLanguages.map(lang => (
              <li key={lang.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={lang.code === currentLanguage}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`
                    w-full px-3 py-2
                    flex items-center gap-2
                    text-sm text-left
                    hover:bg-[var(--color-background-surface)]
                    transition-colors duration-150
                    ${lang.code === currentLanguage
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-[var(--color-text-primary)]'
                    }
                  `}
                  data-testid={`${testId}-option-${lang.code}`}
                >
                  <span className="text-base">{lang.emoji_flag}</span>
                  <span>{lang.native_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // Full variant with label (for desktop sidebar)
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        aria-label={t('language.select')}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`
          flex items-center gap-2
          px-3 py-2
          text-sm font-medium
          text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
          hover:bg-[var(--color-background-surface)]
          focus:outline-none focus:ring-2 focus:ring-primary-500
          rounded-md
          transition-colors duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          w-full
        `}
        data-testid={testId}
      >
        {currentLang ? (
          <span className="text-base flex-shrink-0">{currentLang.emoji_flag}</span>
        ) : (
          <GlobeIcon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
        )}
        <span className="truncate flex-1 text-left">
          {currentLang?.native_name || t('language.select')}
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <ul
          role="listbox"
          aria-label={t('language.select')}
          className="
            absolute left-0 bottom-full mb-1
            w-full
            bg-[var(--color-background-card)]
            border border-[var(--color-border-default)]
            rounded-md shadow-lg
            z-50
            py-1
            overflow-hidden
          "
          data-testid={`${testId}-dropdown`}
        >
          {activeLanguages.map(lang => (
            <li key={lang.code}>
              <button
                type="button"
                role="option"
                aria-selected={lang.code === currentLanguage}
                onClick={() => handleLanguageChange(lang.code)}
                className={`
                  w-full px-3 py-2
                  flex items-center gap-2
                  text-sm text-left
                  hover:bg-[var(--color-background-surface)]
                  transition-colors duration-150
                  ${lang.code === currentLanguage
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-[var(--color-text-primary)]'
                  }
                `}
                data-testid={`${testId}-option-${lang.code}`}
              >
                <span className="text-base">{lang.emoji_flag}</span>
                <span>{lang.native_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LanguageSelector;
