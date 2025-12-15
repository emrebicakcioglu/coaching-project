/**
 * MobileSidebar Component Tests
 * STORY-018B: Context Menu Responsive & Mobile
 *
 * Unit tests for the MobileSidebar responsive container component.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MobileSidebar } from './MobileSidebar';

// Mock useResponsive hook
vi.mock('../../hooks', () => ({
  useResponsive: vi.fn(() => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: 1200,
    height: 800,
    breakpoint: 'lg',
    isBreakpoint: () => true,
    isBelowBreakpoint: () => false,
  })),
}));

import { useResponsive } from '../../hooks';

describe('MobileSidebar', () => {
  const defaultProps = {
    isOpen: false,
    onOpen: vi.fn(),
    onClose: vi.fn(),
    children: <nav>Navigation content</nav>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default to desktop mode
    vi.mocked(useResponsive).mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      width: 1200,
      height: 800,
      breakpoint: 'lg',
      isBreakpoint: () => true,
      isBelowBreakpoint: () => false,
    });
  });

  afterEach(() => {
    // Reset body overflow
    document.body.style.overflow = '';
  });

  describe('Desktop Mode (≥1024px)', () => {
    it('renders fixed sidebar on desktop', () => {
      render(<MobileSidebar {...defaultProps} data-testid="sidebar" />);
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveAttribute('data-variant', 'desktop');
    });

    it('displays sidebar content', () => {
      render(<MobileSidebar {...defaultProps} />);
      expect(screen.getByText('Navigation content')).toBeInTheDocument();
    });

    it('renders with 280px width when not collapsed', () => {
      render(<MobileSidebar {...defaultProps} data-testid="sidebar" />);
      expect(screen.getByTestId('sidebar')).toHaveClass('w-[280px]');
    });

    it('renders collapsed width (64px) when isCollapsed is true', () => {
      render(
        <MobileSidebar
          {...defaultProps}
          isCollapsed={true}
          data-testid="sidebar"
        />
      );
      expect(screen.getByTestId('sidebar')).toHaveClass('w-16');
    });

    it('renders header when provided', () => {
      render(
        <MobileSidebar
          {...defaultProps}
          header={<div>Logo Header</div>}
          data-testid="sidebar"
        />
      );
      expect(screen.getByText('Logo Header')).toBeInTheDocument();
    });

    it('renders footer when provided', () => {
      render(
        <MobileSidebar
          {...defaultProps}
          footer={<div>Footer Content</div>}
          data-testid="sidebar"
        />
      );
      expect(screen.getByText('Footer Content')).toBeInTheDocument();
    });

    it('renders collapse toggle button when onToggleCollapse is provided', () => {
      const onToggle = vi.fn();
      render(
        <MobileSidebar
          {...defaultProps}
          onToggleCollapse={onToggle}
          data-testid="sidebar"
        />
      );
      expect(screen.getByTestId('sidebar-toggle')).toBeInTheDocument();
    });

    it('calls onToggleCollapse when toggle button is clicked', () => {
      const onToggle = vi.fn();
      render(
        <MobileSidebar
          {...defaultProps}
          onToggleCollapse={onToggle}
          data-testid="sidebar"
        />
      );
      fireEvent.click(screen.getByTestId('sidebar-toggle'));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('has data-collapsed="false" when not collapsed', () => {
      render(<MobileSidebar {...defaultProps} data-testid="sidebar" />);
      expect(screen.getByTestId('sidebar')).toHaveAttribute(
        'data-collapsed',
        'false'
      );
    });

    it('has data-collapsed="true" when collapsed', () => {
      render(
        <MobileSidebar
          {...defaultProps}
          isCollapsed={true}
          data-testid="sidebar"
        />
      );
      expect(screen.getByTestId('sidebar')).toHaveAttribute(
        'data-collapsed',
        'true'
      );
    });

    it('does not render hamburger button on desktop', () => {
      render(<MobileSidebar {...defaultProps} data-testid="sidebar" />);
      expect(
        screen.queryByTestId('sidebar-hamburger')
      ).not.toBeInTheDocument();
    });

    it('does not render backdrop on desktop', () => {
      render(<MobileSidebar {...defaultProps} data-testid="sidebar" />);
      expect(screen.queryByTestId('sidebar-backdrop')).not.toBeInTheDocument();
    });
  });

  describe('Mobile Mode (<768px)', () => {
    beforeEach(() => {
      vi.mocked(useResponsive).mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        width: 375,
        height: 667,
        breakpoint: 'xs',
        isBreakpoint: () => false,
        isBelowBreakpoint: () => true,
      });
    });

    it('renders mobile header bar', () => {
      render(<MobileSidebar {...defaultProps} data-testid="sidebar" />);
      expect(screen.getByTestId('sidebar-header-bar')).toBeInTheDocument();
    });

    it('renders hamburger button', () => {
      render(<MobileSidebar {...defaultProps} data-testid="sidebar" />);
      expect(screen.getByTestId('sidebar-hamburger')).toBeInTheDocument();
    });

    it('renders sidebar drawer', () => {
      render(<MobileSidebar {...defaultProps} data-testid="sidebar" />);
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('has data-variant="mobile" on mobile', () => {
      render(<MobileSidebar {...defaultProps} data-testid="sidebar" />);
      expect(screen.getByTestId('sidebar')).toHaveAttribute(
        'data-variant',
        'mobile'
      );
    });

    it('sidebar is hidden when closed', () => {
      render(<MobileSidebar {...defaultProps} data-testid="sidebar" />);
      expect(screen.getByTestId('sidebar')).toHaveClass('-translate-x-full');
      expect(screen.getByTestId('sidebar')).toHaveAttribute(
        'aria-hidden',
        'true'
      );
    });

    it('sidebar is visible when open', () => {
      render(
        <MobileSidebar {...defaultProps} isOpen={true} data-testid="sidebar" />
      );
      expect(screen.getByTestId('sidebar')).toHaveClass('translate-x-0');
      expect(screen.getByTestId('sidebar')).toHaveAttribute(
        'aria-hidden',
        'false'
      );
    });

    it('renders backdrop when open', () => {
      render(
        <MobileSidebar {...defaultProps} isOpen={true} data-testid="sidebar" />
      );
      expect(screen.getByTestId('sidebar-backdrop')).toBeInTheDocument();
    });

    it('does not render backdrop when closed', () => {
      render(
        <MobileSidebar {...defaultProps} isOpen={false} data-testid="sidebar" />
      );
      expect(screen.queryByTestId('sidebar-backdrop')).not.toBeInTheDocument();
    });

    it('calls onOpen when hamburger is clicked while closed', () => {
      const onOpen = vi.fn();
      render(
        <MobileSidebar {...defaultProps} onOpen={onOpen} data-testid="sidebar" />
      );
      fireEvent.click(screen.getByTestId('sidebar-hamburger'));
      expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when hamburger is clicked while open', () => {
      const onClose = vi.fn();
      render(
        <MobileSidebar
          {...defaultProps}
          isOpen={true}
          onClose={onClose}
          data-testid="sidebar"
        />
      );
      fireEvent.click(screen.getByTestId('sidebar-hamburger'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      render(
        <MobileSidebar
          {...defaultProps}
          isOpen={true}
          onClose={onClose}
          data-testid="sidebar"
        />
      );
      fireEvent.click(screen.getByTestId('sidebar-backdrop'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(
        <MobileSidebar
          {...defaultProps}
          isOpen={true}
          onClose={onClose}
          data-testid="sidebar"
        />
      );
      fireEvent.click(screen.getByTestId('sidebar-close'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed while open', async () => {
      const onClose = vi.fn();
      render(
        <MobileSidebar
          {...defaultProps}
          isOpen={true}
          onClose={onClose}
          data-testid="sidebar"
        />
      );
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose on Escape when closed', () => {
      const onClose = vi.fn();
      render(
        <MobileSidebar
          {...defaultProps}
          isOpen={false}
          onClose={onClose}
          data-testid="sidebar"
        />
      );
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('locks body scroll when open', () => {
      render(
        <MobileSidebar {...defaultProps} isOpen={true} data-testid="sidebar" />
      );
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body scroll when closed', () => {
      const { rerender } = render(
        <MobileSidebar {...defaultProps} isOpen={true} data-testid="sidebar" />
      );
      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <MobileSidebar {...defaultProps} isOpen={false} data-testid="sidebar" />
      );
      expect(document.body.style.overflow).toBe('');
    });

    it('uses mobileBarHeader in header bar when provided', () => {
      render(
        <MobileSidebar
          {...defaultProps}
          header={<div>Full Header</div>}
          mobileBarHeader={<div>Compact Header</div>}
          data-testid="sidebar"
        />
      );
      // Mobile bar should show mobileBarHeader
      expect(screen.getByText('Compact Header')).toBeInTheDocument();
    });

    it('falls back to header in mobile bar when mobileBarHeader not provided', () => {
      render(
        <MobileSidebar
          {...defaultProps}
          header={<div>Full Header</div>}
          data-testid="sidebar"
        />
      );
      // Should show header in both places
      expect(screen.getAllByText('Full Header')).toHaveLength(2);
    });
  });

  describe('Tablet Mode (768px - 1023px)', () => {
    beforeEach(() => {
      vi.mocked(useResponsive).mockReturnValue({
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        width: 900,
        height: 600,
        breakpoint: 'md',
        isBreakpoint: (bp) => bp !== 'lg' && bp !== 'xl',
        isBelowBreakpoint: (bp) => bp === 'lg' || bp === 'xl',
      });
    });

    it('renders mobile layout on tablet', () => {
      render(<MobileSidebar {...defaultProps} data-testid="sidebar" />);
      expect(screen.getByTestId('sidebar-hamburger')).toBeInTheDocument();
    });

    it('has data-variant="tablet" on tablet', () => {
      render(<MobileSidebar {...defaultProps} data-testid="sidebar" />);
      expect(screen.getByTestId('sidebar')).toHaveAttribute(
        'data-variant',
        'tablet'
      );
    });

    it('renders backdrop as overlay', () => {
      render(
        <MobileSidebar {...defaultProps} isOpen={true} data-testid="sidebar" />
      );
      expect(screen.getByTestId('sidebar-backdrop')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('sidebar has aria-label="Sidebar"', () => {
      render(<MobileSidebar {...defaultProps} data-testid="sidebar" />);
      expect(screen.getByTestId('sidebar')).toHaveAttribute(
        'aria-label',
        'Sidebar'
      );
    });

    describe('Desktop', () => {
      it('collapse toggle has accessible label for expand', () => {
        render(
          <MobileSidebar
            {...defaultProps}
            isCollapsed={true}
            onToggleCollapse={() => {}}
            data-testid="sidebar"
          />
        );
        expect(screen.getByTestId('sidebar-toggle')).toHaveAttribute(
          'aria-label',
          'Expand sidebar'
        );
      });

      it('collapse toggle has accessible label for collapse', () => {
        render(
          <MobileSidebar
            {...defaultProps}
            isCollapsed={false}
            onToggleCollapse={() => {}}
            data-testid="sidebar"
          />
        );
        expect(screen.getByTestId('sidebar-toggle')).toHaveAttribute(
          'aria-label',
          'Collapse sidebar'
        );
      });
    });

    describe('Mobile', () => {
      beforeEach(() => {
        vi.mocked(useResponsive).mockReturnValue({
          isMobile: true,
          isTablet: false,
          isDesktop: false,
          width: 375,
          height: 667,
          breakpoint: 'xs',
          isBreakpoint: () => false,
          isBelowBreakpoint: () => true,
        });
      });

      it('sidebar drawer has role="dialog" when open', () => {
        render(
          <MobileSidebar
            {...defaultProps}
            isOpen={true}
            data-testid="sidebar"
          />
        );
        expect(screen.getByTestId('sidebar')).toHaveAttribute('role', 'dialog');
      });

      it('sidebar drawer has aria-modal="true" when open', () => {
        render(
          <MobileSidebar
            {...defaultProps}
            isOpen={true}
            data-testid="sidebar"
          />
        );
        expect(screen.getByTestId('sidebar')).toHaveAttribute(
          'aria-modal',
          'true'
        );
      });

      it('close button has accessible label', () => {
        render(
          <MobileSidebar
            {...defaultProps}
            isOpen={true}
            data-testid="sidebar"
          />
        );
        expect(screen.getByTestId('sidebar-close')).toHaveAttribute(
          'aria-label',
          'Close sidebar'
        );
      });
    });
  });

  describe('Styling', () => {
    it('has smooth transitions', () => {
      render(<MobileSidebar {...defaultProps} data-testid="sidebar" />);
      expect(screen.getByTestId('sidebar').className).toMatch(/transition/);
    });

    it('applies custom className', () => {
      render(
        <MobileSidebar
          {...defaultProps}
          className="custom-sidebar"
          data-testid="sidebar"
        />
      );
      expect(screen.getByTestId('sidebar')).toHaveClass('custom-sidebar');
    });
  });
});
