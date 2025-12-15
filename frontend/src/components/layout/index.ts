/**
 * Layout Components Index
 * STORY-017A: Layout & Grid-System
 * STORY-016A: Context Menu Core Navigation
 *
 * Exports all layout components for the responsive grid system.
 *
 * @example
 * ```tsx
 * import { Container, Row, Col, Grid, GridItem, AppLayout } from '@/components/layout';
 *
 * function PageLayout() {
 *   return (
 *     <Container>
 *       <Row gap="lg">
 *         <Col span={12} md={8}>Main Content</Col>
 *         <Col span={12} md={4}>Sidebar</Col>
 *       </Row>
 *     </Container>
 *   );
 * }
 * ```
 */

// Container Component
export { Container } from './Container';
export type { ContainerProps, ContainerMaxWidth } from './Container';

// Row Component
export { Row } from './Row';
export type {
  RowProps,
  RowGap,
  RowAlign,
  RowJustify,
  RowDirection,
} from './Row';

// Col Component
export { Col } from './Col';
export type {
  ColProps,
  ColSpan,
  ColOffset,
  ColOrder,
} from './Col';

// Grid Component
export { Grid, GridItem } from './Grid';
export type {
  GridProps,
  GridItemProps,
  GridCols,
  GridRows,
  GridGap,
  GridFlow,
} from './Grid';

// AppLayout Component (STORY-016A)
export { AppLayout } from './AppLayout';
export type { AppLayoutProps } from './AppLayout';
