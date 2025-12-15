/**
 * ResetPasswordPage Component
 * STORY-009: Password Reset
 *
 * Page component for resetting password with a valid token.
 * Located at /reset-password?token=... in the application.
 */

import React, { useState, useCallback, useMemo, FormEvent, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { passwordResetService } from '../services/authService';
import {
  PasswordStrengthIndicator,
  usePasswordValidation,
} from '../components/auth/PasswordStrengthIndicator';
import './AuthPages.css';

/**
 * Form state interface
 */
interface FormState {
  newPassword: string;
  confirmPassword: string;
}

/**
 * Token validation state
 */
type TokenState = 'validating' | 'valid' | 'invalid';

/**
 * ResetPasswordPage Component
 */
export const ResetPasswordPage: React.FC = () => {
  // Get token from URL
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  // Token validation state
  const [tokenState, setTokenState] = useState<TokenState>('validating');

  // Form state
  const [formData, setFormData] = useState<FormState>({
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Password validation
  const passwordValidation = usePasswordValidation(formData.newPassword);

  // Check if passwords match
  const passwordsMatch = useMemo(
    () => formData.newPassword === formData.confirmPassword,
    [formData.newPassword, formData.confirmPassword]
  );

  // Form is valid when password meets requirements and passwords match
  const isFormValid = useMemo(
    () =>
      passwordValidation.isValid &&
      passwordsMatch &&
      formData.newPassword.length > 0 &&
      formData.confirmPassword.length > 0,
    [passwordValidation.isValid, passwordsMatch, formData.newPassword, formData.confirmPassword]
  );

  /**
   * Validate token on mount
   */
  useEffect(() => {
    if (!token) {
      setTokenState('invalid');
      return;
    }

    // Basic token format validation
    const isValidFormat = passwordResetService.validateToken(token);
    setTokenState(isValidFormat ? 'valid' : 'invalid');
  }, [token]);

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
   * Toggle password visibility
   */
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      // Validate form
      if (!passwordValidation.isValid) {
        setError('Das Passwort erfüllt nicht alle Anforderungen.');
        return;
      }

      if (!passwordsMatch) {
        setError('Die Passwörter stimmen nicht überein.');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        await passwordResetService.resetPassword({
          token,
          new_password: formData.newPassword,
        });
        setIsSuccess(true);

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', {
            state: { message: 'Ihr Passwort wurde erfolgreich zurückgesetzt. Sie können sich jetzt anmelden.' },
          });
        }, 3000);
      } catch (err) {
        // Handle specific error cases
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';

        // Check for common error patterns
        if (errorMessage.toLowerCase().includes('token') || errorMessage.toLowerCase().includes('expired')) {
          setTokenState('invalid');
          setError('Der Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen Link an.');
        } else if (errorMessage.toLowerCase().includes('password')) {
          setError('Das Passwort entspricht nicht den Anforderungen.');
        } else {
          setError(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [token, formData.newPassword, passwordValidation.isValid, passwordsMatch, navigate]
  );

  // Token is being validated
  if (tokenState === 'validating') {
    return (
      <div className="auth-page">
        <div className="auth-container">
          {/* Logo placeholder */}
          <div className="auth-logo" aria-label="Logo">
            <div className="auth-logo__placeholder" aria-hidden="true">
              <span>LOGO</span>
            </div>
          </div>

          <div className="auth-loading">
            <div className="auth-loading__spinner" aria-hidden="true" />
            <p className="auth-loading__text">Link wird überprüft...</p>
          </div>
        </div>
      </div>
    );
  }

  // Token is invalid
  if (tokenState === 'invalid') {
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
            <h1 className="auth-title">Ungültiger Link</h1>
          </div>

          <div className="auth-error-state error-message">
            <div className="auth-error-state__icon" aria-hidden="true">
              ✕
            </div>
            <p className="auth-error-state__message">
              Der Link zum Zurücksetzen des Passworts ist ungültig oder abgelaufen.
              <span className="sr-only">Invalid or expired token</span>
            </p>
            <p className="auth-error-state__hint">
              Bitte fordern Sie einen neuen Link an, falls Sie Ihr Passwort zurücksetzen möchten.
            </p>
          </div>

          <div className="auth-links">
            <Link to="/forgot-password" className="auth-button auth-button--primary">
              Neuen Link anfordern
            </Link>
            <Link to="/login" className="auth-link">
              Zurück zur Anmeldung
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            <h1 className="auth-title">Passwort zurückgesetzt</h1>
          </div>

          <div className="auth-success confirmation-message">
            <div className="auth-success__icon" aria-hidden="true">
              ✓
            </div>
            <p className="auth-success__message success-message">
              Ihr Passwort wurde erfolgreich zurückgesetzt.
            </p>
            <p className="auth-success__hint">
              Sie werden in wenigen Sekunden zur Anmeldung weitergeleitet...
            </p>
          </div>

          <div className="auth-links">
            <Link to="/login" className="auth-button auth-button--primary">
              Jetzt anmelden
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
          <h1 className="auth-title">Neues Passwort festlegen</h1>
          <p className="auth-subtitle">
            Bitte geben Sie Ihr neues Passwort ein.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* Error Message */}
          {error && (
            <div className="auth-error validation-error" role="alert">
              <span className="auth-error__icon" aria-hidden="true">
                !
              </span>
              {error}
            </div>
          )}

          {/* New Password Field */}
          <div className="auth-field">
            <label htmlFor="newPassword" className="auth-label">
              Neues Passwort
            </label>
            <div className="auth-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                className={`auth-input ${
                  formData.newPassword && !passwordValidation.isValid ? 'auth-input--error' : ''
                }`}
                placeholder="Mindestens 8 Zeichen"
                autoComplete="new-password"
                autoFocus
                required
                disabled={isLoading}
                aria-describedby="password-requirements"
              />
              <button
                type="button"
                className="auth-input-toggle"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>

            {/* Password Strength Indicator */}
            <PasswordStrengthIndicator
              password={formData.newPassword}
              showRequirements={true}
            />
          </div>

          {/* Confirm Password Field */}
          <div className="auth-field">
            <label htmlFor="confirmPassword" className="auth-label">
              Passwort bestätigen
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`auth-input ${
                formData.confirmPassword && !passwordsMatch ? 'auth-input--error' : ''
              }`}
              placeholder="Passwort wiederholen"
              autoComplete="new-password"
              required
              disabled={isLoading}
            />
            {formData.confirmPassword && !passwordsMatch && (
              <p className="auth-field-error validation-error" role="alert">
                Die Passwörter stimmen nicht überein.
              </p>
            )}
            {formData.confirmPassword && passwordsMatch && formData.newPassword && (
              <p className="auth-field-success">
                <span aria-hidden="true">✓</span> Passwörter stimmen überein
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="auth-button auth-button--primary"
            disabled={isLoading || !isFormValid}
          >
            {isLoading ? (
              <>
                <span className="auth-button__spinner" aria-hidden="true" />
                Wird gespeichert...
              </>
            ) : (
              'Passwort speichern'
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

export default ResetPasswordPage;
