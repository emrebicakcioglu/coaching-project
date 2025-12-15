/**
 * Roles Page
 * STORY-016A: Context Menu Core Navigation
 * STORY-025B: Roles Management UI
 *
 * Roles and permissions management page with full CRUD functionality.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Container } from '../components/layout';
import { rolesService, Role } from '../services/rolesService';
import { useAuth } from '../contexts/AuthContext';
import { Toast, ToastType } from '../components/feedback/Toast';
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
   * Fetch roles from API
   */
  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await rolesService.listRoles();
      setRoles(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
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
    <Container className="py-6" data-testid="roles-management-page">
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={textPrimaryStyle}>
            {t('title')}
          </h1>
          <p className="mt-1 text-sm" style={textSecondaryStyle}>
            {t('subtitle')}
          </p>
        </div>
        {canCreateRole && (
          <button
            type="button"
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            onClick={handleCreateClick}
            data-testid="new-role-button"
          >
            {t('newRole')}
          </button>
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
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
                              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                            />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium" style={textPrimaryStyle}>
                            {role.name}
                          </div>
                          {role.is_system && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-600">
                              {t('badges.system')}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm" style={textSecondaryStyle}>
                        {role.description || '-'}
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
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {canUpdateRole && (
                        <button
                          type="button"
                          className="text-primary-600 hover:text-primary-900 mr-4"
                          onClick={() => handleEditClick(role)}
                          data-testid={`edit-role-button-${role.id}`}
                          aria-label={t('actions.editLabel', { name: role.name })}
                        >
                          {t('actions.edit')}
                        </button>
                      )}
                      {canDeleteRole && !role.is_system && (
                        <button
                          type="button"
                          className="text-red-600 hover:text-red-900"
                          onClick={() => handleDeleteClick(role)}
                          data-testid={`delete-role-button-${role.id}`}
                          aria-label={t('actions.deleteLabel', { name: role.name })}
                        >
                          {t('actions.delete')}
                        </button>
                      )}
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
