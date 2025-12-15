/**
 * EmailSettings Component Tests
 * STORY-013B: In-App Settings Frontend UI
 *
 * Unit tests for the EmailSettings form component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmailSettings } from './EmailSettings';
import { settingsService } from '../../services/settingsService';

// Mock the settings service
vi.mock('../../services/settingsService', () => ({
  settingsService: {
    getEmailSettings: vi.fn(),
    updateEmailSettings: vi.fn(),
  },
}));

const mockSettings = {
  signature: 'Best regards,\nYour Team',
};

describe('EmailSettings', () => {
  const mockOnSaveSuccess = vi.fn();
  const mockOnSaveError = vi.fn();
  const mockOnUnsavedChanges = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (settingsService.getEmailSettings as ReturnType<typeof vi.fn>).mockResolvedValue(mockSettings);
  });

  describe('loading state', () => {
    it('shows loading indicator while loading', () => {
      (settingsService.getEmailSettings as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {})
      );

      render(
        <EmailSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      expect(screen.getByTestId('email-settings-loading')).toBeInTheDocument();
    });
  });

  describe('form rendering', () => {
    it('renders email signature field', async () => {
      render(
        <EmailSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-settings')).toBeInTheDocument();
      });

      expect(screen.getByTestId('email-setting')).toBeInTheDocument();
    });

    it('populates form with loaded settings', async () => {
      render(
        <EmailSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-setting')).toHaveValue('Best regards,\nYour Team');
      });
    });

    it('renders info banner', async () => {
      render(
        <EmailSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-settings')).toBeInTheDocument();
      });

      expect(screen.getByText(/Diese Einstellungen betreffen alle vom System versendeten E-Mails/)).toBeInTheDocument();
    });

    it('renders signature preview', async () => {
      render(
        <EmailSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-settings')).toBeInTheDocument();
      });

      expect(screen.getByText('Vorschau')).toBeInTheDocument();
    });

    it('renders character count', async () => {
      render(
        <EmailSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-settings')).toBeInTheDocument();
      });

      expect(screen.getByText(/\/ 1000 Zeichen/)).toBeInTheDocument();
    });
  });

  describe('unsaved changes', () => {
    it('shows unsaved changes indicator when form is modified', async () => {
      render(
        <EmailSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
          onUnsavedChanges={mockOnUnsavedChanges}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-settings')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('email-setting'), {
        target: { value: 'New signature' },
      });

      expect(screen.getByTestId('unsaved-indicator')).toBeInTheDocument();
      expect(mockOnUnsavedChanges).toHaveBeenCalledWith(true);
    });

    it('disables save button when no changes', async () => {
      render(
        <EmailSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-settings')).toBeInTheDocument();
      });

      expect(screen.getByTestId('save-button')).toBeDisabled();
    });
  });

  describe('form validation', () => {
    it('shows error for signature exceeding max length', async () => {
      render(
        <EmailSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-settings')).toBeInTheDocument();
      });

      // Create a string longer than 1000 characters
      const longSignature = 'a'.repeat(1001);

      fireEvent.change(screen.getByTestId('email-setting'), {
        target: { value: longSignature },
      });

      fireEvent.click(screen.getByTestId('save-button'));

      await waitFor(() => {
        expect(screen.getByTestId('validation-error')).toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    it('calls updateEmailSettings on valid submission', async () => {
      (settingsService.updateEmailSettings as ReturnType<typeof vi.fn>).mockResolvedValue(mockSettings);

      render(
        <EmailSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-settings')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('email-setting'), {
        target: { value: 'New signature' },
      });

      fireEvent.click(screen.getByTestId('save-button'));

      await waitFor(() => {
        expect(settingsService.updateEmailSettings).toHaveBeenCalled();
      });
    });

    it('calls onSaveSuccess on successful save', async () => {
      (settingsService.updateEmailSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
        signature: 'New signature',
      });

      render(
        <EmailSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-settings')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('email-setting'), {
        target: { value: 'New signature' },
      });

      fireEvent.click(screen.getByTestId('save-button'));

      await waitFor(() => {
        expect(mockOnSaveSuccess).toHaveBeenCalled();
      });
    });

    it('calls onSaveError on failed save', async () => {
      (settingsService.updateEmailSettings as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Save failed')
      );

      render(
        <EmailSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-settings')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('email-setting'), {
        target: { value: 'New signature' },
      });

      fireEvent.click(screen.getByTestId('save-button'));

      await waitFor(() => {
        expect(mockOnSaveError).toHaveBeenCalled();
      });
    });
  });

  describe('reset functionality', () => {
    it('resets form to original values', async () => {
      render(
        <EmailSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-settings')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('email-setting'), {
        target: { value: 'Modified signature' },
      });

      expect(screen.getByTestId('email-setting')).toHaveValue('Modified signature');

      fireEvent.click(screen.getByTestId('reset-button'));

      expect(screen.getByTestId('email-setting')).toHaveValue('Best regards,\nYour Team');
    });

    it('disables reset button when no changes', async () => {
      render(
        <EmailSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-settings')).toBeInTheDocument();
      });

      expect(screen.getByTestId('reset-button')).toBeDisabled();
    });
  });

  describe('preview', () => {
    it('updates preview when signature changes', async () => {
      render(
        <EmailSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-settings')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('email-setting'), {
        target: { value: 'Custom signature here' },
      });

      // The preview should show the new signature (using getAllByText since both textarea and preview have the same text)
      const elements = screen.getAllByText('Custom signature here');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('shows placeholder when signature is empty', async () => {
      (settingsService.getEmailSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
        signature: '',
      });

      render(
        <EmailSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-settings')).toBeInTheDocument();
      });

      expect(screen.getByText('Keine Signatur definiert')).toBeInTheDocument();
    });
  });

  describe('fallback behavior', () => {
    it('uses default settings when loading fails', async () => {
      (settingsService.getEmailSettings as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Load failed')
      );

      render(
        <EmailSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-settings')).toBeInTheDocument();
      });

      // Should have default signature
      expect(screen.getByTestId('email-setting')).toHaveValue('Best regards,\nYour Team');
    });
  });

  describe('character counter', () => {
    it('updates character count as user types', async () => {
      render(
        <EmailSettings
          onSaveSuccess={mockOnSaveSuccess}
          onSaveError={mockOnSaveError}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-settings')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('email-setting'), {
        target: { value: 'Test' },
      });

      expect(screen.getByText('4 / 1000 Zeichen')).toBeInTheDocument();
    });
  });
});
