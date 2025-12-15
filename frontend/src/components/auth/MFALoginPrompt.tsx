/**
 * MFA Login Prompt Component
 * STORY-005C: MFA UI (Frontend)
 *
 * MFA verification prompt displayed after initial login for users with MFA enabled.
 * Supports both TOTP codes and backup codes.
 *
 * Features:
 * - 6-digit TOTP code input with auto-submit
 * - Toggle to use backup code instead
 * - Loading and error states
 * - Responsive design
 * - Accessible with ARIA labels
 * - Auto-focus on code input
 */

import React, { useState, useCallback } from 'react';
import { MFACodeInput } from './MFACodeInput';
import '../auth/MFALoginPrompt.css';

/**
 * MFALoginPrompt Props
 */
export interface MFALoginPromptProps {
  /** Temporary token from initial login */
  tempToken: string;
  /** Callback when MFA verification succeeds */
  onSuccess: (token: string, refreshToken: string) => void;
  /** Callback when user cancels MFA */
  onCancel?: () => void;
  /** API endpoint for TOTP verification */
  verifyEndpoint?: string;
  /** API endpoint for backup code verification */
  backupCodeEndpoint?: string;
  /** Test ID for E2E tests */
  'data-testid'?: string;
}

/**
 * MFALoginPrompt Component
 *
 * Prompts the user for MFA verification after initial login.
 */
export const MFALoginPrompt: React.FC<MFALoginPromptProps> = ({
  tempToken,
  onSuccess,
  onCancel,
  verifyEndpoint = '/api/v1/auth/mfa/verify-login',
  backupCodeEndpoint = '/api/v1/auth/mfa/verify-backup-code',
  'data-testid': testId = 'mfa-login-prompt',
}) => {
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  /**
   * Handle TOTP code verification
   */
  const handleVerifyCode = useCallback(
    async (code: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const endpoint = useBackupCode ? backupCodeEndpoint : verifyEndpoint;
        const body = useBackupCode
          ? { tempToken, backupCode: code }
          : { tempToken, code };

        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:14102';
        const url = `${apiBaseUrl}${endpoint.startsWith('/api') ? endpoint.slice(4) : endpoint}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          credentials: 'include',
        });

        const data = await response.json();

        if (response.ok) {
          onSuccess(data.access_token, data.refresh_token);
        } else {
          // Handle specific error cases
          if (data.attemptsRemaining !== undefined) {
            setAttemptsRemaining(data.attemptsRemaining);
          }

          if (response.status === 429) {
            setError('Zu viele Versuche. Bitte warten Sie einen Moment.');
          } else if (data.message?.includes('locked')) {
            setError('Ihr Konto wurde vorübergehend gesperrt. Bitte versuchen Sie es später erneut.');
          } else if (useBackupCode) {
            setError('Ungültiger Backup-Code. Bitte überprüfen Sie den Code.');
          } else {
            setError('Ungültiger Code. Bitte versuchen Sie es erneut.');
          }
        }
      } catch (err) {
        setError('Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung.');
      } finally {
        setIsLoading(false);
      }
    },
    [tempToken, useBackupCode, verifyEndpoint, backupCodeEndpoint, onSuccess]
  );

  /**
   * Toggle between TOTP and backup code
   */
  const handleToggleCodeType = useCallback(() => {
    setUseBackupCode((prev) => !prev);
    setError(null);
  }, []);

  return (
    <div className="mfa-login-prompt" data-testid={testId}>
      <div className="mfa-login-prompt__container">
        {/* Icon */}
        <div className="mfa-login-prompt__icon">
          <span aria-hidden="true">🔐</span>
        </div>

        {/* Header */}
        <h2 className="mfa-login-prompt__title">
          {useBackupCode ? 'Backup-Code eingeben' : 'Verifizierungscode eingeben'}
        </h2>
        <p className="mfa-login-prompt__description">
          {useBackupCode
            ? 'Geben Sie einen Ihrer Backup-Codes ein.'
            : 'Öffnen Sie Ihre Authenticator-App und geben Sie den 6-stelligen Code ein.'}
        </p>

        {/* Code Input */}
        <div className="mfa-login-prompt__input">
          {useBackupCode ? (
            <MFACodeInput
              key="backup"
              onSubmit={handleVerifyCode}
              isLoading={isLoading}
              error={error}
              autoFocus
              allowAlphanumeric
              maxLength={8}
              placeholder="ABCD1234"
              label="Backup-Code"
              data-testid={`${testId}-backup-code-input`}
            />
          ) : (
            <MFACodeInput
              key="totp"
              onSubmit={handleVerifyCode}
              isLoading={isLoading}
              error={error}
              autoFocus
              label="Verifizierungscode"
              data-testid={`${testId}-code-input`}
            />
          )}
        </div>

        {/* Attempts remaining warning */}
        {attemptsRemaining !== null && attemptsRemaining <= 3 && (
          <p className="mfa-login-prompt__warning" role="alert">
            ⚠️ Noch {attemptsRemaining} Versuch{attemptsRemaining !== 1 ? 'e' : ''} verbleibend
          </p>
        )}

        {/* Toggle code type */}
        <button
          type="button"
          onClick={handleToggleCodeType}
          className="mfa-login-prompt__toggle"
          disabled={isLoading}
          data-testid={`${testId}-toggle-code-type`}
        >
          {useBackupCode
            ? 'Authenticator-Code verwenden'
            : 'Code funktioniert nicht? Backup-Code verwenden'}
        </button>

        {/* Cancel button */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mfa-login-prompt__cancel"
            disabled={isLoading}
            data-testid={`${testId}-cancel`}
          >
            Anmeldung abbrechen
          </button>
        )}

        {/* Help text */}
        <div className="mfa-login-prompt__help">
          <p>
            <strong>Hilfe:</strong> Falls Sie keinen Zugriff auf Ihre Authenticator-App haben,
            verwenden Sie einen Ihrer Backup-Codes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MFALoginPrompt;
