/**
 * Grid Component
 * STORY-017A: Layout & Grid-System
 *
 * CSS Grid-based layout component for more complex grid patterns.
 * Supports 12-column grid with responsive column counts and gaps.
 *
 * @example
 * ```tsx
 * // Simple 3-column grid
 * <Grid cols={3} gap="md">
 *   <Card />
 *   <Card />
 *   <Card />
 * </Grid>
 *
 * // Responsive grid: 1 col mobile, 2 cols tablet, 3 cols desktop
 * <Grid cols={1} md={2} lg={3} gap="lg">
 *   <GridItem />
 *   <GridItem />
 *   <GridItem />
 * </Grid>
 *
 * // Grid with spanning items
 * <Grid cols={12} gap="md">
 *   <GridItem colSpan={12}>Full width header</GridItem>
 *   <GridItem colSpan={8}>Main content</GridItem>
 *   <GridItem colSpan={4}>Sidebar</GridItem>
 * </Grid>
 * ```
 */

import React from 'react';

/**
 * Column count values
 */
export type GridCols = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'none';

/**
 * Row count values
 */
export type GridRows = 1 | 2 | 3 | 4 | 5 | 6 | 'none';

/**
 * Gap size values
 */
export type GridGap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Grid flow options
 */
export type GridFlow = 'row' | 'col' | 'dense' | 'row-dense' | 'col-dense';

/**
 * Grid component props
 */
export interface GridProps {
  /** Grid children */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Number of columns (default) */
  cols?: GridCols;
  /** Columns at sm breakpoint (640px+) */
  sm?: GridCols;
  /** Columns at md breakpoint (768px+) */
  md?: GridCols;
  /** Columns at lg breakpoint (1024px+) */
  lg?: GridCols;
  /** Columns at xl breakpoint (1280px+) */
  xl?: GridCols;
  /** Number of rows */
  rows?: GridRows;
  /** Gap between items */
  gap?: GridGap;
  /** Column gap (overrides gap for horizontal) */
  gapX?: GridGap;
  /** Row gap (overrides gap for vertical) */
  gapY?: GridGap;
  /** Grid auto-flow direction */
  flow?: GridFlow;
  /** HTML element to render as (default: 'div') */
  as?: keyof JSX.IntrinsicElements;
  /** Accessible role */
  role?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * GridItem props for items that span multiple columns/rows
 */
export interface GridItemProps {
  /** Item content */
  children?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Number of columns to span */
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'full';
  /** Columns to span at sm breakpoint */
  colSpanSm?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'full';
  /** Columns to span at md breakpoint */
  colSpanMd?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'full';
  /** Columns to span at lg breakpoint */
  colSpanLg?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'full';
  /** Columns to span at xl breakpoint */
  colSpanXl?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'full';
  /** Number of rows to span */
  rowSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 'full';
  /** Column start position */
  colStart?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 'auto';
  /** Column end position */
  colEnd?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 'auto';
  /** Row start position */
  rowStart?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 'auto';
  /** Row end position */
  rowEnd?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 'auto';
  /** HTML element to render as (default: 'div') */
  as?: keyof JSX.IntrinsicElements;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Maps column count to Tailwind CSS grid-template-columns classes
 */
const colClasses: Record<GridCols, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  7: 'grid-cols-7',
  8: 'grid-cols-8',
  9: 'grid-cols-9',
  10: 'grid-cols-10',
  11: 'grid-cols-11',
  12: 'grid-cols-12',
  'none': 'grid-cols-none',
};

/**
 * Maps responsive column counts to Tailwind classes
 */
const responsiveColClasses: Record<string, Record<GridCols, string>> = {
  sm: {
    1: 'sm:grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
    5: 'sm:grid-cols-5',
    6: 'sm:grid-cols-6',
    7: 'sm:grid-cols-7',
    8: 'sm:grid-cols-8',
    9: 'sm:grid-cols-9',
    10: 'sm:grid-cols-10',
    11: 'sm:grid-cols-11',
    12: 'sm:grid-cols-12',
    'none': 'sm:grid-cols-none',
  },
  md: {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
    6: 'md:grid-cols-6',
    7: 'md:grid-cols-7',
    8: 'md:grid-cols-8',
    9: 'md:grid-cols-9',
    10: 'md:grid-cols-10',
    11: 'md:grid-cols-11',
    12: 'md:grid-cols-12',
    'none': 'md:grid-cols-none',
  },
  lg: {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
    7: 'lg:grid-cols-7',
    8: 'lg:grid-cols-8',
    9: 'lg:grid-cols-9',
    10: 'lg:grid-cols-10',
    11: 'lg:grid-cols-11',
    12: 'lg:grid-cols-12',
    'none': 'lg:grid-cols-none',
  },
  xl: {
    1: 'xl:grid-cols-1',
    2: 'xl:grid-cols-2',
    3: 'xl:grid-cols-3',
    4: 'xl:grid-cols-4',
    5: 'xl:grid-cols-5',
    6: 'xl:grid-cols-6',
    7: 'xl:grid-cols-7',
    8: 'xl:grid-cols-8',
    9: 'xl:grid-cols-9',
    10: 'xl:grid-cols-10',
    11: 'xl:grid-cols-11',
    12: 'xl:grid-cols-12',
    'none': 'xl:grid-cols-none',
  },
};

/**
 * Maps row count to Tailwind CSS grid-template-rows classes
 */
const rowClasses: Record<GridRows, string> = {
  1: 'grid-rows-1',
  2: 'grid-rows-2',
  3: 'grid-rows-3',
  4: 'grid-rows-4',
  5: 'grid-rows-5',
  6: 'grid-rows-6',
  'none': 'grid-rows-none',
};

/**
 * Maps gap values to Tailwind CSS gap classes
 */
const gapClasses: Record<GridGap, string> = {
  'none': 'gap-0',
  'xs': 'gap-1',
  'sm': 'gap-2',
  'md': 'gap-4',
  'lg': 'gap-6',
  'xl': 'gap-8',
  '2xl': 'gap-12',
};

/**
 * Maps gap values to column gap classes
 */
const gapXClasses: Record<GridGap, string> = {
  'none': 'gap-x-0',
  'xs': 'gap-x-1',
  'sm': 'gap-x-2',
  'md': 'gap-x-4',
  'lg': 'gap-x-6',
  'xl': 'gap-x-8',
  '2xl': 'gap-x-12',
};

/**
 * Maps gap values to row gap classes
 */
const gapYClasses: Record<GridGap, string> = {
  'none': 'gap-y-0',
  'xs': 'gap-y-1',
  'sm': 'gap-y-2',
  'md': 'gap-y-4',
  'lg': 'gap-y-6',
  'xl': 'gap-y-8',
  '2xl': 'gap-y-12',
};

/**
 * Maps flow values to Tailwind CSS grid-auto-flow classes
 */
const flowClasses: Record<GridFlow, string> = {
  'row': 'grid-flow-row',
  'col': 'grid-flow-col',
  'dense': 'grid-flow-dense',
  'row-dense': 'grid-flow-row-dense',
  'col-dense': 'grid-flow-col-dense',
};

/**
 * Grid Component
 *
 * CSS Grid-based container for complex grid layouts.
 */
export const Grid: React.FC<GridProps> = ({
  children,
  className = '',
  cols = 1,
  sm,
  md,
  lg,
  xl,
  rows,
  gap = 'md',
  gapX,
  gapY,
  flow,
  as: Component = 'div',
  role,
  'data-testid': testId,
}) => {
  const classes: string[] = ['grid'];

  // Column classes
  classes.push(colClasses[cols]);
  if (sm) classes.push(responsiveColClasses.sm[sm]);
  if (md) classes.push(responsiveColClasses.md[md]);
  if (lg) classes.push(responsiveColClasses.lg[lg]);
  if (xl) classes.push(responsiveColClasses.xl[xl]);

  // Row classes
  if (rows) classes.push(rowClasses[rows]);

  // Gap classes
  if (gapX && gapY) {
    classes.push(gapXClasses[gapX], gapYClasses[gapY]);
  } else if (gapX) {
    classes.push(gapXClasses[gapX], gapYClasses[gap]);
  } else if (gapY) {
    classes.push(gapXClasses[gap], gapYClasses[gapY]);
  } else {
    classes.push(gapClasses[gap]);
  }

  // Flow class
  if (flow) classes.push(flowClasses[flow]);

  // Custom className
  if (className) classes.push(className);

  return (
    <Component
      className={classes.join(' ')}
      role={role}
      data-testid={testId}
    >
      {children}
    </Component>
  );
};

/**
 * Maps col span values to Tailwind classes
 */
const colSpanClasses: Record<number | string, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
  7: 'col-span-7',
  8: 'col-span-8',
  9: 'col-span-9',
  10: 'col-span-10',
  11: 'col-span-11',
  12: 'col-span-12',
  'full': 'col-span-full',
};

/**
 * Maps responsive col span values to Tailwind classes
 */
const responsiveColSpanClasses: Record<string, Record<number | string, string>> = {
  sm: {
    1: 'sm:col-span-1',
    2: 'sm:col-span-2',
    3: 'sm:col-span-3',
    4: 'sm:col-span-4',
    5: 'sm:col-span-5',
    6: 'sm:col-span-6',
    7: 'sm:col-span-7',
    8: 'sm:col-span-8',
    9: 'sm:col-span-9',
    10: 'sm:col-span-10',
    11: 'sm:col-span-11',
    12: 'sm:col-span-12',
    'full': 'sm:col-span-full',
  },
  md: {
    1: 'md:col-span-1',
    2: 'md:col-span-2',
    3: 'md:col-span-3',
    4: 'md:col-span-4',
    5: 'md:col-span-5',
    6: 'md:col-span-6',
    7: 'md:col-span-7',
    8: 'md:col-span-8',
    9: 'md:col-span-9',
    10: 'md:col-span-10',
    11: 'md:col-span-11',
    12: 'md:col-span-12',
    'full': 'md:col-span-full',
  },
  lg: {
    1: 'lg:col-span-1',
    2: 'lg:col-span-2',
    3: 'lg:col-span-3',
    4: 'lg:col-span-4',
    5: 'lg:col-span-5',
    6: 'lg:col-span-6',
    7: 'lg:col-span-7',
    8: 'lg:col-span-8',
    9: 'lg:col-span-9',
    10: 'lg:col-span-10',
    11: 'lg:col-span-11',
    12: 'lg:col-span-12',
    'full': 'lg:col-span-full',
  },
  xl: {
    1: 'xl:col-span-1',
    2: 'xl:col-span-2',
    3: 'xl:col-span-3',
    4: 'xl:col-span-4',
    5: 'xl:col-span-5',
    6: 'xl:col-span-6',
    7: 'xl:col-span-7',
    8: 'xl:col-span-8',
    9: 'xl:col-span-9',
    10: 'xl:col-span-10',
    11: 'xl:col-span-11',
    12: 'xl:col-span-12',
    'full': 'xl:col-span-full',
  },
};

/**
 * Maps row span values to Tailwind classes
 */
const rowSpanClasses: Record<number | string, string> = {
  1: 'row-span-1',
  2: 'row-span-2',
  3: 'row-span-3',
  4: 'row-span-4',
  5: 'row-span-5',
  6: 'row-span-6',
  'full': 'row-span-full',
};

/**
 * GridItem Component
 *
 * Grid item that can span multiple columns/rows.
 */
export const GridItem: React.FC<GridItemProps> = ({
  children,
  className = '',
  colSpan,
  colSpanSm,
  colSpanMd,
  colSpanLg,
  colSpanXl,
  rowSpan,
  colStart,
  colEnd,
  rowStart,
  rowEnd,
  as: Component = 'div',
  'data-testid': testId,
}) => {
  const classes: string[] = [];

  // Column span
  if (colSpan) classes.push(colSpanClasses[colSpan]);
  if (colSpanSm) classes.push(responsiveColSpanClasses.sm[colSpanSm]);
  if (colSpanMd) classes.push(responsiveColSpanClasses.md[colSpanMd]);
  if (colSpanLg) classes.push(responsiveColSpanClasses.lg[colSpanLg]);
  if (colSpanXl) classes.push(responsiveColSpanClasses.xl[colSpanXl]);

  // Row span
  if (rowSpan) classes.push(rowSpanClasses[rowSpan]);

  // Column start/end
  if (colStart) classes.push(colStart === 'auto' ? 'col-start-auto' : `col-start-${colStart}`);
  if (colEnd) classes.push(colEnd === 'auto' ? 'col-end-auto' : `col-end-${colEnd}`);

  // Row start/end
  if (rowStart) classes.push(rowStart === 'auto' ? 'row-start-auto' : `row-start-${rowStart}`);
  if (rowEnd) classes.push(rowEnd === 'auto' ? 'row-end-auto' : `row-end-${rowEnd}`);

  // Custom className
  if (className) classes.push(className);

  return (
    <Component
      className={classes.join(' ')}
      data-testid={testId}
    >
      {children}
    </Component>
  );
};

export default Grid;
