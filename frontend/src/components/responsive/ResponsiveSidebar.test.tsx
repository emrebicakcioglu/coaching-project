/**
 * ResponsiveSidebar Component Tests
 * STORY-017B: Component Responsiveness
 *
 * Unit tests for responsive sidebar component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResponsiveSidebar } from './ResponsiveSidebar';

// Mock useResponsive hook
const mockUseResponsive = vi.fn();

vi.mock('../../hooks', () => ({
  useResponsive: () => mockUseResponsive(),
}));

describe('ResponsiveSidebar', () => {
  const defaultProps = {
    children: <nav data-testid="nav-content">Navigation</nav>,
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
    it('renders as fixed sidebar on desktop', () => {
      render(<ResponsiveSidebar {...defaultProps} />);

      const sidebar = screen.getByTestId('responsive-sidebar');
      expect(sidebar).toBeInTheDocument();
      expect(sidebar).toHaveAttribute('data-variant', 'desktop');
    });

    it('renders header content', () => {
      render(
        <ResponsiveSidebar {...defaultProps} header={<div data-testid="header">Logo</div>} />
      );

      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-sidebar-header')).toBeInTheDocument();
    });

    it('renders footer content', () => {
      render(
        <ResponsiveSidebar {...defaultProps} footer={<div data-testid="footer">Footer</div>} />
      );

      expect(screen.getByTestId('footer')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-sidebar-footer')).toBeInTheDocument();
    });

    it('renders children content', () => {
      render(<ResponsiveSidebar {...defaultProps} />);

      expect(screen.getByTestId('nav-content')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-sidebar-content')).toBeInTheDocument();
    });

    it('does not render close button on desktop', () => {
      render(<ResponsiveSidebar {...defaultProps} isOpen onClose={() => {}} />);

      expect(screen.queryByTestId('responsive-sidebar-close-button')).not.toBeInTheDocument();
    });

    it('applies correct width class', () => {
      render(<ResponsiveSidebar {...defaultProps} width="lg" />);

      const sidebar = screen.getByTestId('responsive-sidebar');
      expect(sidebar).toHaveClass('w-72');
    });

    it('has proper accessibility attributes', () => {
      render(<ResponsiveSidebar {...defaultProps} />);

      const sidebar = screen.getByTestId('responsive-sidebar');
      expect(sidebar).toHaveAttribute('aria-label', 'Sidebar');
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

    it('renders as overlay sidebar on mobile', () => {
      render(<ResponsiveSidebar {...defaultProps} isOpen onClose={() => {}} />);

      const sidebar = screen.getByTestId('responsive-sidebar');
      expect(sidebar).toHaveAttribute('data-variant', 'mobile');
    });

    it('renders backdrop when open on mobile', () => {
      render(<ResponsiveSidebar {...defaultProps} isOpen onClose={() => {}} />);

      expect(screen.getByTestId('responsive-sidebar-backdrop')).toBeInTheDocument();
    });

    it('does not render backdrop when closed on mobile', () => {
      render(<ResponsiveSidebar {...defaultProps} isOpen={false} onClose={() => {}} />);

      expect(screen.queryByTestId('responsive-sidebar-backdrop')).not.toBeInTheDocument();
    });

    it('renders close button on mobile', () => {
      render(
        <ResponsiveSidebar
          {...defaultProps}
          isOpen
          onClose={() => {}}
          header={<div>Header</div>}
        />
      );

      expect(screen.getByTestId('responsive-sidebar-close-button')).toBeInTheDocument();
    });

    it('calls onClose when close button clicked', () => {
      const onClose = vi.fn();
      render(
        <ResponsiveSidebar
          {...defaultProps}
          isOpen
          onClose={onClose}
          header={<div>Header</div>}
        />
      );

      fireEvent.click(screen.getByTestId('responsive-sidebar-close-button'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop clicked', () => {
      const onClose = vi.fn();
      render(<ResponsiveSidebar {...defaultProps} isOpen onClose={onClose} />);

      fireEvent.click(screen.getByTestId('responsive-sidebar-backdrop'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('locks body scroll when open on mobile', () => {
      render(<ResponsiveSidebar {...defaultProps} isOpen onClose={() => {}} />);

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('unlocks body scroll when closed', () => {
      const { rerender } = render(
        <ResponsiveSidebar {...defaultProps} isOpen onClose={() => {}} />
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(<ResponsiveSidebar {...defaultProps} isOpen={false} onClose={() => {}} />);

      expect(document.body.style.overflow).toBe('');
    });

    it('has proper accessibility attributes for dialog', () => {
      render(<ResponsiveSidebar {...defaultProps} isOpen onClose={() => {}} />);

      const sidebar = screen.getByTestId('responsive-sidebar');
      expect(sidebar).toHaveAttribute('role', 'dialog');
      expect(sidebar).toHaveAttribute('aria-modal', 'true');
    });

    it('applies translate transform based on open state', () => {
      const { rerender } = render(
        <ResponsiveSidebar {...defaultProps} isOpen onClose={() => {}} />
      );

      let sidebar = screen.getByTestId('responsive-sidebar');
      expect(sidebar).toHaveClass('translate-x-0');

      rerender(<ResponsiveSidebar {...defaultProps} isOpen={false} onClose={() => {}} />);

      sidebar = screen.getByTestId('responsive-sidebar');
      expect(sidebar).toHaveClass('-translate-x-full');
    });

    it('close button has minimum touch target size', () => {
      render(
        <ResponsiveSidebar
          {...defaultProps}
          isOpen
          onClose={() => {}}
          header={<div>Header</div>}
        />
      );

      const closeButton = screen.getByTestId('responsive-sidebar-close-button');
      expect(closeButton).toHaveClass('min-w-[44px]');
      expect(closeButton).toHaveClass('min-h-[44px]');
    });
  });

  describe('Position', () => {
    it('renders on left by default', () => {
      mockUseResponsive.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        breakpoint: 'xs',
        width: 375,
        height: 667,
      });

      render(<ResponsiveSidebar {...defaultProps} isOpen onClose={() => {}} />);

      const sidebar = screen.getByTestId('responsive-sidebar');
      expect(sidebar).toHaveClass('left-0');
    });

    it('renders on right when position is right', () => {
      mockUseResponsive.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        breakpoint: 'xs',
        width: 375,
        height: 667,
      });

      render(
        <ResponsiveSidebar {...defaultProps} isOpen onClose={() => {}} position="right" />
      );

      const sidebar = screen.getByTestId('responsive-sidebar');
      expect(sidebar).toHaveClass('right-0');
    });
  });

  describe('Keyboard Navigation', () => {
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

    it('closes on Escape key press when mobile and open', async () => {
      const onClose = vi.fn();
      render(<ResponsiveSidebar {...defaultProps} isOpen onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });

    it('does not call onClose on Escape when closed', () => {
      const onClose = vi.fn();
      render(<ResponsiveSidebar {...defaultProps} isOpen={false} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Custom Test ID', () => {
    it('uses custom data-testid', () => {
      render(<ResponsiveSidebar {...defaultProps} data-testid="custom-sidebar" />);

      expect(screen.getByTestId('custom-sidebar')).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      render(<ResponsiveSidebar {...defaultProps} className="custom-class" />);

      const sidebar = screen.getByTestId('responsive-sidebar');
      expect(sidebar).toHaveClass('custom-class');
    });
  });
});
