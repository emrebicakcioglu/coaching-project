/**
 * FeedbackButton Component Tests
 * STORY-041F: Feedback Trigger UI
 *
 * Unit tests for the FeedbackButton component.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FeedbackButton } from './FeedbackButton';
import { FeedbackContext, FeedbackContextState } from '../../contexts';

// Mock html2canvas
vi.mock('html2canvas', () => ({
  default: vi.fn(() =>
    Promise.resolve({
      toDataURL: () => 'data:image/png;base64,mockscreenshot',
    })
  ),
}));

/**
 * Create a mock FeedbackContext value
 */
const createMockFeedbackContext = (
  overrides: Partial<FeedbackContextState> = {}
): FeedbackContextState => ({
  isFeedbackEnabled: true,
  isCheckingFeature: false,
  isCapturing: false,
  screenshot: null,
  isModalOpen: false,
  error: null,
  captureScreenshot: vi.fn().mockResolvedValue(undefined),
  clearScreenshot: vi.fn(),
  openModal: vi.fn(),
  closeModal: vi.fn(),
  refreshFeatureStatus: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

/**
 * Wrapper component for testing with FeedbackContext
 */
const TestWrapper: React.FC<{
  children: React.ReactNode;
  contextValue: FeedbackContextState;
}> = ({ children, contextValue }) => (
  <FeedbackContext.Provider value={contextValue}>
    {children}
  </FeedbackContext.Provider>
);

describe('FeedbackButton', () => {
  describe('Rendering', () => {
    it('should render when feature is enabled', () => {
      const mockContext = createMockFeedbackContext();

      render(
        <TestWrapper contextValue={mockContext}>
          <FeedbackButton />
        </TestWrapper>
      );

      expect(screen.getByTestId('feedback-button')).toBeInTheDocument();
    });

    it('should not render when feature is disabled', () => {
      const mockContext = createMockFeedbackContext({
        isFeedbackEnabled: false,
      });

      render(
        <TestWrapper contextValue={mockContext}>
          <FeedbackButton />
        </TestWrapper>
      );

      expect(screen.queryByTestId('feedback-button')).not.toBeInTheDocument();
    });

    it('should not render while checking feature status', () => {
      const mockContext = createMockFeedbackContext({
        isCheckingFeature: true,
      });

      render(
        <TestWrapper contextValue={mockContext}>
          <FeedbackButton />
        </TestWrapper>
      );

      expect(screen.queryByTestId('feedback-button')).not.toBeInTheDocument();
    });

    it('should have correct id attribute', () => {
      const mockContext = createMockFeedbackContext();

      render(
        <TestWrapper contextValue={mockContext}>
          <FeedbackButton />
        </TestWrapper>
      );

      expect(screen.getByTestId('feedback-button')).toHaveAttribute(
        'id',
        'feedback-button'
      );
    });
  });

  describe('Styling', () => {
    it('should have base class', () => {
      const mockContext = createMockFeedbackContext();

      render(
        <TestWrapper contextValue={mockContext}>
          <FeedbackButton />
        </TestWrapper>
      );

      expect(screen.getByTestId('feedback-button')).toHaveClass(
        'feedback-button'
      );
    });

    it('should apply custom className', () => {
      const mockContext = createMockFeedbackContext();

      render(
        <TestWrapper contextValue={mockContext}>
          <FeedbackButton className="custom-class" />
        </TestWrapper>
      );

      expect(screen.getByTestId('feedback-button')).toHaveClass('custom-class');
    });

    it('should have capturing class when capturing', () => {
      const mockContext = createMockFeedbackContext({
        isCapturing: true,
      });

      render(
        <TestWrapper contextValue={mockContext}>
          <FeedbackButton />
        </TestWrapper>
      );

      expect(screen.getByTestId('feedback-button')).toHaveClass(
        'feedback-button--capturing'
      );
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label', () => {
      const mockContext = createMockFeedbackContext();

      render(
        <TestWrapper contextValue={mockContext}>
          <FeedbackButton />
        </TestWrapper>
      );

      expect(screen.getByTestId('feedback-button')).toHaveAttribute(
        'aria-label',
        'Feedback senden'
      );
    });

    it('should have title with keyboard shortcut', () => {
      const mockContext = createMockFeedbackContext();

      render(
        <TestWrapper contextValue={mockContext}>
          <FeedbackButton />
        </TestWrapper>
      );

      expect(screen.getByTestId('feedback-button')).toHaveAttribute(
        'title',
        'Feedback senden (Ctrl+Shift+F)'
      );
    });

    it('should be a button element', () => {
      const mockContext = createMockFeedbackContext();

      render(
        <TestWrapper contextValue={mockContext}>
          <FeedbackButton />
        </TestWrapper>
      );

      expect(screen.getByTestId('feedback-button').tagName).toBe('BUTTON');
    });
  });

  describe('Interactions', () => {
    it('should call captureScreenshot on click', async () => {
      const captureScreenshot = vi.fn().mockResolvedValue(undefined);
      const mockContext = createMockFeedbackContext({
        captureScreenshot,
      });

      render(
        <TestWrapper contextValue={mockContext}>
          <FeedbackButton />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId('feedback-button'));

      await waitFor(() => {
        expect(captureScreenshot).toHaveBeenCalledTimes(1);
      });
    });

    it('should be disabled while capturing', () => {
      const mockContext = createMockFeedbackContext({
        isCapturing: true,
      });

      render(
        <TestWrapper contextValue={mockContext}>
          <FeedbackButton />
        </TestWrapper>
      );

      expect(screen.getByTestId('feedback-button')).toBeDisabled();
    });
  });

  describe('Loading State', () => {
    it('should show spinner when capturing', () => {
      const mockContext = createMockFeedbackContext({
        isCapturing: true,
      });

      render(
        <TestWrapper contextValue={mockContext}>
          <FeedbackButton />
        </TestWrapper>
      );

      expect(
        screen.getByTestId('feedback-button').querySelector('.feedback-button__spinner')
      ).toBeInTheDocument();
    });

    it('should show icon when not capturing', () => {
      const mockContext = createMockFeedbackContext({
        isCapturing: false,
      });

      render(
        <TestWrapper contextValue={mockContext}>
          <FeedbackButton />
        </TestWrapper>
      );

      expect(
        screen.getByTestId('feedback-button').querySelector('.feedback-button__icon')
      ).toBeInTheDocument();
    });
  });

  describe('onCapture Callback', () => {
    it('should call onCapture when screenshot is available', async () => {
      const onCapture = vi.fn();
      const mockContext = createMockFeedbackContext({
        screenshot: 'data:image/png;base64,test',
      });

      render(
        <TestWrapper contextValue={mockContext}>
          <FeedbackButton onCapture={onCapture} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(onCapture).toHaveBeenCalledWith('data:image/png;base64,test');
      });
    });

    it('should not call onCapture when screenshot is null', () => {
      const onCapture = vi.fn();
      const mockContext = createMockFeedbackContext({
        screenshot: null,
      });

      render(
        <TestWrapper contextValue={mockContext}>
          <FeedbackButton onCapture={onCapture} />
        </TestWrapper>
      );

      expect(onCapture).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should trigger capture on Ctrl+Shift+F', async () => {
      const captureScreenshot = vi.fn().mockResolvedValue(undefined);
      const mockContext = createMockFeedbackContext({
        captureScreenshot,
      });

      render(
        <TestWrapper contextValue={mockContext}>
          <FeedbackButton />
        </TestWrapper>
      );

      // Simulate Ctrl+Shift+F
      fireEvent.keyDown(document, {
        key: 'F',
        ctrlKey: true,
        shiftKey: true,
      });

      await waitFor(() => {
        expect(captureScreenshot).toHaveBeenCalledTimes(1);
      });
    });

    it('should trigger capture on Meta+Shift+F (macOS)', async () => {
      const captureScreenshot = vi.fn().mockResolvedValue(undefined);
      const mockContext = createMockFeedbackContext({
        captureScreenshot,
      });

      render(
        <TestWrapper contextValue={mockContext}>
          <FeedbackButton />
        </TestWrapper>
      );

      // Simulate Cmd+Shift+F (macOS)
      fireEvent.keyDown(document, {
        key: 'F',
        metaKey: true,
        shiftKey: true,
      });

      await waitFor(() => {
        expect(captureScreenshot).toHaveBeenCalledTimes(1);
      });
    });

    it('should not trigger when just F is pressed', () => {
      const captureScreenshot = vi.fn().mockResolvedValue(undefined);
      const mockContext = createMockFeedbackContext({
        captureScreenshot,
      });

      render(
        <TestWrapper contextValue={mockContext}>
          <FeedbackButton />
        </TestWrapper>
      );

      // Just F key
      fireEvent.keyDown(document, { key: 'F' });

      expect(captureScreenshot).not.toHaveBeenCalled();
    });

    it('should not trigger when feature is disabled', () => {
      const captureScreenshot = vi.fn().mockResolvedValue(undefined);
      const mockContext = createMockFeedbackContext({
        isFeedbackEnabled: false,
        captureScreenshot,
      });

      render(
        <TestWrapper contextValue={mockContext}>
          <FeedbackButton />
        </TestWrapper>
      );

      // Simulate Ctrl+Shift+F
      fireEvent.keyDown(document, {
        key: 'F',
        ctrlKey: true,
        shiftKey: true,
      });

      expect(captureScreenshot).not.toHaveBeenCalled();
    });

    it('should cleanup keyboard listener on unmount', () => {
      const captureScreenshot = vi.fn().mockResolvedValue(undefined);
      const mockContext = createMockFeedbackContext({
        captureScreenshot,
      });

      const { unmount } = render(
        <TestWrapper contextValue={mockContext}>
          <FeedbackButton />
        </TestWrapper>
      );

      unmount();

      // After unmount, the shortcut should not trigger
      fireEvent.keyDown(document, {
        key: 'F',
        ctrlKey: true,
        shiftKey: true,
      });

      expect(captureScreenshot).not.toHaveBeenCalled();
    });
  });

  describe('Custom Test IDs', () => {
    it('should use custom data-testid', () => {
      const mockContext = createMockFeedbackContext();

      render(
        <TestWrapper contextValue={mockContext}>
          <FeedbackButton data-testid="custom-feedback-btn" />
        </TestWrapper>
      );

      expect(screen.getByTestId('custom-feedback-btn')).toBeInTheDocument();
    });
  });
});
