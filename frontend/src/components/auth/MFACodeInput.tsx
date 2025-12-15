/**
 * MFA Code Input Component
 * STORY-005C: MFA UI (Frontend)
 *
 * 6-digit code input component with auto-submit and auto-focus functionality.
 * Supports both numeric-only TOTP codes and alphanumeric backup codes.
 *
 * Features:
 * - Auto-focus on mount
 * - Auto-submit when 6 digits entered (for TOTP codes)
 * - Numeric input mode for TOTP codes
 * - Input validation (digits only for TOTP)
 * - Accessible with ARIA labels
 * - Loading state support
 * - Error state display
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './MFACodeInput.css';

/**
 * MFACodeInput Props
 */
export interface MFACodeInputProps {
  /** Callback when code is submitted */
  onSubmit: (code: string) => void;
  /** Auto-focus input on mount */
  autoFocus?: boolean;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Whether component is in loading state */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Whether to allow alphanumeric input (for backup codes) */
  allowAlphanumeric?: boolean;
  /** Maximum length of the code */
  maxLength?: number;
  /** Placeholder text */
  placeholder?: string;
  /** Label text for accessibility */
  label?: string;
  /** Test ID for E2E tests */
  'data-testid'?: string;
}

/**
 * MFACodeInput Component
 *
 * A specialized input component for MFA verification codes.
 * Automatically submits when the correct number of digits is entered.
 */
export const MFACodeInput: React.FC<MFACodeInputProps> = ({
  onSubmit,
  autoFocus = true,
  disabled = false,
  isLoading = false,
  error = null,
  allowAlphanumeric = false,
  maxLength = 6,
  placeholder = '123456',
  label = 'Verifizierungscode',
  'data-testid': testId = 'mfa-code-input',
}) => {
  const [code, setCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current && !disabled && !isLoading) {
      inputRef.current.focus();
    }
  }, [autoFocus, disabled, isLoading]);

  // Auto-submit when code reaches max length (for TOTP codes)
  useEffect(() => {
    if (!allowAlphanumeric && code.length === maxLength) {
      onSubmit(code);
    }
  }, [code, maxLength, onSubmit, allowAlphanumeric]);

  /**
   * Handle input change
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      if (allowAlphanumeric) {
        // Allow alphanumeric characters (for backup codes)
        setCode(value.toUpperCase().slice(0, maxLength));
      } else {
        // Only allow digits (for TOTP codes)
        const digitsOnly = value.replace(/\D/g, '').slice(0, maxLength);
        setCode(digitsOnly);
      }
    },
    [allowAlphanumeric, maxLength]
  );

  /**
   * Handle key press - submit on Enter for backup codes
   */
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && code.length > 0) {
        e.preventDefault();
        onSubmit(code);
      }
    },
    [code, onSubmit]
  );

  /**
   * Handle paste event
   */
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData('text');

      if (allowAlphanumeric) {
        const cleanedText = pastedText.toUpperCase().slice(0, maxLength);
        setCode(cleanedText);
      } else {
        const digitsOnly = pastedText.replace(/\D/g, '').slice(0, maxLength);
        setCode(digitsOnly);
      }
    },
    [allowAlphanumeric, maxLength]
  );

  const isDisabled = disabled || isLoading;
  const hasError = !!error;

  return (
    <div className="mfa-code-input" data-testid={testId}>
      <label htmlFor="mfa-code" className="mfa-code-input__label">
        {label}
      </label>
      <div className="mfa-code-input__wrapper">
        <input
          ref={inputRef}
          id="mfa-code"
          type="text"
          inputMode={allowAlphanumeric ? 'text' : 'numeric'}
          pattern={allowAlphanumeric ? '[A-Za-z0-9]*' : '[0-9]*'}
          maxLength={maxLength}
          value={code}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={isDisabled}
          autoComplete="one-time-code"
          aria-label={label}
          aria-invalid={hasError}
          aria-describedby={hasError ? 'mfa-code-error' : undefined}
          className={`mfa-code-input__input ${hasError ? 'mfa-code-input__input--error' : ''}`}
          data-testid={`${testId}-field`}
        />
        {isLoading && (
          <div className="mfa-code-input__spinner" aria-hidden="true" />
        )}
      </div>
      {error && (
        <p
          id="mfa-code-error"
          className="mfa-code-input__error"
          role="alert"
          data-testid={`${testId}-error`}
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default MFACodeInput;
