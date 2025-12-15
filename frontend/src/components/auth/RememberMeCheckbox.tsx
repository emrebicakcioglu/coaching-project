/**
 * RememberMeCheckbox Component
 * STORY-008: Session Management mit "Remember Me"
 *
 * A checkbox component for the "Remember Me" option on the login page.
 * When checked, the session will be valid for 30 days instead of 24 hours.
 *
 * Security Note:
 * - Checkbox is disabled by default (security best practice)
 * - User must explicitly opt-in to longer sessions
 */

import React from 'react';
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
  label = 'Angemeldet bleiben',
  className = '',
  id = 'remember-me',
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.checked);
  };

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
        <span className="remember-me-text">{label}</span>
      </label>
      <p id={`${id}-description`} className="remember-me-description">
        Bei Aktivierung bleiben Sie 30 Tage angemeldet
      </p>
    </div>
  );
};

export default RememberMeCheckbox;
