/**
 * Row Component Tests
 * STORY-017A: Layout & Grid-System
 *
 * Unit tests for the Row layout component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Row } from './Row';

describe('Row', () => {
  describe('rendering', () => {
    it('renders children correctly', () => {
      render(
        <Row>
          <div data-testid="child1">Child 1</div>
          <div data-testid="child2">Child 2</div>
        </Row>
      );

      expect(screen.getByTestId('child1')).toBeInTheDocument();
      expect(screen.getByTestId('child2')).toBeInTheDocument();
    });

    it('renders with default flex class', () => {
      render(<Row data-testid="row">Content</Row>);

      expect(screen.getByTestId('row')).toHaveClass('flex');
    });

    it('renders as a different HTML element', () => {
      render(
        <Row as="ul" data-testid="row">
          <li>Item</li>
        </Row>
      );

      expect(screen.getByTestId('row').tagName).toBe('UL');
    });

    it('applies role attribute', () => {
      render(
        <Row role="list" data-testid="row">
          Content
        </Row>
      );

      expect(screen.getByTestId('row')).toHaveAttribute('role', 'list');
    });
  });

  describe('gap variants', () => {
    it('applies default md gap', () => {
      render(<Row data-testid="row">Content</Row>);

      expect(screen.getByTestId('row')).toHaveClass('gap-4');
    });

    it('applies none gap', () => {
      render(
        <Row gap="none" data-testid="row">
          Content
        </Row>
      );

      expect(screen.getByTestId('row')).toHaveClass('gap-0');
    });

    it('applies xs gap', () => {
      render(
        <Row gap="xs" data-testid="row">
          Content
        </Row>
      );

      expect(screen.getByTestId('row')).toHaveClass('gap-1');
    });

    it('applies sm gap', () => {
      render(
        <Row gap="sm" data-testid="row">
          Content
        </Row>
      );

      expect(screen.getByTestId('row')).toHaveClass('gap-2');
    });

    it('applies lg gap', () => {
      render(
        <Row gap="lg" data-testid="row">
          Content
        </Row>
      );

      expect(screen.getByTestId('row')).toHaveClass('gap-6');
    });

    it('applies xl gap', () => {
      render(
        <Row gap="xl" data-testid="row">
          Content
        </Row>
      );

      expect(screen.getByTestId('row')).toHaveClass('gap-8');
    });

    it('applies 2xl gap', () => {
      render(
        <Row gap="2xl" data-testid="row">
          Content
        </Row>
      );

      expect(screen.getByTestId('row')).toHaveClass('gap-12');
    });
  });

  describe('directional gap', () => {
    it('applies separate gapX and gapY', () => {
      render(
        <Row gapX="sm" gapY="lg" data-testid="row">
          Content
        </Row>
      );

      const row = screen.getByTestId('row');
      expect(row).toHaveClass('gap-x-2');
      expect(row).toHaveClass('gap-y-6');
    });

    it('applies gapX with default gapY', () => {
      render(
        <Row gapX="xl" data-testid="row">
          Content
        </Row>
      );

      const row = screen.getByTestId('row');
      expect(row).toHaveClass('gap-x-8');
      expect(row).toHaveClass('gap-y-4'); // Default gap
    });

    it('applies gapY with default gapX', () => {
      render(
        <Row gapY="xl" data-testid="row">
          Content
        </Row>
      );

      const row = screen.getByTestId('row');
      expect(row).toHaveClass('gap-x-4'); // Default gap
      expect(row).toHaveClass('gap-y-8');
    });
  });

  describe('alignment', () => {
    it('applies default stretch alignment', () => {
      render(<Row data-testid="row">Content</Row>);

      expect(screen.getByTestId('row')).toHaveClass('items-stretch');
    });

    it('applies start alignment', () => {
      render(
        <Row align="start" data-testid="row">
          Content
        </Row>
      );

      expect(screen.getByTestId('row')).toHaveClass('items-start');
    });

    it('applies center alignment', () => {
      render(
        <Row align="center" data-testid="row">
          Content
        </Row>
      );

      expect(screen.getByTestId('row')).toHaveClass('items-center');
    });

    it('applies end alignment', () => {
      render(
        <Row align="end" data-testid="row">
          Content
        </Row>
      );

      expect(screen.getByTestId('row')).toHaveClass('items-end');
    });

    it('applies baseline alignment', () => {
      render(
        <Row align="baseline" data-testid="row">
          Content
        </Row>
      );

      expect(screen.getByTestId('row')).toHaveClass('items-baseline');
    });
  });

  describe('justification', () => {
    it('applies default start justification', () => {
      render(<Row data-testid="row">Content</Row>);

      expect(screen.getByTestId('row')).toHaveClass('justify-start');
    });

    it('applies center justification', () => {
      render(
        <Row justify="center" data-testid="row">
          Content
        </Row>
      );

      expect(screen.getByTestId('row')).toHaveClass('justify-center');
    });

    it('applies end justification', () => {
      render(
        <Row justify="end" data-testid="row">
          Content
        </Row>
      );

      expect(screen.getByTestId('row')).toHaveClass('justify-end');
    });

    it('applies between justification', () => {
      render(
        <Row justify="between" data-testid="row">
          Content
        </Row>
      );

      expect(screen.getByTestId('row')).toHaveClass('justify-between');
    });

    it('applies around justification', () => {
      render(
        <Row justify="around" data-testid="row">
          Content
        </Row>
      );

      expect(screen.getByTestId('row')).toHaveClass('justify-around');
    });

    it('applies evenly justification', () => {
      render(
        <Row justify="evenly" data-testid="row">
          Content
        </Row>
      );

      expect(screen.getByTestId('row')).toHaveClass('justify-evenly');
    });
  });

  describe('direction', () => {
    it('applies default row direction', () => {
      render(<Row data-testid="row">Content</Row>);

      expect(screen.getByTestId('row')).toHaveClass('flex-row');
    });

    it('applies row-reverse direction', () => {
      render(
        <Row direction="row-reverse" data-testid="row">
          Content
        </Row>
      );

      expect(screen.getByTestId('row')).toHaveClass('flex-row-reverse');
    });

    it('applies col direction', () => {
      render(
        <Row direction="col" data-testid="row">
          Content
        </Row>
      );

      expect(screen.getByTestId('row')).toHaveClass('flex-col');
    });

    it('applies col-reverse direction', () => {
      render(
        <Row direction="col-reverse" data-testid="row">
          Content
        </Row>
      );

      expect(screen.getByTestId('row')).toHaveClass('flex-col-reverse');
    });
  });

  describe('wrapping', () => {
    it('applies default wrap', () => {
      render(<Row data-testid="row">Content</Row>);

      expect(screen.getByTestId('row')).toHaveClass('flex-wrap');
    });

    it('applies no wrap when wrap is false', () => {
      render(
        <Row wrap={false} data-testid="row">
          Content
        </Row>
      );

      expect(screen.getByTestId('row')).toHaveClass('flex-nowrap');
    });

    it('applies wrap-reverse', () => {
      render(
        <Row wrapReverse data-testid="row">
          Content
        </Row>
      );

      expect(screen.getByTestId('row')).toHaveClass('flex-wrap-reverse');
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      render(
        <Row className="custom-row bg-blue-100" data-testid="row">
          Content
        </Row>
      );

      const row = screen.getByTestId('row');
      expect(row).toHaveClass('custom-row', 'bg-blue-100', 'flex');
    });
  });
});
