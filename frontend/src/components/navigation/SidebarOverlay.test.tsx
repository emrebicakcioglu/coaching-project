/**
 * SidebarOverlay Component Tests
 * STORY-018B: Context Menu Responsive & Mobile
 *
 * Unit tests for the SidebarOverlay backdrop component.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SidebarOverlay } from './SidebarOverlay';

describe('SidebarOverlay', () => {
  describe('Visibility', () => {
    it('renders nothing when isVisible is false', () => {
      render(
        <SidebarOverlay
          isVisible={false}
          onClick={() => {}}
          data-testid="overlay"
        />
      );
      expect(screen.queryByTestId('overlay')).not.toBeInTheDocument();
    });

    it('renders overlay when isVisible is true', () => {
      render(
        <SidebarOverlay
          isVisible={true}
          onClick={() => {}}
          data-testid="overlay"
        />
      );
      expect(screen.getByTestId('overlay')).toBeInTheDocument();
    });
  });

  describe('Rendering', () => {
    it('renders with default testId', () => {
      render(<SidebarOverlay isVisible={true} onClick={() => {}} />);
      expect(screen.getByTestId('sidebar-overlay')).toBeInTheDocument();
    });

    it('renders with custom testId', () => {
      render(
        <SidebarOverlay
          isVisible={true}
          onClick={() => {}}
          data-testid="custom-overlay"
        />
      );
      expect(screen.getByTestId('custom-overlay')).toBeInTheDocument();
    });

    it('applies additional className', () => {
      render(
        <SidebarOverlay
          isVisible={true}
          onClick={() => {}}
          className="custom-class"
          data-testid="overlay"
        />
      );
      expect(screen.getByTestId('overlay')).toHaveClass('custom-class');
    });
  });

  describe('Opacity Variants', () => {
    it('uses medium opacity by default', () => {
      render(
        <SidebarOverlay
          isVisible={true}
          onClick={() => {}}
          data-testid="overlay"
        />
      );
      expect(screen.getByTestId('overlay')).toHaveClass('bg-opacity-50');
    });

    it('applies light opacity', () => {
      render(
        <SidebarOverlay
          isVisible={true}
          onClick={() => {}}
          opacity="light"
          data-testid="overlay"
        />
      );
      expect(screen.getByTestId('overlay')).toHaveClass('bg-opacity-25');
    });

    it('applies dark opacity', () => {
      render(
        <SidebarOverlay
          isVisible={true}
          onClick={() => {}}
          opacity="dark"
          data-testid="overlay"
        />
      );
      expect(screen.getByTestId('overlay')).toHaveClass('bg-opacity-75');
    });
  });

  describe('Transition Speed', () => {
    it('uses slow transition by default', () => {
      render(
        <SidebarOverlay
          isVisible={true}
          onClick={() => {}}
          data-testid="overlay"
        />
      );
      expect(screen.getByTestId('overlay').className).toMatch(
        /duration-\[var\(--transition-slow/
      );
    });

    it('applies fast transition', () => {
      render(
        <SidebarOverlay
          isVisible={true}
          onClick={() => {}}
          transitionSpeed="fast"
          data-testid="overlay"
        />
      );
      expect(screen.getByTestId('overlay').className).toMatch(
        /duration-\[var\(--transition-fast/
      );
    });

    it('applies normal transition', () => {
      render(
        <SidebarOverlay
          isVisible={true}
          onClick={() => {}}
          transitionSpeed="normal"
          data-testid="overlay"
        />
      );
      expect(screen.getByTestId('overlay').className).toMatch(
        /duration-\[var\(--transition-normal/
      );
    });
  });

  describe('Interactions', () => {
    it('calls onClick when clicked', () => {
      const onClick = vi.fn();
      render(
        <SidebarOverlay
          isVisible={true}
          onClick={onClick}
          data-testid="overlay"
        />
      );

      fireEvent.click(screen.getByTestId('overlay'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has aria-hidden="true"', () => {
      render(
        <SidebarOverlay
          isVisible={true}
          onClick={() => {}}
          data-testid="overlay"
        />
      );
      expect(screen.getByTestId('overlay')).toHaveAttribute(
        'aria-hidden',
        'true'
      );
    });

    it('has role="presentation"', () => {
      render(
        <SidebarOverlay
          isVisible={true}
          onClick={() => {}}
          data-testid="overlay"
        />
      );
      expect(screen.getByTestId('overlay')).toHaveAttribute(
        'role',
        'presentation'
      );
    });
  });

  describe('Styling', () => {
    it('is positioned fixed with inset-0', () => {
      render(
        <SidebarOverlay
          isVisible={true}
          onClick={() => {}}
          data-testid="overlay"
        />
      );
      expect(screen.getByTestId('overlay')).toHaveClass('fixed');
      expect(screen.getByTestId('overlay')).toHaveClass('inset-0');
    });

    it('has black background', () => {
      render(
        <SidebarOverlay
          isVisible={true}
          onClick={() => {}}
          data-testid="overlay"
        />
      );
      expect(screen.getByTestId('overlay')).toHaveClass('bg-black');
    });

    it('has transition-opacity class', () => {
      render(
        <SidebarOverlay
          isVisible={true}
          onClick={() => {}}
          data-testid="overlay"
        />
      );
      expect(screen.getByTestId('overlay')).toHaveClass('transition-opacity');
    });

    it('has proper z-index class', () => {
      render(
        <SidebarOverlay
          isVisible={true}
          onClick={() => {}}
          data-testid="overlay"
        />
      );
      expect(screen.getByTestId('overlay').className).toMatch(
        /z-\[var\(--z-modal-backdrop/
      );
    });
  });
});
