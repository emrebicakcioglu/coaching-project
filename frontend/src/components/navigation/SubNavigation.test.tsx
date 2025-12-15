/**
 * SubNavigation Component Tests
 * STORY-016A: Context Menu Core Navigation
 *
 * Unit tests for SubNavigation nested menu component.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SubNavigation } from './SubNavigation';
import { NavigationItem } from '../../config/navigation';

describe('SubNavigation', () => {
  const defaultItems: NavigationItem[] = [
    {
      id: 'child-1',
      label: 'Child Item 1',
      icon: 'list',
      path: '/parent/child-1',
      permission: null,
    },
    {
      id: 'child-2',
      label: 'Child Item 2',
      icon: 'user-plus',
      path: '/parent/child-2',
      permission: null,
    },
  ];

  const defaultProps = {
    items: defaultItems,
    activePath: '/parent/child-1',
    onItemClick: vi.fn(),
    parentId: 'parent',
    'data-testid': 'subnav',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders all child items', () => {
      render(<SubNavigation {...defaultProps} />);

      expect(screen.getByText('Child Item 1')).toBeInTheDocument();
      expect(screen.getByText('Child Item 2')).toBeInTheDocument();
    });

    it('renders with correct test ID', () => {
      render(<SubNavigation {...defaultProps} />);

      expect(screen.getByTestId('subnav')).toBeInTheDocument();
    });

    it('renders individual item test IDs', () => {
      render(<SubNavigation {...defaultProps} />);

      expect(screen.getByTestId('subnav-child-1')).toBeInTheDocument();
      expect(screen.getByTestId('subnav-child-2')).toBeInTheDocument();
    });

    it('renders as a list with menu role', () => {
      render(<SubNavigation {...defaultProps} />);

      const list = screen.getByTestId('subnav');
      expect(list.tagName).toBe('UL');
      expect(list).toHaveAttribute('role', 'menu');
    });

    it('renders items as links', () => {
      render(<SubNavigation {...defaultProps} />);

      const item = screen.getByTestId('subnav-child-1');
      expect(item.tagName).toBe('A');
      expect(item).toHaveAttribute('href', '/parent/child-1');
    });
  });

  describe('Active State', () => {
    it('shows active styling for active item', () => {
      render(<SubNavigation {...defaultProps} />);

      const activeItem = screen.getByTestId('subnav-child-1');
      expect(activeItem).toHaveAttribute('aria-current', 'page');
      expect(activeItem.className).toContain('bg-primary-50');
      expect(activeItem.className).toContain('text-primary-700');
    });

    it('does not show active styling for inactive items', () => {
      render(<SubNavigation {...defaultProps} />);

      const inactiveItem = screen.getByTestId('subnav-child-2');
      expect(inactiveItem).not.toHaveAttribute('aria-current');
      expect(inactiveItem.className).toContain('text-neutral-600');
    });

    it('updates active state when activePath changes', () => {
      const { rerender } = render(<SubNavigation {...defaultProps} />);

      expect(screen.getByTestId('subnav-child-1')).toHaveAttribute(
        'aria-current',
        'page'
      );
      expect(screen.getByTestId('subnav-child-2')).not.toHaveAttribute(
        'aria-current'
      );

      rerender(
        <SubNavigation {...defaultProps} activePath="/parent/child-2" />
      );

      expect(screen.getByTestId('subnav-child-1')).not.toHaveAttribute(
        'aria-current'
      );
      expect(screen.getByTestId('subnav-child-2')).toHaveAttribute(
        'aria-current',
        'page'
      );
    });

    it('handles no active item', () => {
      render(
        <SubNavigation {...defaultProps} activePath="/other/path" />
      );

      expect(screen.getByTestId('subnav-child-1')).not.toHaveAttribute(
        'aria-current'
      );
      expect(screen.getByTestId('subnav-child-2')).not.toHaveAttribute(
        'aria-current'
      );
    });
  });

  describe('Click Handler', () => {
    it('calls onItemClick when item is clicked', () => {
      const onItemClick = vi.fn();
      render(<SubNavigation {...defaultProps} onItemClick={onItemClick} />);

      fireEvent.click(screen.getByTestId('subnav-child-1'));
      expect(onItemClick).toHaveBeenCalledTimes(1);
      expect(onItemClick).toHaveBeenCalledWith(defaultItems[0]);
    });

    it('prevents default link behavior', () => {
      const onItemClick = vi.fn();
      render(<SubNavigation {...defaultProps} onItemClick={onItemClick} />);

      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      const preventDefault = vi.fn();
      event.preventDefault = preventDefault;

      screen.getByTestId('subnav-child-1').dispatchEvent(event);
      expect(preventDefault).toHaveBeenCalled();
    });

    it('calls onItemClick with correct item', () => {
      const onItemClick = vi.fn();
      render(<SubNavigation {...defaultProps} onItemClick={onItemClick} />);

      fireEvent.click(screen.getByTestId('subnav-child-2'));
      expect(onItemClick).toHaveBeenCalledWith(defaultItems[1]);
    });
  });

  describe('Disabled State', () => {
    const itemsWithDisabled: NavigationItem[] = [
      ...defaultItems,
      {
        id: 'child-disabled',
        label: 'Disabled Item',
        icon: 'list',
        path: '/parent/disabled',
        permission: null,
        disabled: true,
      },
    ];

    it('renders disabled styling for disabled items', () => {
      render(
        <SubNavigation
          {...defaultProps}
          items={itemsWithDisabled}
        />
      );

      const disabledItem = screen.getByTestId('subnav-child-disabled');
      expect(disabledItem.className).toContain('opacity-50');
      expect(disabledItem.className).toContain('cursor-not-allowed');
    });

    it('has aria-disabled for disabled items', () => {
      render(
        <SubNavigation
          {...defaultProps}
          items={itemsWithDisabled}
        />
      );

      const disabledItem = screen.getByTestId('subnav-child-disabled');
      expect(disabledItem).toHaveAttribute('aria-disabled', 'true');
    });

    it('has tabIndex -1 for disabled items', () => {
      render(
        <SubNavigation
          {...defaultProps}
          items={itemsWithDisabled}
        />
      );

      const disabledItem = screen.getByTestId('subnav-child-disabled');
      expect(disabledItem).toHaveAttribute('tabIndex', '-1');
    });

    it('does not call onItemClick for disabled items', () => {
      const onItemClick = vi.fn();
      render(
        <SubNavigation
          {...defaultProps}
          items={itemsWithDisabled}
          onItemClick={onItemClick}
        />
      );

      fireEvent.click(screen.getByTestId('subnav-child-disabled'));
      expect(onItemClick).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('triggers onItemClick on Enter key', () => {
      const onItemClick = vi.fn();
      render(<SubNavigation {...defaultProps} onItemClick={onItemClick} />);

      fireEvent.keyDown(screen.getByTestId('subnav-child-1'), {
        key: 'Enter',
      });
      expect(onItemClick).toHaveBeenCalledTimes(1);
      expect(onItemClick).toHaveBeenCalledWith(defaultItems[0]);
    });

    it('triggers onItemClick on Space key', () => {
      const onItemClick = vi.fn();
      render(<SubNavigation {...defaultProps} onItemClick={onItemClick} />);

      fireEvent.keyDown(screen.getByTestId('subnav-child-1'), { key: ' ' });
      expect(onItemClick).toHaveBeenCalledTimes(1);
    });

    it('does not trigger onItemClick on other keys', () => {
      const onItemClick = vi.fn();
      render(<SubNavigation {...defaultProps} onItemClick={onItemClick} />);

      fireEvent.keyDown(screen.getByTestId('subnav-child-1'), { key: 'Tab' });
      expect(onItemClick).not.toHaveBeenCalled();
    });

    it('does not trigger on keyboard for disabled items', () => {
      const onItemClick = vi.fn();
      const itemsWithDisabled: NavigationItem[] = [
        {
          id: 'disabled',
          label: 'Disabled',
          icon: 'list',
          path: '/disabled',
          permission: null,
          disabled: true,
        },
      ];

      render(
        <SubNavigation
          {...defaultProps}
          items={itemsWithDisabled}
          onItemClick={onItemClick}
        />
      );

      fireEvent.keyDown(screen.getByTestId('subnav-disabled'), {
        key: 'Enter',
      });
      expect(onItemClick).not.toHaveBeenCalled();
    });
  });

  describe('Icons', () => {
    it('renders icons for items with icon property', () => {
      render(<SubNavigation {...defaultProps} />);

      const item = screen.getByTestId('subnav-child-1');
      const svg = item.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('icon is hidden from accessibility tree', () => {
      render(<SubNavigation {...defaultProps} />);

      const item = screen.getByTestId('subnav-child-1');
      const iconWrapper = item.querySelector('span[aria-hidden="true"]');
      expect(iconWrapper).toBeInTheDocument();
    });
  });

  describe('Badge', () => {
    const itemsWithBadge: NavigationItem[] = [
      {
        id: 'child-badge',
        label: 'Item with Badge',
        icon: 'list',
        path: '/parent/badge',
        permission: null,
        badge: 5,
      },
    ];

    it('renders badge when present', () => {
      render(
        <SubNavigation
          {...defaultProps}
          items={itemsWithBadge}
        />
      );

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('badge has aria-label for accessibility', () => {
      render(
        <SubNavigation
          {...defaultProps}
          items={itemsWithBadge}
        />
      );

      expect(screen.getByText('5')).toHaveAttribute(
        'aria-label',
        '5 notifications'
      );
    });

    it('renders string badges', () => {
      const itemsWithStringBadge: NavigationItem[] = [
        {
          id: 'string-badge',
          label: 'String Badge',
          icon: 'list',
          path: '/badge',
          permission: null,
          badge: 'New',
        },
      ];

      render(
        <SubNavigation
          {...defaultProps}
          items={itemsWithStringBadge}
        />
      );

      expect(screen.getByText('New')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('items have menuitem role', () => {
      render(<SubNavigation {...defaultProps} />);

      const item = screen.getByTestId('subnav-child-1');
      expect(item).toHaveAttribute('role', 'menuitem');
    });

    it('list items have none role', () => {
      render(<SubNavigation {...defaultProps} />);

      const listItem = screen.getByTestId('subnav-child-1').closest('li');
      expect(listItem).toHaveAttribute('role', 'none');
    });

    it('has aria-label for submenu', () => {
      render(<SubNavigation {...defaultProps} />);

      expect(screen.getByTestId('subnav')).toHaveAttribute(
        'aria-label',
        'parent submenu'
      );
    });

    it('items are focusable via keyboard', () => {
      render(<SubNavigation {...defaultProps} />);

      const item = screen.getByTestId('subnav-child-1');
      expect(item).toHaveAttribute('tabIndex', '0');
    });

    it('has proper minimum height for touch targets', () => {
      render(<SubNavigation {...defaultProps} />);

      const item = screen.getByTestId('subnav-child-1');
      expect(item.className).toContain('min-h-[40px]');
    });
  });

  describe('Items without Path', () => {
    const itemsWithoutPath: NavigationItem[] = [
      {
        id: 'no-path',
        label: 'No Path Item',
        icon: 'list',
        permission: null,
      },
    ];

    it('renders items without path with # as href', () => {
      render(
        <SubNavigation
          {...defaultProps}
          items={itemsWithoutPath}
        />
      );

      const item = screen.getByTestId('subnav-no-path');
      expect(item).toHaveAttribute('href', '#');
    });
  });

  describe('Empty State', () => {
    it('renders empty list when no items', () => {
      render(<SubNavigation {...defaultProps} items={[]} />);

      const list = screen.getByTestId('subnav');
      expect(list.children.length).toBe(0);
    });
  });
});
