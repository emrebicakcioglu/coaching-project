/**
 * Users List Page
 * STORY-007B: User Role Assignment
 * STORY-006B: User CRUD Frontend UI
 * STORY-104: Users Page UI Audit
 *
 * Page for displaying a list of users with their roles.
 * Shows role badges for each user in the list.
 * Includes modals for creating, editing, and deleting users.
 *
 * UI Audit Fixes (STORY-104):
 * - Action buttons use consistent ghost/outline variants
 * - "Keine Rollen" styled as neutral badge
 * - Status badges use standardized Badge component
 * - Role badges use updated color scheme (Manager=orange)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Container } from '../components/layout';
import { RoleBadge, UserCreateModal, UserEditModal, UserDeleteDialog } from '../components/users';
import { Toast } from '../components/feedback';
import { Badge, Button, getStatusBadgeVariant } from '../components/ui';
import { usersService } from '../services/usersService';
import { logger } from '../services/loggerService';
import { useAuth } from '../contexts/AuthContext';
import type { User, PaginatedResponse } from '../services/usersService';
import type { ToastType } from '../components/feedback';
import './UsersPage.css';

/**
 * Toast state interface
 */
interface ToastState {
  message: string;
  type: ToastType;
}

/**
 * UsersListPage Component
 *
 * Displays a paginated list of users with role badges.
 * Provides CRUD operations via modals and toast notifications.
 */
export const UsersListPage: React.FC = () => {
  const { t } = useTranslation('users');

  // User data state
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Toast state
  const [toast, setToast] = useState<ToastState | null>(null);

  // Auth context for permission checks
  const { hasPermission } = useAuth();

  /**
   * Fetch users from API
   */
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response: PaginatedResponse<User> = await usersService.listUsers({
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery || undefined,
        status: statusFilter as User['status'] || undefined,
        role: roleFilter || undefined,
      });
      setUsers(response.data);
      setPagination(response.pagination);
    } catch (err) {
      logger.error('Failed to load users', err);
      setError(t('error'));
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, statusFilter, roleFilter]);

  // Fetch users on mount and when filters change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /**
   * Handle page change
   */
  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  /**
   * Handle search input
   */
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  /**
   * Handle status filter change
   */
  const handleStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  /**
   * Handle role filter change
   */
  const handleRoleFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  /**
   * Navigate to user details
   */
  const navigateToUser = (userId: number) => {
    window.location.href = `/users/${userId}`;
  };

  /**
   * Open create modal
   */
  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
  };

  /**
   * Handle user created successfully
   */
  const handleUserCreated = (user: User) => {
    setToast({
      message: t('toast.created', { name: user.name }),
      type: 'success',
    });
    fetchUsers();
  };

  /**
   * Open edit modal for a user
   */
  const handleOpenEditModal = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  /**
   * Handle user updated successfully
   */
  const handleUserUpdated = (user: User) => {
    setToast({
      message: t('toast.updated', { name: user.name }),
      type: 'success',
    });
    fetchUsers();
  };

  /**
   * Open delete dialog for a user
   */
  const handleOpenDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  /**
   * Handle user deleted successfully
   */
  const handleUserDeleted = () => {
    if (selectedUser) {
      setToast({
        message: t('toast.deleted', { name: selectedUser.name }),
        type: 'success',
      });
    }
    fetchUsers();
  };

  /**
   * Close all modals
   */
  const handleCloseModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteDialog(false);
    setSelectedUser(null);
  };

  /**
   * Get localized status text
   */
  const getStatusText = (status: string): string => {
    const statusKey = `status.${status}`;
    return t(statusKey, { defaultValue: status });
  };

  return (
    <Container className="py-8" data-testid="users-list-page">
      {/* Toast notifications */}
      {toast && (
        <div className="users-page__toast-container">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
            data-testid="users-toast"
          />
        </div>
      )}

      {/* Page header */}
      <div className="page-header page-header--with-actions">
        <div>
          <h1 className="page-title">{t('title')}</h1>
        </div>
        {hasPermission('users.create') && (
          <Button
            variant="primary"
            onClick={handleOpenCreateModal}
            data-testid="create-user-button"
          >
            {t('newUser')}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="users-list__filters">
        <div className="users-list__filter-group">
          <input
            type="search"
            className="users-list__search"
            placeholder={t('search.placeholder')}
            value={searchQuery}
            onChange={handleSearch}
            aria-label={t('search.label')}
            data-testid="users-search-input"
          />
        </div>
        <div className="users-list__filter-group">
          <select
            className="users-list__filter-select"
            value={statusFilter}
            onChange={handleStatusFilter}
            aria-label={t('filter.statusLabel')}
            data-testid="users-status-filter"
          >
            <option value="">{t('filter.allStatus')}</option>
            <option value="active">{t('status.active')}</option>
            <option value="inactive">{t('status.inactive')}</option>
            <option value="suspended">{t('status.suspended')}</option>
          </select>
        </div>
        <div className="users-list__filter-group">
          <select
            className="users-list__filter-select"
            value={roleFilter}
            onChange={handleRoleFilter}
            aria-label={t('filter.roleLabel')}
            data-testid="users-role-filter"
          >
            <option value="">{t('filter.allRoles')}</option>
            <option value="admin">{t('roles.admin')}</option>
            <option value="user">{t('roles.user')}</option>
            <option value="editor">{t('roles.editor')}</option>
            <option value="viewer">{t('roles.viewer')}</option>
          </select>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="users-page__error" role="alert" data-testid="users-error">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="users-page__loading" data-testid="users-loading">
          {t('loading')}
        </div>
      ) : (
        <>
          {/* Users table */}
          <div className="users-list__table-container">
            <table className="users-list__table" data-testid="users-table">
              <thead>
                <tr>
                  <th>{t('table.name')}</th>
                  <th>{t('table.email')}</th>
                  <th>{t('table.status')}</th>
                  <th>{t('table.roles')}</th>
                  <th>{t('table.lastLogin')}</th>
                  <th>{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id} className="users-list__row" data-testid={`user-row-${user.id}`}>
                      <td className="users-list__cell users-list__cell--name">
                        {user.name}
                      </td>
                      <td className="users-list__cell users-list__cell--email">
                        {user.email}
                      </td>
                      <td className="users-list__cell users-list__cell--status">
                        <Badge
                          variant={getStatusBadgeVariant(user.status)}
                          size="sm"
                          data-testid={`user-status-${user.id}`}
                        >
                          {getStatusText(user.status)}
                        </Badge>
                      </td>
                      <td className="users-list__cell users-list__cell--roles">
                        <div className="users-list__roles">
                          {user.roles && user.roles.length > 0 ? (
                            user.roles.map((role) => (
                              <RoleBadge key={role.id} name={role.name} small />
                            ))
                          ) : (
                            <Badge
                              variant="neutral"
                              size="sm"
                              data-testid={`user-no-roles-${user.id}`}
                            >
                              {t('table.noRoles')}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="users-list__cell users-list__cell--login">
                        {user.last_login
                          ? new Date(user.last_login).toLocaleDateString()
                          : t('table.never')}
                      </td>
                      <td className="users-list__cell users-list__cell--actions">
                        <div className="users-list__actions">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigateToUser(user.id)}
                            title={t('actions.detailsTitle')}
                            data-testid={`view-user-${user.id}`}
                          >
                            {t('actions.details')}
                          </Button>
                          {hasPermission('users.update') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditModal(user)}
                              title={t('actions.editTitle')}
                              data-testid={`edit-user-${user.id}`}
                            >
                              {t('actions.edit')}
                            </Button>
                          )}
                          {hasPermission('users.delete') && user.status !== 'deleted' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleOpenDeleteDialog(user)}
                              title={t('actions.deleteTitle')}
                              data-testid={`delete-user-${user.id}`}
                            >
                              {t('actions.delete')}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="users-list__empty" data-testid="users-empty">
                      {t('empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="users-list__pagination" data-testid="users-pagination">
              <button
                type="button"
                className="users-list__page-btn"
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
                data-testid="pagination-prev"
              >
                {t('pagination.previous')}
              </button>
              <span className="users-list__page-info">
                {t('pagination.pageInfo', { page: pagination.page, pages: pagination.pages, total: pagination.total })}
              </span>
              <button
                type="button"
                className="users-list__page-btn"
                disabled={pagination.page >= pagination.pages}
                onClick={() => handlePageChange(pagination.page + 1)}
                data-testid="pagination-next"
              >
                {t('pagination.next')}
              </button>
            </div>
          )}
        </>
      )}

      {/* Create User Modal */}
      <UserCreateModal
        isOpen={showCreateModal}
        onClose={handleCloseModals}
        onSuccess={handleUserCreated}
      />

      {/* Edit User Modal */}
      <UserEditModal
        isOpen={showEditModal}
        onClose={handleCloseModals}
        user={selectedUser}
        onSuccess={handleUserUpdated}
      />

      {/* Delete User Dialog */}
      <UserDeleteDialog
        isOpen={showDeleteDialog}
        onClose={handleCloseModals}
        user={selectedUser}
        onSuccess={handleUserDeleted}
      />
    </Container>
  );
};

export default UsersListPage;
