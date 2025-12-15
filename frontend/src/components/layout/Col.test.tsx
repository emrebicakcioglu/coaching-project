/**
 * Col Component Tests
 * STORY-017A: Layout & Grid-System
 *
 * Unit tests for the Col layout component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Col } from './Col';

describe('Col', () => {
  describe('rendering', () => {
    it('renders children correctly', () => {
      render(
        <Col>
          <span data-testid="child">Column content</span>
        </Col>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('renders as a different HTML element', () => {
      render(
        <Col as="article" data-testid="col">
          Content
        </Col>
      );

      expect(screen.getByTestId('col').tagName).toBe('ARTICLE');
    });

    it('defaults to flex-grow when no span specified', () => {
      render(<Col data-testid="col">Content</Col>);

      const col = screen.getByTestId('col');
      expect(col).toHaveClass('flex-1');
      expect(col).toHaveClass('min-w-0');
    });
  });

  describe('span variants', () => {
    it('applies span-1 (1/12)', () => {
      render(
        <Col span={1} data-testid="col">
          Content
        </Col>
      );

      expect(screen.getByTestId('col')).toHaveClass('w-1/12');
    });

    it('applies span-3 (25%)', () => {
      render(
        <Col span={3} data-testid="col">
          Content
        </Col>
      );

      expect(screen.getByTestId('col')).toHaveClass('w-3/12');
    });

    it('applies span-4 (1/3)', () => {
      render(
        <Col span={4} data-testid="col">
          Content
        </Col>
      );

      expect(screen.getByTestId('col')).toHaveClass('w-4/12');
    });

    it('applies span-6 (50%)', () => {
      render(
        <Col span={6} data-testid="col">
          Content
        </Col>
      );

      expect(screen.getByTestId('col')).toHaveClass('w-6/12');
    });

    it('applies span-8 (2/3)', () => {
      render(
        <Col span={8} data-testid="col">
          Content
        </Col>
      );

      expect(screen.getByTestId('col')).toHaveClass('w-8/12');
    });

    it('applies span-12 (full width)', () => {
      render(
        <Col span={12} data-testid="col">
          Content
        </Col>
      );

      expect(screen.getByTestId('col')).toHaveClass('w-full');
    });
  });

  describe('responsive spans', () => {
    it('applies responsive sm span', () => {
      render(
        <Col span={12} sm={6} data-testid="col">
          Content
        </Col>
      );

      const col = screen.getByTestId('col');
      expect(col).toHaveClass('w-full');
      expect(col).toHaveClass('sm:w-6/12');
    });

    it('applies responsive md span', () => {
      render(
        <Col span={12} md={4} data-testid="col">
          Content
        </Col>
      );

      const col = screen.getByTestId('col');
      expect(col).toHaveClass('w-full');
      expect(col).toHaveClass('md:w-4/12');
    });

    it('applies responsive lg span', () => {
      render(
        <Col span={12} lg={3} data-testid="col">
          Content
        </Col>
      );

      const col = screen.getByTestId('col');
      expect(col).toHaveClass('w-full');
      expect(col).toHaveClass('lg:w-3/12');
    });

    it('applies responsive xl span', () => {
      render(
        <Col span={12} xl={2} data-testid="col">
          Content
        </Col>
      );

      const col = screen.getByTestId('col');
      expect(col).toHaveClass('w-full');
      expect(col).toHaveClass('xl:w-2/12');
    });

    it('applies multiple responsive breakpoints', () => {
      render(
        <Col span={12} sm={6} md={4} lg={3} xl={2} data-testid="col">
          Content
        </Col>
      );

      const col = screen.getByTestId('col');
      expect(col).toHaveClass('w-full');
      expect(col).toHaveClass('sm:w-6/12');
      expect(col).toHaveClass('md:w-4/12');
      expect(col).toHaveClass('lg:w-3/12');
      expect(col).toHaveClass('xl:w-2/12');
    });
  });

  describe('auto width', () => {
    it('applies auto width class', () => {
      render(
        <Col auto data-testid="col">
          Content
        </Col>
      );

      const col = screen.getByTestId('col');
      expect(col).toHaveClass('flex-none');
      expect(col).toHaveClass('w-auto');
    });

    it('applies auto span at breakpoint', () => {
      render(
        <Col span={12} md="auto" data-testid="col">
          Content
        </Col>
      );

      const col = screen.getByTestId('col');
      expect(col).toHaveClass('w-full');
      expect(col).toHaveClass('md:w-auto');
    });
  });

  describe('offset', () => {
    it('applies default offset', () => {
      render(
        <Col span={6} offset={3} data-testid="col">
          Content
        </Col>
      );

      expect(screen.getByTestId('col')).toHaveClass('ml-[25%]');
    });

    it('applies zero offset', () => {
      render(
        <Col span={6} offset={0} data-testid="col">
          Content
        </Col>
      );

      expect(screen.getByTestId('col')).toHaveClass('ml-0');
    });

    it('applies responsive offset at sm', () => {
      render(
        <Col span={6} offsetSm={2} data-testid="col">
          Content
        </Col>
      );

      expect(screen.getByTestId('col')).toHaveClass('sm:ml-[16.666667%]');
    });

    it('applies responsive offset at md', () => {
      render(
        <Col span={6} offsetMd={3} data-testid="col">
          Content
        </Col>
      );

      expect(screen.getByTestId('col')).toHaveClass('md:ml-[25%]');
    });

    it('applies responsive offset at lg', () => {
      render(
        <Col span={6} offsetLg={4} data-testid="col">
          Content
        </Col>
      );

      expect(screen.getByTestId('col')).toHaveClass('lg:ml-[33.333333%]');
    });

    it('applies responsive offset at xl', () => {
      render(
        <Col span={6} offsetXl={6} data-testid="col">
          Content
        </Col>
      );

      expect(screen.getByTestId('col')).toHaveClass('xl:ml-[50%]');
    });
  });

  describe('order', () => {
    it('applies order first', () => {
      render(
        <Col order="first" data-testid="col">
          Content
        </Col>
      );

      expect(screen.getByTestId('col')).toHaveClass('order-first');
    });

    it('applies order last', () => {
      render(
        <Col order="last" data-testid="col">
          Content
        </Col>
      );

      expect(screen.getByTestId('col')).toHaveClass('order-last');
    });

    it('applies order none', () => {
      render(
        <Col order="none" data-testid="col">
          Content
        </Col>
      );

      expect(screen.getByTestId('col')).toHaveClass('order-none');
    });

    it('applies numeric order', () => {
      render(
        <Col order={2} data-testid="col">
          Content
        </Col>
      );

      expect(screen.getByTestId('col')).toHaveClass('order-2');
    });

    it('applies responsive order at md', () => {
      render(
        <Col order="last" orderMd="first" data-testid="col">
          Content
        </Col>
      );

      const col = screen.getByTestId('col');
      expect(col).toHaveClass('order-last');
      expect(col).toHaveClass('md:order-first');
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      render(
        <Col className="custom-col bg-red-100" data-testid="col">
          Content
        </Col>
      );

      const col = screen.getByTestId('col');
      expect(col).toHaveClass('custom-col', 'bg-red-100');
    });
  });
});
