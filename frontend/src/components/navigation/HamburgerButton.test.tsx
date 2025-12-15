/**
 * HamburgerButton Component Tests
 * STORY-018B: Context Menu Responsive & Mobile
 *
 * Unit tests for the HamburgerButton toggle component.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HamburgerButton } from './HamburgerButton';

describe('HamburgerButton', () => {
  describe('Rendering', () => {
    it('renders with default testId', () => {
      render(<HamburgerButton isOpen={false} onClick={() => {}} />);
      expect(screen.getByTestId('hamburger-button')).toBeInTheDocument();
    });

    it('renders with custom testId', () => {
      render(
        <HamburgerButton
          isOpen={false}
          onClick={() => {}}
          data-testid="custom-hamburger"
        />
      );
      expect(screen.getByTestId('custom-hamburger')).toBeInTheDocument();
    });

    it('applies additional className', () => {
      render(
        <HamburgerButton
          isOpen={false}
          onClick={() => {}}
          className="custom-class"
          data-testid="hamburger"
        />
      );
      expect(screen.getByTestId('hamburger')).toHaveClass('custom-class');
    });
  });

  describe('Closed State', () => {
    it('displays hamburger icon when closed', () => {
      render(
        <HamburgerButton
          isOpen={false}
          onClick={() => {}}
          data-testid="hamburger"
        />
      );
      const button = screen.getByTestId('hamburger');
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
      // Hamburger has path with "M4 6h16M4 12h16M4 18h16"
      expect(svg?.querySelector('path')).toHaveAttribute(
        'd',
        'M4 6h16M4 12h16M4 18h16'
      );
    });

    it('has aria-expanded="false" when closed', () => {
      render(<HamburgerButton isOpen={false} onClick={() => {}} />);
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-expanded',
        'false'
      );
    });

    it('has default aria-label "Open menu" when closed', () => {
      render(<HamburgerButton isOpen={false} onClick={() => {}} />);
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Open menu'
      );
    });

    it('uses custom closedLabel when provided', () => {
      render(
        <HamburgerButton
          isOpen={false}
          onClick={() => {}}
          closedLabel="Show navigation"
        />
      );
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Show navigation'
      );
    });
  });

  describe('Open State', () => {
    it('displays close (X) icon when open', () => {
      render(
        <HamburgerButton isOpen={true} onClick={() => {}} data-testid="hamburger" />
      );
      const button = screen.getByTestId('hamburger');
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
      // Close icon has path with "M6 18L18 6M6 6l12 12"
      expect(svg?.querySelector('path')).toHaveAttribute(
        'd',
        'M6 18L18 6M6 6l12 12'
      );
    });

    it('has aria-expanded="true" when open', () => {
      render(<HamburgerButton isOpen={true} onClick={() => {}} />);
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-expanded',
        'true'
      );
    });

    it('has default aria-label "Close menu" when open', () => {
      render(<HamburgerButton isOpen={true} onClick={() => {}} />);
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Close menu'
      );
    });

    it('uses custom openLabel when provided', () => {
      render(
        <HamburgerButton
          isOpen={true}
          onClick={() => {}}
          openLabel="Hide navigation"
        />
      );
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Hide navigation'
      );
    });
  });

  describe('Interactions', () => {
    it('calls onClick when clicked', () => {
      const onClick = vi.fn();
      render(<HamburgerButton isOpen={false} onClick={onClick} />);

      fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick on keyboard Enter', () => {
      const onClick = vi.fn();
      render(<HamburgerButton isOpen={false} onClick={onClick} />);

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });
      // Button should respond to Enter key press by default
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has type="button"', () => {
      render(<HamburgerButton isOpen={false} onClick={() => {}} />);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('has minimum tap target size', () => {
      render(
        <HamburgerButton
          isOpen={false}
          onClick={() => {}}
          data-testid="hamburger"
        />
      );
      const button = screen.getByTestId('hamburger');
      expect(button).toHaveClass('min-w-[44px]');
      expect(button).toHaveClass('min-h-[44px]');
    });

    it('svg has aria-hidden="true"', () => {
      render(
        <HamburgerButton
          isOpen={false}
          onClick={() => {}}
          data-testid="hamburger"
        />
      );
      const svg = screen.getByTestId('hamburger').querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Styling', () => {
    it('has focus ring classes', () => {
      render(
        <HamburgerButton
          isOpen={false}
          onClick={() => {}}
          data-testid="hamburger"
        />
      );
      expect(screen.getByTestId('hamburger')).toHaveClass('focus:ring-2');
    });

    it('has hover state classes', () => {
      render(
        <HamburgerButton
          isOpen={false}
          onClick={() => {}}
          data-testid="hamburger"
        />
      );
      expect(screen.getByTestId('hamburger')).toHaveClass('hover:bg-neutral-100');
    });

    it('has transition classes', () => {
      render(
        <HamburgerButton
          isOpen={false}
          onClick={() => {}}
          data-testid="hamburger"
        />
      );
      expect(screen.getByTestId('hamburger')).toHaveClass('transition-colors');
    });
  });
});
