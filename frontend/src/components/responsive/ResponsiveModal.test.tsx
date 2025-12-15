/**
 * ResponsiveModal Component Tests
 * STORY-017B: Component Responsiveness
 *
 * Unit tests for responsive modal component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResponsiveModal } from './ResponsiveModal';

// Mock useResponsive hook
const mockUseResponsive = vi.fn();

vi.mock('../../hooks', () => ({
  useResponsive: () => mockUseResponsive(),
}));

describe('ResponsiveModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    children: <div data-testid="modal-content">Modal Content</div>,
  };

  beforeEach(() => {
    // Default to desktop view
    mockUseResponsive.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      breakpoint: 'lg',
      width: 1024,
      height: 768,
    });
    document.body.style.overflow = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  describe('Desktop View', () => {
    it('renders as centered modal on desktop', () => {
      render(<ResponsiveModal {...defaultProps} />);

      const modal = screen.getByTestId('responsive-modal');
      expect(modal).toHaveAttribute('data-variant', 'desktop');
    });

    it('renders backdrop', () => {
      render(<ResponsiveModal {...defaultProps} />);

      expect(screen.getByTestId('responsive-modal-backdrop')).toBeInTheDocument();
    });

    it('renders title when provided', () => {
      render(<ResponsiveModal {...defaultProps} title="Test Modal" />);

      expect(screen.getByText('Test Modal')).toBeInTheDocument();
    });

    it('renders children content', () => {
      render(<ResponsiveModal {...defaultProps} />);

      expect(screen.getByTestId('modal-content')).toBeInTheDocument();
    });

    it('renders footer when provided', () => {
      render(
        <ResponsiveModal
          {...defaultProps}
          footer={<button data-testid="footer-btn">Save</button>}
        />
      );

      expect(screen.getByTestId('footer-btn')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-modal-footer')).toBeInTheDocument();
    });

    it('renders close button by default', () => {
      render(<ResponsiveModal {...defaultProps} title="Test" />);

      expect(screen.getByTestId('responsive-modal-close-button')).toBeInTheDocument();
    });

    it('hides close button when showCloseButton is false', () => {
      render(
        <ResponsiveModal {...defaultProps} title="Test" showCloseButton={false} />
      );

      expect(screen.queryByTestId('responsive-modal-close-button')).not.toBeInTheDocument();
    });

    it('applies correct size class', () => {
      render(<ResponsiveModal {...defaultProps} size="lg" />);

      const modal = screen.getByTestId('responsive-modal');
      expect(modal).toHaveClass('max-w-lg');
    });

    it('has proper accessibility attributes', () => {
      render(
        <ResponsiveModal
          {...defaultProps}
          title="Accessible Modal"
          description="This is a description"
        />
      );

      const modal = screen.getByTestId('responsive-modal');
      expect(modal).toHaveAttribute('role', 'dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'responsive-modal-title');
      expect(modal).toHaveAttribute('aria-describedby', 'responsive-modal-description');
    });
  });

  describe('Mobile View', () => {
    beforeEach(() => {
      mockUseResponsive.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        breakpoint: 'xs',
        width: 375,
        height: 667,
      });
    });

    it('renders as fullscreen on mobile', () => {
      render(<ResponsiveModal {...defaultProps} />);

      const modal = screen.getByTestId('responsive-modal');
      expect(modal).toHaveAttribute('data-variant', 'mobile');
      expect(modal).toHaveClass('fixed', 'inset-0');
    });

    it('does not render backdrop on mobile (fullscreen)', () => {
      render(<ResponsiveModal {...defaultProps} />);

      expect(screen.queryByTestId('responsive-modal-backdrop')).not.toBeInTheDocument();
    });

    it('renders close button in header', () => {
      render(<ResponsiveModal {...defaultProps} title="Mobile Modal" />);

      expect(screen.getByTestId('responsive-modal-close-button')).toBeInTheDocument();
    });

    it('close button has minimum touch target size', () => {
      render(<ResponsiveModal {...defaultProps} title="Mobile Modal" />);

      const closeButton = screen.getByTestId('responsive-modal-close-button');
      expect(closeButton).toHaveClass('min-w-[44px]');
      expect(closeButton).toHaveClass('min-h-[44px]');
    });
  });

  describe('Interactions', () => {
    it('calls onClose when close button clicked', () => {
      const onClose = vi.fn();
      render(<ResponsiveModal {...defaultProps} onClose={onClose} title="Test" />);

      fireEvent.click(screen.getByTestId('responsive-modal-close-button'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop clicked', () => {
      const onClose = vi.fn();
      render(<ResponsiveModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByTestId('responsive-modal-backdrop'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when backdrop clicked if closeOnBackdropClick is false', () => {
      const onClose = vi.fn();
      render(
        <ResponsiveModal {...defaultProps} onClose={onClose} closeOnBackdropClick={false} />
      );

      fireEvent.click(screen.getByTestId('responsive-modal-backdrop'));

      expect(onClose).not.toHaveBeenCalled();
    });

    it('calls onClose on Escape key press', async () => {
      const onClose = vi.fn();
      render(<ResponsiveModal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });

    it('does not call onClose on Escape if closeOnEscape is false', () => {
      const onClose = vi.fn();
      render(
        <ResponsiveModal {...defaultProps} onClose={onClose} closeOnEscape={false} />
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not close when modal content is clicked', () => {
      const onClose = vi.fn();
      render(<ResponsiveModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByTestId('modal-content'));

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Body Scroll Lock', () => {
    it('locks body scroll when open', () => {
      render(<ResponsiveModal {...defaultProps} />);

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('unlocks body scroll when closed', () => {
      const { rerender } = render(<ResponsiveModal {...defaultProps} />);

      expect(document.body.style.overflow).toBe('hidden');

      rerender(<ResponsiveModal {...defaultProps} isOpen={false} />);

      expect(document.body.style.overflow).toBe('');
    });

    it('cleans up body scroll on unmount', () => {
      const { unmount } = render(<ResponsiveModal {...defaultProps} />);

      expect(document.body.style.overflow).toBe('hidden');

      unmount();

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Closed State', () => {
    it('does not render when isOpen is false', () => {
      render(<ResponsiveModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId('responsive-modal')).not.toBeInTheDocument();
    });
  });

  describe('Custom Test ID', () => {
    it('uses custom data-testid', () => {
      render(<ResponsiveModal {...defaultProps} data-testid="custom-modal" />);

      expect(screen.getByTestId('custom-modal')).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      render(<ResponsiveModal {...defaultProps} className="custom-modal-class" />);

      const modal = screen.getByTestId('responsive-modal');
      expect(modal).toHaveClass('custom-modal-class');
    });
  });
});
