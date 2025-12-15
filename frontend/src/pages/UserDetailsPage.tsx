/**
 * User Details Page
 * STORY-007B: User Role Assignment
 * BUG-001: Fixed Invalid User ID issue by using React Router's useParams
 *
 * Page for viewing and editing user details including role assignment.
 * Displays user information and allows role management via UserRoleSelector.
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { UserRoleSelector } from '../components/users';
import { usersService } from '../services/usersService';
import type { UserWithPermissions, Role } from '../services/usersService';
import './UsersPage.css';

interface UserDetailsPageProps {
  /** User ID from URL params (optional - will use URL param if not provided) */
  userId?: number;
}

/**
 * UserDetailsPage Component
 *
 * Displays user details and allows role management.
 * Shows user permissions aggregated from all assigned roles.
 */
export const UserDetailsPage: React.FC<UserDetailsPageProps> = ({ userId: propUserId }) => {
  // BUG-001 FIX: Use React Router's useParams hook instead of manual URL parsing
  const { id } = useParams<{ id: string }>();

  // Determine userId: prop takes precedence, then URL param
  const userId = propUserId ?? (id ? parseInt(id, 10) : null);
  const [user, setUser] = useState<UserWithPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user details on mount
  useEffect(() => {
    if (!userId) {
      setError('Invalid user ID');
      setIsLoading(false);
      return;
    }

    const fetchUser = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const userData = await usersService.getUserWithPermissions(userId);
        setUser(userData);
      } catch (err) {
        console.error('Failed to load user:', err);
        setError('Failed to load user details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  /**
   * Handle roles update
   */
  const handleRolesUpdated = (newRoles: Role[]) => {
    if (user) {
      setUser({ ...user, roles: newRoles });
    }
  };

  /**
   * Navigate back to users list
   * BUG-001 FIX: Use correct route path /users instead of /admin/users
   */
  const navigateBack = () => {
    window.location.href = '/users';
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  /**
   * Get status badge class
   */
  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'active':
        return 'user-details__status--active';
      case 'inactive':
        return 'user-details__status--inactive';
      case 'suspended':
        return 'user-details__status--suspended';
      case 'deleted':
        return 'user-details__status--deleted';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="users-page">
        <div className="users-page__loading">Loading user details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="users-page">
        <div className="users-page__error" role="alert">
          {error}
        </div>
        <button type="button" className="users-page__back-btn" onClick={navigateBack}>
          Back to Users
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="users-page">
        <div className="users-page__error" role="alert">
          User not found
        </div>
        <button type="button" className="users-page__back-btn" onClick={navigateBack}>
          Back to Users
        </button>
      </div>
    );
  }

  return (
    <div className="users-page">
      <div className="users-page__header">
        <button type="button" className="users-page__back-btn" onClick={navigateBack}>
          &larr; Back to Users
        </button>
        <h1 className="users-page__title">User Details</h1>
      </div>

      <div className="user-details">
        {/* User Info Card */}
        <div className="user-details__card">
          <h2 className="user-details__card-title">User Information</h2>

          <div className="user-details__info">
            <div className="user-details__field">
              <label className="user-details__label">Name</label>
              <span className="user-details__value">{user.name}</span>
            </div>

            <div className="user-details__field">
              <label className="user-details__label">Email</label>
              <span className="user-details__value">{user.email}</span>
            </div>

            <div className="user-details__field">
              <label className="user-details__label">Status</label>
              <span className={`user-details__status ${getStatusClass(user.status)}`}>
                {user.status}
              </span>
            </div>

            <div className="user-details__field">
              <label className="user-details__label">MFA Enabled</label>
              <span className="user-details__value">
                {user.mfa_enabled ? 'Yes' : 'No'}
              </span>
            </div>

            <div className="user-details__field">
              <label className="user-details__label">Last Login</label>
              <span className="user-details__value">{formatDate(user.last_login)}</span>
            </div>

            <div className="user-details__field">
              <label className="user-details__label">Created</label>
              <span className="user-details__value">{formatDate(user.created_at)}</span>
            </div>

            <div className="user-details__field">
              <label className="user-details__label">Updated</label>
              <span className="user-details__value">{formatDate(user.updated_at)}</span>
            </div>
          </div>
        </div>

        {/* Role Management Card */}
        <div className="user-details__card">
          <h2 className="user-details__card-title">Role Management</h2>

          <UserRoleSelector
            userId={user.id}
            currentRoles={user.roles || []}
            onRolesUpdated={handleRolesUpdated}
          />
        </div>

        {/* Permissions Card */}
        <div className="user-details__card">
          <h2 className="user-details__card-title">Aggregated Permissions</h2>
          <p className="user-details__subtitle">
            Permissions granted through all assigned roles:
          </p>

          <div className="user-details__permissions">
            {user.permissions && user.permissions.length > 0 ? (
              <ul className="user-details__permission-list">
                {user.permissions.map((permission) => (
                  <li key={permission} className="user-details__permission-item">
                    <code>{permission}</code>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="user-details__no-permissions">
                No permissions assigned. Assign roles to grant permissions.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsPage;
