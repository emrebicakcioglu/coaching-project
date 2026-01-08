/**
 * RegisterPage Component
 * STORY-023: User Registration
 * STORY-3: Register Page UI Audit - Logo and UI consistency
 * STORY-104: Language Selection on Login Page
 *
 * Page component for user registration.
 * Located at /register in the application.
 *
 * Features:
 * - Responsive design (Mobile/Tablet/Desktop)
 * - Password visibility toggle
 * - Password strength indicator
 * - Loading state with spinner
 * - Error handling with clear messages
 * - Full keyboard navigation
 * - ARIA accessibility labels
 * - Consistent branding with shared AuthLogo component
 * - Language selector for pre-login language switching (STORY-104)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts';
import { RegisterForm, RegisterFormData, AuthLogo } from '../components/auth';
import { LanguageSelector } from '../components/navigation/LanguageSelector';
import { registrationService } from '../services/authService';
import './AuthPages.css';

/**
 * RegisterPage Component
 */
export const RegisterPage: React.FC = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Form state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  /**
   * Handle input change - clear error when user starts typing
   */
  const handleInputChange = useCallback(() => {
    if (error) {
      setError(null);
    }
  }, [error]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (formData: RegisterFormData) => {
      setIsLoading(true);
      setError(null);

      try {
        await registrationService.register({
          email: formData.email,
          name: formData.name,
          password: formData.password,
          passwordConfirm: formData.passwordConfirm,
        });

        // Navigate to registration success page
        navigate('/registration-success', {
          state: { email: formData.email },
          replace: true,
        });
      } catch (err) {
        // Handle specific error cases
        let errorMessage = t('register.errors.generic');

        if (err instanceof Error) {
          const errorStr = err.message.toLowerCase();
          if (errorStr.includes('409') || errorStr.includes('exists') || errorStr.includes('conflict')) {
            errorMessage = t('register.errors.emailExists');
          } else if (errorStr.includes('400') || errorStr.includes('validation')) {
            errorMessage = t('register.errors.validation');
          } else if (errorStr.includes('429') || errorStr.includes('too many')) {
            errorMessage = t('register.errors.tooManyAttempts');
          } else if (errorStr.includes('network') || errorStr.includes('fetch')) {
            errorMessage = t('register.errors.network');
          } else if (errorStr.includes('password') && errorStr.includes('match')) {
            errorMessage = t('register.errors.passwordMismatch');
          }
        }

        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, t]
  );

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="auth-page" data-testid="register-page">
        <div className="auth-container">
          <div className="auth-loading" role="status" aria-label={t('loading')}>
            <div className="auth-loading__spinner" aria-hidden="true" />
            <p className="auth-loading__text">{t('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page" data-testid="register-page">
      {/* STORY-104: Language Selector - positioned in top-right corner */}
      <div className="auth-page__language-selector" data-testid="register-language-selector">
        <LanguageSelector variant="icon" />
      </div>

      <div className="auth-container auth-container--register" data-testid="register-container">
        {/* Logo - STORY-3: Using shared AuthLogo component for consistency */}
        <AuthLogo data-testid="register-auth-logo" />

        <div className="auth-header">
          <h1 className="auth-title" data-testid="register-title">
            {t('register.title')}
          </h1>
          <p className="auth-subtitle">
            {t('register.subtitle')}
          </p>
        </div>

        {/* Register Form */}
        <RegisterForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          error={error}
          autoFocus
          onInputChange={handleInputChange}
        />

        {/* Additional Links */}
        <div className="auth-footer" data-testid="register-footer">
          <p className="auth-footer__text">
            {t('register.hasAccount')}{' '}
            <Link
              to="/login"
              className="auth-link"
              tabIndex={isLoading ? -1 : 0}
              data-testid="login-link"
            >
              {t('register.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
