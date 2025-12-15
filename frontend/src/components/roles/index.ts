/**
 * Roles Components Index
 * STORY-025B: Roles Management UI
 *
 * Exports all role management components.
 *
 * @example
 * ```tsx
 * import {
 *   CreateRoleModal,
 *   EditRoleModal,
 *   RoleDeleteDialog,
 *   PermissionCheckboxGroup,
 * } from '@/components/roles';
 * ```
 */

// Create Role Modal
export { CreateRoleModal } from './CreateRoleModal';
export type { CreateRoleModalProps } from './CreateRoleModal';

// Edit Role Modal
export { EditRoleModal } from './EditRoleModal';
export type { EditRoleModalProps } from './EditRoleModal';

// Delete Role Dialog
export { RoleDeleteDialog } from './RoleDeleteDialog';
export type { RoleDeleteDialogProps } from './RoleDeleteDialog';

// Permission Checkbox Group
export { PermissionCheckboxGroup } from './PermissionCheckboxGroup';
export type { PermissionCheckboxGroupProps } from './PermissionCheckboxGroup';
