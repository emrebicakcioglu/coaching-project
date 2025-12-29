/**
 * LoginPage Component
 * STORY-001: Login System
 * STORY-007B: Login System Frontend UI
 * STORY-008: Session Management mit "Remember Me"
 * STORY-009: Password Reset - Added "Passwort vergessen?" link
 * STORY-CAPTCHA: Login Security with CAPTCHA
 * STORY-3: Register Page UI Audit - Logo consistency
 * STORY-002-REWORK-001: Login Error Message Localization
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
 * - Consistent branding with shared AuthLogo component
 * - Localized error messages (DE/EN)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts';
import { LoginForm, LoginFormData, CaptchaChallengeData, AuthLogo } from '../components/auth';
import { captchaService, CaptchaChallenge } from '../services/authService';
import { logger } from '../services/loggerService';
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
 * Error code to translation key mapping
 * STORY-002-REWORK-001: Login Error Message Localization
 */
const ERROR_CODE_TO_TRANSLATION_KEY: Record<string, string> = {
  // Auth errors
  AUTH_INVALID_CREDENTIALS: 'login.errors.invalidCredentials',
  AUTH_EMAIL_NOT_VERIFIED: 'login.errors.emailNotVerified',
  AUTH_ACCOUNT_INACTIVE: 'login.errors.accountLocked',
  // CAPTCHA errors
  CAPTCHA_REQUIRED: 'login.errors.captchaRequired',
  CAPTCHA_INVALID: 'login.errors.captchaInvalid',
};

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
      logger.error('Failed to load CAPTCHA', err);
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

          // STORY-002-REWORK-001: Translate error using error code
          const errorCode = captchaInfo.errorCode || captchaInfo.message;
          const translationKey = ERROR_CODE_TO_TRANSLATION_KEY[errorCode];

          if (translationKey) {
            // Use translated error message
            const translatedMessage = t(translationKey);
            if (errorCode === 'CAPTCHA_REQUIRED' || errorCode === 'CAPTCHA_INVALID') {
              setCaptchaError(translatedMessage);
            } else {
              setError(translatedMessage);
            }
          } else {
            // Fallback: Check if it's a CAPTCHA-related error
            if (errorCode.includes('CAPTCHA')) {
              setCaptchaError(t('login.errors.captchaInvalid'));
            } else {
              setError(t('login.errors.invalidCredentials'));
            }
          }
        } else {
          // Handle other error cases
          let errorMessage = t('login.errors.generic');

          // STORY-002-REWORK-001: Check for error code in axios error response
          if (err && typeof err === 'object' && 'response' in err) {
            const axiosErr = err as { response?: { data?: { errorCode?: string; message?: string } } };
            const errorCode = axiosErr.response?.data?.errorCode || axiosErr.response?.data?.message;

            if (errorCode && ERROR_CODE_TO_TRANSLATION_KEY[errorCode]) {
              errorMessage = t(ERROR_CODE_TO_TRANSLATION_KEY[errorCode]);
            }
          }

          // Fallback pattern matching for legacy error messages
          if (errorMessage === t('login.errors.generic') && err instanceof Error) {
            const errorStr = err.message.toLowerCase();
            if (errorStr.includes('401') || errorStr.includes('unauthorized') || errorStr.includes('invalid') || errorStr.includes('auth_invalid')) {
              errorMessage = t('login.errors.invalidCredentials');
            } else if (errorStr.includes('429') || errorStr.includes('too many')) {
              errorMessage = t('login.errors.tooManyAttempts');
            } else if (errorStr.includes('network') || errorStr.includes('fetch')) {
              errorMessage = t('login.errors.network');
            } else if (errorStr.includes('locked') || errorStr.includes('disabled') || errorStr.includes('inactive')) {
              errorMessage = t('login.errors.accountLocked');
            } else if (errorStr.includes('verify') || errorStr.includes('pending')) {
              errorMessage = t('login.errors.emailNotVerified');
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
        {/* Logo - STORY-3: Using shared AuthLogo component for consistency */}
        <AuthLogo data-testid="login-auth-logo" />

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
