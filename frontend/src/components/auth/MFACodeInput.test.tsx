/**
 * MFACodeInput Component Unit Tests
 * STORY-005C: MFA UI (Frontend)
 *
 * Tests for MFACodeInput component including auto-submit,
 * input validation, and accessibility.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MFACodeInput } from './MFACodeInput';

describe('MFACodeInput', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<MFACodeInput onSubmit={mockOnSubmit} />);

      expect(screen.getByTestId('mfa-code-input')).toBeInTheDocument();
      expect(screen.getByTestId('mfa-code-input-field')).toBeInTheDocument();
      expect(screen.getByLabelText('Verifizierungscode')).toBeInTheDocument();
    });

    it('renders with custom label', () => {
      render(<MFACodeInput onSubmit={mockOnSubmit} label="Backup Code" />);

      expect(screen.getByLabelText('Backup Code')).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(<MFACodeInput onSubmit={mockOnSubmit} placeholder="000000" />);

      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      render(<MFACodeInput onSubmit={mockOnSubmit} data-testid="custom-input" />);

      expect(screen.getByTestId('custom-input')).toBeInTheDocument();
    });
  });

  describe('Input Validation', () => {
    it('only accepts numeric input by default', async () => {
      const user = userEvent.setup();
      render(<MFACodeInput onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('mfa-code-input-field');
      await user.type(input, 'abc123def456');

      expect(input).toHaveValue('123456');
    });

    it('accepts alphanumeric input when allowAlphanumeric is true', async () => {
      const user = userEvent.setup();
      render(<MFACodeInput onSubmit={mockOnSubmit} allowAlphanumeric maxLength={8} />);

      const input = screen.getByTestId('mfa-code-input-field');
      await user.type(input, 'ABCD1234');

      expect(input).toHaveValue('ABCD1234');
    });

    it('limits input to maxLength', async () => {
      const user = userEvent.setup();
      render(<MFACodeInput onSubmit={mockOnSubmit} maxLength={6} />);

      const input = screen.getByTestId('mfa-code-input-field');
      await user.type(input, '12345678');

      expect(input).toHaveValue('123456');
    });

    it('converts alphanumeric to uppercase when allowAlphanumeric is true', async () => {
      const user = userEvent.setup();
      render(<MFACodeInput onSubmit={mockOnSubmit} allowAlphanumeric maxLength={8} />);

      const input = screen.getByTestId('mfa-code-input-field');
      await user.type(input, 'abcd1234');

      expect(input).toHaveValue('ABCD1234');
    });
  });

  describe('Auto-Submit', () => {
    it('auto-submits when 6 digits are entered', async () => {
      const user = userEvent.setup();
      render(<MFACodeInput onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('mfa-code-input-field');
      await user.type(input, '123456');

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('123456');
      });
    });

    it('does not auto-submit with less than maxLength digits', async () => {
      const user = userEvent.setup();
      render(<MFACodeInput onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('mfa-code-input-field');
      await user.type(input, '12345');

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('does not auto-submit when allowAlphanumeric is true', async () => {
      const user = userEvent.setup();
      render(<MFACodeInput onSubmit={mockOnSubmit} allowAlphanumeric maxLength={8} />);

      const input = screen.getByTestId('mfa-code-input-field');
      await user.type(input, 'ABCD1234');

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Manual Submit', () => {
    it('submits on Enter key press', async () => {
      const user = userEvent.setup();
      render(<MFACodeInput onSubmit={mockOnSubmit} allowAlphanumeric maxLength={8} />);

      const input = screen.getByTestId('mfa-code-input-field');
      await user.type(input, 'ABCD1234');
      await user.keyboard('{Enter}');

      expect(mockOnSubmit).toHaveBeenCalledWith('ABCD1234');
    });

    it('does not submit on Enter when input is empty', async () => {
      const user = userEvent.setup();
      render(<MFACodeInput onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('mfa-code-input-field');
      await user.click(input);
      await user.keyboard('{Enter}');

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Paste Handling', () => {
    it('handles paste for numeric codes', async () => {
      render(<MFACodeInput onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('mfa-code-input-field');
      fireEvent.paste(input, {
        clipboardData: {
          getData: () => '123456',
        },
      });

      await waitFor(() => {
        expect(input).toHaveValue('123456');
      });
    });

    it('filters non-numeric characters on paste', async () => {
      render(<MFACodeInput onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('mfa-code-input-field');
      fireEvent.paste(input, {
        clipboardData: {
          getData: () => '12-34-56',
        },
      });

      await waitFor(() => {
        expect(input).toHaveValue('123456');
      });
    });

    it('handles paste for alphanumeric codes', async () => {
      render(<MFACodeInput onSubmit={mockOnSubmit} allowAlphanumeric maxLength={8} />);

      const input = screen.getByTestId('mfa-code-input-field');
      fireEvent.paste(input, {
        clipboardData: {
          getData: () => 'abcd1234',
        },
      });

      await waitFor(() => {
        expect(input).toHaveValue('ABCD1234');
      });
    });
  });

  describe('Auto-Focus', () => {
    it('auto-focuses input when autoFocus is true', () => {
      render(<MFACodeInput onSubmit={mockOnSubmit} autoFocus />);

      const input = screen.getByTestId('mfa-code-input-field');
      expect(input).toHaveFocus();
    });

    it('does not auto-focus when autoFocus is false', () => {
      render(<MFACodeInput onSubmit={mockOnSubmit} autoFocus={false} />);

      const input = screen.getByTestId('mfa-code-input-field');
      expect(input).not.toHaveFocus();
    });
  });

  describe('Disabled State', () => {
    it('disables input when disabled is true', () => {
      render(<MFACodeInput onSubmit={mockOnSubmit} disabled />);

      const input = screen.getByTestId('mfa-code-input-field');
      expect(input).toBeDisabled();
    });

    it('disables input when isLoading is true', () => {
      render(<MFACodeInput onSubmit={mockOnSubmit} isLoading />);

      const input = screen.getByTestId('mfa-code-input-field');
      expect(input).toBeDisabled();
    });
  });

  describe('Loading State', () => {
    it('shows spinner when isLoading is true', () => {
      render(<MFACodeInput onSubmit={mockOnSubmit} isLoading />);

      expect(screen.getByTestId('mfa-code-input')).toContainElement(
        document.querySelector('.mfa-code-input__spinner')
      );
    });

    it('does not show spinner when not loading', () => {
      render(<MFACodeInput onSubmit={mockOnSubmit} />);

      expect(document.querySelector('.mfa-code-input__spinner')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('displays error message when error prop is provided', () => {
      render(<MFACodeInput onSubmit={mockOnSubmit} error="Invalid code" />);

      expect(screen.getByTestId('mfa-code-input-error')).toBeInTheDocument();
      expect(screen.getByText('Invalid code')).toBeInTheDocument();
    });

    it('error message has alert role', () => {
      render(<MFACodeInput onSubmit={mockOnSubmit} error="Invalid code" />);

      expect(screen.getByTestId('mfa-code-input-error')).toHaveAttribute('role', 'alert');
    });

    it('input has aria-invalid when error is present', () => {
      render(<MFACodeInput onSubmit={mockOnSubmit} error="Invalid code" />);

      const input = screen.getByTestId('mfa-code-input-field');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('input has aria-describedby pointing to error', () => {
      render(<MFACodeInput onSubmit={mockOnSubmit} error="Invalid code" />);

      const input = screen.getByTestId('mfa-code-input-field');
      expect(input).toHaveAttribute('aria-describedby', 'mfa-code-error');
    });
  });

  describe('Accessibility', () => {
    it('has correct input mode for numeric codes', () => {
      render(<MFACodeInput onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('mfa-code-input-field');
      expect(input).toHaveAttribute('inputMode', 'numeric');
    });

    it('has correct input mode for alphanumeric codes', () => {
      render(<MFACodeInput onSubmit={mockOnSubmit} allowAlphanumeric />);

      const input = screen.getByTestId('mfa-code-input-field');
      expect(input).toHaveAttribute('inputMode', 'text');
    });

    it('has aria-label attribute', () => {
      render(<MFACodeInput onSubmit={mockOnSubmit} label="Test Label" />);

      const input = screen.getByTestId('mfa-code-input-field');
      expect(input).toHaveAttribute('aria-label', 'Test Label');
    });

    it('has autocomplete attribute for one-time-code', () => {
      render(<MFACodeInput onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('mfa-code-input-field');
      expect(input).toHaveAttribute('autoComplete', 'one-time-code');
    });
  });
});
