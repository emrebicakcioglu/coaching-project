/**
 * FeedbackModal Component Tests
 * STORY-041G: Feedback Modal UI
 *
 * Unit tests for the FeedbackModal component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedbackModal } from './FeedbackModal';
import { feedbackService } from '../../services/feedbackService';

// Mock feedbackService
vi.mock('../../services/feedbackService', () => ({
  feedbackService: {
    submitFeedback: vi.fn(),
  },
}));

// Mock useResponsive hook
vi.mock('../../hooks', () => ({
  useResponsive: () => ({ isMobile: false }),
}));

// Sample base64 screenshot for testing
const MOCK_SCREENSHOT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('FeedbackModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    screenshot: MOCK_SCREENSHOT,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render nothing when isOpen is false', () => {
      render(<FeedbackModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Feedback senden')).not.toBeInTheDocument();
    });

    it('should render modal when isOpen is true', () => {
      render(<FeedbackModal {...defaultProps} />);
      expect(screen.getByText('Feedback senden')).toBeInTheDocument();
    });

    it('should display screenshot preview', () => {
      render(<FeedbackModal {...defaultProps} />);
      const screenshot = screen.getByAltText('Screenshot Vorschau');
      expect(screenshot).toBeInTheDocument();
      expect(screenshot).toHaveAttribute('src', MOCK_SCREENSHOT);
    });

    it('should display textarea with placeholder', () => {
      render(<FeedbackModal {...defaultProps} />);
      expect(screen.getByPlaceholderText('Was möchten Sie uns mitteilen?')).toBeInTheDocument();
    });

    it('should display character counter at 0/2000', () => {
      render(<FeedbackModal {...defaultProps} />);
      expect(screen.getByText('0/2000 Zeichen')).toBeInTheDocument();
    });

    it('should have submit button disabled by default', () => {
      render(<FeedbackModal {...defaultProps} />);
      const submitButton = screen.getByTestId('feedback-modal-submit-button');
      expect(submitButton).toBeDisabled();
    });

    it('should display cancel button enabled', () => {
      render(<FeedbackModal {...defaultProps} />);
      const cancelButton = screen.getByTestId('feedback-modal-cancel-button');
      expect(cancelButton).toBeEnabled();
    });
  });

  describe('Character Counter', () => {
    it('should update counter when typing', async () => {
      const user = userEvent.setup();
      render(<FeedbackModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Was möchten Sie uns mitteilen?');
      await user.type(textarea, 'Hello');

      expect(screen.getByText('5/2000 Zeichen')).toBeInTheDocument();
    });

    it('should show hint when less than 10 characters', async () => {
      const user = userEvent.setup();
      render(<FeedbackModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Was möchten Sie uns mitteilen?');
      await user.type(textarea, 'Hello');

      expect(screen.getByText(/Noch 5 Zeichen erforderlich/)).toBeInTheDocument();
    });

    it('should hide hint when 10 or more characters', async () => {
      const user = userEvent.setup();
      render(<FeedbackModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Was möchten Sie uns mitteilen?');
      await user.type(textarea, 'Hello World!');

      expect(screen.queryByText(/Noch \d+ Zeichen erforderlich/)).not.toBeInTheDocument();
    });

    it('should not allow more than 2000 characters', async () => {
      render(<FeedbackModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Was möchten Sie uns mitteilen?');

      // Directly set value to 1990 chars first
      fireEvent.change(textarea, { target: { value: 'a'.repeat(1990) } });
      expect(screen.getByText('1990/2000 Zeichen')).toBeInTheDocument();

      // Add 10 more to hit limit
      fireEvent.change(textarea, { target: { value: 'a'.repeat(2000) } });
      expect(screen.getByText('2000/2000 Zeichen')).toBeInTheDocument();

      // Try to set more than 2000 - should be capped
      fireEvent.change(textarea, { target: { value: 'a'.repeat(2100) } });
      // The handler should cap it at 2000
      expect(screen.getByText('2000/2000 Zeichen')).toBeInTheDocument();
    });
  });

  describe('Submit Button State', () => {
    it('should be disabled when less than 10 characters', async () => {
      const user = userEvent.setup();
      render(<FeedbackModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Was möchten Sie uns mitteilen?');
      await user.type(textarea, 'Short');

      const submitButton = screen.getByTestId('feedback-modal-submit-button');
      expect(submitButton).toBeDisabled();
    });

    it('should be enabled when 10 or more characters', async () => {
      const user = userEvent.setup();
      render(<FeedbackModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Was möchten Sie uns mitteilen?');
      await user.type(textarea, 'This is long enough');

      const submitButton = screen.getByTestId('feedback-modal-submit-button');
      expect(submitButton).toBeEnabled();
    });
  });

  describe('Form Submission', () => {
    it('should call feedbackService.submitFeedback on submit', async () => {
      const mockSubmit = vi.mocked(feedbackService.submitFeedback);
      mockSubmit.mockResolvedValue({
        message: 'Success',
        id: 123,
        queued: true,
        screenshotStored: true,
      });

      const user = userEvent.setup();
      render(<FeedbackModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Was möchten Sie uns mitteilen?');
      await user.type(textarea, 'This is a valid feedback message');

      const submitButton = screen.getByTestId('feedback-modal-submit-button');
      await user.click(submitButton);

      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          screenshot: MOCK_SCREENSHOT,
          comment: 'This is a valid feedback message',
        })
      );
    });

    it('should show loading state during submission', async () => {
      const mockSubmit = vi.mocked(feedbackService.submitFeedback);
      mockSubmit.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          message: 'Success',
          id: 123,
        }), 100))
      );

      const user = userEvent.setup();
      render(<FeedbackModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Was möchten Sie uns mitteilen?');
      await user.type(textarea, 'This is a valid feedback message');

      const submitButton = screen.getByTestId('feedback-modal-submit-button');
      await user.click(submitButton);

      expect(screen.getByText('Senden...')).toBeInTheDocument();
    });

    it('should call onClose after successful submission', async () => {
      const mockSubmit = vi.mocked(feedbackService.submitFeedback);
      mockSubmit.mockResolvedValue({
        message: 'Success',
        id: 123,
      });

      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<FeedbackModal {...defaultProps} onClose={onClose} />);

      const textarea = screen.getByPlaceholderText('Was möchten Sie uns mitteilen?');
      await user.type(textarea, 'This is a valid feedback message');

      const submitButton = screen.getByTestId('feedback-modal-submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    it('should show error message on submission failure', async () => {
      const mockSubmit = vi.mocked(feedbackService.submitFeedback);
      mockSubmit.mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup();
      render(<FeedbackModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Was möchten Sie uns mitteilen?');
      await user.type(textarea, 'This is a valid feedback message');

      const submitButton = screen.getByTestId('feedback-modal-submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Fehler beim Senden/)).toBeInTheDocument();
      });
    });

    it('should not call onClose on submission failure', async () => {
      const mockSubmit = vi.mocked(feedbackService.submitFeedback);
      mockSubmit.mockRejectedValue(new Error('Network error'));

      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<FeedbackModal {...defaultProps} onClose={onClose} />);

      const textarea = screen.getByPlaceholderText('Was möchten Sie uns mitteilen?');
      await user.type(textarea, 'This is a valid feedback message');

      const submitButton = screen.getByTestId('feedback-modal-submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Fehler beim Senden/)).toBeInTheDocument();
      });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Cancel Button', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<FeedbackModal {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByTestId('feedback-modal-cancel-button');
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Form Reset', () => {
    it('should reset form when modal reopens', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<FeedbackModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Was möchten Sie uns mitteilen?');
      await user.type(textarea, 'Some text');
      expect(textarea).toHaveValue('Some text');

      // Close modal
      rerender(<FeedbackModal {...defaultProps} isOpen={false} />);

      // Reopen modal
      rerender(<FeedbackModal {...defaultProps} isOpen={true} />);

      const textareaAfter = screen.getByPlaceholderText('Was möchten Sie uns mitteilen?');
      expect(textareaAfter).toHaveValue('');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible textarea with label', () => {
      render(<FeedbackModal {...defaultProps} />);
      const textarea = screen.getByLabelText('Beschreiben Sie Ihr Feedback:');
      expect(textarea).toBeInTheDocument();
    });

    it('should set aria-invalid on textarea when error exists', async () => {
      const mockSubmit = vi.mocked(feedbackService.submitFeedback);
      mockSubmit.mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup();
      render(<FeedbackModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Was möchten Sie uns mitteilen?');
      await user.type(textarea, 'This is a valid feedback message');

      const submitButton = screen.getByTestId('feedback-modal-submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        // Check for the inline error message in modal
        const errorMessage = screen.getByTestId('feedback-modal-error');
        expect(errorMessage).toBeInTheDocument();
        expect(textarea).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should have error message with role=alert', async () => {
      const mockSubmit = vi.mocked(feedbackService.submitFeedback);
      mockSubmit.mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup();
      render(<FeedbackModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Was möchten Sie uns mitteilen?');
      await user.type(textarea, 'This is a valid feedback message');

      const submitButton = screen.getByTestId('feedback-modal-submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        // Check for the inline error message in modal (via testid)
        const error = screen.getByTestId('feedback-modal-error');
        expect(error).toHaveAttribute('role', 'alert');
      });
    });
  });

  describe('Screenshot Missing', () => {
    it('should not show preview when screenshot is null', () => {
      render(<FeedbackModal {...defaultProps} screenshot={null} />);
      expect(screen.queryByAltText('Screenshot Vorschau')).not.toBeInTheDocument();
    });
  });

  describe('Success Toast', () => {
    it('should show success toast after submission', async () => {
      const mockSubmit = vi.mocked(feedbackService.submitFeedback);
      mockSubmit.mockResolvedValue({
        message: 'Success',
        id: 123,
      });

      const user = userEvent.setup();
      render(<FeedbackModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Was möchten Sie uns mitteilen?');
      await user.type(textarea, 'This is a valid feedback message');

      const submitButton = screen.getByTestId('feedback-modal-submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Feedback erfolgreich gesendet!')).toBeInTheDocument();
      });
    });
  });
});
