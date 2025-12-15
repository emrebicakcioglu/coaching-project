/**
 * PasswordStrengthIndicator Component
 * STORY-009: Password Reset
 *
 * Visual indicator showing password strength and requirements.
 * Provides real-time feedback as the user types their password.
 */

import React, { useMemo } from 'react';
import './PasswordStrengthIndicator.css';

/**
 * Password requirement interface
 */
interface PasswordRequirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

/**
 * Password strength levels
 */
type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

/**
 * Props for PasswordStrengthIndicator
 */
interface PasswordStrengthIndicatorProps {
  /**
   * The password to evaluate
   */
  password: string;

  /**
   * Whether to show requirement checklist
   * @default true
   */
  showRequirements?: boolean;

  /**
   * Whether to show optional requirements (special character, 12+ chars)
   * @default true
   */
  showOptionalRequirements?: boolean;

  /**
   * Custom className for styling
   */
  className?: string;
}

/**
 * Password requirements based on backend validation rules
 * (from password-reset.dto.ts)
 */
const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: 'length',
    label: 'Mindestens 8 Zeichen',
    test: (pwd) => pwd.length >= 8,
  },
  {
    id: 'lowercase',
    label: 'Mindestens ein Kleinbuchstabe',
    test: (pwd) => /[a-z]/.test(pwd),
  },
  {
    id: 'uppercase',
    label: 'Mindestens ein Großbuchstabe',
    test: (pwd) => /[A-Z]/.test(pwd),
  },
  {
    id: 'number',
    label: 'Mindestens eine Zahl',
    test: (pwd) => /\d/.test(pwd),
  },
];

/**
 * Optional extra requirements for stronger passwords
 * NOTE: Special character regex matches backend validation in register.dto.ts
 */
const OPTIONAL_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: 'special',
    label: 'Sonderzeichen (@$!%*?&)',
    test: (pwd) => /[@$!%*?&]/.test(pwd),
  },
  {
    id: 'long',
    label: '12+ Zeichen (empfohlen)',
    test: (pwd) => pwd.length >= 12,
  },
];

/**
 * Calculate password strength score (0-4)
 */
const calculateStrengthScore = (password: string): number => {
  if (!password) return 0;

  let score = 0;

  // Check required requirements
  const requiredMet = PASSWORD_REQUIREMENTS.filter((req) => req.test(password)).length;
  score += requiredMet;

  // Add bonus for optional requirements
  const optionalMet = OPTIONAL_REQUIREMENTS.filter((req) => req.test(password)).length;
  score += optionalMet * 0.5;

  // Cap at 4
  return Math.min(score, 4);
};

/**
 * Get strength level from score
 */
const getStrengthLevel = (score: number): StrengthLevel => {
  if (score < 2) return 'weak';
  if (score < 3) return 'fair';
  if (score < 4) return 'good';
  return 'strong';
};

/**
 * Get strength label for accessibility
 */
const getStrengthLabel = (level: StrengthLevel): string => {
  switch (level) {
    case 'weak':
      return 'Schwach';
    case 'fair':
      return 'Ausreichend';
    case 'good':
      return 'Gut';
    case 'strong':
      return 'Stark';
  }
};

/**
 * PasswordStrengthIndicator Component
 */
export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  showRequirements = true,
  showOptionalRequirements = true,
  className = '',
}) => {
  // Calculate strength metrics
  const strengthScore = useMemo(() => calculateStrengthScore(password), [password]);
  const strengthLevel = useMemo(() => getStrengthLevel(strengthScore), [strengthScore]);
  const strengthLabel = useMemo(() => getStrengthLabel(strengthLevel), [strengthLevel]);

  // Check which requirements are met
  const requirementsMet = useMemo(
    () =>
      PASSWORD_REQUIREMENTS.map((req) => ({
        ...req,
        met: req.test(password),
      })),
    [password]
  );

  // Check which optional requirements are met
  const optionalRequirementsMet = useMemo(
    () =>
      OPTIONAL_REQUIREMENTS.map((req) => ({
        ...req,
        met: req.test(password),
      })),
    [password]
  );

  // All required requirements met
  const allRequirementsMet = useMemo(
    () => requirementsMet.every((req) => req.met),
    [requirementsMet]
  );

  // Don't render anything if password is empty
  if (!password) {
    return null;
  }

  return (
    <div className={`password-strength ${className} ${!allRequirementsMet ? 'validation-error' : ''}`} role="status" aria-live="polite" data-testid="password-strength">
      {/* Strength Bar */}
      <div className="password-strength__bar-container">
        <div
          className={`password-strength__bar password-strength__bar--${strengthLevel}`}
          style={{ width: `${(strengthScore / 4) * 100}%` }}
          role="progressbar"
          aria-valuenow={strengthScore}
          aria-valuemin={0}
          aria-valuemax={4}
          aria-label={`Passwortstärke: ${strengthLabel}`}
        />
      </div>

      {/* Strength Label */}
      <div className={`password-strength__label password-strength__label--${strengthLevel}`}>
        {strengthLabel}
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <ul className="password-strength__requirements" aria-label="Passwort-Anforderungen">
          {requirementsMet.map((req) => (
            <li
              key={req.id}
              className={`password-strength__requirement ${
                req.met ? 'password-strength__requirement--met' : ''
              }`}
            >
              <span className="password-strength__requirement-icon" aria-hidden="true">
                {req.met ? '✓' : '○'}
              </span>
              <span className="password-strength__requirement-label">{req.label}</span>
            </li>
          ))}
          {/* Optional requirements */}
          {showOptionalRequirements && optionalRequirementsMet.map((req) => (
            <li
              key={req.id}
              className={`password-strength__requirement password-strength__requirement--optional ${
                req.met ? 'password-strength__requirement--met' : ''
              }`}
            >
              <span className="password-strength__requirement-icon" aria-hidden="true">
                {req.met ? '✓' : '○'}
              </span>
              <span className="password-strength__requirement-label">{req.label}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Overall validity indicator */}
      {allRequirementsMet && (
        <div className="password-strength__valid" role="status">
          <span className="password-strength__valid-icon" aria-hidden="true">
            ✓
          </span>
          Passwort erfüllt alle Anforderungen
        </div>
      )}
    </div>
  );
};

/**
 * Hook to check if password meets all requirements
 * STORY-009: Password Reset
 */
export const usePasswordValidation = (password: string): {
  isValid: boolean;
  errors: string[];
  strength: StrengthLevel;
} => {
  return useMemo(() => {
    const errors: string[] = [];

    PASSWORD_REQUIREMENTS.forEach((req) => {
      if (!req.test(password)) {
        errors.push(req.label);
      }
    });

    const score = calculateStrengthScore(password);
    const strength = getStrengthLevel(score);

    return {
      isValid: errors.length === 0,
      errors,
      strength,
    };
  }, [password]);
};

export default PasswordStrengthIndicator;
