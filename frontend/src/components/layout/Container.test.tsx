/**
 * Container Component Tests
 * STORY-017A: Layout & Grid-System
 *
 * Unit tests for the Container layout component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Container } from './Container';

describe('Container', () => {
  describe('rendering', () => {
    it('renders children correctly', () => {
      render(
        <Container>
          <div data-testid="child">Child content</div>
        </Container>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('renders with default props', () => {
      render(<Container data-testid="container">Content</Container>);

      const container = screen.getByTestId('container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('w-full', 'mx-auto', 'px-4');
    });

    it('renders as a different HTML element', () => {
      render(
        <Container as="section" data-testid="container">
          Content
        </Container>
      );

      const container = screen.getByTestId('container');
      expect(container.tagName).toBe('SECTION');
    });

    it('renders with aria-label', () => {
      render(
        <Container aria-label="Main content area" data-testid="container">
          Content
        </Container>
      );

      const container = screen.getByTestId('container');
      expect(container).toHaveAttribute('aria-label', 'Main content area');
    });
  });

  describe('maxWidth variants', () => {
    it('applies sm max-width class', () => {
      render(
        <Container maxWidth="sm" data-testid="container">
          Content
        </Container>
      );

      expect(screen.getByTestId('container')).toHaveClass('max-w-screen-sm');
    });

    it('applies md max-width class', () => {
      render(
        <Container maxWidth="md" data-testid="container">
          Content
        </Container>
      );

      expect(screen.getByTestId('container')).toHaveClass('max-w-screen-md');
    });

    it('applies lg max-width class', () => {
      render(
        <Container maxWidth="lg" data-testid="container">
          Content
        </Container>
      );

      expect(screen.getByTestId('container')).toHaveClass('max-w-screen-lg');
    });

    it('applies xl max-width class by default', () => {
      render(<Container data-testid="container">Content</Container>);

      expect(screen.getByTestId('container')).toHaveClass('max-w-screen-xl');
    });

    it('applies full max-width class', () => {
      render(
        <Container maxWidth="full" data-testid="container">
          Content
        </Container>
      );

      expect(screen.getByTestId('container')).toHaveClass('max-w-full');
    });
  });

  describe('fluid variant', () => {
    it('removes max-width constraint when fluid is true', () => {
      render(
        <Container fluid data-testid="container">
          Content
        </Container>
      );

      const container = screen.getByTestId('container');
      expect(container).not.toHaveClass('max-w-screen-xl');
      expect(container).not.toHaveClass('max-w-screen-lg');
      expect(container).not.toHaveClass('max-w-screen-md');
      expect(container).not.toHaveClass('max-w-screen-sm');
    });
  });

  describe('responsive padding', () => {
    it('includes responsive padding classes', () => {
      render(<Container data-testid="container">Content</Container>);

      const container = screen.getByTestId('container');
      expect(container).toHaveClass('px-4');
      expect(container).toHaveClass('sm:px-6');
      expect(container).toHaveClass('md:px-8');
      expect(container).toHaveClass('lg:px-10');
      expect(container).toHaveClass('xl:px-12');
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      render(
        <Container className="custom-class bg-gray-100" data-testid="container">
          Content
        </Container>
      );

      const container = screen.getByTestId('container');
      expect(container).toHaveClass('custom-class', 'bg-gray-100');
    });

    it('merges custom className with default classes', () => {
      render(
        <Container className="py-8" data-testid="container">
          Content
        </Container>
      );

      const container = screen.getByTestId('container');
      expect(container).toHaveClass('w-full', 'mx-auto', 'py-8');
    });
  });
});
