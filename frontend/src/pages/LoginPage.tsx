/**
 * LoginPage Component
 * STORY-001: Login System
 * STORY-007B: Login System Frontend UI
 * STORY-008: Session Management mit "Remember Me"
 * STORY-009: Password Reset - Added "Passwort vergessen?" link
 * STORY-CAPTCHA: Login Security with CAPTCHA
 *
 * Page component for user authentication.
 * Located at /login in the application.
 *
 * Features:
 * - Responsive design (Mobile/Tablet/Desktop)
 * - Password visibility toggle
 * - Loading state with spinner
 * - Error handling with clear messages
 * - Forgot password link
 * - Full keyboard navigation
 * - ARIA accessibility labels
 * - CAPTCHA after 2 failed login attempts
 * - 10 second delay for subsequent attempts
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts';
import { LoginForm, LoginFormData, CaptchaChallengeData } from '../components/auth/LoginForm';
import { captchaService, CaptchaChallenge } from '../services/authService';
import './AuthPages.css';

/**
 * Location state for success messages
 */
interface LocationState {
  message?: string;
  from?: string;
  returnUrl?: string;
}

/**
 * LoginPage Component
 */
export const LoginPage: React.FC = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const locationState = location.state as LocationState | null;

  // Form state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    locationState?.message || null
  );

  // CAPTCHA state
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaChallengeData | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [isCaptchaLoading, setIsCaptchaLoading] = useState(false);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [delayMessage, setDelayMessage] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const returnUrl = locationState?.returnUrl || locationState?.from || '/dashboard';
      navigate(returnUrl, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, locationState]);

  // Clear location state after reading message
  useEffect(() => {
    if (locationState?.message) {
      // Clear state to prevent message from showing on refresh
      window.history.replaceState({}, document.title);
    }
  }, [locationState]);

  /**
   * Load a new CAPTCHA challenge
   */
  const loadCaptcha = useCallback(async () => {
    setIsCaptchaLoading(true);
    setCaptchaError(null);
    try {
      const newCaptcha = await captchaService.getCaptcha();
      setCaptcha(newCaptcha);
      setCaptchaAnswer('');
    } catch (err) {
      console.error('Failed to load CAPTCHA:', err);
      setCaptchaError(t('login.captchaLoadError'));
    } finally {
      setIsCaptchaLoading(false);
    }
  }, []);

  /**
   * Handle input change - clear error when user starts typing
   */
  const handleInputChange = useCallback(() => {
    if (error) {
      setError(null);
    }
    setCaptchaError(null);
  }, [error]);

  /**
   * Handle CAPTCHA answer change
   */
  const handleCaptchaChange = useCallback((value: string) => {
    setCaptchaAnswer(value);
    if (captchaError) {
      setCaptchaError(null);
    }
  }, [captchaError]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (formData: LoginFormData) => {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);
      setCaptchaError(null);
      setDelayMessage(null);

      try {
        await login({
          email: formData.email,
          password: formData.password,
          rememberMe: formData.rememberMe,
          captchaId: formData.captchaId,
          captchaAnswer: formData.captchaAnswer,
        });

        // Redirect to return URL or dashboard on success
        const returnUrl = locationState?.returnUrl || locationState?.from || '/dashboard';
        navigate(returnUrl, { replace: true });
      } catch (err: unknown) {
        // Check if error contains CAPTCHA info
        const captchaInfo = captchaService.parseCaptchaFromError(err);

        if (captchaInfo?.requiresCaptcha && captchaInfo.captcha) {
          // CAPTCHA is now required
          setRequiresCaptcha(true);
          setCaptcha(captchaInfo.captcha);
          setCaptchaAnswer('');

          // Show delay message if applicable
          if (captchaInfo.delaySeconds && captchaInfo.delaySeconds > 0) {
            setDelayMessage(t('login.delayMessage', { seconds: captchaInfo.delaySeconds }));
          }

          // Set appropriate error message
          if (captchaInfo.message.toLowerCase().includes('captcha')) {
            setCaptchaError(captchaInfo.message);
          } else {
            setError(captchaInfo.message);
          }
        } else {
          // Handle other error cases
          let errorMessage = t('login.errors.generic');

          if (err instanceof Error) {
            const errorStr = err.message.toLowerCase();
            if (errorStr.includes('401') || errorStr.includes('unauthorized') || errorStr.includes('invalid')) {
              errorMessage = t('login.errors.invalidCredentials');
            } else if (errorStr.includes('429') || errorStr.includes('too many')) {
              errorMessage = t('login.errors.tooManyAttempts');
            } else if (errorStr.includes('network') || errorStr.includes('fetch')) {
              errorMessage = t('login.errors.network');
            } else if (errorStr.includes('locked') || errorStr.includes('disabled')) {
              errorMessage = t('login.errors.accountLocked');
            }
          }

          setError(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [login, navigate, locationState]
  );

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="auth-page" data-testid="login-page">
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
    <div className="auth-page" data-testid="login-page">
      <div className="auth-container" data-testid="login-container">
        {/* Logo placeholder */}
        <div className="auth-logo" aria-label={t('logo')}>
          <div className="auth-logo__placeholder" aria-hidden="true">
            <span>LOGO</span>
          </div>
        </div>

        <div className="auth-header">
          <h1 className="auth-title" data-testid="login-title">
            {t('login.title')}
          </h1>
          <p className="auth-subtitle">
            {t('login.subtitle')}
          </p>
        </div>

        {/* Login Form */}
        <LoginForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          error={error}
          successMessage={successMessage}
          showRememberMe
          showForgotPassword
          autoFocus
          onInputChange={handleInputChange}
          requiresCaptcha={requiresCaptcha}
          captcha={captcha}
          captchaAnswer={captchaAnswer}
          onCaptchaChange={handleCaptchaChange}
          onCaptchaRefresh={loadCaptcha}
          isCaptchaLoading={isCaptchaLoading}
          captchaError={captchaError}
          delayMessage={delayMessage}
        />

        {/* Additional Links */}
        <div className="auth-footer" data-testid="login-footer">
          <p className="auth-footer__text">
            {t('login.noAccount')}{' '}
            <Link
              to="/register"
              className="auth-link"
              tabIndex={isLoading ? -1 : 0}
              data-testid="register-link"
            >
              {t('login.register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
