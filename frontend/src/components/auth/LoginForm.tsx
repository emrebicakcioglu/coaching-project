/**
 * LoginForm Component
 * STORY-007B: Login System Frontend UI
 * STORY-CAPTCHA: Login Security with CAPTCHA
 * STORY-002-001: i18n Support for Login Page
 *
 * Reusable login form component with validation, accessibility features,
 * and password visibility toggle.
 *
 * Features:
 * - Email and password validation
 * - Password visibility toggle
 * - Loading state with spinner
 * - Error display
 * - Full keyboard navigation
 * - ARIA accessibility labels
 * - Responsive design
 * - CAPTCHA support
 */

import React, { useState, useCallback, FormEvent, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RememberMeCheckbox } from './RememberMeCheckbox';
import { CaptchaInput } from './CaptchaInput';
import { EyeIcon, EyeOffIcon } from '../icons';

/**
 * Form data interface
 */
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
  captchaId?: string;
  captchaAnswer?: string;
}

/**
 * CAPTCHA challenge data
 * STORY-CAPTCHA: Login Security
 */
export interface CaptchaChallengeData {
  captchaId: string;
  question: string;
  expiresAt: string;
}

/**
 * Props for LoginForm component
 */
export interface LoginFormProps {
  /** Form submission handler */
  onSubmit: (data: LoginFormData) => void | Promise<void>;
  /** Whether form is in loading state */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Success message to display */
  successMessage?: string | null;
  /** Whether to show Remember Me checkbox */
  showRememberMe?: boolean;
  /** Whether to show Forgot Password link */
  showForgotPassword?: boolean;
  /** Initial form values */
  initialValues?: Partial<LoginFormData>;
  /** Auto-focus email input */
  autoFocus?: boolean;
  /** Callback when any input changes (useful for clearing external errors) */
  onInputChange?: () => void;
  /** Whether CAPTCHA is required */
  requiresCaptcha?: boolean;
  /** Current CAPTCHA challenge */
  captcha?: CaptchaChallengeData | null;
  /** CAPTCHA answer value */
  captchaAnswer?: string;
  /** Callback when CAPTCHA answer changes */
  onCaptchaChange?: (value: string) => void;
  /** Callback to refresh CAPTCHA */
  onCaptchaRefresh?: () => void;
  /** Whether CAPTCHA is loading */
  isCaptchaLoading?: boolean;
  /** CAPTCHA error message */
  captchaError?: string | null;
  /** Delay message to show */
  delayMessage?: string | null;
}

/**
 * Validation result interface with translation keys
 */
interface ValidationResult {
  isValid: boolean;
  emailErrorKey?: string;
  passwordErrorKey?: string;
}

/**
 * Validate form data - returns translation keys for error messages
 */
const validateForm = (data: LoginFormData): ValidationResult => {
  const result: ValidationResult = { isValid: true };

  // Email validation
  if (!data.email.trim()) {
    result.emailErrorKey = 'login.validation.emailRequired';
    result.isValid = false;
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      result.emailErrorKey = 'login.validation.invalidEmail';
      result.isValid = false;
    }
  }

  // Password validation
  if (!data.password) {
    result.passwordErrorKey = 'login.validation.passwordRequired';
    result.isValid = false;
  }

  return result;
};

/**
 * LoginForm Component
 */
export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  isLoading = false,
  error = null,
  successMessage = null,
  showRememberMe = true,
  showForgotPassword = true,
  initialValues = {},
  autoFocus = true,
  onInputChange,
  requiresCaptcha = false,
  captcha = null,
  captchaAnswer = '',
  onCaptchaChange,
  onCaptchaRefresh,
  isCaptchaLoading = false,
  captchaError = null,
  delayMessage = null,
}) => {
  const { t } = useTranslation('auth');

  // Form state
  const [formData, setFormData] = useState<LoginFormData>({
    email: initialValues.email || '',
    password: initialValues.password || '',
    rememberMe: initialValues.rememberMe || false,
  });

  // Field-level errors
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  // Password visibility toggle
  const [showPassword, setShowPassword] = useState(false);

  // Refs for focus management
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus email input on mount
  useEffect(() => {
    if (autoFocus && emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [autoFocus]);

  /**
   * Handle input change
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value, type, checked } = e.target;
      const newValue = type === 'checkbox' ? checked : value;

      setFormData((prev) => ({
        ...prev,
        [name]: newValue,
      }));

      // Clear ALL field errors when user starts typing in ANY field
      if (fieldErrors.email || fieldErrors.password) {
        setFieldErrors({});
      }

      // Notify parent of input change (for clearing external errors)
      if (onInputChange) {
        onInputChange();
      }
    },
    [fieldErrors, onInputChange]
  );

  /**
   * Handle Remember Me change
   */
  const handleRememberMeChange = useCallback((checked: boolean) => {
    setFormData((prev) => ({ ...prev, rememberMe: checked }));
  }, []);

  /**
   * Toggle password visibility
   */
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
    // Keep focus on password input after toggle
    if (passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, []);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      // Validate form
      const validation = validateForm(formData);

      if (!validation.isValid) {
        setFieldErrors({
          email: validation.emailErrorKey ? t(validation.emailErrorKey) : undefined,
          password: validation.passwordErrorKey ? t(validation.passwordErrorKey) : undefined,
        });

        // Focus first field with error
        if (validation.emailErrorKey && emailInputRef.current) {
          emailInputRef.current.focus();
        } else if (validation.passwordErrorKey && passwordInputRef.current) {
          passwordInputRef.current.focus();
        }

        return;
      }

      // Clear any previous errors
      setFieldErrors({});

      // Call submit handler with CAPTCHA data
      await onSubmit({
        ...formData,
        captchaId: captcha?.captchaId,
        captchaAnswer: requiresCaptcha ? captchaAnswer : undefined,
      });
    },
    [formData, onSubmit, captcha, requiresCaptcha, captchaAnswer, t]
  );

  // Determine if there are any errors to display
  const hasError = error || fieldErrors.email || fieldErrors.password;
  const displayError = error || fieldErrors.email || fieldErrors.password;

  return (
    <form
      className="auth-form"
      onSubmit={handleSubmit}
      noValidate
      aria-label={t('login.formLabel')}
      data-testid="login-form"
    >
      {/* Success Message */}
      {successMessage && (
        <div
          className="auth-success-message"
          role="status"
          aria-live="polite"
          data-testid="success-message"
        >
          <span className="auth-success-message__icon" aria-hidden="true">
            ✓
          </span>
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {hasError && (
        <div
          className="auth-error"
          role="alert"
          aria-live="assertive"
          data-testid="error-message"
        >
          <span className="auth-error__icon" aria-hidden="true">
            !
          </span>
          {displayError}
        </div>
      )}

      {/* Email Field */}
      <div className="auth-field">
        <label htmlFor="email" className="auth-label">
          {t('login.email')}
        </label>
        <input
          ref={emailInputRef}
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          className={`auth-input ${fieldErrors.email ? 'auth-input--error' : ''}`}
          placeholder={t('login.emailPlaceholder')}
          autoComplete="email"
          required
          disabled={isLoading}
          aria-required="true"
          aria-invalid={!!fieldErrors.email}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          data-testid="email-input"
        />
        {fieldErrors.email && (
          <span id="email-error" className="auth-field-error" role="alert">
            {fieldErrors.email}
          </span>
        )}
      </div>

      {/* Password Field */}
      <div className="auth-field">
        <div className="auth-field-header">
          <label htmlFor="password" className="auth-label">
            {t('login.password')}
          </label>
        </div>
        <div className="auth-input-wrapper">
          <input
            ref={passwordInputRef}
            type={showPassword ? 'text' : 'password'}
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className={`auth-input ${fieldErrors.password ? 'auth-input--error' : ''}`}
            placeholder={t('login.passwordPlaceholder')}
            autoComplete="current-password"
            required
            disabled={isLoading}
            aria-required="true"
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            data-testid="password-input"
          />
          <button
            type="button"
            className="auth-input-toggle"
            onClick={togglePasswordVisibility}
            disabled={isLoading}
            aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
            aria-pressed={showPassword}
            data-testid="password-toggle"
          >
            {showPassword ? (
              <EyeOffIcon className="w-5 h-5" aria-hidden="true" />
            ) : (
              <EyeIcon className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
        {fieldErrors.password && (
          <span id="password-error" className="auth-field-error" role="alert">
            {fieldErrors.password}
          </span>
        )}
        {showForgotPassword && (
          <div className="auth-field-footer">
            <Link
              to="/forgot-password"
              className="auth-link auth-link--small"
              tabIndex={isLoading ? -1 : 0}
              data-testid="forgot-password-link"
            >
              {t('login.forgotPassword')}
            </Link>
          </div>
        )}
      </div>

      {/* Remember Me Checkbox */}
      {showRememberMe && (
        <div className="auth-field auth-field--checkbox" data-testid="remember-me-wrapper">
          <RememberMeCheckbox
            checked={formData.rememberMe}
            onChange={handleRememberMeChange}
            disabled={isLoading}
            id="remember-me"
          />
        </div>
      )}

      {/* Delay Message */}
      {delayMessage && (
        <div
          className="auth-delay-message"
          role="status"
          aria-live="polite"
          data-testid="delay-message"
        >
          <span className="auth-delay-message__icon" aria-hidden="true">⏱️</span>
          {delayMessage}
        </div>
      )}

      {/* CAPTCHA Section */}
      {requiresCaptcha && captcha && (
        <CaptchaInput
          question={captcha.question}
          captchaId={captcha.captchaId}
          value={captchaAnswer}
          onChange={onCaptchaChange || (() => {})}
          onRefresh={onCaptchaRefresh || (() => {})}
          isLoading={isCaptchaLoading}
          error={captchaError}
          disabled={isLoading}
        />
      )}

      {/* Submit Button */}
      <button
        type="submit"
        className="auth-button auth-button--primary"
        disabled={isLoading}
        aria-busy={isLoading}
        data-testid="login-button"
      >
        {isLoading ? (
          <>
            <span
              className="auth-button__spinner"
              aria-hidden="true"
              data-testid="loading-spinner"
            />
            <span>{t('login.submitting')}</span>
          </>
        ) : (
          t('login.submit')
        )}
      </button>
    </form>
  );
};

export default LoginForm;
