/**
 * Row Component
 * STORY-017A: Layout & Grid-System
 *
 * Flex container for grid rows with configurable gap and alignment.
 * Works with Col components for responsive grid layouts.
 *
 * @example
 * ```tsx
 * <Row>
 *   <Col>Column 1</Col>
 *   <Col>Column 2</Col>
 * </Row>
 *
 * <Row gap="lg" align="center" justify="between">
 *   <Col span={6}>Left</Col>
 *   <Col span={6}>Right</Col>
 * </Row>
 *
 * <Row wrap={false} gap="md">
 *   <Col>No wrap column 1</Col>
 *   <Col>No wrap column 2</Col>
 * </Row>
 * ```
 */

import React from 'react';

/**
 * Gap size variants
 */
export type RowGap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Alignment options (align-items)
 */
export type RowAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';

/**
 * Justification options (justify-content)
 */
export type RowJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

/**
 * Direction options
 */
export type RowDirection = 'row' | 'row-reverse' | 'col' | 'col-reverse';

/**
 * Row component props
 */
export interface RowProps {
  /** Content (typically Col components) */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Gap between columns */
  gap?: RowGap;
  /** Vertical gap (row-gap) - overrides gap for vertical spacing */
  gapY?: RowGap;
  /** Horizontal gap (column-gap) - overrides gap for horizontal spacing */
  gapX?: RowGap;
  /** Align items vertically */
  align?: RowAlign;
  /** Justify content horizontally */
  justify?: RowJustify;
  /** Flex direction */
  direction?: RowDirection;
  /** Enable wrapping (default: true) */
  wrap?: boolean;
  /** Reverse wrap direction */
  wrapReverse?: boolean;
  /** Remove gutters/padding from children */
  noGutters?: boolean;
  /** HTML element to render as (default: 'div') */
  as?: keyof JSX.IntrinsicElements;
  /** Accessible role */
  role?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Maps gap prop to Tailwind CSS gap classes
 */
const gapClasses: Record<RowGap, string> = {
  none: 'gap-0',
  xs: 'gap-1',     // 4px
  sm: 'gap-2',     // 8px
  md: 'gap-4',     // 16px
  lg: 'gap-6',     // 24px
  xl: 'gap-8',     // 32px
  '2xl': 'gap-12', // 48px
};

/**
 * Maps gap prop to Tailwind CSS gap-x classes
 */
const gapXClasses: Record<RowGap, string> = {
  none: 'gap-x-0',
  xs: 'gap-x-1',
  sm: 'gap-x-2',
  md: 'gap-x-4',
  lg: 'gap-x-6',
  xl: 'gap-x-8',
  '2xl': 'gap-x-12',
};

/**
 * Maps gap prop to Tailwind CSS gap-y classes
 */
const gapYClasses: Record<RowGap, string> = {
  none: 'gap-y-0',
  xs: 'gap-y-1',
  sm: 'gap-y-2',
  md: 'gap-y-4',
  lg: 'gap-y-6',
  xl: 'gap-y-8',
  '2xl': 'gap-y-12',
};

/**
 * Maps align prop to Tailwind CSS align-items classes
 */
const alignClasses: Record<RowAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
};

/**
 * Maps justify prop to Tailwind CSS justify-content classes
 */
const justifyClasses: Record<RowJustify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
};

/**
 * Maps direction prop to Tailwind CSS flex-direction classes
 */
const directionClasses: Record<RowDirection, string> = {
  'row': 'flex-row',
  'row-reverse': 'flex-row-reverse',
  'col': 'flex-col',
  'col-reverse': 'flex-col-reverse',
};

/**
 * Row Component
 *
 * Provides a flex container for creating grid rows.
 * Supports responsive gap, alignment, and justification.
 */
export const Row: React.FC<RowProps> = ({
  children,
  className = '',
  gap = 'md',
  gapY,
  gapX,
  align = 'stretch',
  justify = 'start',
  direction = 'row',
  wrap = true,
  wrapReverse = false,
  noGutters = false,
  as: Component = 'div',
  role,
  'data-testid': testId,
}) => {
  // Build gap classes
  const computedGapClasses: string[] = [];
  if (gapX && gapY) {
    computedGapClasses.push(gapXClasses[gapX], gapYClasses[gapY]);
  } else if (gapX) {
    computedGapClasses.push(gapXClasses[gapX], gapYClasses[gap]);
  } else if (gapY) {
    computedGapClasses.push(gapXClasses[gap], gapYClasses[gapY]);
  } else {
    computedGapClasses.push(gapClasses[gap]);
  }

  // Determine wrap class
  let wrapClass = 'flex-wrap';
  if (!wrap) {
    wrapClass = 'flex-nowrap';
  } else if (wrapReverse) {
    wrapClass = 'flex-wrap-reverse';
  }

  // Combine all classes
  const rowClasses = [
    'flex',
    directionClasses[direction],
    wrapClass,
    alignClasses[align],
    justifyClasses[justify],
    ...computedGapClasses,
    noGutters ? '' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <Component
      className={rowClasses}
      role={role}
      data-testid={testId}
    >
      {children}
    </Component>
  );
};

export default Row;
