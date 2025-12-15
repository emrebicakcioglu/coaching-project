/**
 * ResponsiveTable Component Tests
 * STORY-017B: Component Responsiveness
 *
 * Unit tests for responsive table component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ResponsiveTable, TableColumn } from './ResponsiveTable';

// Mock useResponsive hook
const mockUseResponsive = vi.fn();

vi.mock('../../hooks', () => ({
  useResponsive: () => mockUseResponsive(),
}));

interface TestUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

const testData: TestUser[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Editor' },
];

const testColumns: TableColumn<TestUser>[] = [
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role' },
];

describe('ResponsiveTable', () => {
  beforeEach(() => {
    // Default to desktop view
    mockUseResponsive.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      breakpoint: 'lg',
      width: 1024,
      height: 768,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Desktop View (Table)', () => {
    it('renders as table on desktop', () => {
      render(
        <ResponsiveTable<TestUser>
          columns={testColumns}
          data={testData}
          keyExtractor={(item) => item.id}
        />
      );

      const table = screen.getByTestId('responsive-table');
      expect(table).toHaveAttribute('data-variant', 'table');
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('renders all column headers', () => {
      render(
        <ResponsiveTable<TestUser>
          columns={testColumns}
          data={testData}
          keyExtractor={(item) => item.id}
        />
      );

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Role')).toBeInTheDocument();
    });

    it('renders all data rows', () => {
      render(
        <ResponsiveTable<TestUser>
          columns={testColumns}
          data={testData}
          keyExtractor={(item) => item.id}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    it('renders row with correct test id', () => {
      render(
        <ResponsiveTable<TestUser>
          columns={testColumns}
          data={testData}
          keyExtractor={(item) => item.id}
        />
      );

      expect(screen.getByTestId('responsive-table-row-0')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-table-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-table-row-2')).toBeInTheDocument();
    });

    it('renders caption for accessibility when provided', () => {
      render(
        <ResponsiveTable<TestUser>
          columns={testColumns}
          data={testData}
          keyExtractor={(item) => item.id}
          caption="User list table"
        />
      );

      const table = screen.getByRole('table');
      expect(table.querySelector('caption')).toHaveTextContent('User list table');
    });

    it('handles row click', () => {
      const onRowClick = vi.fn();
      render(
        <ResponsiveTable<TestUser>
          columns={testColumns}
          data={testData}
          keyExtractor={(item) => item.id}
          onRowClick={onRowClick}
        />
      );

      fireEvent.click(screen.getByTestId('responsive-table-row-0'));

      expect(onRowClick).toHaveBeenCalledWith(testData[0], 0);
    });

    it('handles row keyboard navigation', () => {
      const onRowClick = vi.fn();
      render(
        <ResponsiveTable<TestUser>
          columns={testColumns}
          data={testData}
          keyExtractor={(item) => item.id}
          onRowClick={onRowClick}
        />
      );

      const row = screen.getByTestId('responsive-table-row-0');
      fireEvent.keyDown(row, { key: 'Enter' });

      expect(onRowClick).toHaveBeenCalledWith(testData[0], 0);
    });

    it('applies custom render function to columns', () => {
      const columnsWithRender: TableColumn<TestUser>[] = [
        ...testColumns.slice(0, 2),
        {
          key: 'role',
          header: 'Role',
          render: (item) => <span data-testid="custom-render">{item.role.toUpperCase()}</span>,
        },
      ];

      render(
        <ResponsiveTable<TestUser>
          columns={columnsWithRender}
          data={testData}
          keyExtractor={(item) => item.id}
        />
      );

      const customRenders = screen.getAllByTestId('custom-render');
      expect(customRenders).toHaveLength(3);
      expect(customRenders[0]).toHaveTextContent('ADMIN');
    });
  });

  describe('Mobile View (Cards)', () => {
    beforeEach(() => {
      mockUseResponsive.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        breakpoint: 'xs',
        width: 375,
        height: 667,
      });
    });

    it('renders as cards on mobile', () => {
      render(
        <ResponsiveTable<TestUser>
          columns={testColumns}
          data={testData}
          keyExtractor={(item) => item.id}
        />
      );

      const container = screen.getByTestId('responsive-table');
      expect(container).toHaveAttribute('data-variant', 'cards');
      expect(container).toHaveAttribute('role', 'list');
    });

    it('renders all data as cards', () => {
      render(
        <ResponsiveTable<TestUser>
          columns={testColumns}
          data={testData}
          keyExtractor={(item) => item.id}
        />
      );

      expect(screen.getByTestId('responsive-table-card-0')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-table-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-table-card-2')).toBeInTheDocument();
    });

    it('displays column headers as labels in cards', () => {
      render(
        <ResponsiveTable<TestUser>
          columns={testColumns}
          data={testData}
          keyExtractor={(item) => item.id}
        />
      );

      // Each card should have all column headers as labels
      const nameLabels = screen.getAllByText('Name');
      const emailLabels = screen.getAllByText('Email');
      const roleLabels = screen.getAllByText('Role');

      expect(nameLabels).toHaveLength(3);
      expect(emailLabels).toHaveLength(3);
      expect(roleLabels).toHaveLength(3);
    });

    it('handles card click', () => {
      const onRowClick = vi.fn();
      render(
        <ResponsiveTable<TestUser>
          columns={testColumns}
          data={testData}
          keyExtractor={(item) => item.id}
          onRowClick={onRowClick}
        />
      );

      fireEvent.click(screen.getByTestId('responsive-table-card-0'));

      expect(onRowClick).toHaveBeenCalledWith(testData[0], 0);
    });

    it('renders custom card when renderCard is provided', () => {
      const customRenderCard = (item: TestUser) => (
        <div data-testid={`custom-card-${item.id}`}>Custom: {item.name}</div>
      );

      render(
        <ResponsiveTable<TestUser>
          columns={testColumns}
          data={testData}
          keyExtractor={(item) => item.id}
          renderCard={customRenderCard}
        />
      );

      expect(screen.getByTestId('custom-card-1')).toBeInTheDocument();
      expect(screen.getByText('Custom: John Doe')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('renders default empty state when data is empty', () => {
      render(
        <ResponsiveTable<TestUser>
          columns={testColumns}
          data={[]}
          keyExtractor={(item) => item.id}
        />
      );

      expect(screen.getByTestId('responsive-table-empty')).toBeInTheDocument();
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('renders custom empty state', () => {
      render(
        <ResponsiveTable<TestUser>
          columns={testColumns}
          data={[]}
          keyExtractor={(item) => item.id}
          emptyState={<div data-testid="custom-empty">No users found</div>}
        />
      );

      expect(screen.getByTestId('custom-empty')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('renders default loading state', () => {
      render(
        <ResponsiveTable<TestUser>
          columns={testColumns}
          data={testData}
          keyExtractor={(item) => item.id}
          isLoading
        />
      );

      expect(screen.getByTestId('responsive-table-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders custom loading content', () => {
      render(
        <ResponsiveTable<TestUser>
          columns={testColumns}
          data={testData}
          keyExtractor={(item) => item.id}
          isLoading
          loadingContent={<div data-testid="custom-loading">Fetching data...</div>}
        />
      );

      expect(screen.getByTestId('custom-loading')).toBeInTheDocument();
    });
  });

  describe('Custom Test ID', () => {
    it('uses custom data-testid', () => {
      render(
        <ResponsiveTable<TestUser>
          columns={testColumns}
          data={testData}
          keyExtractor={(item) => item.id}
          data-testid="users-table"
        />
      );

      expect(screen.getByTestId('users-table')).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('applies custom className to table', () => {
      render(
        <ResponsiveTable<TestUser>
          columns={testColumns}
          data={testData}
          keyExtractor={(item) => item.id}
          className="custom-table-class"
        />
      );

      const table = screen.getByRole('table');
      expect(table).toHaveClass('custom-table-class');
    });

    it('applies custom className to card container on mobile', () => {
      mockUseResponsive.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        breakpoint: 'xs',
        width: 375,
        height: 667,
      });

      render(
        <ResponsiveTable<TestUser>
          columns={testColumns}
          data={testData}
          keyExtractor={(item) => item.id}
          cardContainerClassName="custom-cards-class"
        />
      );

      const container = screen.getByTestId('responsive-table');
      expect(container).toHaveClass('custom-cards-class');
    });
  });
});
