/**
 * GeneralSettings Component Tests
 * STORY-013B: In-App Settings Frontend UI
 *
 * Unit tests for the GeneralSettings form component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GeneralSettings } from './GeneralSettings';
import { settingsService } from '../../services/settingsService';

// Mock the settings service
vi.mock('../../services/settingsService', () => ({
  settingsService: {
    getGeneralSettings: vi.fn(),
    updateGeneralSettings: vi.fn(),
  },
}));

const mockSettings = {
  support_email: 'support@example.com',
  session_timeout_minutes: 30,
  show_timeout_warning: true,
  warning_before_timeout_minutes: 5,
};

describe('GeneralSettings', () => {
  const mockOnSaveSuccess = vi.fn();
  const mockOnSaveError = vi.fn();
  const mockOnUnsavedChanges = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (settingsService.getGeneralSettings as ReturnType<typeof vi.fn>).mockResolvedValue(mockSettings);
  });

  describe('loading state', () => {
    it('shows loading indicator while loading', () => {
      (settingsService.getGeneralSettings as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <GeneralSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      expect(screen.getByTestId('general-settings-loading')).toBeInTheDocument();
    });

    it('hides loading indicator after loading', async () => {
      render(
        <GeneralSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('general-settings-loading')).not.toBeInTheDocument();
      });
    });
  });

  describe('form rendering', () => {
    it('renders all form fields after loading', async () => {
      render(
        <GeneralSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('general-settings')).toBeInTheDocument();
      });

      expect(screen.getByTestId('setting-input-support-email')).toBeInTheDocument();
      expect(screen.getByTestId('setting-input-session-timeout')).toBeInTheDocument();
      expect(screen.getByTestId('setting-toggle-show-warning')).toBeInTheDocument();
      expect(screen.getByTestId('setting-input-warning-time')).toBeInTheDocument();
    });

    it('populates form with loaded settings', async () => {
      render(
        <GeneralSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('setting-input-support-email')).toHaveValue('support@example.com');
      });

      expect(screen.getByTestId('setting-input-session-timeout')).toHaveValue(30);
    });
  });

  describe('unsaved changes', () => {
    it('shows unsaved changes indicator when form is modified', async () => {
      render(
        <GeneralSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
          onUnsavedChanges={mockOnUnsavedChanges}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('general-settings')).toBeInTheDocument();
      });

      // Modify a field
      fireEvent.change(screen.getByTestId('setting-input-support-email'), {
        target: { value: 'new@example.com' },
      });

      expect(screen.getByTestId('unsaved-indicator')).toBeInTheDocument();
      expect(mockOnUnsavedChanges).toHaveBeenCalledWith(true);
    });

    it('disables save button when no changes', async () => {
      render(
        <GeneralSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('general-settings')).toBeInTheDocument();
      });

      expect(screen.getByTestId('save-button')).toBeDisabled();
    });

    it('enables save button when there are changes', async () => {
      render(
        <GeneralSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('general-settings')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('setting-input-session-timeout'), {
        target: { value: '60' },
      });

      expect(screen.getByTestId('save-button')).not.toBeDisabled();
    });
  });

  describe('form validation', () => {
    it('shows error for invalid email format', async () => {
      render(
        <GeneralSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('general-settings')).toBeInTheDocument();
      });

      // Change email to invalid format - this triggers unsaved changes
      fireEvent.change(screen.getByTestId('setting-input-support-email'), {
        target: { value: 'invalid-email' },
      });

      // Ensure button is enabled due to changes
      await waitFor(() => {
        expect(screen.getByTestId('save-button')).not.toBeDisabled();
      });

      // Submit the form
      const form = screen.getByTestId('general-settings');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByTestId('validation-error')).toBeInTheDocument();
      });
    });

    it('shows error when session timeout is out of range', async () => {
      render(
        <GeneralSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('general-settings')).toBeInTheDocument();
      });

      // Change to out-of-range value
      fireEvent.change(screen.getByTestId('setting-input-session-timeout'), {
        target: { value: '2000' },
      });

      // Ensure button is enabled due to changes
      await waitFor(() => {
        expect(screen.getByTestId('save-button')).not.toBeDisabled();
      });

      // Submit the form
      const form = screen.getByTestId('general-settings');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByTestId('validation-error')).toBeInTheDocument();
      });
    });

    it('shows error when warning time exceeds session timeout', async () => {
      render(
        <GeneralSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('general-settings')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('setting-input-session-timeout'), {
        target: { value: '5' },
      });

      fireEvent.change(screen.getByTestId('setting-input-warning-time'), {
        target: { value: '10' },
      });

      // Submit the form
      const form = screen.getByTestId('general-settings');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByTestId('validation-error')).toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    it('calls updateGeneralSettings on valid submission', async () => {
      (settingsService.updateGeneralSettings as ReturnType<typeof vi.fn>).mockResolvedValue(mockSettings);

      render(
        <GeneralSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('general-settings')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('setting-input-session-timeout'), {
        target: { value: '45' },
      });

      fireEvent.click(screen.getByTestId('save-button'));

      await waitFor(() => {
        expect(settingsService.updateGeneralSettings).toHaveBeenCalled();
      });
    });

    it('calls onSaveSuccess callback on successful save', async () => {
      (settingsService.updateGeneralSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockSettings,
        session_timeout_minutes: 45,
      });

      render(
        <GeneralSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('general-settings')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('setting-input-session-timeout'), {
        target: { value: '45' },
      });

      fireEvent.click(screen.getByTestId('save-button'));

      await waitFor(() => {
        expect(mockOnSaveSuccess).toHaveBeenCalled();
      });
    });

    it('calls onSaveError callback on failed save', async () => {
      (settingsService.updateGeneralSettings as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Save failed')
      );

      render(
        <GeneralSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('general-settings')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('setting-input-session-timeout'), {
        target: { value: '45' },
      });

      fireEvent.click(screen.getByTestId('save-button'));

      await waitFor(() => {
        expect(mockOnSaveError).toHaveBeenCalled();
      });
    });

    it('shows saving state while submitting', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      (settingsService.updateGeneralSettings as ReturnType<typeof vi.fn>).mockReturnValue(promise);

      render(
        <GeneralSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('general-settings')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('setting-input-session-timeout'), {
        target: { value: '45' },
      });

      fireEvent.click(screen.getByTestId('save-button'));

      expect(screen.getByTestId('save-button')).toHaveTextContent('Wird gespeichert...');

      resolvePromise!(mockSettings);
    });
  });

  describe('reset functionality', () => {
    it('resets form to original values', async () => {
      render(
        <GeneralSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('general-settings')).toBeInTheDocument();
      });

      // Modify value
      fireEvent.change(screen.getByTestId('setting-input-session-timeout'), {
        target: { value: '45' },
      });

      expect(screen.getByTestId('setting-input-session-timeout')).toHaveValue(45);

      // Reset
      fireEvent.click(screen.getByTestId('reset-button'));

      expect(screen.getByTestId('setting-input-session-timeout')).toHaveValue(30);
    });

    it('disables reset button when no changes', async () => {
      render(
        <GeneralSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('general-settings')).toBeInTheDocument();
      });

      expect(screen.getByTestId('reset-button')).toBeDisabled();
    });
  });

  describe('conditional rendering', () => {
    it('hides warning time field when show_timeout_warning is false', async () => {
      (settingsService.getGeneralSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockSettings,
        show_timeout_warning: false,
      });

      render(
        <GeneralSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('general-settings')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('setting-input-warning-time')).not.toBeInTheDocument();
    });

    it('shows warning time field when show_timeout_warning is true', async () => {
      render(
        <GeneralSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('general-settings')).toBeInTheDocument();
      });

      expect(screen.getByTestId('setting-input-warning-time')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('shows error when loading fails', async () => {
      (settingsService.getGeneralSettings as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Load failed')
      );

      render(
        <GeneralSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(mockOnSaveError).toHaveBeenCalledWith('Fehler beim Laden der Einstellungen');
      });
    });
  });
});
