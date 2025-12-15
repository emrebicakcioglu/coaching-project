/**
 * ForgotPasswordPage Component
 * STORY-009: Password Reset
 *
 * Page component for requesting a password reset email.
 * Located at /forgot-password in the application.
 */

import React, { useState, useCallback, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { passwordResetService } from '../services/authService';
import './AuthPages.css';

/**
 * Form state interface
 */
interface FormState {
  email: string;
}

/**
 * ForgotPasswordPage Component
 */
export const ForgotPasswordPage: React.FC = () => {
  // Form state
  const [formData, setFormData] = useState<FormState>({ email: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  /**
   * Handle input change
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      // Clear error when user starts typing
      if (error) setError(null);
    },
    [error]
  );

  /**
   * Validate email format
   */
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      // Validate email
      if (!formData.email.trim()) {
        setError('Bitte geben Sie Ihre E-Mail-Adresse ein.');
        return;
      }

      if (!validateEmail(formData.email)) {
        setError('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        await passwordResetService.forgotPassword({ email: formData.email });
        setIsSuccess(true);
      } catch (err) {
        // Even if an error occurs, we don't want to reveal if the email exists
        // So we show a generic success message
        // Only show error for network/server errors
        if (err instanceof Error && err.message.includes('Network')) {
          setError('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.');
        } else {
          // Show success anyway to prevent email enumeration
          setIsSuccess(true);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [formData.email]
  );

  /**
   * Handle resend email
   */
  const handleResend = useCallback(async () => {
    setIsResending(true);
    setResendSuccess(false);

    try {
      await passwordResetService.forgotPassword({ email: formData.email });
      setResendSuccess(true);
    } catch {
      // Silently handle error - still show success for security
      setResendSuccess(true);
    } finally {
      setIsResending(false);
    }
  }, [formData.email]);

  // Success state
  if (isSuccess) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          {/* Logo placeholder */}
          <div className="auth-logo" aria-label="Logo">
            <div className="auth-logo__placeholder" aria-hidden="true">
              <span>LOGO</span>
            </div>
          </div>

          <div className="auth-header">
            <h1 className="auth-title">E-Mail gesendet</h1>
          </div>

          <div className="auth-success confirmation-message">
            <div className="auth-success__icon" aria-hidden="true">
              ✓
            </div>
            <p className="auth-success__message success-message">
              Wenn ein Konto mit der E-Mail-Adresse <strong>{formData.email}</strong> existiert,
              haben wir Ihnen einen Link zum Zurücksetzen Ihres Passworts gesendet.
            </p>
            <p className="auth-success__expiry">
              Der Link ist <strong>1 Stunde</strong> gültig.
            </p>
            <p className="auth-success__hint">
              Bitte überprüfen Sie auch Ihren Spam-Ordner, falls Sie die E-Mail nicht in Ihrem
              Posteingang finden.
            </p>
          </div>

          {/* Resend Email Button */}
          <div className="auth-actions">
            {resendSuccess ? (
              <p className="auth-resend-success" role="status">
                <span aria-hidden="true">✓</span> E-Mail wurde erneut gesendet
              </p>
            ) : (
              <button
                type="button"
                className="auth-button auth-button--secondary"
                onClick={handleResend}
                disabled={isResending}
              >
                {isResending ? (
                  <>
                    <span className="auth-button__spinner" aria-hidden="true" />
                    Wird gesendet...
                  </>
                ) : (
                  'E-Mail erneut senden'
                )}
              </button>
            )}
          </div>

          <div className="auth-links">
            <Link to="/login" className="auth-link">
              Zurück zur Anmeldung
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Logo placeholder */}
        <div className="auth-logo" aria-label="Logo">
          <div className="auth-logo__placeholder" aria-hidden="true">
            <span>LOGO</span>
          </div>
        </div>

        <div className="auth-header">
          <h1 className="auth-title">Passwort vergessen?</h1>
          <p className="auth-subtitle">
            Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen
            Ihres Passworts.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* Error Message */}
          {error && (
            <div className="auth-error" role="alert">
              <span className="auth-error__icon" aria-hidden="true">
                !
              </span>
              {error}
            </div>
          )}

          {/* Email Field */}
          <div className="auth-field">
            <label htmlFor="email" className="auth-label">
              E-Mail-Adresse
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`auth-input ${error ? 'auth-input--error' : ''}`}
              placeholder="ihre@email.de"
              autoComplete="email"
              autoFocus
              required
              disabled={isLoading}
              aria-describedby={error ? 'email-error' : undefined}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="auth-button auth-button--primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="auth-button__spinner" aria-hidden="true" />
                Wird gesendet...
              </>
            ) : (
              'Link senden'
            )}
          </button>
        </form>

        {/* Links */}
        <div className="auth-links">
          <Link to="/login" className="auth-link">
            Zurück zur Anmeldung
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
