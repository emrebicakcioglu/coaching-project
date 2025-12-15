/**
 * ForbiddenPage Component
 * STORY-008B: Permission-System (Frontend)
 *
 * Page displayed when a user attempts to access a resource
 * for which they lack the required permission.
 *
 * Features:
 * - Clear access denied message
 * - Navigation options (go back, go to dashboard)
 * - Responsive design
 * - WCAG 2.1 Level AA accessibility
 */

import React, { useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './AuthPages.css';

/**
 * ForbiddenPage Component
 *
 * Displays an access denied message when the user lacks
 * permissions to view a resource.
 */
export const ForbiddenPage: React.FC = () => {
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
            Zugriff verweigert
          </h1>
          <p className="auth-subtitle" data-testid="forbidden-message">
            Sie haben keine Berechtigung, auf diese Seite zuzugreifen.
            <br />
            Bitte wenden Sie sich an Ihren Administrator, wenn Sie der Meinung sind,
            dass dies ein Fehler ist.
          </p>
        </div>

        {/* Error Code Display */}
        <div
          className="auth-form"
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
            style={{
              fontSize: '3rem',
              fontWeight: '700',
              color: 'var(--color-neutral-400, #9ca3af)',
              letterSpacing: '0.1em',
            }}
            aria-hidden="true"
          >
            403
          </span>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-neutral-500, #6b7280)',
              marginTop: '0.5rem',
            }}
          >
            Forbidden
          </p>
        </div>

        {/* Action Buttons */}
        <div
          className="auth-form"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <button
            type="button"
            className="auth-button"
            onClick={handleGoBack}
            data-testid="go-back-button"
          >
            Zurück zur vorherigen Seite
          </button>
          <Link
            to="/dashboard"
            className="auth-button auth-button--secondary"
            data-testid="dashboard-link"
            style={{
              backgroundColor: 'transparent',
              border: '1px solid var(--color-neutral-300, #d1d5db)',
              color: 'var(--color-neutral-700, #374151)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Zum Dashboard
          </Link>
        </div>

        {/* Help Footer */}
        <div className="auth-footer" data-testid="forbidden-footer">
          <p className="auth-footer__text">
            Brauchen Sie Hilfe?{' '}
            <Link
              to="/help"
              className="auth-link"
              data-testid="help-link"
            >
              Kontaktieren Sie den Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForbiddenPage;
