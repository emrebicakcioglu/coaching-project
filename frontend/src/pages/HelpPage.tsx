/**
 * Help Page
 * STORY-016A: Context Menu Core Navigation
 *
 * Help and documentation page with FAQs and support information.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Container } from '../components/layout';

/**
 * HelpPage Component
 *
 * Help page with FAQs, documentation links, and support contact.
 */
export const HelpPage: React.FC = () => {
  const { t } = useTranslation('help');

  // CSS variable styles for theming
  const cardStyle = { backgroundColor: 'var(--color-background-card, #ffffff)' };  const textPrimaryStyle = { color: 'var(--color-text-primary, #111827)' };  const textSecondaryStyle = { color: 'var(--color-text-secondary, #6b7280)' };  const borderStyle = { borderColor: 'var(--color-border-default, #e5e7eb)' };

  const faqKeys = ['createUser', 'resetPassword', 'manageRoles', 'viewSessions', 'changeSettings'];
  const faqs = faqKeys.map((key) => ({
    question: t(`faq.questions.${key}.question`),
    answer: t(`faq.questions.${key}.answer`),
  }));

  return (
    <Container className="py-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={textPrimaryStyle}>{t('title')}</h1>
        <p className="mt-1 text-sm" style={textSecondaryStyle}>
          {t('subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FAQs Section */}
        <div className="lg:col-span-2">
          <div className="rounded-lg shadow-sm border" style={{ ...cardStyle, ...borderStyle }}>
            <div className="p-6 border-b" style={borderStyle}>
              <h2 className="text-lg font-semibold" style={textPrimaryStyle}>
                {t('faq.title')}
              </h2>
            </div>
            <div className="divide-y" style={borderStyle}>
              {faqs.map((faq, index) => (
                <div key={index} className="p-6">
                  <h3 className="text-sm font-medium mb-2" style={textPrimaryStyle}>
                    {faq.question}
                  </h3>
                  <p className="text-sm" style={textSecondaryStyle}>{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Support Card */}
        <div className="space-y-6">
          {/* Contact Support */}
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <h2 className="text-lg font-semibold mb-4" style={textPrimaryStyle}>
              {t('contact.title')}
            </h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
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
                  <p className="text-sm font-medium" style={textPrimaryStyle}>{t('contact.email')}</p>
                  <a
                    href="mailto:support@example.com"
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    support@example.com
                  </a>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
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
                  <p className="text-sm font-medium" style={textPrimaryStyle}>{t('contact.phone')}</p>
                  <a
                    href="tel:+1234567890"
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    +1 (234) 567-890
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Documentation */}
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <h2 className="text-lg font-semibold mb-4" style={textPrimaryStyle}>
              {t('documentation.title')}
            </h2>
            <ul className="space-y-3">
              <li>
                <a
                  href="#"
                  className="flex items-center text-sm text-neutral-600 hover:text-primary-600"
                >
                  <svg
                    className="w-4 h-4 mr-2"
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
                  {t('documentation.gettingStarted')}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="flex items-center text-sm text-neutral-600 hover:text-primary-600"
                >
                  <svg
                    className="w-4 h-4 mr-2"
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
                  {t('documentation.userManagement')}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="flex items-center text-sm text-neutral-600 hover:text-primary-600"
                >
                  <svg
                    className="w-4 h-4 mr-2"
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
                  {t('documentation.rolesPermissions')}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="flex items-center text-sm text-neutral-600 hover:text-primary-600"
                >
                  <svg
                    className="w-4 h-4 mr-2"
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
                  {t('documentation.api')}
                </a>
              </li>
            </ul>
          </div>

          {/* Version Info */}
          <div className="rounded-lg border p-6" style={{ backgroundColor: 'var(--color-background-page, #f9fafb)', ...borderStyle }}>
            <h2 className="text-sm font-medium mb-2" style={textSecondaryStyle}>
              {t('version.title')}
            </h2>
            <p className="text-sm" style={textSecondaryStyle}>{t('version.current')}</p>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default HelpPage;
