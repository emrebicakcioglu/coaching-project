/**
 * RegisterPage Component
 * STORY-023: User Registration
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
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts';
import { RegisterForm, RegisterFormData } from '../components/auth/RegisterForm';
import { registrationService } from '../services/authService';
import './AuthPages.css';

/**
 * RegisterPage Component
 */
export const RegisterPage: React.FC = () => {
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
        let errorMessage = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';

        if (err instanceof Error) {
          const errorStr = err.message.toLowerCase();
          if (errorStr.includes('409') || errorStr.includes('exists') || errorStr.includes('conflict')) {
            errorMessage = 'Diese E-Mail-Adresse ist bereits registriert.';
          } else if (errorStr.includes('400') || errorStr.includes('validation')) {
            errorMessage = 'Bitte überprüfen Sie Ihre Eingaben.';
          } else if (errorStr.includes('429') || errorStr.includes('too many')) {
            errorMessage = 'Zu viele Registrierungsversuche. Bitte warten Sie einen Moment.';
          } else if (errorStr.includes('network') || errorStr.includes('fetch')) {
            errorMessage = 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.';
          } else if (errorStr.includes('password') && errorStr.includes('match')) {
            errorMessage = 'Die Passwörter stimmen nicht überein.';
          }
        }

        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [navigate]
  );

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="auth-page" data-testid="register-page">
        <div className="auth-container">
          <div className="auth-loading" role="status" aria-label="Wird geladen">
            <div className="auth-loading__spinner" aria-hidden="true" />
            <p className="auth-loading__text">Wird geladen...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page" data-testid="register-page">
      <div className="auth-container auth-container--register" data-testid="register-container">
        {/* Logo placeholder */}
        <div className="auth-logo" aria-label="Logo">
          <div className="auth-logo__placeholder" aria-hidden="true">
            <span>LOGO</span>
          </div>
        </div>

        <div className="auth-header">
          <h1 className="auth-title" data-testid="register-title">
            Registrieren
          </h1>
          <p className="auth-subtitle">
            Erstellen Sie ein neues Konto.
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
            Bereits registriert?{' '}
            <Link
              to="/login"
              className="auth-link"
              tabIndex={isLoading ? -1 : 0}
              data-testid="login-link"
            >
              Anmelden
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
