/**
 * UserDeleteDialog Component
 * STORY-006B: User CRUD Frontend UI
 *
 * Confirmation dialog for user deletion.
 * Displays user information and requires confirmation before soft-deleting the user.
 *
 * @example
 * ```tsx
 * <UserDeleteDialog
 *   isOpen={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   user={selectedUser}
 *   onSuccess={() => handleUserDeleted()}
 * />
 * ```
 */

import React, { useState } from 'react';
import { ResponsiveModal } from '../responsive';
import { usersService, User } from '../../services/usersService';
import { logger } from '../../services/loggerService';
import './UserDeleteDialog.css';

/**
 * Props for UserDeleteDialog component
 */
export interface UserDeleteDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** User to delete */
  user: User | null;
  /** Callback when user is successfully deleted */
  onSuccess?: () => void;
}

/**
 * UserDeleteDialog Component
 */
export const UserDeleteDialog: React.FC<UserDeleteDialogProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle delete confirmation
   */
  const handleDelete = async () => {
    if (!user) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await usersService.deleteUser(user.id);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      logger.error('Failed to delete user', err);
      const apiError = err as { response?: { data?: { message?: string } } };
      setError(
        apiError.response?.data?.message ||
          'Benutzer konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle dialog close (reset error state)
   */
  const handleClose = () => {
    setError(null);
    onClose();
  };

  /**
   * Render footer buttons
   */
  const renderFooter = () => (
    <div className="user-delete-dialog__footer">
      <button
        type="button"
        className="user-delete-dialog__btn user-delete-dialog__btn--secondary"
        onClick={handleClose}
        disabled={isLoading}
      >
        Abbrechen
      </button>
      <button
        type="button"
        className="user-delete-dialog__btn user-delete-dialog__btn--danger"
        onClick={handleDelete}
        disabled={isLoading}
        data-testid="confirm-delete-button"
      >
        {isLoading ? 'Lösche...' : 'Benutzer löschen'}
      </button>
    </div>
  );

  if (!user) {
    return null;
  }

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Benutzer löschen"
      size="sm"
      footer={renderFooter()}
      data-testid="user-delete-dialog"
    >
      <div className="user-delete-dialog__content">
        {/* Warning icon */}
        <div className="user-delete-dialog__icon" aria-hidden="true">
          <svg
            className="user-delete-dialog__icon-svg"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Error message */}
        {error && (
          <div className="user-delete-dialog__error" role="alert">
            {error}
          </div>
        )}

        {/* Confirmation message */}
        <p className="user-delete-dialog__message">
          Sind Sie sicher, dass Sie diesen Benutzer löschen möchten?
        </p>

        {/* User info */}
        <div className="user-delete-dialog__user-info">
          <div className="user-delete-dialog__user-row">
            <span className="user-delete-dialog__user-label">Name:</span>
            <span className="user-delete-dialog__user-value">{user.name}</span>
          </div>
          <div className="user-delete-dialog__user-row">
            <span className="user-delete-dialog__user-label">E-Mail:</span>
            <span className="user-delete-dialog__user-value">{user.email}</span>
          </div>
        </div>

        {/* Warning note */}
        <p className="user-delete-dialog__note">
          Der Benutzer wird als gelöscht markiert (Soft Delete) und kann später
          wiederhergestellt werden.
        </p>
      </div>
    </ResponsiveModal>
  );
};

export default UserDeleteDialog;
