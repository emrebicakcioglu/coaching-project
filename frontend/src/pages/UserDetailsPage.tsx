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
import { useTranslation } from 'react-i18next';
import { Container } from '../components/layout';
import { Button } from '../components/ui';
import { UserRoleSelector } from '../components/users';
import { usersService } from '../services/usersService';
import { logger } from '../services/loggerService';
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
  const { t } = useTranslation('users');
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
      setError(t('details.invalidUserId'));
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
        logger.error('Failed to load user', err);
        setError(t('details.loadError'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [userId, t]);

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
    if (!dateString) return t('details.values.never');
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
      <Container className="py-8">
        <div className="users-page__loading">{t('details.loading')}</div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-8">
        <div className="users-page__error" role="alert">
          {error}
        </div>
        <Button variant="outline" onClick={navigateBack} className="mt-4">
          {t('details.backToUsers')}
        </Button>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container className="py-8">
        <div className="users-page__error" role="alert">
          {t('details.userNotFound')}
        </div>
        <Button variant="outline" onClick={navigateBack} className="mt-4">
          {t('details.backToUsers')}
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <div className="mb-6">
        <Button variant="outline" onClick={navigateBack} size="sm">
          &larr; {t('details.backToUsers')}
        </Button>
      </div>
      <div className="page-header">
        <h1 className="page-title">{t('details.title')}</h1>
      </div>

      <div className="user-details">
        {/* User Info Card */}
        <div className="user-details__card">
          <h2 className="user-details__card-title">{t('details.cards.userInfo')}</h2>

          <div className="user-details__info">
            <div className="user-details__field">
              <label className="user-details__label">{t('details.fields.name')}</label>
              <span className="user-details__value">{user.name}</span>
            </div>

            <div className="user-details__field">
              <label className="user-details__label">{t('details.fields.email')}</label>
              <span className="user-details__value">{user.email}</span>
            </div>

            <div className="user-details__field">
              <label className="user-details__label">{t('details.fields.status')}</label>
              <span className={`user-details__status ${getStatusClass(user.status)}`}>
                {t(`status.${user.status}`)}
              </span>
            </div>

            <div className="user-details__field">
              <label className="user-details__label">{t('details.fields.mfaEnabled')}</label>
              <span className="user-details__value">
                {user.mfa_enabled ? t('details.values.yes') : t('details.values.no')}
              </span>
            </div>

            <div className="user-details__field">
              <label className="user-details__label">{t('details.fields.lastLogin')}</label>
              <span className="user-details__value">{formatDate(user.last_login)}</span>
            </div>

            <div className="user-details__field">
              <label className="user-details__label">{t('details.fields.created')}</label>
              <span className="user-details__value">{formatDate(user.created_at)}</span>
            </div>

            <div className="user-details__field">
              <label className="user-details__label">{t('details.fields.updated')}</label>
              <span className="user-details__value">{formatDate(user.updated_at)}</span>
            </div>
          </div>
        </div>

        {/* Role Management Card */}
        <div className="user-details__card">
          <h2 className="user-details__card-title">{t('details.cards.roleManagement')}</h2>

          <UserRoleSelector
            userId={user.id}
            currentRoles={user.roles || []}
            onRolesUpdated={handleRolesUpdated}
          />
        </div>

        {/* Permissions Card */}
        <div className="user-details__card">
          <h2 className="user-details__card-title">{t('details.cards.permissions')}</h2>
          <p className="user-details__subtitle">
            {t('details.permissions.subtitle')}
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
                {t('details.permissions.none')}
              </p>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
};

export default UserDetailsPage;
