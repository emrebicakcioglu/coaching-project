/**
 * ResponsiveTable Component
 * STORY-017B: Component Responsiveness
 *
 * A responsive table that displays as a full table on desktop
 * and as stacked cards on mobile devices.
 *
 * @example
 * ```tsx
 * <ResponsiveTable
 *   columns={[
 *     { key: 'name', header: 'Name' },
 *     { key: 'email', header: 'Email' },
 *     { key: 'role', header: 'Role' },
 *   ]}
 *   data={users}
 *   renderCard={(item) => <UserCard user={item} />}
 * />
 * ```
 */

import React from 'react';
import { useResponsive } from '../../hooks';

/**
 * Column definition for table
 */
export interface TableColumn<T> {
  /** Unique key for the column */
  key: keyof T | string;
  /** Header text to display */
  header: string;
  /** Optional render function for cell content */
  render?: (item: T, rowIndex: number) => React.ReactNode;
  /** Optional CSS class for column */
  className?: string;
  /** Optional header CSS class */
  headerClassName?: string;
  /** Whether the column is sortable */
  sortable?: boolean;
  /** Width of column (CSS value) */
  width?: string;
}

/**
 * Props for ResponsiveTable component
 */
export interface ResponsiveTableProps<T extends object> {
  /** Column definitions */
  columns: TableColumn<T>[];
  /** Data to display */
  data: T[];
  /** Key extractor for unique row keys */
  keyExtractor: (item: T, index: number) => string | number;
  /** Optional custom card renderer for mobile view */
  renderCard?: (item: T, index: number) => React.ReactNode;
  /** Optional empty state content */
  emptyState?: React.ReactNode;
  /** Optional loading state */
  isLoading?: boolean;
  /** Optional loading content */
  loadingContent?: React.ReactNode;
  /** Optional row click handler */
  onRowClick?: (item: T, index: number) => void;
  /** Additional CSS classes for table */
  className?: string;
  /** Additional CSS classes for card container */
  cardContainerClassName?: string;
  /** Test ID for E2E testing */
  'data-testid'?: string;
  /** Caption for accessibility */
  caption?: string;
}

/**
 * Default card renderer for mobile view
 */
function DefaultCardRenderer<T extends object>({
  item,
  columns,
  index,
  onClick,
  testId,
}: {
  item: T;
  columns: TableColumn<T>[];
  index: number;
  onClick?: (item: T, index: number) => void;
  testId: string;
}): React.ReactElement {
  const handleClick = () => {
    if (onClick) {
      onClick(item, index);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(item, index);
    }
  };

  return (
    <div
      className={`
        bg-white
        border border-neutral-200
        rounded-lg
        p-4
        shadow-sm
        ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
      `}
      data-testid={`${testId}-card-${index}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
    >
      {columns.map((column) => {
        const value = column.key in item ? item[column.key as keyof T] : null;
        const content = column.render
          ? column.render(item, index)
          : (value as React.ReactNode);

        return (
          <div
            key={String(column.key)}
            className="flex justify-between items-center py-2 border-b border-neutral-100 last:border-b-0"
          >
            <span className="text-sm font-medium text-neutral-600">
              {column.header}
            </span>
            <span className="text-sm text-neutral-900">{content}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * ResponsiveTable Component
 *
 * Desktop: Full table layout with columns and rows
 * Mobile: Stacked cards with label-value pairs
 */
export function ResponsiveTable<T extends object>({
  columns,
  data,
  keyExtractor,
  renderCard,
  emptyState,
  isLoading = false,
  loadingContent,
  onRowClick,
  className = '',
  cardContainerClassName = '',
  'data-testid': testId = 'responsive-table',
  caption,
}: ResponsiveTableProps<T>): React.ReactElement {
  const { isMobile } = useResponsive();

  // Loading state
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-12"
        data-testid={`${testId}-loading`}
      >
        {loadingContent || (
          <div className="animate-pulse text-neutral-500">Loading...</div>
        )}
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-12"
        data-testid={`${testId}-empty`}
      >
        {emptyState || (
          <p className="text-neutral-500">No data available</p>
        )}
      </div>
    );
  }

  // Mobile: Card view
  if (isMobile) {
    return (
      <div
        className={`space-y-4 ${cardContainerClassName}`}
        data-testid={testId}
        data-variant="cards"
        role="list"
        aria-label={caption}
      >
        {data.map((item, index) => {
          const key = keyExtractor(item, index);
          return (
            <div key={key} role="listitem">
              {renderCard ? (
                renderCard(item, index)
              ) : (
                <DefaultCardRenderer
                  item={item}
                  columns={columns}
                  index={index}
                  onClick={onRowClick}
                  testId={testId}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Desktop: Table view
  return (
    <div className="overflow-x-auto" data-testid={testId} data-variant="table">
      <table
        className={`
          w-full
          border-collapse
          bg-white
          ${className}
        `}
      >
        {caption && (
          <caption className="sr-only">{caption}</caption>
        )}
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200">
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={`
                  px-4 py-3
                  text-left
                  text-sm font-semibold text-neutral-700
                  ${column.headerClassName || ''}
                `}
                style={column.width ? { width: column.width } : undefined}
                scope="col"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, rowIndex) => {
            const key = keyExtractor(item, rowIndex);
            const handleRowClick = onRowClick
              ? () => onRowClick(item, rowIndex)
              : undefined;

            const handleKeyDown = (e: React.KeyboardEvent) => {
              if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onRowClick(item, rowIndex);
              }
            };

            return (
              <tr
                key={key}
                className={`
                  border-b border-neutral-200
                  hover:bg-neutral-50
                  ${onRowClick ? 'cursor-pointer' : ''}
                `}
                data-testid={`${testId}-row-${rowIndex}`}
                onClick={handleRowClick}
                onKeyDown={handleKeyDown}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
              >
                {columns.map((column) => {
                  const value =
                    column.key in item ? item[column.key as keyof T] : null;
                  const content = column.render
                    ? column.render(item, rowIndex)
                    : (value as React.ReactNode);

                  return (
                    <td
                      key={String(column.key)}
                      className={`
                        px-4 py-3
                        text-sm text-neutral-900
                        ${column.className || ''}
                      `}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ResponsiveTable;
