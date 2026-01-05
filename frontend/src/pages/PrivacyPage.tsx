/**
 * Privacy Policy Page
 * BUG-006: Fehlende Datenschutzbestimmungen-Seite
 *
 * Public page displaying the privacy policy (Datenschutzbestimmungen).
 * This page is accessible without authentication as required by GDPR.
 *
 * Features:
 * - GDPR-compliant privacy policy content
 * - Multi-language support (German/English)
 * - Responsive design
 * - Accessible navigation back to registration
 * - No authentication required (public route)
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthLogo } from '../components/auth';
import i18n from '../i18n';
import './AuthPages.css';

/**
 * ChevronLeftIcon Component
 * Arrow icon for navigation back
 */
const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 19l-7-7 7-7"
    />
  </svg>
);

/**
 * PrivacyPage Component
 *
 * Displays the privacy policy for the application.
 * Public route - no authentication required.
 */
export const PrivacyPage: React.FC = () => {
  const { t, ready } = useTranslation('privacy');
  const [isLoading, setIsLoading] = useState(!ready);

  // Ensure the 'privacy' namespace is loaded
  useEffect(() => {
    const loadNamespace = async () => {
      if (!i18n.hasLoadedNamespace('privacy')) {
        try {
          await i18n.loadNamespaces('privacy');
        } catch (error) {
          console.error('Failed to load privacy translations', error);
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
      <div className="auth-page" data-testid="privacy-page">
        <div className="auth-container auth-container--privacy">
          <div className="auth-loading" role="status" aria-label="Loading...">
            <div className="auth-loading__spinner" aria-hidden="true" />
            <p className="auth-loading__text">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page" data-testid="privacy-page">
      <div
        className="auth-container auth-container--privacy"
        style={{ maxWidth: '720px' }}
        data-testid="privacy-container"
      >
        {/* Logo */}
        <AuthLogo data-testid="privacy-auth-logo" />

        {/* Back Navigation */}
        <div className="privacy-back-nav" style={{ marginBottom: '24px' }}>
          <Link
            to="/register"
            className="auth-link privacy-back-link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.875rem',
            }}
            data-testid="back-to-register-link"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            {t('backToRegister')}
          </Link>
        </div>

        {/* Header */}
        <div className="auth-header">
          <h1
            className="auth-title"
            style={{ fontSize: '1.5rem', marginBottom: '8px' }}
            data-testid="privacy-title"
          >
            {t('title')}
          </h1>
          <p className="auth-subtitle" data-testid="privacy-last-updated">
            {t('lastUpdated', { date: '01.01.2024' })}
          </p>
        </div>

        {/* Privacy Policy Content */}
        <div
          className="privacy-content"
          style={{
            textAlign: 'left',
            lineHeight: '1.75',
            fontSize: '0.9375rem',
          }}
        >
          {/* Section 1: Introduction */}
          <section className="privacy-section" style={{ marginBottom: '24px' }}>
            <h2
              className="privacy-section-title"
              style={{ ...textPrimaryStyle, fontSize: '1.125rem', fontWeight: '600', marginBottom: '12px' }}
              data-testid="privacy-section-intro"
            >
              {t('sections.introduction.title')}
            </h2>
            <p style={{ ...textSecondaryStyle, marginBottom: '12px' }}>
              {t('sections.introduction.content')}
            </p>
          </section>

          {/* Section 2: Responsible Party */}
          <section className="privacy-section" style={{ marginBottom: '24px' }}>
            <h2
              className="privacy-section-title"
              style={{ ...textPrimaryStyle, fontSize: '1.125rem', fontWeight: '600', marginBottom: '12px' }}
              data-testid="privacy-section-responsible"
            >
              {t('sections.responsible.title')}
            </h2>
            <p style={{ ...textSecondaryStyle, marginBottom: '12px' }}>
              {t('sections.responsible.content')}
            </p>
          </section>

          {/* Section 3: Data Collection */}
          <section className="privacy-section" style={{ marginBottom: '24px' }}>
            <h2
              className="privacy-section-title"
              style={{ ...textPrimaryStyle, fontSize: '1.125rem', fontWeight: '600', marginBottom: '12px' }}
              data-testid="privacy-section-collection"
            >
              {t('sections.dataCollection.title')}
            </h2>
            <p style={{ ...textSecondaryStyle, marginBottom: '12px' }}>
              {t('sections.dataCollection.content')}
            </p>
            <ul
              style={{
                ...textSecondaryStyle,
                paddingLeft: '24px',
                listStyleType: 'disc',
                marginBottom: '12px',
              }}
            >
              <li>{t('sections.dataCollection.items.email')}</li>
              <li>{t('sections.dataCollection.items.name')}</li>
              <li>{t('sections.dataCollection.items.password')}</li>
              <li>{t('sections.dataCollection.items.ip')}</li>
              <li>{t('sections.dataCollection.items.browser')}</li>
            </ul>
          </section>

          {/* Section 4: Purpose of Processing */}
          <section className="privacy-section" style={{ marginBottom: '24px' }}>
            <h2
              className="privacy-section-title"
              style={{ ...textPrimaryStyle, fontSize: '1.125rem', fontWeight: '600', marginBottom: '12px' }}
              data-testid="privacy-section-purpose"
            >
              {t('sections.purpose.title')}
            </h2>
            <p style={{ ...textSecondaryStyle, marginBottom: '12px' }}>
              {t('sections.purpose.content')}
            </p>
            <ul
              style={{
                ...textSecondaryStyle,
                paddingLeft: '24px',
                listStyleType: 'disc',
                marginBottom: '12px',
              }}
            >
              <li>{t('sections.purpose.items.account')}</li>
              <li>{t('sections.purpose.items.authentication')}</li>
              <li>{t('sections.purpose.items.security')}</li>
              <li>{t('sections.purpose.items.communication')}</li>
            </ul>
          </section>

          {/* Section 5: Legal Basis */}
          <section className="privacy-section" style={{ marginBottom: '24px' }}>
            <h2
              className="privacy-section-title"
              style={{ ...textPrimaryStyle, fontSize: '1.125rem', fontWeight: '600', marginBottom: '12px' }}
              data-testid="privacy-section-legal"
            >
              {t('sections.legalBasis.title')}
            </h2>
            <p style={{ ...textSecondaryStyle, marginBottom: '12px' }}>
              {t('sections.legalBasis.content')}
            </p>
          </section>

          {/* Section 6: Data Retention */}
          <section className="privacy-section" style={{ marginBottom: '24px' }}>
            <h2
              className="privacy-section-title"
              style={{ ...textPrimaryStyle, fontSize: '1.125rem', fontWeight: '600', marginBottom: '12px' }}
              data-testid="privacy-section-retention"
            >
              {t('sections.retention.title')}
            </h2>
            <p style={{ ...textSecondaryStyle, marginBottom: '12px' }}>
              {t('sections.retention.content')}
            </p>
          </section>

          {/* Section 7: Your Rights */}
          <section className="privacy-section" style={{ marginBottom: '24px' }}>
            <h2
              className="privacy-section-title"
              style={{ ...textPrimaryStyle, fontSize: '1.125rem', fontWeight: '600', marginBottom: '12px' }}
              data-testid="privacy-section-rights"
            >
              {t('sections.rights.title')}
            </h2>
            <p style={{ ...textSecondaryStyle, marginBottom: '12px' }}>
              {t('sections.rights.content')}
            </p>
            <ul
              style={{
                ...textSecondaryStyle,
                paddingLeft: '24px',
                listStyleType: 'disc',
                marginBottom: '12px',
              }}
            >
              <li>{t('sections.rights.items.access')}</li>
              <li>{t('sections.rights.items.rectification')}</li>
              <li>{t('sections.rights.items.erasure')}</li>
              <li>{t('sections.rights.items.restriction')}</li>
              <li>{t('sections.rights.items.portability')}</li>
              <li>{t('sections.rights.items.objection')}</li>
            </ul>
          </section>

          {/* Section 8: Contact */}
          <section className="privacy-section" style={{ marginBottom: '24px' }}>
            <h2
              className="privacy-section-title"
              style={{ ...textPrimaryStyle, fontSize: '1.125rem', fontWeight: '600', marginBottom: '12px' }}
              data-testid="privacy-section-contact"
            >
              {t('sections.contact.title')}
            </h2>
            <p style={{ ...textSecondaryStyle, marginBottom: '12px' }}>
              {t('sections.contact.content')}
            </p>
            <p style={{ ...textSecondaryStyle }}>
              <a
                href="mailto:privacy@example.com"
                className="auth-link"
                data-testid="privacy-email-link"
              >
                privacy@example.com
              </a>
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="auth-footer" data-testid="privacy-footer">
          <p className="auth-footer__text">
            <Link
              to="/register"
              className="auth-link"
              data-testid="register-link"
            >
              {t('registerPrompt')}
            </Link>
            {' | '}
            <Link
              to="/login"
              className="auth-link"
              data-testid="login-link"
            >
              {t('loginPrompt')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
