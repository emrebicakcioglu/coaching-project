/**
 * Help Page
 * STORY-016A: Context Menu Core Navigation
 * STORY-108: Help Page UI Audit
 *
 * Help and documentation page with FAQs and support information.
 *
 * UI Audit Fixes Applied:
 * - Fixed missing translations by adding 'help' namespace to i18n config
 * - Unified card styling across FAQ and sidebar sections
 * - Added interaction cues to FAQ accordion (chevrons, hover states)
 * - Fixed contact icons sizing consistency
 * - Added hover states to documentation links
 * - Fixed version information display with actual version
 * - Added translation loading state to prevent showing raw translation keys (STORY-108 iteration 1)
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Container } from '../components/layout';
import i18n from '../i18n';
import { logger } from '../services/loggerService';

/**
 * ChevronIcon Component
 * Renders a chevron/arrow icon for FAQ accordion
 */
const ChevronIcon: React.FC<{ isExpanded: boolean }> = ({ isExpanded }) => (
  <svg
    className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </svg>
);

/**
 * DocumentIcon Component
 * Renders a document icon for documentation links
 */
const DocumentIcon: React.FC = () => (
  <svg
    className="w-4 h-4 mr-3 flex-shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

/**
 * Unified card styles for consistent appearance across all cards
 */
const CARD_STYLES = {
  base: 'rounded-lg shadow-sm border bg-[var(--color-background-card,#ffffff)] border-[var(--color-border-default,#e5e7eb)]',
  header: 'p-6 border-b border-[var(--color-border-default,#e5e7eb)]',
  content: 'p-6',
};

/**
 * Application version from environment or default
 */
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
const BUILD_DATE = import.meta.env.VITE_BUILD_DATE || new Date().toISOString().split('T')[0];

/**
 * HelpPage Component
 *
 * Help page with FAQs, documentation links, and support contact.
 */
export const HelpPage: React.FC = () => {
  const { t, ready } = useTranslation('help');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(!ready);

  // Ensure the 'help' namespace is loaded
  useEffect(() => {
    const loadNamespace = async () => {
      if (!i18n.hasLoadedNamespace('help')) {
        try {
          await i18n.loadNamespaces('help');
        } catch (error) {
          logger.error('Failed to load help translations', error);
        }
      }
      setIsLoading(false);
    };

    if (!ready) {
      loadNamespace();
    } else {
      setIsLoading(false);
    }
  }, [ready]);

  // CSS variable styles for theming
  const textPrimaryStyle = { color: 'var(--color-text-primary, #111827)' };
  const textSecondaryStyle = { color: 'var(--color-text-secondary, #6b7280)' };

  // Show loading state while translations are being loaded
  if (isLoading) {
    return (
      <Container className="py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center" data-testid="help-loading">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p style={textSecondaryStyle}>Loading...</p>
          </div>
        </div>
      </Container>
    );
  }

  const faqKeys = ['createUser', 'resetPassword', 'manageRoles', 'viewSessions', 'changeSettings'];
  const faqs = faqKeys.map((key) => ({
    key,
    question: t(`faq.questions.${key}.question`),
    answer: t(`faq.questions.${key}.answer`),
  }));

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <Container className="py-8">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title" data-testid="help-page-title">
          {t('title')}
        </h1>
        <p className="page-subtitle" data-testid="help-page-subtitle">
          {t('subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FAQs Section */}
        <div className="lg:col-span-2">
          <div className={CARD_STYLES.base} data-testid="faq-card">
            <div className={CARD_STYLES.header}>
              <h2 className="card-title" data-testid="faq-title">
                {t('faq.title')}
              </h2>
            </div>
            <div className="divide-y divide-[var(--color-border-default,#e5e7eb)]" data-testid="faq-list">
              {faqs.map((faq, index) => (
                <div key={faq.key} data-testid={`faq-item-${faq.key}`}>
                  <button
                    type="button"
                    className="w-full p-6 text-left flex items-center justify-between hover:bg-[var(--color-background-surface,#f9fafb)] transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
                    onClick={() => toggleFaq(index)}
                    aria-expanded={expandedFaq === index}
                    aria-controls={`faq-answer-${index}`}
                    data-testid={`faq-question-${faq.key}`}
                  >
                    <h3 className="text-sm font-medium pr-4" style={textPrimaryStyle}>
                      {faq.question}
                    </h3>
                    <ChevronIcon isExpanded={expandedFaq === index} />
                  </button>
                  <div
                    id={`faq-answer-${index}`}
                    className={`overflow-hidden transition-all duration-200 ${
                      expandedFaq === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                    aria-hidden={expandedFaq !== index}
                    data-testid={`faq-answer-${faq.key}`}
                  >
                    <p className="px-6 pb-6 text-sm" style={textSecondaryStyle}>
                      {faq.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Support */}
          <div className={CARD_STYLES.base} data-testid="contact-card">
            <div className={CARD_STYLES.content}>
              <h2 className="card-title mb-4" data-testid="contact-title">
                {t('contact.title')}
              </h2>
              <div className="space-y-4">
                {/* Email Contact */}
                <div className="flex items-start" data-testid="contact-email">
                  <div
                    className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center"
                    data-testid="email-icon-container"
                  >
                    <svg
                      className="w-5 h-5 text-primary-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium" style={textPrimaryStyle}>
                      {t('contact.email')}
                    </p>
                    <a
                      href="mailto:support@example.com"
                      className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
                    >
                      support@example.com
                    </a>
                  </div>
                </div>
                {/* Phone Contact */}
                <div className="flex items-start" data-testid="contact-phone">
                  <div
                    className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center"
                    data-testid="phone-icon-container"
                  >
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium" style={textPrimaryStyle}>
                      {t('contact.phone')}
                    </p>
                    <a
                      href="tel:+1234567890"
                      className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
                    >
                      +1 (234) 567-890
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Documentation */}
          <div className={CARD_STYLES.base} data-testid="documentation-card">
            <div className={CARD_STYLES.content}>
              <h2 className="card-title mb-4" data-testid="documentation-title">
                {t('documentation.title')}
              </h2>
              <ul className="space-y-1" data-testid="documentation-list">
                <li>
                  <a
                    href="#getting-started"
                    className="flex items-center text-sm py-2 px-3 -mx-3 rounded-md hover:bg-[var(--color-background-surface,#f9fafb)] transition-colors duration-150"
                    style={textSecondaryStyle}
                    data-testid="doc-link-getting-started"
                  >
                    <DocumentIcon />
                    <span className="hover:text-primary-600">{t('documentation.gettingStarted')}</span>
                  </a>
                </li>
                <li>
                  <a
                    href="#user-management"
                    className="flex items-center text-sm py-2 px-3 -mx-3 rounded-md hover:bg-[var(--color-background-surface,#f9fafb)] transition-colors duration-150"
                    style={textSecondaryStyle}
                    data-testid="doc-link-user-management"
                  >
                    <DocumentIcon />
                    <span className="hover:text-primary-600">{t('documentation.userManagement')}</span>
                  </a>
                </li>
                <li>
                  <a
                    href="#roles-permissions"
                    className="flex items-center text-sm py-2 px-3 -mx-3 rounded-md hover:bg-[var(--color-background-surface,#f9fafb)] transition-colors duration-150"
                    style={textSecondaryStyle}
                    data-testid="doc-link-roles-permissions"
                  >
                    <DocumentIcon />
                    <span className="hover:text-primary-600">{t('documentation.rolesPermissions')}</span>
                  </a>
                </li>
                <li>
                  <a
                    href="#api"
                    className="flex items-center text-sm py-2 px-3 -mx-3 rounded-md hover:bg-[var(--color-background-surface,#f9fafb)] transition-colors duration-150"
                    style={textSecondaryStyle}
                    data-testid="doc-link-api"
                  >
                    <DocumentIcon />
                    <span className="hover:text-primary-600">{t('documentation.api')}</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Version Info - Unified styling with other cards */}
          <div className={CARD_STYLES.base} data-testid="version-card">
            <div className={CARD_STYLES.content}>
              <h2 className="text-sm font-medium mb-2" style={textSecondaryStyle} data-testid="version-title">
                {t('version.title')}
              </h2>
              <div className="flex items-baseline space-x-2">
                <span
                  className="text-lg font-semibold"
                  style={textPrimaryStyle}
                  data-testid="version-number"
                >
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-xs mt-1" style={textSecondaryStyle} data-testid="version-build-date">
                {t('version.buildDate', { date: BUILD_DATE, defaultValue: `Build: ${BUILD_DATE}` })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default HelpPage;
