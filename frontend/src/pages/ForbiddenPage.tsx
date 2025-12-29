/**
 * ForbiddenPage Component
 * STORY-008B: Permission-System (Frontend)
 * STORY-109: Forbidden (403) Page UI Audit
 *
 * Page displayed when a user attempts to access a resource
 * for which they lack the required permission.
 *
 * Features:
 * - Clear access denied message
 * - Navigation options (go back, go to dashboard)
 * - Responsive design
 * - WCAG 2.1 Level AA accessibility
 *
 * STORY-109 UI Audit Fixes:
 * - Button styling consistency with MFA page pattern
 * - Primary action (Dashboard) uses filled blue button
 * - Secondary action (Back) uses outlined white button
 * - Consistent 403 error code typography (orange/amber)
 * - Enhanced support link visibility with HelpIcon
 */

import React, { useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HelpIcon } from '../components/icons';
import './AuthPages.css';

/**
 * ForbiddenPage Component
 *
 * Displays an access denied message when the user lacks
 * permissions to view a resource.
 */
export const ForbiddenPage: React.FC = () => {
  const { t } = useTranslation('errors');
  const navigate = useNavigate();

  /**
   * Handle go back button click
   */
  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <div className="auth-page" data-testid="forbidden-page">
      <div className="auth-container" data-testid="forbidden-container">
        {/* Warning Icon */}
        <div className="auth-logo" aria-hidden="true">
          <div
            className="auth-logo__placeholder"
            style={{
              backgroundColor: 'var(--color-warning-100, #fef3c7)',
              borderColor: 'var(--color-warning-500, #f59e0b)',
              color: 'var(--color-warning-600, #d97706)',
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        {/* Header */}
        <div className="auth-header">
          <h1
            className="auth-title"
            data-testid="forbidden-title"
            style={{ color: 'var(--color-warning-600, #d97706)' }}
          >
            {t('forbidden.title')}
          </h1>
          <p className="auth-subtitle" data-testid="forbidden-message">
            {t('forbidden.message')}
          </p>
        </div>

        {/* Error Code Display - STORY-109: Consistent orange/amber typography */}
        <div
          className="auth-form forbidden-page__error-code"
          style={{
            backgroundColor: 'var(--color-neutral-50, #f9fafb)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}
          data-testid="error-code"
        >
          <span
            className="forbidden-page__code-number"
            style={{
              fontSize: '3rem',
              fontWeight: '700',
              color: 'var(--color-warning-500, #f59e0b)',
              letterSpacing: '0.1em',
            }}
            aria-hidden="true"
            data-testid="error-code-number"
          >
            403
          </span>
          <p
            className="forbidden-page__code-label"
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-neutral-500, #6b7280)',
              marginTop: '0.5rem',
            }}
            data-testid="error-code-label"
          >
            {t('forbidden.code')}
          </p>
        </div>

        {/* Action Buttons - STORY-109: Clear button hierarchy matching MFA page pattern */}
        <div
          className="auth-form forbidden-page__actions"
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '0.75rem',
            justifyContent: 'center',
          }}
          data-testid="forbidden-actions"
        >
          {/* Secondary action - Go Back (outlined) */}
          <button
            type="button"
            className="auth-button auth-button--secondary forbidden-page__button forbidden-page__button--secondary"
            onClick={handleGoBack}
            data-testid="go-back-button"
            style={{
              backgroundColor: 'transparent',
              border: '1px solid var(--color-neutral-300, #d1d5db)',
              color: 'var(--color-neutral-700, #374151)',
              flex: '1',
              maxWidth: '180px',
            }}
          >
            {t('forbidden.buttons.goBack')}
          </button>
          {/* Primary action - Dashboard (filled blue) */}
          <Link
            to="/dashboard"
            className="auth-button auth-button--primary forbidden-page__button forbidden-page__button--primary"
            data-testid="dashboard-link"
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: '1',
              maxWidth: '180px',
            }}
          >
            {t('forbidden.buttons.dashboard')}
          </Link>
        </div>

        {/* Help Footer - STORY-109: Enhanced support link visibility with icon */}
        <div className="auth-footer forbidden-page__footer" data-testid="forbidden-footer">
          <p className="auth-footer__text">
            <Link
              to="/help"
              className="auth-link forbidden-page__support-link"
              data-testid="help-link"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '500',
              }}
            >
              <HelpIcon
                className="forbidden-page__help-icon"
                aria-hidden="true"
                data-testid="help-link-icon"
              />
              {t('forbidden.links.support')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForbiddenPage;
