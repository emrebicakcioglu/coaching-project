/**
 * Logo Component Tests
 * STORY-016A: Context Menu Core Navigation
 *
 * Unit tests for Logo sidebar header component.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Logo } from './Logo';

describe('Logo', () => {
  describe('Basic Rendering', () => {
    it('renders with default company name', () => {
      render(<Logo data-testid="logo" />);

      expect(screen.getByText('Core App')).toBeInTheDocument();
    });

    it('renders with custom company name', () => {
      render(<Logo companyName="My Company" data-testid="logo" />);

      expect(screen.getByText('My Company')).toBeInTheDocument();
    });

    it('renders with correct test ID', () => {
      render(<Logo data-testid="logo" />);

      expect(screen.getByTestId('logo')).toBeInTheDocument();
    });

    it('renders logo mark', () => {
      render(<Logo companyName="Test Company" data-testid="logo" />);

      // Logo mark shows first letter of company name
      expect(screen.getByText('T')).toBeInTheDocument();
    });
  });

  describe('Logo Mark', () => {
    it('shows first letter of company name uppercase', () => {
      render(<Logo companyName="acme" data-testid="logo" />);

      // Should show 'A' not 'a'
      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('logo mark is hidden from accessibility tree', () => {
      render(<Logo companyName="Test" data-testid="logo" />);

      const logoMark = screen.getByText('T').closest('div');
      expect(logoMark).toHaveAttribute('aria-hidden', 'true');
    });

    it('logo mark has correct styling', () => {
      render(<Logo companyName="Test" data-testid="logo" />);

      const logoMark = screen.getByText('T').closest('div');
      expect(logoMark?.className).toContain('bg-primary-600');
      expect(logoMark?.className).toContain('rounded-lg');
      expect(logoMark?.className).toContain('w-8');
      expect(logoMark?.className).toContain('h-8');
    });
  });

  describe('Company Name Display', () => {
    it('shows company name by default', () => {
      render(<Logo companyName="My Company" data-testid="logo" />);

      expect(screen.getByText('My Company')).toBeInTheDocument();
    });

    it('hides company name when showName is false', () => {
      render(
        <Logo companyName="My Company" showName={false} data-testid="logo" />
      );

      expect(screen.queryByText('My Company')).not.toBeInTheDocument();
    });

    it('still shows logo mark when showName is false', () => {
      render(
        <Logo companyName="My Company" showName={false} data-testid="logo" />
      );

      expect(screen.getByText('M')).toBeInTheDocument();
    });

    it('company name has correct test ID', () => {
      render(<Logo companyName="Test" data-testid="logo" />);

      expect(screen.getByTestId('logo-name')).toBeInTheDocument();
    });

    it('company name is truncated for long names', () => {
      render(<Logo companyName="Very Long Company Name" data-testid="logo" />);

      const nameElement = screen.getByTestId('logo-name');
      expect(nameElement.className).toContain('truncate');
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      render(<Logo className="custom-class" data-testid="logo" />);

      expect(screen.getByTestId('logo').className).toContain('custom-class');
    });

    it('has flex layout for alignment', () => {
      render(<Logo data-testid="logo" />);

      expect(screen.getByTestId('logo').className).toContain('flex');
      expect(screen.getByTestId('logo').className).toContain('items-center');
    });

    it('company name has proper font styling', () => {
      render(<Logo companyName="Test" data-testid="logo" />);

      const nameElement = screen.getByTestId('logo-name');
      expect(nameElement.className).toContain('font-semibold');
      expect(nameElement.className).toContain('text-lg');
    });

    it('logo mark text is white and bold', () => {
      render(<Logo companyName="Test" data-testid="logo" />);

      const logoMark = screen.getByText('T').closest('div');
      expect(logoMark?.className).toContain('text-white');
      expect(logoMark?.className).toContain('font-bold');
    });
  });

  describe('Collapsed Mode Support', () => {
    it('renders correctly when collapsed (showName=false)', () => {
      render(<Logo showName={false} data-testid="logo" />);

      const logo = screen.getByTestId('logo');
      expect(logo).toBeInTheDocument();

      // Only logo mark should be visible
      expect(screen.getByText('C')).toBeInTheDocument(); // "Core App"
      expect(screen.queryByTestId('logo-name')).not.toBeInTheDocument();
    });

    it('renders correctly when expanded (showName=true)', () => {
      render(<Logo showName={true} data-testid="logo" />);

      expect(screen.getByText('C')).toBeInTheDocument();
      expect(screen.getByTestId('logo-name')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty company name', () => {
      render(<Logo companyName="" data-testid="logo" />);

      // Should render but with empty logo mark
      expect(screen.getByTestId('logo')).toBeInTheDocument();
    });

    it('handles single character company name', () => {
      render(<Logo companyName="X" data-testid="logo" />);

      // Should show the single character
      const logos = screen.getAllByText('X');
      expect(logos.length).toBe(2); // Logo mark + company name
    });

    it('handles company name with spaces at start', () => {
      render(<Logo companyName="  Test" data-testid="logo" />);

      // Should handle leading space gracefully
      expect(screen.getByTestId('logo')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('logo mark is decorative (aria-hidden)', () => {
      render(<Logo companyName="Test" data-testid="logo" />);

      const logoMark = screen.getByText('T').closest('div');
      expect(logoMark).toHaveAttribute('aria-hidden', 'true');
    });

    it('company name is visible to screen readers', () => {
      render(<Logo companyName="Test Company" data-testid="logo" />);

      // Company name should be in the document and accessible
      const nameElement = screen.getByTestId('logo-name');
      expect(nameElement).not.toHaveAttribute('aria-hidden');
    });
  });

  describe('Default Props', () => {
    it('uses default company name when not provided', () => {
      render(<Logo data-testid="logo" />);

      expect(screen.getByText('Core App')).toBeInTheDocument();
    });

    it('uses default showName=true when not provided', () => {
      render(<Logo data-testid="logo" />);

      expect(screen.getByTestId('logo-name')).toBeInTheDocument();
    });

    it('uses default testId when not provided', () => {
      render(<Logo />);

      expect(screen.getByTestId('logo')).toBeInTheDocument();
    });

    it('uses default empty className when not provided', () => {
      render(<Logo data-testid="logo" />);

      // Should only have base classes, not custom
      const logo = screen.getByTestId('logo');
      expect(logo.className).toContain('flex');
    });
  });
});
