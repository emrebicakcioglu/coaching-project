/**
 * ResetPasswordPage Component
 * STORY-009: Password Reset
 *
 * Page component for resetting password with a valid token.
 * Located at /reset-password?token=... in the application.
 */

import React, { useState, useCallback, useMemo, FormEvent, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('auth');

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
        setError(t('resetPassword.validation.passwordRequirements'));
        return;
      }

      if (!passwordsMatch) {
        setError(t('resetPassword.validation.passwordMismatch'));
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
            state: { message: t('resetPassword.success.message') },
          });
        }, 3000);
      } catch (err) {
        // Handle specific error cases
        const errorMessage =
          err instanceof Error
            ? err.message
            : t('forgotPassword.errors.generic');

        // Check for common error patterns
        if (errorMessage.toLowerCase().includes('token') || errorMessage.toLowerCase().includes('expired')) {
          setTokenState('invalid');
          setError(t('resetPassword.error.message'));
        } else if (errorMessage.toLowerCase().includes('password')) {
          setError(t('resetPassword.validation.passwordRequirements'));
        } else {
          setError(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [token, formData.newPassword, passwordValidation.isValid, passwordsMatch, navigate, t]
  );

  // Token is being validated
  if (tokenState === 'validating') {
    return (
      <div className="auth-page">
        <div className="auth-container">
          {/* Logo placeholder */}
          <div className="auth-logo" aria-label={t('logo')}>
            <div className="auth-logo__placeholder" aria-hidden="true">
              <span>{t('logoText')}</span>
            </div>
          </div>

          <div className="auth-loading">
            <div className="auth-loading__spinner" aria-hidden="true" />
            <p className="auth-loading__text">{t('resetPassword.loading')}</p>
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
          <div className="auth-logo" aria-label={t('logo')}>
            <div className="auth-logo__placeholder" aria-hidden="true">
              <span>{t('logoText')}</span>
            </div>
          </div>

          <div className="auth-header">
            <h1 className="auth-title">{t('resetPassword.error.title')}</h1>
          </div>

          <div className="auth-error-state error-message">
            <div className="auth-error-state__icon" aria-hidden="true">
              ✕
            </div>
            <p className="auth-error-state__message">
              {t('resetPassword.error.message')}
              <span className="sr-only">Invalid or expired token</span>
            </p>
            <p className="auth-error-state__hint">
              {t('resetPassword.error.hint')}
            </p>
          </div>

          <div className="auth-links">
            <Link to="/forgot-password" className="auth-button auth-button--primary">
              {t('resetPassword.error.requestNew')}
            </Link>
            <Link to="/login" className="auth-link">
              {t('resetPassword.backToLogin')}
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
          <div className="auth-logo" aria-label={t('logo')}>
            <div className="auth-logo__placeholder" aria-hidden="true">
              <span>{t('logoText')}</span>
            </div>
          </div>

          <div className="auth-header">
            <h1 className="auth-title">{t('resetPassword.success.title')}</h1>
          </div>

          <div className="auth-success confirmation-message">
            <div className="auth-success__icon" aria-hidden="true">
              ✓
            </div>
            <p className="auth-success__message success-message">
              {t('resetPassword.success.message')}
            </p>
            <p className="auth-success__hint">
              {t('resetPassword.success.redirect')}
            </p>
          </div>

          <div className="auth-links">
            <Link to="/login" className="auth-button auth-button--primary">
              {t('resetPassword.success.loginNow')}
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
        <div className="auth-logo" aria-label={t('logo')}>
          <div className="auth-logo__placeholder" aria-hidden="true">
            <span>{t('logoText')}</span>
          </div>
        </div>

        <div className="auth-header">
          <h1 className="auth-title">{t('resetPassword.title')}</h1>
          <p className="auth-subtitle">
            {t('resetPassword.subtitle')}
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
              {t('resetPassword.newPassword')}
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
                placeholder={t('resetPassword.newPasswordPlaceholder')}
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
                aria-label={showPassword ? t('resetPassword.aria.hidePassword') : t('resetPassword.aria.showPassword')}
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
              {t('resetPassword.confirmPassword')}
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
              placeholder={t('resetPassword.confirmPasswordPlaceholder')}
              autoComplete="new-password"
              required
              disabled={isLoading}
            />
            {formData.confirmPassword && !passwordsMatch && (
              <p className="auth-field-error validation-error" role="alert">
                {t('resetPassword.validation.passwordMismatch')}
              </p>
            )}
            {formData.confirmPassword && passwordsMatch && formData.newPassword && (
              <p className="auth-field-success">
                <span aria-hidden="true">✓</span> {t('resetPassword.validation.match')}
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
                {t('resetPassword.submitting')}
              </>
            ) : (
              t('resetPassword.submit')
            )}
          </button>
        </form>

        {/* Links */}
        <div className="auth-links">
          <Link to="/login" className="auth-link">
            {t('resetPassword.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
