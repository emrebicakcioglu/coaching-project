/**
 * Col Component
 * STORY-017A: Layout & Grid-System
 *
 * Flexible column component for 12-column grid system.
 * Supports responsive column spanning across all breakpoints.
 *
 * @example
 * ```tsx
 * // Full width on mobile, half on md, third on lg
 * <Row>
 *   <Col span={12} md={6} lg={4}>Column 1</Col>
 *   <Col span={12} md={6} lg={4}>Column 2</Col>
 *   <Col span={12} md={12} lg={4}>Column 3</Col>
 * </Row>
 *
 * // Auto-width column
 * <Row>
 *   <Col auto>Auto width</Col>
 *   <Col>Fills remaining space</Col>
 * </Row>
 *
 * // Offset columns
 * <Row>
 *   <Col span={6} offset={3}>Centered</Col>
 * </Row>
 * ```
 */

import React from 'react';

/**
 * Column span values (1-12) or 'auto'
 */
export type ColSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'auto';

/**
 * Column offset values (0-11)
 */
export type ColOffset = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

/**
 * Column order values
 */
export type ColOrder = 'first' | 'last' | 'none' | number;

/**
 * Col component props
 */
export interface ColProps {
  /** Content to render inside the column */
  children?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Default column span (applies to all breakpoints unless overridden) */
  span?: ColSpan;
  /** Column span at sm breakpoint (640px+) */
  sm?: ColSpan;
  /** Column span at md breakpoint (768px+) */
  md?: ColSpan;
  /** Column span at lg breakpoint (1024px+) */
  lg?: ColSpan;
  /** Column span at xl breakpoint (1280px+) */
  xl?: ColSpan;
  /** Auto-size column based on content */
  auto?: boolean;
  /** Default column offset */
  offset?: ColOffset;
  /** Column offset at sm breakpoint */
  offsetSm?: ColOffset;
  /** Column offset at md breakpoint */
  offsetMd?: ColOffset;
  /** Column offset at lg breakpoint */
  offsetLg?: ColOffset;
  /** Column offset at xl breakpoint */
  offsetXl?: ColOffset;
  /** Column order */
  order?: ColOrder;
  /** Order at sm breakpoint */
  orderSm?: ColOrder;
  /** Order at md breakpoint */
  orderMd?: ColOrder;
  /** Order at lg breakpoint */
  orderLg?: ColOrder;
  /** Order at xl breakpoint */
  orderXl?: ColOrder;
  /** HTML element to render as (default: 'div') */
  as?: keyof JSX.IntrinsicElements;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Maps span values to Tailwind CSS width classes
 */
const spanClasses: Record<number, string> = {
  1: 'w-1/12',
  2: 'w-2/12',
  3: 'w-3/12',
  4: 'w-4/12',
  5: 'w-5/12',
  6: 'w-6/12',
  7: 'w-7/12',
  8: 'w-8/12',
  9: 'w-9/12',
  10: 'w-10/12',
  11: 'w-11/12',
  12: 'w-full',
};

/**
 * Maps span values to responsive Tailwind CSS width classes
 */
const responsiveSpanClasses: Record<string, Record<number, string>> = {
  sm: {
    1: 'sm:w-1/12',
    2: 'sm:w-2/12',
    3: 'sm:w-3/12',
    4: 'sm:w-4/12',
    5: 'sm:w-5/12',
    6: 'sm:w-6/12',
    7: 'sm:w-7/12',
    8: 'sm:w-8/12',
    9: 'sm:w-9/12',
    10: 'sm:w-10/12',
    11: 'sm:w-11/12',
    12: 'sm:w-full',
  },
  md: {
    1: 'md:w-1/12',
    2: 'md:w-2/12',
    3: 'md:w-3/12',
    4: 'md:w-4/12',
    5: 'md:w-5/12',
    6: 'md:w-6/12',
    7: 'md:w-7/12',
    8: 'md:w-8/12',
    9: 'md:w-9/12',
    10: 'md:w-10/12',
    11: 'md:w-11/12',
    12: 'md:w-full',
  },
  lg: {
    1: 'lg:w-1/12',
    2: 'lg:w-2/12',
    3: 'lg:w-3/12',
    4: 'lg:w-4/12',
    5: 'lg:w-5/12',
    6: 'lg:w-6/12',
    7: 'lg:w-7/12',
    8: 'lg:w-8/12',
    9: 'lg:w-9/12',
    10: 'lg:w-10/12',
    11: 'lg:w-11/12',
    12: 'lg:w-full',
  },
  xl: {
    1: 'xl:w-1/12',
    2: 'xl:w-2/12',
    3: 'xl:w-3/12',
    4: 'xl:w-4/12',
    5: 'xl:w-5/12',
    6: 'xl:w-6/12',
    7: 'xl:w-7/12',
    8: 'xl:w-8/12',
    9: 'xl:w-9/12',
    10: 'xl:w-10/12',
    11: 'xl:w-11/12',
    12: 'xl:w-full',
  },
};

/**
 * Maps offset values to Tailwind CSS margin-left classes
 */
const offsetClasses: Record<number, string> = {
  0: 'ml-0',
  1: 'ml-[8.333333%]',
  2: 'ml-[16.666667%]',
  3: 'ml-[25%]',
  4: 'ml-[33.333333%]',
  5: 'ml-[41.666667%]',
  6: 'ml-[50%]',
  7: 'ml-[58.333333%]',
  8: 'ml-[66.666667%]',
  9: 'ml-[75%]',
  10: 'ml-[83.333333%]',
  11: 'ml-[91.666667%]',
};

/**
 * Maps offset values to responsive Tailwind CSS margin-left classes
 */
const responsiveOffsetClasses: Record<string, Record<number, string>> = {
  sm: {
    0: 'sm:ml-0',
    1: 'sm:ml-[8.333333%]',
    2: 'sm:ml-[16.666667%]',
    3: 'sm:ml-[25%]',
    4: 'sm:ml-[33.333333%]',
    5: 'sm:ml-[41.666667%]',
    6: 'sm:ml-[50%]',
    7: 'sm:ml-[58.333333%]',
    8: 'sm:ml-[66.666667%]',
    9: 'sm:ml-[75%]',
    10: 'sm:ml-[83.333333%]',
    11: 'sm:ml-[91.666667%]',
  },
  md: {
    0: 'md:ml-0',
    1: 'md:ml-[8.333333%]',
    2: 'md:ml-[16.666667%]',
    3: 'md:ml-[25%]',
    4: 'md:ml-[33.333333%]',
    5: 'md:ml-[41.666667%]',
    6: 'md:ml-[50%]',
    7: 'md:ml-[58.333333%]',
    8: 'md:ml-[66.666667%]',
    9: 'md:ml-[75%]',
    10: 'md:ml-[83.333333%]',
    11: 'md:ml-[91.666667%]',
  },
  lg: {
    0: 'lg:ml-0',
    1: 'lg:ml-[8.333333%]',
    2: 'lg:ml-[16.666667%]',
    3: 'lg:ml-[25%]',
    4: 'lg:ml-[33.333333%]',
    5: 'lg:ml-[41.666667%]',
    6: 'lg:ml-[50%]',
    7: 'lg:ml-[58.333333%]',
    8: 'lg:ml-[66.666667%]',
    9: 'lg:ml-[75%]',
    10: 'lg:ml-[83.333333%]',
    11: 'lg:ml-[91.666667%]',
  },
  xl: {
    0: 'xl:ml-0',
    1: 'xl:ml-[8.333333%]',
    2: 'xl:ml-[16.666667%]',
    3: 'xl:ml-[25%]',
    4: 'xl:ml-[33.333333%]',
    5: 'xl:ml-[41.666667%]',
    6: 'xl:ml-[50%]',
    7: 'xl:ml-[58.333333%]',
    8: 'xl:ml-[66.666667%]',
    9: 'xl:ml-[75%]',
    10: 'xl:ml-[83.333333%]',
    11: 'xl:ml-[91.666667%]',
  },
};

/**
 * Gets order class for a given value
 */
function getOrderClass(order: ColOrder, prefix = ''): string {
  const bp = prefix ? `${prefix}:` : '';
  if (order === 'first') return `${bp}order-first`;
  if (order === 'last') return `${bp}order-last`;
  if (order === 'none') return `${bp}order-none`;
  if (typeof order === 'number') return `${bp}order-${order}`;
  return '';
}

/**
 * Col Component
 *
 * Provides a flexible column for the 12-column grid system.
 * Supports responsive spanning, offset, and ordering.
 */
export const Col: React.FC<ColProps> = ({
  children,
  className = '',
  span,
  sm,
  md,
  lg,
  xl,
  auto = false,
  offset,
  offsetSm,
  offsetMd,
  offsetLg,
  offsetXl,
  order,
  orderSm,
  orderMd,
  orderLg,
  orderXl,
  as: Component = 'div',
  'data-testid': testId,
}) => {
  const classes: string[] = [];

  // Base flex behavior
  // Always add min-w-0 to allow content to shrink below its minimum size
  // This prevents overflow when flex items have content wider than their container
  classes.push('min-w-0');

  if (auto) {
    classes.push('flex-none', 'w-auto');
  } else if (span === undefined && sm === undefined && md === undefined && lg === undefined && xl === undefined) {
    // Default: grow to fill available space
    classes.push('flex-1');
  } else {
    // Add flex-shrink to allow columns to shrink when gap takes up space
    classes.push('flex-shrink');
    // Handle span classes
    if (span !== undefined && span !== 'auto') {
      classes.push(spanClasses[span]);
    } else if (span === 'auto') {
      classes.push('w-auto');
    }

    // Handle responsive spans
    if (sm !== undefined && sm !== 'auto') {
      classes.push(responsiveSpanClasses.sm[sm]);
    } else if (sm === 'auto') {
      classes.push('sm:w-auto');
    }

    if (md !== undefined && md !== 'auto') {
      classes.push(responsiveSpanClasses.md[md]);
    } else if (md === 'auto') {
      classes.push('md:w-auto');
    }

    if (lg !== undefined && lg !== 'auto') {
      classes.push(responsiveSpanClasses.lg[lg]);
    } else if (lg === 'auto') {
      classes.push('lg:w-auto');
    }

    if (xl !== undefined && xl !== 'auto') {
      classes.push(responsiveSpanClasses.xl[xl]);
    } else if (xl === 'auto') {
      classes.push('xl:w-auto');
    }
  }

  // Handle offset classes
  if (offset !== undefined) {
    classes.push(offsetClasses[offset]);
  }
  if (offsetSm !== undefined) {
    classes.push(responsiveOffsetClasses.sm[offsetSm]);
  }
  if (offsetMd !== undefined) {
    classes.push(responsiveOffsetClasses.md[offsetMd]);
  }
  if (offsetLg !== undefined) {
    classes.push(responsiveOffsetClasses.lg[offsetLg]);
  }
  if (offsetXl !== undefined) {
    classes.push(responsiveOffsetClasses.xl[offsetXl]);
  }

  // Handle order classes
  if (order !== undefined) {
    classes.push(getOrderClass(order));
  }
  if (orderSm !== undefined) {
    classes.push(getOrderClass(orderSm, 'sm'));
  }
  if (orderMd !== undefined) {
    classes.push(getOrderClass(orderMd, 'md'));
  }
  if (orderLg !== undefined) {
    classes.push(getOrderClass(orderLg, 'lg'));
  }
  if (orderXl !== undefined) {
    classes.push(getOrderClass(orderXl, 'xl'));
  }

  // Add custom className
  if (className) {
    classes.push(className);
  }

  return (
    <Component
      className={classes.join(' ')}
      data-testid={testId}
    >
      {children}
    </Component>
  );
};

export default Col;
