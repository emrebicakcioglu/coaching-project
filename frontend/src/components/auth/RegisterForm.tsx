/**
 * RegisterForm Component
 * STORY-023: User Registration
 * STORY-002-002: i18n Support for Register Page
 *
 * Reusable registration form component with validation, password strength indicator,
 * and accessibility features.
 *
 * Features:
 * - Email, name, and password validation
 * - Password strength indicator
 * - Password visibility toggle
 * - Password confirmation validation
 * - Loading state with spinner
 * - Error display
 * - Full keyboard navigation
 * - ARIA accessibility labels
 * - Responsive design
 * - Full i18n support with react-i18next
 */

import React, { useState, useCallback, FormEvent, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { EyeIcon, EyeOffIcon } from '../icons';

/**
 * Form data interface
 */
export interface RegisterFormData {
  email: string;
  name: string;
  password: string;
  passwordConfirm: string;
}

/**
 * Props for RegisterForm component
 */
export interface RegisterFormProps {
  /** Form submission handler */
  onSubmit: (data: RegisterFormData) => void | Promise<void>;
  /** Whether form is in loading state */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Initial form values */
  initialValues?: Partial<RegisterFormData>;
  /** Auto-focus email input */
  autoFocus?: boolean;
  /** Callback when any input changes (useful for clearing external errors) */
  onInputChange?: () => void;
}

/**
 * Validation result interface
 */
interface ValidationResult {
  isValid: boolean;
  emailError?: string;
  nameError?: string;
  passwordError?: string;
  passwordConfirmError?: string;
}

/**
 * Password validation requirements
 */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

/**
 * Type for translation function
 */
type TFunction = (key: string, options?: Record<string, unknown>) => string;

/**
 * Validate form data with i18n support
 */
const validateForm = (data: RegisterFormData, t: TFunction): ValidationResult => {
  const result: ValidationResult = { isValid: true };

  // Email validation
  if (!data.email.trim()) {
    result.emailError = t('register.validation.emailRequired');
    result.isValid = false;
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      result.emailError = t('register.validation.invalidEmail');
      result.isValid = false;
    }
  }

  // Name validation
  if (!data.name.trim()) {
    result.nameError = t('register.validation.nameRequired');
    result.isValid = false;
  } else if (data.name.trim().length < 2) {
    result.nameError = t('register.validation.nameMinLength');
    result.isValid = false;
  }

  // Password validation
  if (!data.password) {
    result.passwordError = t('register.validation.passwordRequired');
    result.isValid = false;
  } else if (data.password.length < PASSWORD_MIN_LENGTH) {
    result.passwordError = t('register.validation.passwordMinLength', { count: PASSWORD_MIN_LENGTH });
    result.isValid = false;
  } else if (!PASSWORD_REGEX.test(data.password)) {
    result.passwordError = t('register.validation.passwordPattern');
    result.isValid = false;
  }

  // Password confirmation validation
  if (!data.passwordConfirm) {
    result.passwordConfirmError = t('register.validation.passwordConfirmRequired');
    result.isValid = false;
  } else if (data.password !== data.passwordConfirm) {
    result.passwordConfirmError = t('register.validation.passwordMismatch');
    result.isValid = false;
  }

  return result;
};

/**
 * RegisterForm Component
 */
export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  isLoading = false,
  error = null,
  initialValues = {},
  autoFocus = true,
  onInputChange,
}) => {
  // i18n translation hook
  const { t } = useTranslation('auth');

  // Form state
  const [formData, setFormData] = useState<RegisterFormData>({
    email: initialValues.email || '',
    name: initialValues.name || '',
    password: initialValues.password || '',
    passwordConfirm: initialValues.passwordConfirm || '',
  });

  // Field-level errors
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    name?: string;
    password?: string;
    passwordConfirm?: string;
  }>({});

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // Refs for focus management
  const emailInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const passwordConfirmInputRef = useRef<HTMLInputElement>(null);

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
      const { name, value } = e.target;

      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));

      // Clear field error when user starts typing
      if (fieldErrors[name as keyof typeof fieldErrors]) {
        setFieldErrors((prev) => ({
          ...prev,
          [name]: undefined,
        }));
      }

      // Notify parent of input change (for clearing external errors)
      if (onInputChange) {
        onInputChange();
      }
    },
    [fieldErrors, onInputChange]
  );

  /**
   * Toggle password visibility
   */
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
    if (passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, []);

  /**
   * Toggle password confirmation visibility
   */
  const togglePasswordConfirmVisibility = useCallback(() => {
    setShowPasswordConfirm((prev) => !prev);
    if (passwordConfirmInputRef.current) {
      passwordConfirmInputRef.current.focus();
    }
  }, []);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      // Validate form with translations
      const validation = validateForm(formData, t);

      if (!validation.isValid) {
        setFieldErrors({
          email: validation.emailError,
          name: validation.nameError,
          password: validation.passwordError,
          passwordConfirm: validation.passwordConfirmError,
        });

        // Focus first field with error
        if (validation.emailError && emailInputRef.current) {
          emailInputRef.current.focus();
        } else if (validation.nameError && nameInputRef.current) {
          nameInputRef.current.focus();
        } else if (validation.passwordError && passwordInputRef.current) {
          passwordInputRef.current.focus();
        } else if (validation.passwordConfirmError && passwordConfirmInputRef.current) {
          passwordConfirmInputRef.current.focus();
        }

        return;
      }

      // Clear any previous errors
      setFieldErrors({});

      // Call submit handler
      await onSubmit(formData);
    },
    [formData, onSubmit, t]
  );

  // Determine if there are any errors to display
  const hasError = error || Object.values(fieldErrors).some(Boolean);
  const displayError = error || fieldErrors.email || fieldErrors.name || fieldErrors.password || fieldErrors.passwordConfirm;

  return (
    <form
      className="auth-form"
      onSubmit={handleSubmit}
      noValidate
      aria-label={t('register.formLabel')}
      data-testid="register-form"
    >
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
          {t('register.email')}
        </label>
        <input
          ref={emailInputRef}
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          className={`auth-input ${fieldErrors.email ? 'auth-input--error' : ''}`}
          placeholder={t('register.emailPlaceholder')}
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

      {/* Name Field */}
      <div className="auth-field">
        <label htmlFor="name" className="auth-label">
          {t('register.name')}
        </label>
        <input
          ref={nameInputRef}
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          className={`auth-input ${fieldErrors.name ? 'auth-input--error' : ''}`}
          placeholder={t('register.namePlaceholder')}
          autoComplete="name"
          required
          disabled={isLoading}
          aria-required="true"
          aria-invalid={!!fieldErrors.name}
          aria-describedby={fieldErrors.name ? 'name-error' : undefined}
          data-testid="name-input"
        />
        {fieldErrors.name && (
          <span id="name-error" className="auth-field-error" role="alert">
            {fieldErrors.name}
          </span>
        )}
      </div>

      {/* Password Field */}
      <div className="auth-field">
        <label htmlFor="password" className="auth-label">
          {t('register.password')}
        </label>
        <div className="auth-input-wrapper">
          <input
            ref={passwordInputRef}
            type={showPassword ? 'text' : 'password'}
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className={`auth-input ${fieldErrors.password ? 'auth-input--error' : ''}`}
            placeholder={t('register.passwordPlaceholder')}
            autoComplete="new-password"
            required
            disabled={isLoading}
            aria-required="true"
            aria-invalid={!!fieldErrors.password}
            aria-describedby="password-requirements password-error"
            data-testid="password-input"
          />
          <button
            type="button"
            className="auth-input-toggle"
            onClick={togglePasswordVisibility}
            disabled={isLoading}
            aria-label={showPassword ? t('register.hidePassword') : t('register.showPassword')}
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

        {/* Password Strength Indicator */}
        <PasswordStrengthIndicator password={formData.password} />

        <p id="password-requirements" className="auth-field-hint" data-testid="password-requirements">
          {t('register.passwordRequirements')}
        </p>
      </div>

      {/* Password Confirmation Field */}
      <div className="auth-field">
        <label htmlFor="passwordConfirm" className="auth-label">
          {t('register.confirmPassword')}
        </label>
        <div className="auth-input-wrapper">
          <input
            ref={passwordConfirmInputRef}
            type={showPasswordConfirm ? 'text' : 'password'}
            id="passwordConfirm"
            name="passwordConfirm"
            value={formData.passwordConfirm}
            onChange={handleInputChange}
            className={`auth-input ${fieldErrors.passwordConfirm ? 'auth-input--error' : ''}`}
            placeholder={t('register.confirmPasswordPlaceholder')}
            autoComplete="new-password"
            required
            disabled={isLoading}
            aria-required="true"
            aria-invalid={!!fieldErrors.passwordConfirm}
            aria-describedby={fieldErrors.passwordConfirm ? 'password-confirm-error' : undefined}
            data-testid="password-confirm-input"
          />
          <button
            type="button"
            className="auth-input-toggle"
            onClick={togglePasswordConfirmVisibility}
            disabled={isLoading}
            aria-label={showPasswordConfirm ? t('register.hidePassword') : t('register.showPassword')}
            aria-pressed={showPasswordConfirm}
            data-testid="password-confirm-toggle"
          >
            {showPasswordConfirm ? (
              <EyeOffIcon className="w-5 h-5" aria-hidden="true" />
            ) : (
              <EyeIcon className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
        {fieldErrors.passwordConfirm && (
          <span id="password-confirm-error" className="auth-field-error" role="alert">
            {fieldErrors.passwordConfirm}
          </span>
        )}
      </div>

      {/* Privacy Policy Link */}
      <div className="auth-field auth-field--checkbox">
        <p className="auth-privacy-notice" data-testid="privacy-notice">
          {t('register.privacyPrefix')}{' '}
          <Link to="/privacy" className="auth-link" tabIndex={isLoading ? -1 : 0} data-testid="privacy-link">
            {t('register.privacyPolicy')}
          </Link>{' '}
          {t('register.privacySuffix')}
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="auth-button auth-button--primary"
        disabled={isLoading}
        aria-busy={isLoading}
        data-testid="register-button"
      >
        {isLoading ? (
          <>
            <span
              className="auth-button__spinner"
              aria-hidden="true"
              data-testid="loading-spinner"
            />
            <span>{t('register.submitting')}</span>
          </>
        ) : (
          t('register.submit')
        )}
      </button>
    </form>
  );
};

export default RegisterForm;
