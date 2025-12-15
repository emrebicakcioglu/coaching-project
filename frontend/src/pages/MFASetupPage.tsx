/**
 * MFA Setup Page Component
 * STORY-005C: MFA UI (Frontend)
 *
 * Multi-step MFA setup wizard in account settings.
 * Guides users through enabling two-factor authentication.
 *
 * Steps:
 * 1. Init - Introduction and enable button
 * 2. Verify - QR code display and code verification
 * 3. Backup - Display and download backup codes
 * 4. Done - Success confirmation
 *
 * Features:
 * - QR code display (300x300px)
 * - Manual entry code for copy/paste
 * - 6-digit code verification with auto-submit
 * - Backup codes display with download
 * - Loading and error states
 * - Responsive design
 * - Accessible with ARIA labels
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '../components/layout';
import { MFACodeInput, BackupCodesList } from '../components/auth';
import { mfaService } from '../services/authService';
import { useAuth } from '../contexts';
import './MFASetup.css';

/**
 * MFA Setup Step Type
 */
type MFASetupStep = 'init' | 'verify' | 'backup' | 'done';

/**
 * MFASetupPage Component
 */
export const MFASetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  // State
  const [step, setStep] = useState<MFASetupStep>('init');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);

  /**
   * Handle MFA setup initiation
   */
  const handleInitiate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await mfaService.initiateMFASetup();
      setQrCodeUrl(response.qrCodeUrl);
      setSecret(response.secret);
      setBackupCodes(response.backupCodes);
      setStep('verify');
    } catch (err) {
      let errorMessage = 'MFA-Einrichtung fehlgeschlagen. Bitte versuchen Sie es erneut.';
      if (err instanceof Error) {
        if (err.message.includes('already enabled')) {
          errorMessage = 'MFA ist bereits für Ihr Konto aktiviert.';
        } else if (err.message.includes('unauthorized')) {
          errorMessage = 'Sie sind nicht angemeldet. Bitte melden Sie sich erneut an.';
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handle code verification
   */
  const handleVerify = useCallback(async (code: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await mfaService.verifyMFASetup(code);
      setStep('backup');
    } catch (err) {
      let errorMessage = 'Verifizierung fehlgeschlagen. Bitte überprüfen Sie den Code.';
      if (err instanceof Error) {
        if (err.message.includes('invalid') || err.message.includes('expired')) {
          errorMessage = 'Ungültiger oder abgelaufener Code. Bitte versuchen Sie es erneut.';
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handle completion
   */
  const handleComplete = useCallback(async () => {
    try {
      await refreshUser();
    } catch {
      // Ignore refresh errors
    }
    setStep('done');
  }, [refreshUser]);

  /**
   * Copy secret to clipboard
   */
  const handleCopySecret = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = secret;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    }
  }, [secret]);

  /**
   * Navigate to settings
   */
  const handleBackToSettings = useCallback(() => {
    navigate('/settings');
  }, [navigate]);

  return (
    <Container className="py-6">
      <div className="mfa-setup" data-testid="mfa-setup-page">
        {/* Header */}
        <div className="mfa-setup__header">
          <h1 className="mfa-setup__title">Zwei-Faktor-Authentifizierung</h1>
          <p className="mfa-setup__subtitle">
            Schützen Sie Ihr Konto mit einem zusätzlichen Sicherheitsfaktor.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mfa-setup__progress" role="progressbar" aria-valuenow={getStepNumber(step)} aria-valuemin={1} aria-valuemax={4}>
          <div className={`mfa-setup__step ${step === 'init' || step === 'verify' || step === 'backup' || step === 'done' ? 'mfa-setup__step--active' : ''}`}>
            <span className="mfa-setup__step-number">1</span>
            <span className="mfa-setup__step-label">Start</span>
          </div>
          <div className={`mfa-setup__step ${step === 'verify' || step === 'backup' || step === 'done' ? 'mfa-setup__step--active' : ''}`}>
            <span className="mfa-setup__step-number">2</span>
            <span className="mfa-setup__step-label">Verifizieren</span>
          </div>
          <div className={`mfa-setup__step ${step === 'backup' || step === 'done' ? 'mfa-setup__step--active' : ''}`}>
            <span className="mfa-setup__step-number">3</span>
            <span className="mfa-setup__step-label">Backup-Codes</span>
          </div>
          <div className={`mfa-setup__step ${step === 'done' ? 'mfa-setup__step--active' : ''}`}>
            <span className="mfa-setup__step-number">4</span>
            <span className="mfa-setup__step-label">Fertig</span>
          </div>
        </div>

        {/* Content */}
        <div className="mfa-setup__content">
          {/* Step 1: Init */}
          {step === 'init' && (
            <div className="mfa-setup__init" data-testid="mfa-setup-init">
              <div className="mfa-setup__icon">
                <span aria-hidden="true">🔐</span>
              </div>
              <h2 className="mfa-setup__content-title">2FA aktivieren</h2>
              <p className="mfa-setup__content-description">
                Die Zwei-Faktor-Authentifizierung fügt eine zusätzliche Sicherheitsebene zu Ihrem
                Konto hinzu. Nach der Aktivierung benötigen Sie neben Ihrem Passwort einen
                zeitbasierten Code aus einer Authentifizierungs-App.
              </p>
              <ul className="mfa-setup__benefits">
                <li>Schutz vor unbefugtem Zugriff</li>
                <li>Sicherheit auch bei kompromittiertem Passwort</li>
                <li>Kompatibel mit gängigen Authenticator-Apps</li>
              </ul>

              {error && (
                <div className="mfa-setup__error" role="alert" data-testid="mfa-setup-error">
                  <span aria-hidden="true">❌</span>
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleInitiate}
                disabled={isLoading}
                className="mfa-setup__button mfa-setup__button--primary"
                data-testid="mfa-setup-enable-button"
              >
                {isLoading ? (
                  <>
                    <span className="mfa-setup__spinner" aria-hidden="true" />
                    Wird eingerichtet...
                  </>
                ) : (
                  '2FA aktivieren'
                )}
              </button>

              <button
                type="button"
                onClick={handleBackToSettings}
                className="mfa-setup__button mfa-setup__button--secondary"
              >
                Zurück zu Einstellungen
              </button>
            </div>
          )}

          {/* Step 2: Verify */}
          {step === 'verify' && (
            <div className="mfa-setup__verify" data-testid="mfa-setup-verify">
              <h2 className="mfa-setup__content-title">QR-Code scannen</h2>
              <p className="mfa-setup__content-description">
                Scannen Sie den QR-Code mit Ihrer Authenticator-App (z.B. Google Authenticator,
                Authy, Microsoft Authenticator).
              </p>

              {/* QR Code */}
              <div className="mfa-setup__qr-container">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="QR-Code für MFA-Einrichtung"
                    width="300"
                    height="300"
                    className="mfa-setup__qr-code"
                    data-testid="mfa-setup-qr-code"
                  />
                ) : (
                  <div className="mfa-setup__qr-placeholder">
                    <span className="mfa-setup__spinner" aria-hidden="true" />
                    Lade QR-Code...
                  </div>
                )}
              </div>

              {/* Manual Entry */}
              <div className="mfa-setup__manual-entry">
                <p className="mfa-setup__manual-label">
                  Oder geben Sie diesen Code manuell ein:
                </p>
                <div className="mfa-setup__secret-container">
                  <code className="mfa-setup__secret" data-testid="mfa-setup-secret">
                    {secret}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="mfa-setup__copy-button"
                    aria-label="Code kopieren"
                    data-testid="mfa-setup-copy-secret"
                  >
                    {secretCopied ? '✓' : '📋'}
                  </button>
                </div>
              </div>

              {/* Code Input */}
              <div className="mfa-setup__code-input">
                <MFACodeInput
                  onSubmit={handleVerify}
                  isLoading={isLoading}
                  error={error}
                  autoFocus
                  label="Verifizierungscode eingeben"
                  data-testid="mfa-setup-code-input"
                />
              </div>

              <p className="mfa-setup__hint">
                Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein.
              </p>
            </div>
          )}

          {/* Step 3: Backup */}
          {step === 'backup' && (
            <div className="mfa-setup__backup" data-testid="mfa-setup-backup">
              <h2 className="mfa-setup__content-title">Backup-Codes speichern</h2>
              <p className="mfa-setup__content-description">
                Speichern Sie diese Backup-Codes sicher. Sie können jeden Code einmal verwenden,
                falls Sie keinen Zugriff auf Ihre Authenticator-App haben.
              </p>

              <BackupCodesList
                codes={backupCodes}
                appName="Core App"
                data-testid="mfa-setup-backup-codes"
              />

              <button
                type="button"
                onClick={handleComplete}
                className="mfa-setup__button mfa-setup__button--primary"
                data-testid="mfa-setup-complete-button"
              >
                Ich habe die Codes gespeichert
              </button>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <div className="mfa-setup__done" data-testid="mfa-setup-done">
              <div className="mfa-setup__success-icon">
                <span aria-hidden="true">✅</span>
              </div>
              <h2 className="mfa-setup__content-title">2FA aktiviert!</h2>
              <p className="mfa-setup__content-description">
                Ihr Konto ist jetzt mit Zwei-Faktor-Authentifizierung geschützt. Bei der nächsten
                Anmeldung werden Sie nach einem Code aus Ihrer Authenticator-App gefragt.
              </p>

              <div className="mfa-setup__success-info">
                <p>
                  <strong>Wichtig:</strong> Bewahren Sie Ihre Backup-Codes sicher auf. Sie benötigen
                  diese, falls Sie keinen Zugriff auf Ihre Authenticator-App haben.
                </p>
              </div>

              <button
                type="button"
                onClick={handleBackToSettings}
                className="mfa-setup__button mfa-setup__button--primary"
                data-testid="mfa-setup-finish-button"
              >
                Fertig
              </button>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
};

/**
 * Get step number for progress indicator
 */
function getStepNumber(step: MFASetupStep): number {
  switch (step) {
    case 'init':
      return 1;
    case 'verify':
      return 2;
    case 'backup':
      return 3;
    case 'done':
      return 4;
    default:
      return 1;
  }
}

export default MFASetupPage;
