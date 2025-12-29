/**
 * MFA Setup Page Component
 * STORY-005C: MFA UI (Frontend)
 * STORY-107: MFA Settings Page UI Audit - Icon consistency improvements
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
 * - Consistent SVG icons (STORY-107)
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Container } from '../components/layout';
import { MFACodeInput, BackupCodesList } from '../components/auth';
import { mfaService } from '../services/authService';
import { useAuth } from '../contexts';
import {
  LockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardIcon,
  CheckIcon,
} from '../components/icons';
import './MFASetup.css';

/**
 * MFA Setup Step Type
 */
type MFASetupStep = 'init' | 'verify' | 'backup' | 'done';

/**
 * MFASetupPage Component
 */
export const MFASetupPage: React.FC = () => {
  const { t } = useTranslation('settings');
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
      let errorMessage = t('mfaSetup.errors.setup');
      if (err instanceof Error) {
        if (err.message.includes('already enabled')) {
          errorMessage = t('mfaSetup.errors.setup');
        } else if (err.message.includes('unauthorized')) {
          errorMessage = t('mfaSetup.errors.generic');
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

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
      let errorMessage = t('mfaSetup.errors.verify');
      if (err instanceof Error) {
        if (err.message.includes('invalid') || err.message.includes('expired')) {
          errorMessage = t('mfaSetup.errors.verify');
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

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
    <Container className="py-8">
      <div className="mfa-setup" data-testid="mfa-setup-page">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">{t('mfaSetup.title')}</h1>
          <p className="page-subtitle">
            {t('mfaSetup.subtitle')}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mfa-setup__progress" role="progressbar" aria-valuenow={getStepNumber(step)} aria-valuemin={1} aria-valuemax={4}>
          <div className={`mfa-setup__step ${step === 'init' || step === 'verify' || step === 'backup' || step === 'done' ? 'mfa-setup__step--active' : ''}`}>
            <span className="mfa-setup__step-number">1</span>
            <span className="mfa-setup__step-label">{t('mfaSetup.steps.start')}</span>
          </div>
          <div className={`mfa-setup__step ${step === 'verify' || step === 'backup' || step === 'done' ? 'mfa-setup__step--active' : ''}`}>
            <span className="mfa-setup__step-number">2</span>
            <span className="mfa-setup__step-label">{t('mfaSetup.steps.verify')}</span>
          </div>
          <div className={`mfa-setup__step ${step === 'backup' || step === 'done' ? 'mfa-setup__step--active' : ''}`}>
            <span className="mfa-setup__step-number">3</span>
            <span className="mfa-setup__step-label">{t('mfaSetup.steps.backup')}</span>
          </div>
          <div className={`mfa-setup__step ${step === 'done' ? 'mfa-setup__step--active' : ''}`}>
            <span className="mfa-setup__step-number">4</span>
            <span className="mfa-setup__step-label">{t('mfaSetup.steps.done')}</span>
          </div>
        </div>

        {/* Content */}
        <div className="mfa-setup__content">
          {/* Step 1: Init */}
          {step === 'init' && (
            <div className="mfa-setup__init" data-testid="mfa-setup-init">
              <div className="mfa-setup__icon" data-testid="mfa-setup-lock-icon">
                <LockIcon className="mfa-setup__icon-svg" aria-label="Security lock" />
              </div>
              <h2 className="mfa-setup__content-title">{t('mfaSetup.intro.title')}</h2>
              <p className="mfa-setup__content-description">
                {t('mfaSetup.intro.description')}
              </p>
              <ul className="mfa-setup__benefits">
                <li>{t('mfaSetup.intro.benefits.protection')}</li>
                <li>{t('mfaSetup.intro.benefits.security')}</li>
                <li>{t('mfaSetup.intro.benefits.recovery')}</li>
              </ul>

              {error && (
                <div className="mfa-setup__error" role="alert" data-testid="mfa-setup-error">
                  <XCircleIcon className="mfa-setup__error-icon" aria-hidden="true" />
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
                    {t('mfaSetup.loading.setup')}
                  </>
                ) : (
                  t('mfaSetup.buttons.enable')
                )}
              </button>

              <button
                type="button"
                onClick={handleBackToSettings}
                className="mfa-setup__button mfa-setup__button--secondary"
              >
                {t('mfaSetup.buttons.backToSettings')}
              </button>
            </div>
          )}

          {/* Step 2: Verify */}
          {step === 'verify' && (
            <div className="mfa-setup__verify" data-testid="mfa-setup-verify">
              <h2 className="mfa-setup__content-title">{t('mfaSetup.scan.title')}</h2>
              <p className="mfa-setup__content-description">
                {t('mfaSetup.scan.description')}
              </p>

              {/* QR Code */}
              <div className="mfa-setup__qr-container">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt={t('mfaSetup.scan.aria.qrCode')}
                    width="300"
                    height="300"
                    className="mfa-setup__qr-code"
                    data-testid="mfa-setup-qr-code"
                  />
                ) : (
                  <div className="mfa-setup__qr-placeholder">
                    <span className="mfa-setup__spinner" aria-hidden="true" />
                    {t('mfaSetup.loading.qrCode')}
                  </div>
                )}
              </div>

              {/* Manual Entry */}
              <div className="mfa-setup__manual-entry">
                <p className="mfa-setup__manual-label">
                  {t('mfaSetup.scan.manual')}
                </p>
                <div className="mfa-setup__secret-container">
                  <code className="mfa-setup__secret" data-testid="mfa-setup-secret">
                    {secret}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="mfa-setup__copy-button"
                    aria-label={t('mfaSetup.buttons.copyCode')}
                    data-testid="mfa-setup-copy-secret"
                  >
                    {secretCopied ? (
                      <CheckIcon className="mfa-setup__copy-icon mfa-setup__copy-icon--success" aria-hidden="true" />
                    ) : (
                      <ClipboardIcon className="mfa-setup__copy-icon" aria-hidden="true" />
                    )}
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
                  label={t('mfaSetup.verify.title')}
                  data-testid="mfa-setup-code-input"
                />
              </div>

              <p className="mfa-setup__hint">
                {t('mfaSetup.verify.description')}
              </p>
            </div>
          )}

          {/* Step 3: Backup */}
          {step === 'backup' && (
            <div className="mfa-setup__backup" data-testid="mfa-setup-backup">
              <h2 className="mfa-setup__content-title">{t('mfaSetup.backup.title')}</h2>
              <p className="mfa-setup__content-description">
                {t('mfaSetup.backup.description')}
              </p>

              <BackupCodesList
                codes={backupCodes}
                appName={t('mfaSetup.backup.appName')}
                data-testid="mfa-setup-backup-codes"
              />

              <button
                type="button"
                onClick={handleComplete}
                className="mfa-setup__button mfa-setup__button--primary"
                data-testid="mfa-setup-complete-button"
              >
                {t('mfaSetup.buttons.codesStored')}
              </button>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <div className="mfa-setup__done" data-testid="mfa-setup-done">
              <div className="mfa-setup__success-icon" data-testid="mfa-setup-success-icon">
                <CheckCircleIcon className="mfa-setup__icon-svg mfa-setup__icon-svg--success" aria-label="Success" />
              </div>
              <h2 className="mfa-setup__content-title">{t('mfaSetup.success.title')}</h2>
              <p className="mfa-setup__content-description">
                {t('mfaSetup.success.description')}
              </p>

              <div className="mfa-setup__success-info">
                <p>
                  {t('mfaSetup.success.warning')}
                </p>
              </div>

              <button
                type="button"
                onClick={handleBackToSettings}
                className="mfa-setup__button mfa-setup__button--primary"
                data-testid="mfa-setup-finish-button"
              >
                {t('mfaSetup.buttons.done')}
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
