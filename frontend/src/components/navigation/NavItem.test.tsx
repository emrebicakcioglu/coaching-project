/**
 * NavItem Component Tests
 * STORY-016A: Context Menu Core Navigation
 *
 * Unit tests for NavItem navigation component.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NavItem } from './NavItem';
import { NavigationItem } from '../../config/navigation';

describe('NavItem', () => {
  const defaultItem: NavigationItem = {
    id: 'test-item',
    label: 'Test Item',
    icon: 'home',
    path: '/test',
    permission: null,
  };

  describe('Basic Rendering', () => {
    it('renders with label', () => {
      render(<NavItem item={defaultItem} data-testid="nav-item" />);
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });

    it('renders with icon', () => {
      render(<NavItem item={defaultItem} data-testid="nav-item" />);
      expect(screen.getByTestId('nav-item').querySelector('svg')).toBeInTheDocument();
    });

    it('renders as a link with correct href', () => {
      render(<NavItem item={defaultItem} data-testid="nav-item" />);
      const link = screen.getByTestId('nav-item');
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', '/test');
    });
  });

  describe('Active State', () => {
    it('shows active styling when isActive is true', () => {
      render(<NavItem item={defaultItem} isActive={true} data-testid="nav-item" />);
      const item = screen.getByTestId('nav-item');
      expect(item).toHaveAttribute('aria-current', 'page');
      expect(item.className).toContain('bg-primary-50');
    });

    it('does not show active styling when isActive is false', () => {
      render(<NavItem item={defaultItem} isActive={false} data-testid="nav-item" />);
      const item = screen.getByTestId('nav-item');
      expect(item).not.toHaveAttribute('aria-current');
      expect(item.className).not.toContain('bg-primary-50');
    });
  });

  describe('Collapsed Mode', () => {
    it('hides label when collapsed', () => {
      render(<NavItem item={defaultItem} isCollapsed={true} data-testid="nav-item" />);
      expect(screen.queryByText('Test Item')).not.toBeInTheDocument();
    });

    it('shows tooltip (title) when collapsed', () => {
      render(<NavItem item={defaultItem} isCollapsed={true} data-testid="nav-item" />);
      expect(screen.getByTestId('nav-item')).toHaveAttribute('title', 'Test Item');
    });

    it('shows label when not collapsed', () => {
      render(<NavItem item={defaultItem} isCollapsed={false} data-testid="nav-item" />);
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });
  });

  describe('Items with Children', () => {
    const itemWithChildren: NavigationItem = {
      ...defaultItem,
      children: [
        { id: 'child-1', label: 'Child 1', icon: 'list', path: '/child1', permission: null },
      ],
    };

    it('shows expand indicator for items with children', () => {
      render(<NavItem item={itemWithChildren} data-testid="nav-item" />);
      // Look for chevron icon
      const chevrons = screen.getByTestId('nav-item').querySelectorAll('svg');
      expect(chevrons.length).toBeGreaterThan(1);
    });

    it('has aria-expanded attribute for expandable items', () => {
      render(<NavItem item={itemWithChildren} isExpanded={false} data-testid="nav-item" />);
      expect(screen.getByTestId('nav-item')).toHaveAttribute('aria-expanded', 'false');
    });

    it('sets aria-expanded to true when expanded', () => {
      render(<NavItem item={itemWithChildren} isExpanded={true} data-testid="nav-item" />);
      expect(screen.getByTestId('nav-item')).toHaveAttribute('aria-expanded', 'true');
    });

    it('has aria-haspopup for items with children', () => {
      render(<NavItem item={itemWithChildren} data-testid="nav-item" />);
      expect(screen.getByTestId('nav-item')).toHaveAttribute('aria-haspopup', 'menu');
    });
  });

  describe('Badge', () => {
    const itemWithBadge: NavigationItem = {
      ...defaultItem,
      badge: 5,
    };

    it('renders badge when provided', () => {
      render(<NavItem item={itemWithBadge} data-testid="nav-item" />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('badge has aria-label for accessibility', () => {
      render(<NavItem item={itemWithBadge} data-testid="nav-item" />);
      expect(screen.getByText('5')).toHaveAttribute('aria-label', '5 notifications');
    });

    it('hides badge when collapsed', () => {
      render(<NavItem item={itemWithBadge} isCollapsed={true} data-testid="nav-item" />);
      expect(screen.queryByText('5')).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    const disabledItem: NavigationItem = {
      ...defaultItem,
      disabled: true,
    };

    it('applies disabled styling', () => {
      render(<NavItem item={disabledItem} data-testid="nav-item" />);
      const item = screen.getByTestId('nav-item');
      expect(item.className).toContain('opacity-50');
      expect(item.className).toContain('cursor-not-allowed');
    });

    it('has aria-disabled attribute', () => {
      render(<NavItem item={disabledItem} data-testid="nav-item" />);
      expect(screen.getByTestId('nav-item')).toHaveAttribute('aria-disabled', 'true');
    });

    it('has tabIndex -1 for disabled items', () => {
      render(<NavItem item={disabledItem} data-testid="nav-item" />);
      expect(screen.getByTestId('nav-item')).toHaveAttribute('tabIndex', '-1');
    });

    it('does not call onClick when disabled', () => {
      const onClick = vi.fn();
      render(<NavItem item={disabledItem} onClick={onClick} data-testid="nav-item" />);
      fireEvent.click(screen.getByTestId('nav-item'));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Click Handler', () => {
    it('calls onClick when clicked', () => {
      const onClick = vi.fn();
      render(<NavItem item={defaultItem} onClick={onClick} data-testid="nav-item" />);
      fireEvent.click(screen.getByTestId('nav-item'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('prevents default link behavior', () => {
      const onClick = vi.fn();
      render(<NavItem item={defaultItem} onClick={onClick} data-testid="nav-item" />);

      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      const preventDefault = vi.fn();
      event.preventDefault = preventDefault;

      screen.getByTestId('nav-item').dispatchEvent(event);
      expect(preventDefault).toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('triggers onClick on Enter key', () => {
      const onClick = vi.fn();
      render(<NavItem item={defaultItem} onClick={onClick} data-testid="nav-item" />);
      fireEvent.keyDown(screen.getByTestId('nav-item'), { key: 'Enter' });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('triggers onClick on Space key', () => {
      const onClick = vi.fn();
      render(<NavItem item={defaultItem} onClick={onClick} data-testid="nav-item" />);
      fireEvent.keyDown(screen.getByTestId('nav-item'), { key: ' ' });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not trigger onClick on other keys', () => {
      const onClick = vi.fn();
      render(<NavItem item={defaultItem} onClick={onClick} data-testid="nav-item" />);
      fireEvent.keyDown(screen.getByTestId('nav-item'), { key: 'Tab' });
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('is focusable via keyboard', () => {
      render(<NavItem item={defaultItem} data-testid="nav-item" />);
      expect(screen.getByTestId('nav-item')).toHaveAttribute('tabIndex', '0');
    });

    it('has minimum touch target size', () => {
      render(<NavItem item={defaultItem} data-testid="nav-item" />);
      const item = screen.getByTestId('nav-item');
      expect(item.className).toContain('min-h-[44px]');
    });
  });
});
