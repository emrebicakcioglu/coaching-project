/**
 * PermissionCheckboxGroup Component
 * STORY-025B: Roles Management UI
 *
 * Displays permissions grouped by category with checkboxes for selection.
 * Supports select all/deselect all per category.
 *
 * @example
 * ```tsx
 * <PermissionCheckboxGroup
 *   permissions={allPermissions}
 *   selectedIds={selectedPermissionIds}
 *   onChange={(ids) => setSelectedPermissionIds(ids)}
 *   disabled={isLoading}
 * />
 * ```
 */

import React, { useMemo, useCallback } from 'react';
import { Permission } from '../../services/rolesService';
import './PermissionCheckboxGroup.css';

/**
 * Props for PermissionCheckboxGroup component
 */
export interface PermissionCheckboxGroupProps {
  /** All available permissions */
  permissions: Permission[];
  /** Currently selected permission IDs */
  selectedIds: number[];
  /** Callback when selection changes */
  onChange: (selectedIds: number[]) => void;
  /** Whether the checkboxes are disabled */
  disabled?: boolean;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/**
 * Group permissions by their category
 */
function groupByCategory(permissions: Permission[]): Record<string, Permission[]> {
  return permissions.reduce((acc, permission) => {
    const category = permission.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);
}

/**
 * Format category name for display
 */
function formatCategoryName(category: string): string {
  // Capitalize first letter and replace underscores with spaces
  return category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * PermissionCheckboxGroup Component
 */
export const PermissionCheckboxGroup: React.FC<PermissionCheckboxGroupProps> = ({
  permissions,
  selectedIds,
  onChange,
  disabled = false,
  'data-testid': testId = 'permission-checkbox-group',
}) => {
  // Group permissions by category
  const groupedPermissions = useMemo(() => groupByCategory(permissions), [permissions]);

  // Get sorted category names
  const categories = useMemo(() => Object.keys(groupedPermissions).sort(), [groupedPermissions]);

  /**
   * Toggle a single permission
   */
  const handleTogglePermission = useCallback(
    (permissionId: number) => {
      if (disabled) return;

      const newSelectedIds = selectedIds.includes(permissionId)
        ? selectedIds.filter((id) => id !== permissionId)
        : [...selectedIds, permissionId];

      onChange(newSelectedIds);
    },
    [selectedIds, onChange, disabled]
  );

  /**
   * Toggle all permissions in a category
   */
  const handleToggleCategory = useCallback(
    (category: string) => {
      if (disabled) return;

      const categoryPermissionIds = groupedPermissions[category].map((p) => p.id);
      const allSelected = categoryPermissionIds.every((id) => selectedIds.includes(id));

      let newSelectedIds: number[];
      if (allSelected) {
        // Deselect all in category
        newSelectedIds = selectedIds.filter((id) => !categoryPermissionIds.includes(id));
      } else {
        // Select all in category
        newSelectedIds = [...new Set([...selectedIds, ...categoryPermissionIds])];
      }

      onChange(newSelectedIds);
    },
    [groupedPermissions, selectedIds, onChange, disabled]
  );

  /**
   * Check if all permissions in a category are selected
   */
  const isCategoryFullySelected = useCallback(
    (category: string): boolean => {
      const categoryPermissionIds = groupedPermissions[category].map((p) => p.id);
      return categoryPermissionIds.every((id) => selectedIds.includes(id));
    },
    [groupedPermissions, selectedIds]
  );

  /**
   * Check if some permissions in a category are selected
   */
  const isCategoryPartiallySelected = useCallback(
    (category: string): boolean => {
      const categoryPermissionIds = groupedPermissions[category].map((p) => p.id);
      const selectedInCategory = categoryPermissionIds.filter((id) => selectedIds.includes(id));
      return selectedInCategory.length > 0 && selectedInCategory.length < categoryPermissionIds.length;
    },
    [groupedPermissions, selectedIds]
  );

  if (permissions.length === 0) {
    return (
      <div className="permission-checkbox-group__empty" data-testid={testId}>
        <p>Keine Berechtigungen verfügbar.</p>
      </div>
    );
  }

  return (
    <div className="permission-checkbox-group" data-testid={testId}>
      {categories.map((category) => {
        const categoryPermissions = groupedPermissions[category];
        const isFullySelected = isCategoryFullySelected(category);
        const isPartiallySelected = isCategoryPartiallySelected(category);

        return (
          <div
            key={category}
            className="permission-checkbox-group__category"
            data-testid={`${testId}-category-${category}`}
          >
            {/* Category header with select all */}
            <div className="permission-checkbox-group__category-header">
              <label className="permission-checkbox-group__category-label">
                <input
                  type="checkbox"
                  className="permission-checkbox-group__category-checkbox"
                  checked={isFullySelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = isPartiallySelected;
                    }
                  }}
                  onChange={() => handleToggleCategory(category)}
                  disabled={disabled}
                  aria-label={`Alle ${formatCategoryName(category)} Berechtigungen auswählen`}
                />
                <span className="permission-checkbox-group__category-name">
                  {formatCategoryName(category)}
                </span>
                <span className="permission-checkbox-group__category-count">
                  ({categoryPermissions.filter((p) => selectedIds.includes(p.id)).length}/
                  {categoryPermissions.length})
                </span>
              </label>
            </div>

            {/* Individual permissions */}
            <div className="permission-checkbox-group__permissions">
              {categoryPermissions.map((permission) => (
                <label
                  key={permission.id}
                  className="permission-checkbox-group__permission"
                  data-testid={`${testId}-permission-${permission.id}`}
                >
                  <input
                    type="checkbox"
                    className="permission-checkbox-group__checkbox"
                    checked={selectedIds.includes(permission.id)}
                    onChange={() => handleTogglePermission(permission.id)}
                    disabled={disabled}
                    aria-describedby={
                      permission.description
                        ? `permission-desc-${permission.id}`
                        : undefined
                    }
                  />
                  <div className="permission-checkbox-group__permission-info">
                    <span className="permission-checkbox-group__permission-name">
                      {permission.name}
                    </span>
                    {permission.description && (
                      <span
                        id={`permission-desc-${permission.id}`}
                        className="permission-checkbox-group__permission-description"
                      >
                        {permission.description}
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PermissionCheckboxGroup;
