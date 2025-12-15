/**
 * EmailVerificationPage Component
 * STORY-023: User Registration
 *
 * Page for verifying email address after registration.
 * Handles the verification token from the URL and shows appropriate status.
 *
 * Features:
 * - Automatic token verification on load
 * - Success, error, and loading states
 * - Link to login page
 * - Responsive design
 * - Accessibility compliant
 */

import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { registrationService } from '../services/authService';
import './AuthPages.css';

/**
 * Verification status type
 */
type VerificationStatus = 'loading' | 'success' | 'error' | 'invalid';

/**
 * EmailVerificationPage Component
 */
export const EmailVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Verification state
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Verify email on component mount
  useEffect(() => {
    const verifyEmail = async () => {
      // Check if token is present
      if (!token) {
        setStatus('invalid');
        setErrorMessage('Kein Verifizierungstoken gefunden.');
        return;
      }

      try {
        await registrationService.verifyEmail(token);
        setStatus('success');
      } catch (err) {
        setStatus('error');

        // Handle specific error cases
        if (err instanceof Error) {
          const errorStr = err.message.toLowerCase();
          if (errorStr.includes('expired')) {
            setErrorMessage('Der Verifizierungslink ist abgelaufen. Bitte fordern Sie einen neuen an.');
          } else if (errorStr.includes('invalid')) {
            setErrorMessage('Der Verifizierungslink ist ungültig.');
          } else if (errorStr.includes('already')) {
            setErrorMessage('Diese E-Mail-Adresse wurde bereits verifiziert.');
          } else {
            setErrorMessage('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
          }
        } else {
          setErrorMessage('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
        }
      }
    };

    verifyEmail();
  }, [token]);

  // Loading state
  if (status === 'loading') {
    return (
      <div className="auth-page" data-testid="email-verification-page">
        <div className="auth-container" data-testid="email-verification-container">
          {/* Logo placeholder */}
          <div className="auth-logo" aria-label="Logo">
            <div className="auth-logo__placeholder" aria-hidden="true">
              <span>LOGO</span>
            </div>
          </div>

          <div className="auth-loading" role="status" aria-label="Verifizierung läuft">
            <div className="auth-loading__spinner" aria-hidden="true" />
            <p className="auth-loading__text">E-Mail-Adresse wird verifiziert...</p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="auth-page" data-testid="email-verification-page">
        <div className="auth-container" data-testid="email-verification-container">
          {/* Logo placeholder */}
          <div className="auth-logo" aria-label="Logo">
            <div className="auth-logo__placeholder" aria-hidden="true">
              <span>LOGO</span>
            </div>
          </div>

          {/* Success Icon */}
          <div className="auth-success-icon auth-success-icon--large" aria-hidden="true">
            <span className="auth-success-icon__check">&#10003;</span>
          </div>

          <div className="auth-header">
            <h1 className="auth-title" data-testid="success-title">
              E-Mail-Adresse bestätigt!
            </h1>
            <p className="auth-subtitle">
              Ihr Konto wurde erfolgreich aktiviert.
            </p>
          </div>

          <div className="auth-message-box auth-message-box--success">
            <p className="auth-message-box__text">
              Sie können sich jetzt mit Ihrer E-Mail-Adresse und Ihrem Passwort anmelden.
            </p>
          </div>

          <div className="auth-actions">
            <Link
              to="/login"
              className="auth-button auth-button--primary"
              data-testid="login-button"
            >
              Jetzt anmelden
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Error state (invalid token or verification failed)
  return (
    <div className="auth-page" data-testid="email-verification-page">
      <div className="auth-container" data-testid="email-verification-container">
        {/* Logo placeholder */}
        <div className="auth-logo" aria-label="Logo">
          <div className="auth-logo__placeholder" aria-hidden="true">
            <span>LOGO</span>
          </div>
        </div>

        {/* Error Icon */}
        <div className="auth-error-icon" aria-hidden="true">
          <span className="auth-error-icon__x">&#10005;</span>
        </div>

        <div className="auth-header">
          <h1 className="auth-title" data-testid="error-title">
            Verifizierung fehlgeschlagen
          </h1>
        </div>

        <div className="auth-error" role="alert" data-testid="error-message">
          <span className="auth-error__icon" aria-hidden="true">
            !
          </span>
          {errorMessage}
        </div>

        {/* Help Text */}
        <div className="auth-help-text">
          <p>
            <strong>Was können Sie tun?</strong>
          </p>
          <ul>
            <li>Fordern Sie einen neuen Verifizierungslink an</li>
            <li>Überprüfen Sie, ob der Link vollständig kopiert wurde</li>
            <li>Kontaktieren Sie den Support, wenn das Problem weiterhin besteht</li>
          </ul>
        </div>

        <div className="auth-actions">
          <Link
            to="/register"
            className="auth-button auth-button--secondary"
            data-testid="register-button"
          >
            Erneut registrieren
          </Link>
          <Link
            to="/login"
            className="auth-button auth-button--link"
            data-testid="login-link"
          >
            Zur Anmeldung
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;
