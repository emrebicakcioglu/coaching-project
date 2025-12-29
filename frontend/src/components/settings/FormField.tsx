/**
 * FormField Component
 * STORY-013B: In-App Settings Frontend UI
 * STORY-106: Settings Page UI Audit - Standardized spacing (label-input: 8px, desc-input: 4px)
 *
 * Reusable form field component with label, description, and various input types.
 * Supports text, number, email, password, select, toggle, and textarea inputs.
 */

import React, { useId } from 'react';

/**
 * Input type for FormField
 */
export type FormFieldInputType =
  | 'text'
  | 'number'
  | 'email'
  | 'password'
  | 'select'
  | 'toggle'
  | 'textarea';

/**
 * Select option interface
 */
export interface SelectOption {
  value: string | number;
  label: string;
}

/**
 * Props for FormField component
 */
export interface FormFieldProps {
  /** Field label */
  label: string;
  /** Field description (optional) */
  description?: string;
  /** Field name */
  name: string;
  /** Input type */
  type: FormFieldInputType;
  /** Current value */
  value: string | number | boolean;
  /** Change handler */
  onChange: (value: string | number | boolean) => void;
  /** Error message (optional) */
  error?: string;
  /** Whether field is required */
  required?: boolean;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Placeholder text (optional) */
  placeholder?: string;
  /** Min value for number inputs */
  min?: number;
  /** Max value for number inputs */
  max?: number;
  /** Step for number inputs */
  step?: number;
  /** Options for select inputs */
  options?: SelectOption[];
  /** Number of rows for textarea */
  rows?: number;
  /** Test ID */
  'data-testid'?: string;
}

/**
 * FormField Component
 *
 * Renders a form field with label, description, input, and error handling.
 * Supports multiple input types with consistent styling.
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  description,
  name,
  type,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  placeholder,
  min,
  max,
  step,
  options = [],
  rows = 3,
  'data-testid': testId,
}) => {
  const id = useId();
  const fieldId = `field-${id}-${name}`;
  const descriptionId = description ? `desc-${id}-${name}` : undefined;
  const errorId = error ? `error-${id}-${name}` : undefined;

  /**
   * Base input styles for dark mode support
   * Uses theme input CSS variables for proper color scheme integration
   */
  const inputBaseStyle = {
    backgroundColor: error
      ? 'var(--color-input-error-background, var(--color-error-light, #fef2f2))'
      : disabled
        ? 'var(--color-input-disabled-background, #f3f4f6)'
        : 'var(--color-input-background, var(--color-background-input, #ffffff))',
    borderColor: error
      ? 'var(--color-input-error-border, var(--color-error, #ef4444))'
      : disabled
        ? 'var(--color-input-disabled-border, #e5e7eb)'
        : 'var(--color-input-border, var(--color-border-default, #d1d5db))',
    color: error
      ? 'var(--color-input-error-text, #991b1b)'
      : disabled
        ? 'var(--color-input-disabled-text, #9ca3af)'
        : 'var(--color-input-text, var(--color-text-primary, #111827))',
    '--tw-ring-color': error
      ? 'var(--color-input-error-focus-ring, rgba(239, 68, 68, 0.2))'
      : 'var(--color-input-focus-ring, rgba(37, 99, 235, 0.2))',
  } as React.CSSProperties;

  const inputBaseClasses = `
    w-full px-3 py-2 border rounded-md text-sm
    transition-colors duration-200
    focus:outline-none focus:ring-2 focus:border-transparent
    disabled:cursor-not-allowed disabled:opacity-60
    placeholder:text-[var(--color-input-placeholder,#9ca3af)]
  `;

  /**
   * Render text/number/email/password input
   */
  const renderInput = () => {
    const inputType = type === 'toggle' || type === 'select' || type === 'textarea' ? 'text' : type;
    return (
      <input
        id={fieldId}
        name={name}
        type={inputType}
        value={String(value)}
        onChange={(e) => {
          const newValue = type === 'number' ? Number(e.target.value) : e.target.value;
          onChange(newValue);
        }}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className={inputBaseClasses}
        style={inputBaseStyle}
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
        aria-invalid={error ? 'true' : undefined}
        data-testid={testId || `setting-input-${name}`}
      />
    );
  };

  /**
   * Render select input
   */
  const renderSelect = () => (
    <select
      id={fieldId}
      name={name}
      value={String(value)}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      required={required}
      className={inputBaseClasses}
      style={inputBaseStyle}
      aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
      aria-invalid={error ? 'true' : undefined}
      data-testid={testId || `setting-select-${name}`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  /**
   * Render textarea
   */
  const renderTextarea = () => (
    <textarea
      id={fieldId}
      name={name}
      value={String(value)}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      required={required}
      placeholder={placeholder}
      rows={rows}
      className={inputBaseClasses}
      style={inputBaseStyle}
      aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
      aria-invalid={error ? 'true' : undefined}
      data-testid={testId || `setting-textarea-${name}`}
    />
  );

  /**
   * Render toggle switch
   */
  const renderToggle = () => {
    const isOn = Boolean(value);
    return (
      <button
        id={fieldId}
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
        disabled={disabled}
        onClick={() => onChange(!isOn)}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
          border-2 border-transparent transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isOn ? 'bg-primary-600' : 'bg-neutral-200'}
        `}
        data-testid={testId || `setting-toggle-${name}`}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full
            bg-white shadow ring-0 transition duration-200 ease-in-out
            ${isOn ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    );
  };

  /**
   * Render appropriate input based on type
   */
  const renderFieldInput = () => {
    switch (type) {
      case 'select':
        return renderSelect();
      case 'toggle':
        return renderToggle();
      case 'textarea':
        return renderTextarea();
      default:
        return renderInput();
    }
  };

  return (
    <div className="space-y-2" data-testid={`field-container-${name}`}>
      {/* Label and Toggle Layout - STORY-106: Standardized spacing */}
      {type === 'toggle' ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <label
              htmlFor={fieldId}
              className="block text-sm font-medium"
              style={{ color: 'var(--color-text-primary, #111827)' }}
            >
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {description && (
              <p id={descriptionId} className="text-sm mt-1" style={{ color: 'var(--color-text-secondary, #6b7280)' }}>
                {description}
              </p>
            )}
          </div>
          {renderFieldInput()}
        </div>
      ) : (
        <>
          {/* STORY-106: Label with 8px (space-y-2) spacing to input */}
          <label
            htmlFor={fieldId}
            className="block text-sm font-medium"
            style={{ color: 'var(--color-text-primary, #111827)' }}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {/* STORY-106: Description with 4px (mt-1) spacing */}
          {description && (
            <p id={descriptionId} className="text-sm -mt-1 mb-1" style={{ color: 'var(--color-text-secondary, #6b7280)' }}>
              {description}
            </p>
          )}
          {renderFieldInput()}
        </>
      )}

      {/* Error Message - STORY-106: Consistent error spacing */}
      {error && (
        <p
          id={errorId}
          className="text-sm text-red-600 mt-1"
          role="alert"
          data-testid="validation-error"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;
