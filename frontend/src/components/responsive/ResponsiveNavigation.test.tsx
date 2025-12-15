/**
 * ResponsiveNavigation Component Tests
 * STORY-017B: Component Responsiveness
 *
 * Unit tests for responsive navigation component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResponsiveNavigation, NavItem } from './ResponsiveNavigation';

// Mock useResponsive hook
const mockUseResponsive = vi.fn();

vi.mock('../../hooks', () => ({
  useResponsive: () => mockUseResponsive(),
}));

const testNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Users', href: '/users', badge: 5 },
  { label: 'Settings', href: '/settings' },
];

describe('ResponsiveNavigation', () => {
  const defaultProps = {
    items: testNavItems,
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
    it('renders as sidebar navigation on desktop', () => {
      render(<ResponsiveNavigation {...defaultProps} />);

      const nav = screen.getByTestId('responsive-navigation');
      expect(nav).toHaveAttribute('data-variant', 'desktop');
    });

    it('renders sidebar directly visible', () => {
      render(<ResponsiveNavigation {...defaultProps} />);

      expect(screen.getByTestId('responsive-navigation-sidebar')).toBeInTheDocument();
    });

    it('does not render hamburger button on desktop', () => {
      render(<ResponsiveNavigation {...defaultProps} />);

      expect(screen.queryByTestId('responsive-navigation-hamburger')).not.toBeInTheDocument();
    });

    it('renders all navigation items', () => {
      render(<ResponsiveNavigation {...defaultProps} />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders item badges', () => {
      render(<ResponsiveNavigation {...defaultProps} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('renders logo when provided', () => {
      render(
        <ResponsiveNavigation
          {...defaultProps}
          logo={<div data-testid="logo">Logo</div>}
        />
      );

      expect(screen.getByTestId('logo')).toBeInTheDocument();
    });

    it('renders footer when provided', () => {
      render(
        <ResponsiveNavigation
          {...defaultProps}
          footer={<div data-testid="footer">Footer</div>}
        />
      );

      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('renders children in main content area', () => {
      render(
        <ResponsiveNavigation {...defaultProps}>
          <div data-testid="main-content">Main Content</div>
        </ResponsiveNavigation>
      );

      expect(screen.getByTestId('main-content')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-navigation-main')).toBeInTheDocument();
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

    it('renders as mobile navigation', () => {
      render(<ResponsiveNavigation {...defaultProps} />);

      const nav = screen.getByTestId('responsive-navigation');
      expect(nav).toHaveAttribute('data-variant', 'mobile');
    });

    it('renders hamburger button on mobile', () => {
      render(<ResponsiveNavigation {...defaultProps} />);

      expect(screen.getByTestId('responsive-navigation-hamburger')).toBeInTheDocument();
    });

    it('renders mobile header bar', () => {
      render(<ResponsiveNavigation {...defaultProps} />);

      expect(screen.getByTestId('responsive-navigation-header')).toBeInTheDocument();
    });

    it('hamburger button has minimum touch target size', () => {
      render(<ResponsiveNavigation {...defaultProps} />);

      const hamburger = screen.getByTestId('responsive-navigation-hamburger');
      expect(hamburger).toHaveClass('min-w-[44px]');
      expect(hamburger).toHaveClass('min-h-[44px]');
    });

    it('opens sidebar when hamburger clicked', async () => {
      render(<ResponsiveNavigation {...defaultProps} />);

      fireEvent.click(screen.getByTestId('responsive-navigation-hamburger'));

      // Sidebar should now be open (backdrop visible)
      await waitFor(() => {
        expect(screen.getByTestId('responsive-navigation-sidebar-backdrop')).toBeInTheDocument();
      });
    });

    it('closes sidebar when navigation item clicked on mobile', async () => {
      render(<ResponsiveNavigation {...defaultProps} />);

      // Open sidebar
      fireEvent.click(screen.getByTestId('responsive-navigation-hamburger'));

      await waitFor(() => {
        expect(screen.getByTestId('responsive-navigation-sidebar-backdrop')).toBeInTheDocument();
      });

      // Click navigation item
      fireEvent.click(screen.getByText('Dashboard'));

      // Sidebar should close
      await waitFor(() => {
        expect(screen.queryByTestId('responsive-navigation-sidebar-backdrop')).not.toBeInTheDocument();
      });
    });

    it('renders logo in header on mobile', () => {
      render(
        <ResponsiveNavigation
          {...defaultProps}
          logo={<div data-testid="logo">Logo</div>}
        />
      );

      expect(screen.getByTestId('responsive-navigation-logo')).toBeInTheDocument();
    });
  });

  describe('Navigation Item Behavior', () => {
    it('calls onItemClick when navigation item clicked', () => {
      const onItemClick = vi.fn();
      render(<ResponsiveNavigation {...defaultProps} onItemClick={onItemClick} />);

      fireEvent.click(screen.getByText('Dashboard'));

      expect(onItemClick).toHaveBeenCalledWith(testNavItems[0]);
    });

    it('highlights active item based on activePath', () => {
      render(<ResponsiveNavigation {...defaultProps} activePath="/dashboard" />);

      const dashboardItem = screen.getByTestId('responsive-navigation-item-0');
      expect(dashboardItem).toHaveAttribute('aria-current', 'page');
    });

    it('highlights active item based on isActive prop', () => {
      const itemsWithActive: NavItem[] = [
        { label: 'Dashboard', href: '/dashboard', isActive: true },
        { label: 'Users', href: '/users' },
      ];

      render(<ResponsiveNavigation items={itemsWithActive} />);

      const dashboardItem = screen.getByTestId('responsive-navigation-item-0');
      expect(dashboardItem).toHaveAttribute('aria-current', 'page');
    });

    it('renders disabled items correctly', () => {
      const itemsWithDisabled: NavItem[] = [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Disabled', href: '/disabled', disabled: true },
      ];

      render(<ResponsiveNavigation items={itemsWithDisabled} />);

      const disabledItem = screen.getByTestId('responsive-navigation-item-1');
      expect(disabledItem).toHaveAttribute('aria-disabled', 'true');
      expect(disabledItem).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('does not trigger onItemClick for disabled items', () => {
      const onItemClick = vi.fn();
      const itemsWithDisabled: NavItem[] = [
        { label: 'Disabled', href: '/disabled', disabled: true },
      ];

      render(<ResponsiveNavigation items={itemsWithDisabled} onItemClick={onItemClick} />);

      fireEvent.click(screen.getByTestId('responsive-navigation-item-0'));

      expect(onItemClick).not.toHaveBeenCalled();
    });

    it('supports keyboard navigation', () => {
      const onItemClick = vi.fn();
      render(<ResponsiveNavigation {...defaultProps} onItemClick={onItemClick} />);

      const item = screen.getByTestId('responsive-navigation-item-0');
      fireEvent.keyDown(item, { key: 'Enter' });

      expect(onItemClick).toHaveBeenCalledWith(testNavItems[0]);
    });
  });

  describe('Navigation Items with Icons', () => {
    it('renders icons when provided', () => {
      const itemsWithIcons: NavItem[] = [
        {
          label: 'Dashboard',
          href: '/dashboard',
          icon: <svg data-testid="dashboard-icon" />,
        },
      ];

      render(<ResponsiveNavigation items={itemsWithIcons} />);

      expect(screen.getByTestId('dashboard-icon')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has main navigation aria-label', () => {
      render(<ResponsiveNavigation {...defaultProps} />);

      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Main navigation');
    });

    it('renders navigation items in a list', () => {
      render(<ResponsiveNavigation {...defaultProps} />);

      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('hamburger button has correct aria attributes', () => {
      mockUseResponsive.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        breakpoint: 'xs',
        width: 375,
        height: 667,
      });

      render(<ResponsiveNavigation {...defaultProps} />);

      const hamburger = screen.getByTestId('responsive-navigation-hamburger');
      expect(hamburger).toHaveAttribute('aria-label', 'Open menu');
      expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Custom Test ID', () => {
    it('uses custom data-testid', () => {
      render(<ResponsiveNavigation {...defaultProps} data-testid="custom-nav" />);

      expect(screen.getByTestId('custom-nav')).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      render(<ResponsiveNavigation {...defaultProps} className="custom-nav-class" />);

      const nav = screen.getByTestId('responsive-navigation');
      expect(nav).toHaveClass('custom-nav-class');
    });
  });
});
