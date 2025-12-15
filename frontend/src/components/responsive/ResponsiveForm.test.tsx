/**
 * ResponsiveForm Component Tests
 * STORY-017B: Component Responsiveness
 *
 * Unit tests for responsive form components.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ResponsiveForm,
  ResponsiveFormRow,
  ResponsiveFormField,
  FormInput,
  FormSelect,
  FormButton,
} from './ResponsiveForm';

// Mock useResponsive hook
const mockUseResponsive = vi.fn();

vi.mock('../../hooks', () => ({
  useResponsive: () => mockUseResponsive(),
}));

describe('ResponsiveForm', () => {
  beforeEach(() => {
    mockUseResponsive.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      breakpoint: 'lg',
      width: 1024,
      height: 768,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ResponsiveForm Container', () => {
    it('renders form element', () => {
      render(
        <ResponsiveForm>
          <div>Form content</div>
        </ResponsiveForm>
      );

      expect(screen.getByTestId('responsive-form')).toBeInTheDocument();
    });

    it('calls onSubmit when form is submitted', () => {
      const onSubmit = vi.fn((e) => e.preventDefault());
      render(
        <ResponsiveForm onSubmit={onSubmit}>
          <button type="submit">Submit</button>
        </ResponsiveForm>
      );

      fireEvent.submit(screen.getByTestId('responsive-form'));

      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('does not call onSubmit when disabled', () => {
      const onSubmit = vi.fn((e) => e.preventDefault());
      render(
        <ResponsiveForm onSubmit={onSubmit} disabled>
          <button type="submit">Submit</button>
        </ResponsiveForm>
      );

      fireEvent.submit(screen.getByTestId('responsive-form'));

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('applies custom id', () => {
      render(
        <ResponsiveForm id="custom-form">
          <div>Content</div>
        </ResponsiveForm>
      );

      expect(screen.getByTestId('responsive-form')).toHaveAttribute('id', 'custom-form');
    });

    it('applies custom className', () => {
      render(
        <ResponsiveForm className="custom-class">
          <div>Content</div>
        </ResponsiveForm>
      );

      expect(screen.getByTestId('responsive-form')).toHaveClass('custom-class');
    });
  });

  describe('ResponsiveFormRow', () => {
    it('renders grid container', () => {
      render(
        <ResponsiveFormRow>
          <div>Row content</div>
        </ResponsiveFormRow>
      );

      expect(screen.getByTestId('responsive-form-row')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-form-row')).toHaveClass('grid');
    });

    it('applies correct gap class', () => {
      render(
        <ResponsiveFormRow gap="lg">
          <div>Row content</div>
        </ResponsiveFormRow>
      );

      expect(screen.getByTestId('responsive-form-row')).toHaveClass('gap-6');
    });

    it('uses 12-column grid on desktop', () => {
      render(
        <ResponsiveFormRow>
          <div>Row content</div>
        </ResponsiveFormRow>
      );

      expect(screen.getByTestId('responsive-form-row')).toHaveClass('md:grid-cols-12');
    });
  });

  describe('ResponsiveFormField', () => {
    it('renders with correct span class', () => {
      render(
        <ResponsiveFormField span="half" data-testid="field">
          <div>Field content</div>
        </ResponsiveFormField>
      );

      expect(screen.getByTestId('field')).toHaveClass('md:col-span-6');
    });

    it('renders full width by default', () => {
      render(
        <ResponsiveFormField data-testid="field">
          <div>Field content</div>
        </ResponsiveFormField>
      );

      expect(screen.getByTestId('field')).toHaveClass('md:col-span-12');
    });

    it('applies third span correctly', () => {
      render(
        <ResponsiveFormField span="third" data-testid="field">
          <div>Field content</div>
        </ResponsiveFormField>
      );

      expect(screen.getByTestId('field')).toHaveClass('md:col-span-4');
    });

    it('applies two-thirds span correctly', () => {
      render(
        <ResponsiveFormField span="two-thirds" data-testid="field">
          <div>Field content</div>
        </ResponsiveFormField>
      );

      expect(screen.getByTestId('field')).toHaveClass('md:col-span-8');
    });
  });

  describe('FormInput', () => {
    it('renders input with label', () => {
      render(<FormInput name="email" label="Email" />);

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByTestId('input-email')).toBeInTheDocument();
    });

    it('renders required indicator', () => {
      render(<FormInput name="email" label="Email" required />);

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('displays error message', () => {
      render(<FormInput name="email" label="Email" error="Invalid email" />);

      expect(screen.getByTestId('error-email')).toHaveTextContent('Invalid email');
      expect(screen.getByTestId('input-email')).toHaveAttribute('aria-invalid', 'true');
    });

    it('displays helper text', () => {
      render(<FormInput name="email" label="Email" helperText="Enter your email" />);

      expect(screen.getByTestId('helper-email')).toHaveTextContent('Enter your email');
    });

    it('hides helper text when error is shown', () => {
      render(
        <FormInput
          name="email"
          label="Email"
          error="Invalid email"
          helperText="Enter your email"
        />
      );

      expect(screen.queryByTestId('helper-email')).not.toBeInTheDocument();
      expect(screen.getByTestId('error-email')).toBeInTheDocument();
    });

    it('has minimum touch target height', () => {
      render(<FormInput name="email" label="Email" />);

      expect(screen.getByTestId('input-email')).toHaveClass('min-h-[44px]');
    });

    it('applies custom type', () => {
      render(<FormInput name="password" label="Password" type="password" />);

      expect(screen.getByTestId('input-password')).toHaveAttribute('type', 'password');
    });
  });

  describe('FormSelect', () => {
    const options = [
      { value: 'admin', label: 'Admin' },
      { value: 'user', label: 'User' },
      { value: 'guest', label: 'Guest' },
    ];

    it('renders select with label', () => {
      render(<FormSelect name="role" label="Role" options={options} />);

      expect(screen.getByLabelText('Role')).toBeInTheDocument();
      expect(screen.getByTestId('select-role')).toBeInTheDocument();
    });

    it('renders all options', () => {
      render(<FormSelect name="role" label="Role" options={options} />);

      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('Guest')).toBeInTheDocument();
    });

    it('renders placeholder option', () => {
      render(
        <FormSelect
          name="role"
          label="Role"
          options={options}
          placeholder="Select a role"
        />
      );

      expect(screen.getByText('Select a role')).toBeInTheDocument();
    });

    it('displays error message', () => {
      render(
        <FormSelect name="role" label="Role" options={options} error="Required field" />
      );

      expect(screen.getByTestId('error-role')).toHaveTextContent('Required field');
    });

    it('has minimum touch target height', () => {
      render(<FormSelect name="role" label="Role" options={options} />);

      expect(screen.getByTestId('select-role')).toHaveClass('min-h-[44px]');
    });

    it('renders disabled options', () => {
      const optionsWithDisabled = [
        ...options,
        { value: 'disabled', label: 'Disabled', disabled: true },
      ];

      render(<FormSelect name="role" label="Role" options={optionsWithDisabled} />);

      const disabledOption = screen.getByRole('option', { name: 'Disabled' });
      expect(disabledOption).toBeDisabled();
    });
  });

  describe('FormButton', () => {
    it('renders button with text', () => {
      render(<FormButton>Click me</FormButton>);

      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('applies primary variant by default', () => {
      render(<FormButton>Primary</FormButton>);

      expect(screen.getByTestId('button-primary')).toHaveClass('bg-primary');
    });

    it('applies secondary variant', () => {
      render(<FormButton variant="secondary">Secondary</FormButton>);

      expect(screen.getByTestId('button-secondary')).toHaveClass('bg-secondary');
    });

    it('applies outline variant', () => {
      render(<FormButton variant="outline">Outline</FormButton>);

      expect(screen.getByTestId('button-outline')).toHaveClass('border-primary');
    });

    it('applies correct size classes', () => {
      const { rerender } = render(<FormButton size="sm">Small</FormButton>);
      expect(screen.getByText('Small')).toHaveClass('min-h-[36px]');

      rerender(<FormButton size="md">Medium</FormButton>);
      expect(screen.getByText('Medium')).toHaveClass('min-h-[44px]');

      rerender(<FormButton size="lg">Large</FormButton>);
      expect(screen.getByText('Large')).toHaveClass('min-h-[52px]');
    });

    it('shows loading spinner when isLoading', () => {
      render(<FormButton isLoading>Loading</FormButton>);

      const button = screen.getByText('Loading').closest('button');
      expect(button).toContainHTML('animate-spin');
    });

    it('is disabled when isLoading', () => {
      render(<FormButton isLoading>Loading</FormButton>);

      expect(screen.getByText('Loading').closest('button')).toBeDisabled();
    });

    it('applies full width when fullWidth is true', () => {
      render(<FormButton fullWidth>Full Width</FormButton>);

      expect(screen.getByText('Full Width')).toHaveClass('w-full');
    });

    it('defaults to button type', () => {
      render(<FormButton>Button</FormButton>);

      expect(screen.getByText('Button')).toHaveAttribute('type', 'button');
    });

    it('can be set to submit type', () => {
      render(<FormButton type="submit">Submit</FormButton>);

      expect(screen.getByText('Submit')).toHaveAttribute('type', 'submit');
    });
  });
});
