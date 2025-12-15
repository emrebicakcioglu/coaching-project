/**
 * Pagination DTO Unit Tests
 * STORY-021B: Resource Endpoints
 *
 * Tests for pagination, filtering, and sorting utilities.
 */

import 'reflect-metadata';
import {
  parseSort,
  SortOrder,
  createPaginatedResponse,
  PaginatedResponse,
} from '../../src/common/dto/pagination.dto';

describe('Pagination DTO', () => {
  describe('parseSort', () => {
    const allowedFields = ['created_at', 'email', 'name', 'status'];

    it('should parse valid sort string', () => {
      const result = parseSort('email:asc', allowedFields, 'created_at');

      expect(result.field).toBe('email');
      expect(result.order).toBe(SortOrder.ASC);
    });

    it('should use valid field and default to DESC order when direction is not specified', () => {
      const result = parseSort('email', allowedFields, 'created_at');

      // Field is valid (email is in allowedFields), so it's used
      // Direction defaults to DESC since no direction is specified
      expect(result.field).toBe('email');
      expect(result.order).toBe(SortOrder.DESC);
    });

    it('should use default field when field is not allowed', () => {
      const result = parseSort('invalid_field:asc', allowedFields, 'created_at');

      expect(result.field).toBe('created_at');
      expect(result.order).toBe(SortOrder.ASC);
    });

    it('should use default values when sort is undefined', () => {
      const result = parseSort(undefined, allowedFields, 'created_at');

      expect(result.field).toBe('created_at');
      expect(result.order).toBe(SortOrder.DESC);
    });

    it('should use default values when sort is empty string', () => {
      const result = parseSort('', allowedFields, 'created_at');

      expect(result.field).toBe('created_at');
      expect(result.order).toBe(SortOrder.DESC);
    });

    it('should handle case-insensitive order direction', () => {
      const ascResult = parseSort('email:ASC', allowedFields, 'created_at');
      expect(ascResult.order).toBe(SortOrder.ASC);

      const descResult = parseSort('email:DESC', allowedFields, 'created_at');
      expect(descResult.order).toBe(SortOrder.DESC);

      const mixedResult = parseSort('email:Asc', allowedFields, 'created_at');
      expect(mixedResult.order).toBe(SortOrder.ASC);
    });

    it('should default to DESC for invalid direction', () => {
      const result = parseSort('email:invalid', allowedFields, 'created_at');

      expect(result.field).toBe('email');
      expect(result.order).toBe(SortOrder.DESC);
    });
  });

  describe('createPaginatedResponse', () => {
    it('should create paginated response with correct metadata', () => {
      const data = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];

      const result = createPaginatedResponse(data, 50, 1, 20);

      expect(result.data).toEqual(data);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBe(50);
      expect(result.pagination.pages).toBe(3);
    });

    it('should calculate pages correctly for exact fit', () => {
      const data = [{ id: 1 }];
      const result = createPaginatedResponse(data, 20, 1, 20);

      expect(result.pagination.pages).toBe(1);
    });

    it('should calculate pages correctly for partial last page', () => {
      const data = [{ id: 1 }];
      const result = createPaginatedResponse(data, 21, 1, 20);

      expect(result.pagination.pages).toBe(2);
    });

    it('should handle empty data', () => {
      const result = createPaginatedResponse([], 0, 1, 20);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.pages).toBe(0);
    });

    it('should preserve data types', () => {
      interface TestItem {
        id: number;
        name: string;
        active: boolean;
      }

      const data: TestItem[] = [
        { id: 1, name: 'Test', active: true },
      ];

      const result: PaginatedResponse<TestItem> = createPaginatedResponse(
        data,
        1,
        1,
        20,
      );

      expect(result.data[0].active).toBe(true);
    });
  });
});
