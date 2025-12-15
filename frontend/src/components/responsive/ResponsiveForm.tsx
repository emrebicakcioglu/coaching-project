/**
 * ResponsiveForm Component
 * STORY-017B: Component Responsiveness
 *
 * A responsive form container that displays fields in a multi-column
 * layout on desktop and single-column on mobile devices.
 *
 * @example
 * ```tsx
 * <ResponsiveForm onSubmit={handleSubmit}>
 *   <ResponsiveFormRow>
 *     <ResponsiveFormField span="half">
 *       <Input name="firstName" label="First Name" />
 *     </ResponsiveFormField>
 *     <ResponsiveFormField span="half">
 *       <Input name="lastName" label="Last Name" />
 *     </ResponsiveFormField>
 *   </ResponsiveFormRow>
 * </ResponsiveForm>
 * ```
 */

import React from 'react';
import { useResponsive } from '../../hooks';

/**
 * Props for ResponsiveForm container
 */
export interface ResponsiveFormProps {
  /** Form content */
  children: React.ReactNode;
  /** Form submission handler */
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for E2E testing */
  'data-testid'?: string;
  /** Form ID */
  id?: string;
  /** Disable form */
  disabled?: boolean;
}

/**
 * Props for ResponsiveFormRow
 */
export interface ResponsiveFormRowProps {
  /** Row content (typically ResponsiveFormField components) */
  children: React.ReactNode;
  /** Gap between fields */
  gap?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for ResponsiveFormField
 */
export interface ResponsiveFormFieldProps {
  /** Field content */
  children: React.ReactNode;
  /** Span width on desktop */
  span?: 'full' | 'half' | 'third' | 'quarter' | 'two-thirds' | 'three-quarters';
  /** Additional CSS classes */
  className?: string;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/**
 * Gap size classes
 */
const gapClasses = {
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
} as const;

/**
 * Desktop span width classes
 */
const spanClasses = {
  full: 'md:col-span-12',
  half: 'md:col-span-6',
  third: 'md:col-span-4',
  quarter: 'md:col-span-3',
  'two-thirds': 'md:col-span-8',
  'three-quarters': 'md:col-span-9',
} as const;

/**
 * ResponsiveForm Container
 *
 * Wraps form elements and provides responsive context.
 */
export const ResponsiveForm: React.FC<ResponsiveFormProps> = ({
  children,
  onSubmit,
  className = '',
  'data-testid': testId = 'responsive-form',
  id,
  disabled = false,
}) => {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (onSubmit && !disabled) {
      onSubmit(event);
    }
  };

  return (
    <form
      id={id}
      className={`space-y-6 ${className}`}
      onSubmit={handleSubmit}
      data-testid={testId}
      aria-disabled={disabled}
    >
      <fieldset disabled={disabled} className="space-y-6">
        {children}
      </fieldset>
    </form>
  );
};

/**
 * ResponsiveFormRow
 *
 * A row container that arranges fields in a responsive grid.
 * On mobile (< 768px): Single column layout
 * On desktop (>= 768px): Multi-column grid layout
 */
export const ResponsiveFormRow: React.FC<ResponsiveFormRowProps> = ({
  children,
  gap = 'md',
  className = '',
}) => {
  return (
    <div
      className={`
        grid
        grid-cols-1
        md:grid-cols-12
        ${gapClasses[gap]}
        ${className}
      `}
      data-testid="responsive-form-row"
    >
      {children}
    </div>
  );
};

/**
 * ResponsiveFormField
 *
 * A field wrapper that handles responsive sizing.
 * On mobile: Always full width
 * On desktop: Specified span width
 */
export const ResponsiveFormField: React.FC<ResponsiveFormFieldProps> = ({
  children,
  span = 'full',
  className = '',
  'data-testid': testId,
}) => {
  return (
    <div
      className={`
        col-span-1
        ${spanClasses[span]}
        ${className}
      `}
      data-testid={testId}
    >
      {children}
    </div>
  );
};

/**
 * FormInput Component
 *
 * A touch-friendly input field with minimum touch target size.
 */
export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Input label */
  label: string;
  /** Input name */
  name: string;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  name,
  error,
  helperText,
  className = '',
  type = 'text',
  id,
  ...props
}) => {
  const inputId = id || name;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  return (
    <div className="flex flex-col">
      <label
        htmlFor={inputId}
        className="
          block
          text-sm font-medium text-neutral-700
          mb-1
        "
      >
        {label}
        {props.required && (
          <span className="text-error ml-1" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <input
        {...props}
        id={inputId}
        name={name}
        type={type}
        className={`
          min-h-[44px]
          w-full
          px-3 py-2
          border border-neutral-300 rounded-md
          text-sm text-neutral-900
          placeholder:text-neutral-400
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          disabled:bg-neutral-100 disabled:text-neutral-500 disabled:cursor-not-allowed
          ${error ? 'border-error focus:ring-error focus:border-error' : ''}
          ${className}
        `}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        data-testid={`input-${name}`}
      />
      {error && (
        <p
          id={errorId}
          className="mt-1 text-sm text-error"
          role="alert"
          data-testid={`error-${name}`}
        >
          {error}
        </p>
      )}
      {helperText && !error && (
        <p
          id={helperId}
          className="mt-1 text-sm text-neutral-500"
          data-testid={`helper-${name}`}
        >
          {helperText}
        </p>
      )}
    </div>
  );
};

/**
 * FormSelect Component
 *
 * A touch-friendly select field with minimum touch target size.
 */
export interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Select label */
  label: string;
  /** Select name */
  name: string;
  /** Options to display */
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Placeholder option */
  placeholder?: string;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  label,
  name,
  options,
  error,
  helperText,
  placeholder,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || name;
  const errorId = `${selectId}-error`;
  const helperId = `${selectId}-helper`;

  return (
    <div className="flex flex-col">
      <label
        htmlFor={selectId}
        className="
          block
          text-sm font-medium text-neutral-700
          mb-1
        "
      >
        {label}
        {props.required && (
          <span className="text-error ml-1" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <select
        {...props}
        id={selectId}
        name={name}
        className={`
          min-h-[44px]
          w-full
          px-3 py-2
          border border-neutral-300 rounded-md
          text-sm text-neutral-900
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          disabled:bg-neutral-100 disabled:text-neutral-500 disabled:cursor-not-allowed
          ${error ? 'border-error focus:ring-error focus:border-error' : ''}
          ${className}
        `}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        data-testid={`select-${name}`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p
          id={errorId}
          className="mt-1 text-sm text-error"
          role="alert"
          data-testid={`error-${name}`}
        >
          {error}
        </p>
      )}
      {helperText && !error && (
        <p
          id={helperId}
          className="mt-1 text-sm text-neutral-500"
          data-testid={`helper-${name}`}
        >
          {helperText}
        </p>
      )}
    </div>
  );
};

/**
 * FormButton Component
 *
 * A touch-friendly button with minimum touch target size.
 */
export interface FormButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Loading state */
  isLoading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
}

const variantClasses = {
  primary: 'bg-primary text-white hover:bg-primary-700 focus:ring-primary-500',
  secondary: 'bg-secondary text-white hover:bg-secondary-700 focus:ring-secondary-500',
  outline: 'bg-transparent border border-primary text-primary hover:bg-primary-50 focus:ring-primary-500',
  ghost: 'bg-transparent text-primary hover:bg-primary-50 focus:ring-primary-500',
} as const;

const sizeClasses = {
  sm: 'min-h-[36px] px-3 py-1.5 text-sm',
  md: 'min-h-[44px] px-4 py-2 text-base',
  lg: 'min-h-[52px] px-6 py-3 text-lg',
} as const;

export const FormButton: React.FC<FormButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  className = '',
  disabled,
  type = 'button',
  ...props
}) => {
  const isDisabled = disabled || isLoading;

  return (
    <button
      {...props}
      type={type}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center
        font-medium rounded-md
        focus:outline-none focus:ring-2 focus:ring-offset-2
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      data-testid={props['data-testid'] || `button-${variant}`}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};

export default ResponsiveForm;
