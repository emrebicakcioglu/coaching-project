/**
 * RememberMeCheckbox Component
 * STORY-008: Session Management mit "Remember Me"
 * STORY-002-001: i18n Support for Login Page
 *
 * A checkbox component for the "Remember Me" option on the login page.
 * When checked, the session will be valid for 30 days instead of 24 hours.
 *
 * Security Note:
 * - Checkbox is disabled by default (security best practice)
 * - User must explicitly opt-in to longer sessions
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import './RememberMeCheckbox.css';

export interface RememberMeCheckboxProps {
  /** Whether the checkbox is checked */
  checked: boolean;
  /** Callback when checkbox state changes */
  onChange: (checked: boolean) => void;
  /** Whether the checkbox is disabled */
  disabled?: boolean;
  /** Custom label text */
  label?: string;
  /** Additional CSS class name */
  className?: string;
  /** ID for the checkbox input */
  id?: string;
}

/**
 * RememberMeCheckbox Component
 *
 * Renders a styled checkbox for the "Remember Me" login option.
 */
export const RememberMeCheckbox: React.FC<RememberMeCheckboxProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  className = '',
  id = 'remember-me',
}) => {
  const { t } = useTranslation('auth');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.checked);
  };

  // Use provided label or fall back to translated text
  const displayLabel = label || t('login.rememberMe');

  return (
    <div className={`remember-me-checkbox ${className}`}>
      <label
        htmlFor={id}
        className={`remember-me-label ${disabled ? 'remember-me-label--disabled' : ''}`}
      >
        <input
          type="checkbox"
          id={id}
          name="rememberMe"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="remember-me-input"
          aria-describedby={`${id}-description`}
        />
        <span className="remember-me-checkmark" aria-hidden="true" />
        <span className="remember-me-text">{displayLabel}</span>
      </label>
      <p id={`${id}-description`} className="remember-me-description">
        {t('rememberMeHint')}
      </p>
    </div>
  );
};

export default RememberMeCheckbox;
