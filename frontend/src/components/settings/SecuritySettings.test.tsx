/**
 * SecuritySettings Component Tests
 * STORY-013B: In-App Settings Frontend UI
 *
 * Unit tests for the SecuritySettings form component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SecuritySettings } from './SecuritySettings';
import { settingsService } from '../../services/settingsService';

// Mock the settings service
vi.mock('../../services/settingsService', () => ({
  settingsService: {
    getSecuritySettings: vi.fn(),
    updateSecuritySettings: vi.fn(),
    resetSecuritySettings: vi.fn(),
  },
}));

const mockSettings = {
  max_login_attempts: 5,
  password_min_length: 8,
  password_require_uppercase: true,
  password_require_lowercase: true,
  password_require_numbers: true,
  password_require_special_chars: true,
  session_inactivity_timeout: 15,
};

describe('SecuritySettings', () => {
  const mockOnSaveSuccess = vi.fn();
  const mockOnSaveError = vi.fn();
  const mockOnUnsavedChanges = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (settingsService.getSecuritySettings as ReturnType<typeof vi.fn>).mockResolvedValue(mockSettings);
  });

  describe('loading state', () => {
    it('shows loading indicator while loading', () => {
      (settingsService.getSecuritySettings as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {})
      );

      render(
        <SecuritySettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      expect(screen.getByTestId('security-settings-loading')).toBeInTheDocument();
    });
  });

  describe('form rendering', () => {
    it('renders all security settings fields', async () => {
      render(
        <SecuritySettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('security-settings')).toBeInTheDocument();
      });

      expect(screen.getByTestId('setting-input-max-login-attempts')).toBeInTheDocument();
      expect(screen.getByTestId('setting-input-password-min-length')).toBeInTheDocument();
      expect(screen.getByTestId('setting-toggle-require-uppercase')).toBeInTheDocument();
      expect(screen.getByTestId('setting-toggle-require-lowercase')).toBeInTheDocument();
      expect(screen.getByTestId('setting-toggle-require-numbers')).toBeInTheDocument();
      expect(screen.getByTestId('setting-toggle-require-special')).toBeInTheDocument();
      expect(screen.getByTestId('setting-input-inactivity-timeout')).toBeInTheDocument();
    });

    it('populates form with loaded settings', async () => {
      render(
        <SecuritySettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('setting-input-max-login-attempts')).toHaveValue(5);
      });

      expect(screen.getByTestId('setting-input-password-min-length')).toHaveValue(8);
      expect(screen.getByTestId('setting-input-inactivity-timeout')).toHaveValue(15);
    });

    it('renders section headers', async () => {
      render(
        <SecuritySettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('security-settings')).toBeInTheDocument();
      });

      expect(screen.getByText('Login-Sicherheit')).toBeInTheDocument();
      expect(screen.getByText('Passwort-Richtlinie')).toBeInTheDocument();
    });
  });

  describe('unsaved changes', () => {
    it('shows unsaved changes indicator when form is modified', async () => {
      render(
        <SecuritySettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
          onUnsavedChanges={mockOnUnsavedChanges}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('security-settings')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('setting-input-max-login-attempts'), {
        target: { value: '10' },
      });

      expect(screen.getByTestId('unsaved-indicator')).toBeInTheDocument();
      expect(mockOnUnsavedChanges).toHaveBeenCalledWith(true);
    });
  });

  describe('form validation', () => {
    it('validates max login attempts range', async () => {
      render(
        <SecuritySettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('security-settings')).toBeInTheDocument();
      });

      // Change to out-of-range value
      fireEvent.change(screen.getByTestId('setting-input-max-login-attempts'), {
        target: { value: '200' },
      });

      // Ensure button is enabled due to changes
      await waitFor(() => {
        expect(screen.getByTestId('save-button')).not.toBeDisabled();
      });

      // Submit the form
      const form = screen.getByTestId('security-settings').querySelector('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByTestId('validation-error')).toBeInTheDocument();
      });
    });

    it('validates password min length range', async () => {
      render(
        <SecuritySettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('security-settings')).toBeInTheDocument();
      });

      // Change to out-of-range value
      fireEvent.change(screen.getByTestId('setting-input-password-min-length'), {
        target: { value: '3' },
      });

      // Ensure button is enabled due to changes
      await waitFor(() => {
        expect(screen.getByTestId('save-button')).not.toBeDisabled();
      });

      // Submit the form
      const form = screen.getByTestId('security-settings').querySelector('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByTestId('validation-error')).toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    it('calls updateSecuritySettings on valid submission', async () => {
      (settingsService.updateSecuritySettings as ReturnType<typeof vi.fn>).mockResolvedValue(mockSettings);

      render(
        <SecuritySettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('security-settings')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('setting-input-max-login-attempts'), {
        target: { value: '10' },
      });

      fireEvent.click(screen.getByTestId('save-button'));

      await waitFor(() => {
        expect(settingsService.updateSecuritySettings).toHaveBeenCalled();
      });
    });

    it('calls onSaveSuccess on successful save', async () => {
      (settingsService.updateSecuritySettings as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockSettings,
        max_login_attempts: 10,
      });

      render(
        <SecuritySettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('security-settings')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('setting-input-max-login-attempts'), {
        target: { value: '10' },
      });

      fireEvent.click(screen.getByTestId('save-button'));

      await waitFor(() => {
        expect(mockOnSaveSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('reset to defaults', () => {
    it('shows confirmation dialog when clicking reset button', async () => {
      render(
        <SecuritySettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('security-settings')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('reset-to-defaults-button'));

      expect(screen.getByTestId('reset-confirm-dialog')).toBeInTheDocument();
    });

    it('calls resetSecuritySettings when confirmed', async () => {
      (settingsService.resetSecuritySettings as ReturnType<typeof vi.fn>).mockResolvedValue(mockSettings);

      render(
        <SecuritySettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('security-settings')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('reset-to-defaults-button'));
      fireEvent.click(screen.getByTestId('confirm-reset'));

      await waitFor(() => {
        expect(settingsService.resetSecuritySettings).toHaveBeenCalled();
      });
    });

    it('closes dialog when cancelled', async () => {
      render(
        <SecuritySettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('security-settings')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('reset-to-defaults-button'));
      expect(screen.getByTestId('reset-confirm-dialog')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Abbrechen'));

      expect(screen.queryByTestId('reset-confirm-dialog')).not.toBeInTheDocument();
    });

    it('calls onSaveSuccess after successful reset', async () => {
      (settingsService.resetSecuritySettings as ReturnType<typeof vi.fn>).mockResolvedValue(mockSettings);

      render(
        <SecuritySettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('security-settings')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('reset-to-defaults-button'));
      fireEvent.click(screen.getByTestId('confirm-reset'));

      await waitFor(() => {
        expect(mockOnSaveSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('undo changes', () => {
    it('resets form to original values when clicking undo', async () => {
      render(
        <SecuritySettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('security-settings')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('setting-input-max-login-attempts'), {
        target: { value: '10' },
      });

      expect(screen.getByTestId('setting-input-max-login-attempts')).toHaveValue(10);

      fireEvent.click(screen.getByTestId('reset-button'));

      expect(screen.getByTestId('setting-input-max-login-attempts')).toHaveValue(5);
    });
  });

  describe('toggle switches', () => {
    it('toggles password requirement settings', async () => {
      render(
        <SecuritySettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('security-settings')).toBeInTheDocument();
      });

      const uppercaseToggle = screen.getByTestId('setting-toggle-require-uppercase');
      expect(uppercaseToggle).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(uppercaseToggle);

      expect(uppercaseToggle).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('error handling', () => {
    it('shows error when loading fails', async () => {
      (settingsService.getSecuritySettings as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Load failed')
      );

      render(
        <SecuritySettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(mockOnSaveError).toHaveBeenCalledWith('Fehler beim Laden der Sicherheitseinstellungen');
      });
    });

    it('shows error when save fails', async () => {
      (settingsService.updateSecuritySettings as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Save failed')
      );

      render(
        <SecuritySettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('security-settings')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('setting-input-max-login-attempts'), {
        target: { value: '10' },
      });

      fireEvent.click(screen.getByTestId('save-button'));

      await waitFor(() => {
        expect(mockOnSaveError).toHaveBeenCalled();
      });
    });

    it('shows error when reset fails', async () => {
      (settingsService.resetSecuritySettings as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Reset failed')
      );

      render(
        <SecuritySettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('security-settings')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('reset-to-defaults-button'));
      fireEvent.click(screen.getByTestId('confirm-reset'));

      await waitFor(() => {
        expect(mockOnSaveError).toHaveBeenCalled();
      });
    });
  });
});
