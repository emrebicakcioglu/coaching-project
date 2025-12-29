/**
 * Roles Page
 * STORY-016A: Context Menu Core Navigation
 * STORY-025B: Roles Management UI
 * STORY-105: Roles Page UI Audit
 * STORY-002-005: Roles Page i18n Support for Role Descriptions
 *
 * Roles and permissions management page with full CRUD functionality.
 *
 * UI Audit Fixes (STORY-105):
 * - Action buttons use consistent Button component (matching Users page)
 * - Header button uses Button component with primary variant
 * - Role icons are role-specific (shield for admin, user icons for others)
 * - System badge only shows for system roles (is_system=true)
 *
 * i18n Support (STORY-002-005):
 * - Role descriptions are translated based on role name
 * - Falls back to database description for custom roles without translations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Container } from '../components/layout';
import { rolesService, Role } from '../services/rolesService';
import { logger } from '../services/loggerService';
import { useAuth } from '../contexts/AuthContext';
import { Toast, ToastType } from '../components/feedback/Toast';
import { Button, Badge } from '../components/ui';
import {
  CreateRoleModal,
  EditRoleModal,
  RoleDeleteDialog,
} from '../components/roles';

/**
 * Toast state interface
 */
interface ToastState {
  message: string;
  type: ToastType;
}

/**
 * RolesPage Component
 *
 * List and manage roles and their permissions.
 */
export const RolesPage: React.FC = () => {
  const { t } = useTranslation('roles');

  /**
   * Get translated role description
   * STORY-002-005: Roles Page i18n Support for Role Descriptions
   *
   * Translates role descriptions based on the role name and current language.
   * Falls back to the original description from the database if no translation exists.
   *
   * @param role - The role object
   * @returns Translated description or original description
   */
  const getRoleDescription = (role: Role): string => {
    const roleName = role.name.toLowerCase();
    const translationKey = `descriptions.${roleName}`;
    const translated = t(translationKey, { defaultValue: '' });

    // If translation exists and is not empty, use it
    // Otherwise fall back to the database description
    if (translated && translated !== translationKey) {
      return translated;
    }

    return role.description || '-';
  };

  // Data state
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Toast state
  const [toast, setToast] = useState<ToastState | null>(null);

  // Permission checking
  const { hasPermission } = useAuth();
  const canCreateRole = hasPermission('roles.create');
  const canUpdateRole = hasPermission('roles.update');
  const canDeleteRole = hasPermission('roles.delete');

  // CSS variable styles for theming
  const cardStyle = { backgroundColor: 'var(--color-background-card, #ffffff)' };
  const textPrimaryStyle = { color: 'var(--color-text-primary, #111827)' };
  const textSecondaryStyle = { color: 'var(--color-text-secondary, #6b7280)' };
  const borderStyle = { borderColor: 'var(--color-border-default, #e5e7eb)' };

  /**
   * Get role-specific icon based on role name
   * STORY-105: Replace generic checkmark with meaningful role icons
   */
  const getRoleIcon = (roleName: string): React.ReactNode => {
    const name = roleName.toLowerCase();

    // Shield icon for admin roles
    if (name === 'admin' || name === 'administrator') {
      return (
        <svg
          className="w-4 h-4 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      );
    }

    // Star icon for manager roles
    if (name === 'manager') {
      return (
        <svg
          className="w-4 h-4 text-amber-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      );
    }

    // User icon for user/viewer/guest roles
    if (name === 'user' || name === 'viewer' || name === 'guest') {
      return (
        <svg
          className="w-4 h-4 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      );
    }

    // Default: key/lock icon for other roles (moderator, editor, etc.)
    return (
      <svg
        className="w-4 h-4 text-primary-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
        />
      </svg>
    );
  };

  /**
   * Get role icon background color based on role name
   * STORY-105: Consistent background colors for role icons
   */
  const getRoleIconBgClass = (roleName: string): string => {
    const name = roleName.toLowerCase();

    if (name === 'admin' || name === 'administrator') {
      return 'bg-red-100';
    }
    if (name === 'manager') {
      return 'bg-amber-100';
    }
    if (name === 'user' || name === 'viewer' || name === 'guest') {
      return 'bg-blue-100';
    }
    return 'bg-primary-100';
  };

  /**
   * Fetch roles from API
   */
  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await rolesService.listRoles();
      setRoles(data);
      setError(null);
    } catch (err) {
      logger.error('Failed to fetch roles', err);
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load roles on mount
  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  /**
   * Handle create role button click
   */
  const handleCreateClick = () => {
    setShowCreateModal(true);
  };

  /**
   * Handle edit role button click
   */
  const handleEditClick = (role: Role) => {
    setSelectedRole(role);
    setShowEditModal(true);
  };

  /**
   * Handle delete role button click
   */
  const handleDeleteClick = (role: Role) => {
    setSelectedRole(role);
    setShowDeleteDialog(true);
  };

  /**
   * Close all modals
   */
  const handleCloseModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteDialog(false);
    setSelectedRole(null);
  };

  /**
   * Handle successful role creation
   */
  const handleCreateSuccess = (newRole: Role) => {
    setRoles((prev) => [...prev, newRole]);
    setToast({
      message: t('toast.created', { name: newRole.name }),
      type: 'success',
    });
    handleCloseModals();
  };

  /**
   * Handle successful role update
   */
  const handleEditSuccess = (updatedRole: Role) => {
    setRoles((prev) =>
      prev.map((r) => (r.id === updatedRole.id ? updatedRole : r))
    );
    setToast({
      message: t('toast.updated', { name: updatedRole.name }),
      type: 'success',
    });
    handleCloseModals();
  };

  /**
   * Handle successful role deletion
   */
  const handleDeleteSuccess = () => {
    if (selectedRole) {
      setRoles((prev) => prev.filter((r) => r.id !== selectedRole.id));
      setToast({
        message: t('toast.deleted', { name: selectedRole.name }),
        type: 'success',
      });
    }
    handleCloseModals();
  };

  /**
   * Close toast notification
   */
  const handleCloseToast = () => {
    setToast(null);
  };

  return (
    <Container className="py-8" data-testid="roles-management-page">
      {/* Page Header */}
      <div className="page-header page-header--with-actions">
        <div>
          <h1 className="page-title">
            {t('title')}
          </h1>
          <p className="page-subtitle">
            {t('subtitle')}
          </p>
        </div>
        {canCreateRole && (
          <Button
            variant="primary"
            onClick={handleCreateClick}
            data-testid="new-role-button"
          >
            {t('newRole')}
          </Button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            className="mt-2 text-sm text-red-700 underline hover:no-underline"
            onClick={fetchRoles}
          >
            {t('retry')}
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="rounded-lg shadow-sm border p-8" style={{...cardStyle, ...borderStyle}}>
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            <span className="ml-3" style={textSecondaryStyle}>{t('loading')}</span>
          </div>
        </div>
      ) : (
        /* Roles Table */
        <div className="rounded-lg shadow-sm border overflow-hidden" style={{...cardStyle, ...borderStyle}}>
          <table className="min-w-full divide-y divide-neutral-200">
            <thead style={{backgroundColor: 'var(--color-background-page, #f9fafb)'}}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={textSecondaryStyle}>
                  {t('table.role')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={textSecondaryStyle}>
                  {t('table.description')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={textSecondaryStyle}>
                  {t('table.permissions')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={textSecondaryStyle}>
                  {t('table.users')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={textSecondaryStyle}>
                  {t('table.actions')}
                </th>
              </tr>
            </thead>
            <tbody style={cardStyle}>
              {roles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center" style={textSecondaryStyle}>
                    {t('empty')}
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr key={role.id} style={{...cardStyle}} className="" data-testid={`role-row-${role.id}`}>
                    {/* STORY-105: Role-specific icons and System badge only for system roles */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 w-8 h-8 ${getRoleIconBgClass(role.name)} rounded-lg flex items-center justify-center`}
                          data-testid={`role-icon-${role.id}`}
                        >
                          {getRoleIcon(role.name)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium" style={textPrimaryStyle}>
                            {role.name}
                          </div>
                          {role.is_system && (
                            <Badge
                              variant="neutral"
                              size="sm"
                              data-testid={`role-system-badge-${role.id}`}
                            >
                              {t('badges.system')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4" data-testid={`role-description-${role.id}`}>
                      <div className="text-sm" style={textSecondaryStyle}>
                        {getRoleDescription(role)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm" style={textSecondaryStyle}>
                        {t('table.permissionsCount', { count: role.permissions?.length || 0 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm" style={textSecondaryStyle}>
                        {t('table.usersCount', { count: role.userCount || 0 })}
                      </div>
                    </td>
                    {/* STORY-105: Standardized action buttons using Button component (matching Users page) */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {canUpdateRole && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(role)}
                            data-testid={`edit-role-button-${role.id}`}
                            title={t('actions.editLabel', { name: role.name })}
                            aria-label={t('actions.editLabel', { name: role.name })}
                          >
                            {t('actions.edit')}
                          </Button>
                        )}
                        {canDeleteRole && !role.is_system && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(role)}
                            data-testid={`delete-role-button-${role.id}`}
                            title={t('actions.deleteLabel', { name: role.name })}
                            aria-label={t('actions.deleteLabel', { name: role.name })}
                          >
                            {t('actions.delete')}
                          </Button>
                        )}
                        {role.is_system && (
                          <span
                            className="text-xs text-neutral-400 italic"
                            data-testid={`role-protected-indicator-${role.id}`}
                            title={t('actions.protectedRole')}
                          >
                            {t('actions.protected')}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Role Modal */}
      <CreateRoleModal
        isOpen={showCreateModal}
        onClose={handleCloseModals}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Role Modal */}
      <EditRoleModal
        isOpen={showEditModal}
        onClose={handleCloseModals}
        role={selectedRole}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Role Dialog */}
      <RoleDeleteDialog
        isOpen={showDeleteDialog}
        onClose={handleCloseModals}
        role={selectedRole}
        onSuccess={handleDeleteSuccess}
      />

      {/* Toast Notifications */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={handleCloseToast}
            data-testid="roles-toast"
          />
        </div>
      )}
    </Container>
  );
};

export default RolesPage;
