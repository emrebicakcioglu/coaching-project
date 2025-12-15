/**
 * LoginForm Component Unit Tests
 * STORY-007B: Login System Frontend UI
 *
 * Tests for LoginForm component including validation, accessibility,
 * and password visibility toggle.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { LoginForm, LoginFormData } from './LoginForm';

// Wrapper component for routing
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('LoginForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('renders form with all elements', () => {
      renderWithRouter(<LoginForm onSubmit={mockOnSubmit} />);

      expect(screen.getByTestId('login-form')).toBeInTheDocument();
      expect(screen.getByTestId('email-input')).toBeInTheDocument();
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
      expect(screen.getByTestId('password-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('login-button')).toBeInTheDocument();
    });

    it('renders forgot password link when showForgotPassword is true', () => {
      renderWithRouter(<LoginForm onSubmit={mockOnSubmit} showForgotPassword />);

      expect(screen.getByTestId('forgot-password-link')).toBeInTheDocument();
      expect(screen.getByText('Passwort vergessen?')).toBeInTheDocument();
    });

    it('hides forgot password link when showForgotPassword is false', () => {
      renderWithRouter(<LoginForm onSubmit={mockOnSubmit} showForgotPassword={false} />);

      expect(screen.queryByTestId('forgot-password-link')).not.toBeInTheDocument();
    });

    it('renders remember me checkbox when showRememberMe is true', () => {
      renderWithRouter(<LoginForm onSubmit={mockOnSubmit} showRememberMe />);

      expect(screen.getByText('Angemeldet bleiben')).toBeInTheDocument();
    });

    it('hides remember me checkbox when showRememberMe is false', () => {
      renderWithRouter(<LoginForm onSubmit={mockOnSubmit} showRememberMe={false} />);

      expect(screen.queryByText('Angemeldet bleiben')).not.toBeInTheDocument();
    });

    it('renders with initial values', () => {
      renderWithRouter(
        <LoginForm
          onSubmit={mockOnSubmit}
          initialValues={{ email: 'test@example.com', password: 'password123' }}
        />
      );

      expect(screen.getByTestId('email-input')).toHaveValue('test@example.com');
      expect(screen.getByTestId('password-input')).toHaveValue('password123');
    });
  });

  describe('Password Visibility Toggle', () => {
    it('password is hidden by default', () => {
      renderWithRouter(<LoginForm onSubmit={mockOnSubmit} />);

      const passwordInput = screen.getByTestId('password-input');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('toggles password visibility on click', async () => {
      const user = userEvent.setup();
      renderWithRouter(<LoginForm onSubmit={mockOnSubmit} />);

      const passwordInput = screen.getByTestId('password-input');
      const toggleButton = screen.getByTestId('password-toggle');

      expect(passwordInput).toHaveAttribute('type', 'password');

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('toggle button has correct aria-label', async () => {
      const user = userEvent.setup();
      renderWithRouter(<LoginForm onSubmit={mockOnSubmit} />);

      const toggleButton = screen.getByTestId('password-toggle');

      expect(toggleButton).toHaveAttribute('aria-label', 'Passwort anzeigen');

      await user.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-label', 'Passwort verbergen');
    });
  });

  describe('Form Validation', () => {
    it('shows error for empty email', async () => {
      const user = userEvent.setup();
      renderWithRouter(<LoginForm onSubmit={mockOnSubmit} />);

      await user.type(screen.getByTestId('password-input'), 'password123');
      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText('Bitte geben Sie Ihre E-Mail-Adresse ein.')).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('shows error for invalid email format', async () => {
      const user = userEvent.setup();
      renderWithRouter(<LoginForm onSubmit={mockOnSubmit} />);

      await user.type(screen.getByTestId('email-input'), 'invalid-email');
      await user.type(screen.getByTestId('password-input'), 'password123');
      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText('Bitte geben Sie eine gültige E-Mail-Adresse ein.')).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('shows error for empty password', async () => {
      const user = userEvent.setup();
      renderWithRouter(<LoginForm onSubmit={mockOnSubmit} />);

      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText('Bitte geben Sie Ihr Passwort ein.')).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('clears field error when user starts typing', async () => {
      const user = userEvent.setup();
      renderWithRouter(<LoginForm onSubmit={mockOnSubmit} />);

      // Submit with empty fields to trigger error
      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      // Start typing to clear error
      await user.type(screen.getByTestId('email-input'), 't');

      await waitFor(() => {
        expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
      });
    });

    it('calls onInputChange callback when user types', async () => {
      const user = userEvent.setup();
      const mockInputChange = vi.fn();
      renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} onInputChange={mockInputChange} />
      );

      await user.type(screen.getByTestId('email-input'), 'test');

      expect(mockInputChange).toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit with form data on valid submission', async () => {
      const user = userEvent.setup();
      renderWithRouter(<LoginForm onSubmit={mockOnSubmit} />);

      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.type(screen.getByTestId('password-input'), 'password123');
      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          rememberMe: false,
        });
      });
    });

    it('includes rememberMe in form data when checked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<LoginForm onSubmit={mockOnSubmit} showRememberMe />);

      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.type(screen.getByTestId('password-input'), 'password123');

      // Find and click the remember me checkbox
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          rememberMe: true,
        });
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when isLoading is true', () => {
      renderWithRouter(<LoginForm onSubmit={mockOnSubmit} isLoading />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Wird angemeldet...')).toBeInTheDocument();
    });

    it('disables inputs when loading', () => {
      renderWithRouter(<LoginForm onSubmit={mockOnSubmit} isLoading />);

      expect(screen.getByTestId('email-input')).toBeDisabled();
      expect(screen.getByTestId('password-input')).toBeDisabled();
      expect(screen.getByTestId('login-button')).toBeDisabled();
    });

    it('button has aria-busy when loading', () => {
      renderWithRouter(<LoginForm onSubmit={mockOnSubmit} isLoading />);

      expect(screen.getByTestId('login-button')).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Error Display', () => {
    it('displays external error message', () => {
      renderWithRouter(
        <LoginForm
          onSubmit={mockOnSubmit}
          error="E-Mail-Adresse oder Passwort ist falsch."
        />
      );

      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText('E-Mail-Adresse oder Passwort ist falsch.')).toBeInTheDocument();
    });

    it('error message has alert role', () => {
      renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} error="Error message" />
      );

      expect(screen.getByTestId('error-message')).toHaveAttribute('role', 'alert');
    });
  });

  describe('Success Message Display', () => {
    it('displays success message', () => {
      renderWithRouter(
        <LoginForm
          onSubmit={mockOnSubmit}
          successMessage="Ihr Passwort wurde erfolgreich zurückgesetzt."
        />
      );

      expect(screen.getByTestId('success-message')).toBeInTheDocument();
      expect(screen.getByText('Ihr Passwort wurde erfolgreich zurückgesetzt.')).toBeInTheDocument();
    });

    it('success message has status role', () => {
      renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} successMessage="Success!" />
      );

      expect(screen.getByTestId('success-message')).toHaveAttribute('role', 'status');
    });
  });

  describe('Accessibility', () => {
    it('form has aria-label', () => {
      renderWithRouter(<LoginForm onSubmit={mockOnSubmit} />);

      expect(screen.getByTestId('login-form')).toHaveAttribute('aria-label', 'Anmeldeformular');
    });

    it('inputs have aria-required', () => {
      renderWithRouter(<LoginForm onSubmit={mockOnSubmit} />);

      expect(screen.getByTestId('email-input')).toHaveAttribute('aria-required', 'true');
      expect(screen.getByTestId('password-input')).toHaveAttribute('aria-required', 'true');
    });

    it('invalid inputs have aria-invalid', async () => {
      const user = userEvent.setup();
      renderWithRouter(<LoginForm onSubmit={mockOnSubmit} />);

      // Submit empty form to trigger validation
      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('email-input')).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('supports keyboard navigation (Tab through fields)', async () => {
      const user = userEvent.setup();
      renderWithRouter(<LoginForm onSubmit={mockOnSubmit} autoFocus />);

      // Email should be focused first due to autoFocus
      await waitFor(() => {
        expect(screen.getByTestId('email-input')).toHaveFocus();
      });

      // Tab to password
      await user.tab();
      expect(screen.getByTestId('password-input')).toHaveFocus();

      // Tab to toggle button
      await user.tab();
      expect(screen.getByTestId('password-toggle')).toHaveFocus();
    });

    it('can submit form with Enter key', async () => {
      const user = userEvent.setup();
      renderWithRouter(<LoginForm onSubmit={mockOnSubmit} />);

      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.type(screen.getByTestId('password-input'), 'password123');

      // Press Enter while focused on password field
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });
  });
});
