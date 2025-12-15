/**
 * RegistrationSuccessPage Component
 * STORY-023: User Registration
 *
 * Confirmation page shown after successful registration.
 * Instructs user to check their email for verification link.
 *
 * Features:
 * - Confirmation message
 * - Resend verification email button
 * - Link to login page
 * - Responsive design
 * - Accessibility compliant
 */

import React, { useState, useCallback } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { registrationService } from '../services/authService';
import './AuthPages.css';

/**
 * Location state interface
 */
interface LocationState {
  email?: string;
}

/**
 * RegistrationSuccessPage Component
 */
export const RegistrationSuccessPage: React.FC = () => {
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const email = locationState?.email;

  // Resend state
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  /**
   * Handle resend verification email
   */
  const handleResendVerification = useCallback(async () => {
    if (!email || isResending) return;

    setIsResending(true);
    setResendMessage(null);
    setResendError(null);

    try {
      await registrationService.resendVerification({ email });
      setResendMessage('Die Bestätigungs-E-Mail wurde erneut gesendet.');
    } catch {
      setResendError('Fehler beim Senden der E-Mail. Bitte versuchen Sie es später erneut.');
    } finally {
      setIsResending(false);
    }
  }, [email, isResending]);

  // Redirect if no email in state (direct access without registration)
  if (!email) {
    return <Navigate to="/register" replace />;
  }

  return (
    <div className="auth-page" data-testid="registration-success-page">
      <div className="auth-container" data-testid="registration-success-container">
        {/* Logo placeholder */}
        <div className="auth-logo" aria-label="Logo">
          <div className="auth-logo__placeholder" aria-hidden="true">
            <span>LOGO</span>
          </div>
        </div>

        {/* Success Icon */}
        <div className="auth-success-icon" aria-hidden="true">
          <span className="auth-success-icon__check">&#10003;</span>
        </div>

        <div className="auth-header">
          <h1 className="auth-title" data-testid="success-title">
            Registrierung erfolgreich!
          </h1>
          <p className="auth-subtitle">
            Vielen Dank für Ihre Registrierung.
          </p>
        </div>

        {/* Instructions */}
        <div className="auth-message-box" data-testid="instructions">
          <h2 className="auth-message-box__title">
            Bitte bestätigen Sie Ihre E-Mail-Adresse
          </h2>
          <p className="auth-message-box__text">
            Wir haben eine Bestätigungs-E-Mail an <strong>{email}</strong> gesendet.
          </p>
          <p className="auth-message-box__text">
            Bitte klicken Sie auf den Link in der E-Mail, um Ihr Konto zu aktivieren.
          </p>
          <p className="auth-message-box__hint">
            Der Link ist 24 Stunden gültig.
          </p>
        </div>

        {/* Resend Verification */}
        {resendMessage && (
          <div
            className="auth-success-message"
            role="status"
            aria-live="polite"
            data-testid="resend-success"
          >
            <span className="auth-success-message__icon" aria-hidden="true">
              &#10003;
            </span>
            {resendMessage}
          </div>
        )}

        {resendError && (
          <div
            className="auth-error"
            role="alert"
            aria-live="assertive"
            data-testid="resend-error"
          >
            <span className="auth-error__icon" aria-hidden="true">
              !
            </span>
            {resendError}
          </div>
        )}

        <div className="auth-actions">
          <button
            type="button"
            className="auth-button auth-button--secondary"
            onClick={handleResendVerification}
            disabled={isResending}
            data-testid="resend-button"
          >
            {isResending ? (
              <>
                <span className="auth-button__spinner" aria-hidden="true" />
                <span>Wird gesendet...</span>
              </>
            ) : (
              'E-Mail erneut senden'
            )}
          </button>
        </div>

        {/* Help Text */}
        <div className="auth-help-text">
          <p>
            <strong>E-Mail nicht erhalten?</strong>
          </p>
          <ul>
            <li>Überprüfen Sie Ihren Spam-Ordner</li>
            <li>Stellen Sie sicher, dass die E-Mail-Adresse korrekt ist</li>
            <li>Warten Sie einige Minuten und versuchen Sie es erneut</li>
          </ul>
        </div>

        {/* Additional Links */}
        <div className="auth-footer" data-testid="registration-success-footer">
          <p className="auth-footer__text">
            <Link
              to="/login"
              className="auth-link"
              data-testid="login-link"
            >
              Zurück zur Anmeldung
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationSuccessPage;
