/**
 * Grid Component Tests
 * STORY-017A: Layout & Grid-System
 *
 * Unit tests for the Grid and GridItem layout components.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Grid, GridItem } from './Grid';

describe('Grid', () => {
  describe('rendering', () => {
    it('renders children correctly', () => {
      render(
        <Grid>
          <div data-testid="child1">Item 1</div>
          <div data-testid="child2">Item 2</div>
        </Grid>
      );

      expect(screen.getByTestId('child1')).toBeInTheDocument();
      expect(screen.getByTestId('child2')).toBeInTheDocument();
    });

    it('renders with grid class', () => {
      render(<Grid data-testid="grid">Content</Grid>);

      expect(screen.getByTestId('grid')).toHaveClass('grid');
    });

    it('renders as a different HTML element', () => {
      render(
        <Grid as="section" data-testid="grid">
          Content
        </Grid>
      );

      expect(screen.getByTestId('grid').tagName).toBe('SECTION');
    });

    it('applies role attribute', () => {
      render(
        <Grid role="list" data-testid="grid">
          Content
        </Grid>
      );

      expect(screen.getByTestId('grid')).toHaveAttribute('role', 'list');
    });
  });

  describe('column variants', () => {
    it('applies default 1 column', () => {
      render(<Grid data-testid="grid">Content</Grid>);

      expect(screen.getByTestId('grid')).toHaveClass('grid-cols-1');
    });

    it('applies 2 columns', () => {
      render(
        <Grid cols={2} data-testid="grid">
          Content
        </Grid>
      );

      expect(screen.getByTestId('grid')).toHaveClass('grid-cols-2');
    });

    it('applies 3 columns', () => {
      render(
        <Grid cols={3} data-testid="grid">
          Content
        </Grid>
      );

      expect(screen.getByTestId('grid')).toHaveClass('grid-cols-3');
    });

    it('applies 4 columns', () => {
      render(
        <Grid cols={4} data-testid="grid">
          Content
        </Grid>
      );

      expect(screen.getByTestId('grid')).toHaveClass('grid-cols-4');
    });

    it('applies 6 columns', () => {
      render(
        <Grid cols={6} data-testid="grid">
          Content
        </Grid>
      );

      expect(screen.getByTestId('grid')).toHaveClass('grid-cols-6');
    });

    it('applies 12 columns', () => {
      render(
        <Grid cols={12} data-testid="grid">
          Content
        </Grid>
      );

      expect(screen.getByTestId('grid')).toHaveClass('grid-cols-12');
    });

    it('applies none columns', () => {
      render(
        <Grid cols="none" data-testid="grid">
          Content
        </Grid>
      );

      expect(screen.getByTestId('grid')).toHaveClass('grid-cols-none');
    });
  });

  describe('responsive columns', () => {
    it('applies responsive sm columns', () => {
      render(
        <Grid cols={1} sm={2} data-testid="grid">
          Content
        </Grid>
      );

      const grid = screen.getByTestId('grid');
      expect(grid).toHaveClass('grid-cols-1');
      expect(grid).toHaveClass('sm:grid-cols-2');
    });

    it('applies responsive md columns', () => {
      render(
        <Grid cols={1} md={3} data-testid="grid">
          Content
        </Grid>
      );

      const grid = screen.getByTestId('grid');
      expect(grid).toHaveClass('grid-cols-1');
      expect(grid).toHaveClass('md:grid-cols-3');
    });

    it('applies responsive lg columns', () => {
      render(
        <Grid cols={1} lg={4} data-testid="grid">
          Content
        </Grid>
      );

      const grid = screen.getByTestId('grid');
      expect(grid).toHaveClass('grid-cols-1');
      expect(grid).toHaveClass('lg:grid-cols-4');
    });

    it('applies responsive xl columns', () => {
      render(
        <Grid cols={1} xl={6} data-testid="grid">
          Content
        </Grid>
      );

      const grid = screen.getByTestId('grid');
      expect(grid).toHaveClass('grid-cols-1');
      expect(grid).toHaveClass('xl:grid-cols-6');
    });

    it('applies multiple responsive breakpoints', () => {
      render(
        <Grid cols={1} sm={2} md={3} lg={4} xl={6} data-testid="grid">
          Content
        </Grid>
      );

      const grid = screen.getByTestId('grid');
      expect(grid).toHaveClass('grid-cols-1');
      expect(grid).toHaveClass('sm:grid-cols-2');
      expect(grid).toHaveClass('md:grid-cols-3');
      expect(grid).toHaveClass('lg:grid-cols-4');
      expect(grid).toHaveClass('xl:grid-cols-6');
    });
  });

  describe('gap variants', () => {
    it('applies default md gap', () => {
      render(<Grid data-testid="grid">Content</Grid>);

      expect(screen.getByTestId('grid')).toHaveClass('gap-4');
    });

    it('applies none gap', () => {
      render(
        <Grid gap="none" data-testid="grid">
          Content
        </Grid>
      );

      expect(screen.getByTestId('grid')).toHaveClass('gap-0');
    });

    it('applies xs gap', () => {
      render(
        <Grid gap="xs" data-testid="grid">
          Content
        </Grid>
      );

      expect(screen.getByTestId('grid')).toHaveClass('gap-1');
    });

    it('applies sm gap', () => {
      render(
        <Grid gap="sm" data-testid="grid">
          Content
        </Grid>
      );

      expect(screen.getByTestId('grid')).toHaveClass('gap-2');
    });

    it('applies lg gap', () => {
      render(
        <Grid gap="lg" data-testid="grid">
          Content
        </Grid>
      );

      expect(screen.getByTestId('grid')).toHaveClass('gap-6');
    });

    it('applies xl gap', () => {
      render(
        <Grid gap="xl" data-testid="grid">
          Content
        </Grid>
      );

      expect(screen.getByTestId('grid')).toHaveClass('gap-8');
    });

    it('applies 2xl gap', () => {
      render(
        <Grid gap="2xl" data-testid="grid">
          Content
        </Grid>
      );

      expect(screen.getByTestId('grid')).toHaveClass('gap-12');
    });
  });

  describe('directional gap', () => {
    it('applies separate gapX and gapY', () => {
      render(
        <Grid gapX="sm" gapY="lg" data-testid="grid">
          Content
        </Grid>
      );

      const grid = screen.getByTestId('grid');
      expect(grid).toHaveClass('gap-x-2');
      expect(grid).toHaveClass('gap-y-6');
    });
  });

  describe('rows', () => {
    it('applies grid rows', () => {
      render(
        <Grid rows={3} data-testid="grid">
          Content
        </Grid>
      );

      expect(screen.getByTestId('grid')).toHaveClass('grid-rows-3');
    });

    it('applies rows none', () => {
      render(
        <Grid rows="none" data-testid="grid">
          Content
        </Grid>
      );

      expect(screen.getByTestId('grid')).toHaveClass('grid-rows-none');
    });
  });

  describe('flow', () => {
    it('applies row flow', () => {
      render(
        <Grid flow="row" data-testid="grid">
          Content
        </Grid>
      );

      expect(screen.getByTestId('grid')).toHaveClass('grid-flow-row');
    });

    it('applies col flow', () => {
      render(
        <Grid flow="col" data-testid="grid">
          Content
        </Grid>
      );

      expect(screen.getByTestId('grid')).toHaveClass('grid-flow-col');
    });

    it('applies dense flow', () => {
      render(
        <Grid flow="dense" data-testid="grid">
          Content
        </Grid>
      );

      expect(screen.getByTestId('grid')).toHaveClass('grid-flow-dense');
    });

    it('applies row-dense flow', () => {
      render(
        <Grid flow="row-dense" data-testid="grid">
          Content
        </Grid>
      );

      expect(screen.getByTestId('grid')).toHaveClass('grid-flow-row-dense');
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      render(
        <Grid className="custom-grid bg-gray-50" data-testid="grid">
          Content
        </Grid>
      );

      const grid = screen.getByTestId('grid');
      expect(grid).toHaveClass('custom-grid', 'bg-gray-50', 'grid');
    });
  });
});

describe('GridItem', () => {
  describe('rendering', () => {
    it('renders children correctly', () => {
      render(
        <GridItem>
          <span data-testid="child">Item content</span>
        </GridItem>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('renders as a different HTML element', () => {
      render(
        <GridItem as="li" data-testid="item">
          Content
        </GridItem>
      );

      expect(screen.getByTestId('item').tagName).toBe('LI');
    });
  });

  describe('column span', () => {
    it('applies col span 1', () => {
      render(
        <GridItem colSpan={1} data-testid="item">
          Content
        </GridItem>
      );

      expect(screen.getByTestId('item')).toHaveClass('col-span-1');
    });

    it('applies col span 6', () => {
      render(
        <GridItem colSpan={6} data-testid="item">
          Content
        </GridItem>
      );

      expect(screen.getByTestId('item')).toHaveClass('col-span-6');
    });

    it('applies col span 12', () => {
      render(
        <GridItem colSpan={12} data-testid="item">
          Content
        </GridItem>
      );

      expect(screen.getByTestId('item')).toHaveClass('col-span-12');
    });

    it('applies col span full', () => {
      render(
        <GridItem colSpan="full" data-testid="item">
          Content
        </GridItem>
      );

      expect(screen.getByTestId('item')).toHaveClass('col-span-full');
    });
  });

  describe('responsive column span', () => {
    it('applies responsive col span at sm', () => {
      render(
        <GridItem colSpan={12} colSpanSm={6} data-testid="item">
          Content
        </GridItem>
      );

      const item = screen.getByTestId('item');
      expect(item).toHaveClass('col-span-12');
      expect(item).toHaveClass('sm:col-span-6');
    });

    it('applies responsive col span at md', () => {
      render(
        <GridItem colSpan={12} colSpanMd={4} data-testid="item">
          Content
        </GridItem>
      );

      const item = screen.getByTestId('item');
      expect(item).toHaveClass('col-span-12');
      expect(item).toHaveClass('md:col-span-4');
    });

    it('applies responsive col span at lg', () => {
      render(
        <GridItem colSpan={12} colSpanLg={3} data-testid="item">
          Content
        </GridItem>
      );

      const item = screen.getByTestId('item');
      expect(item).toHaveClass('col-span-12');
      expect(item).toHaveClass('lg:col-span-3');
    });

    it('applies responsive col span at xl', () => {
      render(
        <GridItem colSpan={12} colSpanXl={2} data-testid="item">
          Content
        </GridItem>
      );

      const item = screen.getByTestId('item');
      expect(item).toHaveClass('col-span-12');
      expect(item).toHaveClass('xl:col-span-2');
    });
  });

  describe('row span', () => {
    it('applies row span 2', () => {
      render(
        <GridItem rowSpan={2} data-testid="item">
          Content
        </GridItem>
      );

      expect(screen.getByTestId('item')).toHaveClass('row-span-2');
    });

    it('applies row span full', () => {
      render(
        <GridItem rowSpan="full" data-testid="item">
          Content
        </GridItem>
      );

      expect(screen.getByTestId('item')).toHaveClass('row-span-full');
    });
  });

  describe('start/end positions', () => {
    it('applies col start', () => {
      render(
        <GridItem colStart={2} data-testid="item">
          Content
        </GridItem>
      );

      expect(screen.getByTestId('item')).toHaveClass('col-start-2');
    });

    it('applies col end', () => {
      render(
        <GridItem colEnd={4} data-testid="item">
          Content
        </GridItem>
      );

      expect(screen.getByTestId('item')).toHaveClass('col-end-4');
    });

    it('applies col start auto', () => {
      render(
        <GridItem colStart="auto" data-testid="item">
          Content
        </GridItem>
      );

      expect(screen.getByTestId('item')).toHaveClass('col-start-auto');
    });

    it('applies row start', () => {
      render(
        <GridItem rowStart={1} data-testid="item">
          Content
        </GridItem>
      );

      expect(screen.getByTestId('item')).toHaveClass('row-start-1');
    });

    it('applies row end', () => {
      render(
        <GridItem rowEnd={3} data-testid="item">
          Content
        </GridItem>
      );

      expect(screen.getByTestId('item')).toHaveClass('row-end-3');
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      render(
        <GridItem className="custom-item p-4" data-testid="item">
          Content
        </GridItem>
      );

      const item = screen.getByTestId('item');
      expect(item).toHaveClass('custom-item', 'p-4');
    });
  });
});
