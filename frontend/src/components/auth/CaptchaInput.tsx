/**
 * CaptchaInput Component
 * STORY-CAPTCHA: Login Security with CAPTCHA
 *
 * Math CAPTCHA input component for login security.
 * Displays a math question and input field for the answer.
 *
 * Features:
 * - Displays math question from backend
 * - Input field for answer
 * - Refresh button to get new CAPTCHA
 * - Loading and error states
 * - Accessible with ARIA labels
 *
 * @example
 * ```tsx
 * <CaptchaInput
 *   question="Was ist 7 + 5?"
 *   captchaId="abc123"
 *   value={captchaAnswer}
 *   onChange={setCaptchaAnswer}
 *   onRefresh={handleRefreshCaptcha}
 *   isLoading={isLoadingCaptcha}
 *   error={captchaError}
 * />
 * ```
 */

import React, { useCallback } from 'react';

/**
 * Props for CaptchaInput component
 */
export interface CaptchaInputProps {
  /** Math question to display */
  question: string;
  /** Current CAPTCHA ID (for tracking) */
  captchaId: string;
  /** Current answer value */
  value: string;
  /** Callback when answer changes */
  onChange: (value: string) => void;
  /** Callback to refresh CAPTCHA */
  onRefresh: () => void;
  /** Whether CAPTCHA is loading */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * CaptchaInput Component
 */
export const CaptchaInput: React.FC<CaptchaInputProps> = ({
  question,
  captchaId,
  value,
  onChange,
  onRefresh,
  isLoading = false,
  error = null,
  disabled = false,
  className = '',
}) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Only allow numbers and minus sign
      const newValue = e.target.value.replace(/[^0-9-]/g, '');
      onChange(newValue);
    },
    [onChange]
  );

  const handleRefresh = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!isLoading && !disabled) {
        onRefresh();
      }
    },
    [onRefresh, isLoading, disabled]
  );

  return (
    <div
      className={`captcha-container ${className}`}
      data-testid="captcha-container"
      data-captcha-id={captchaId}
    >
      <div className="captcha-header">
        <label htmlFor="captcha-answer" className="captcha-label">
          Sicherheitsabfrage
        </label>
      </div>

      <div className="captcha-content">
        {/* Question display */}
        <div className="captcha-question" aria-live="polite">
          {isLoading ? (
            <span className="captcha-loading">
              <span className="captcha-spinner" aria-hidden="true" />
              Wird geladen...
            </span>
          ) : (
            <span className="captcha-question-text">{question}</span>
          )}
        </div>

        {/* Answer input with refresh button */}
        <div className="captcha-input-row">
          <input
            type="text"
            id="captcha-answer"
            name="captchaAnswer"
            value={value}
            onChange={handleChange}
            className={`captcha-input ${error ? 'captcha-input--error' : ''}`}
            placeholder="Antwort eingeben"
            autoComplete="off"
            inputMode="numeric"
            required
            disabled={disabled || isLoading}
            aria-required="true"
            aria-invalid={!!error}
            aria-describedby={error ? 'captcha-error' : 'captcha-hint'}
            data-testid="captcha-input"
          />

          <button
            type="button"
            className="captcha-refresh-btn"
            onClick={handleRefresh}
            disabled={disabled || isLoading}
            aria-label="Neue Sicherheitsabfrage laden"
            title="Neue Frage"
            data-testid="captcha-refresh"
          >
            {isLoading ? (
              <span className="captcha-spinner" aria-hidden="true" />
            ) : (
              <svg
                className="captcha-refresh-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Error message */}
        {error && (
          <span id="captcha-error" className="captcha-error" role="alert">
            {error}
          </span>
        )}

        {/* Hint text */}
        {!error && (
          <span id="captcha-hint" className="captcha-hint">
            Bitte l&ouml;sen Sie die Rechenaufgabe
          </span>
        )}
      </div>

      <style>{`
        .captcha-container {
          margin-top: 1rem;
          padding: 1rem;
          background-color: var(--color-background-alt, #f9fafb);
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 0.5rem;
        }

        .captcha-header {
          margin-bottom: 0.5rem;
        }

        .captcha-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text-primary, #111827);
        }

        .captcha-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .captcha-question {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text-primary, #111827);
          padding: 0.5rem;
          background-color: var(--color-background, #ffffff);
          border-radius: 0.375rem;
          text-align: center;
          min-height: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .captcha-question-text {
          font-family: monospace;
        }

        .captcha-loading {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--color-text-secondary, #6b7280);
          font-size: 0.875rem;
          font-weight: normal;
        }

        .captcha-input-row {
          display: flex;
          gap: 0.5rem;
        }

        .captcha-input {
          flex: 1;
          padding: 0.625rem 0.75rem;
          font-size: 1rem;
          border: 1px solid var(--color-border, #d1d5db);
          border-radius: 0.375rem;
          background-color: var(--color-background, #ffffff);
          color: var(--color-text-primary, #111827);
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .captcha-input:focus {
          outline: none;
          border-color: var(--color-primary, #3b82f6);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .captcha-input--error {
          border-color: var(--color-error, #ef4444);
        }

        .captcha-input--error:focus {
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        .captcha-input:disabled {
          background-color: var(--color-background-disabled, #f3f4f6);
          cursor: not-allowed;
        }

        .captcha-refresh-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.75rem;
          height: 2.75rem;
          padding: 0;
          background-color: var(--color-background, #ffffff);
          border: 1px solid var(--color-border, #d1d5db);
          border-radius: 0.375rem;
          color: var(--color-text-secondary, #6b7280);
          cursor: pointer;
          transition: background-color 0.15s, border-color 0.15s, color 0.15s;
        }

        .captcha-refresh-btn:hover:not(:disabled) {
          background-color: var(--color-background-hover, #f3f4f6);
          border-color: var(--color-primary, #3b82f6);
          color: var(--color-primary, #3b82f6);
        }

        .captcha-refresh-btn:focus {
          outline: none;
          border-color: var(--color-primary, #3b82f6);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .captcha-refresh-btn:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .captcha-refresh-icon {
          width: 1.25rem;
          height: 1.25rem;
        }

        .captcha-spinner {
          width: 1rem;
          height: 1rem;
          border: 2px solid var(--color-border, #e5e7eb);
          border-top-color: var(--color-primary, #3b82f6);
          border-radius: 50%;
          animation: captcha-spin 0.6s linear infinite;
        }

        .captcha-error {
          font-size: 0.75rem;
          color: var(--color-error, #ef4444);
        }

        .captcha-hint {
          font-size: 0.75rem;
          color: var(--color-text-tertiary, #9ca3af);
        }

        @keyframes captcha-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default CaptchaInput;
