/**
 * RoleDeleteDialog Component
 * STORY-025B: Roles Management UI
 *
 * Confirmation dialog for role deletion.
 * Displays role information and requires confirmation before deleting.
 * System roles cannot be deleted and will show a warning.
 *
 * @example
 * ```tsx
 * <RoleDeleteDialog
 *   isOpen={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   role={selectedRole}
 *   onSuccess={() => handleRoleDeleted()}
 * />
 * ```
 */

import React, { useState } from 'react';
import { ResponsiveModal } from '../responsive';
import { rolesService, Role } from '../../services/rolesService';
import { logger } from '../../services/loggerService';
import './RoleDeleteDialog.css';

/**
 * Props for RoleDeleteDialog component
 */
export interface RoleDeleteDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Role to delete */
  role: Role | null;
  /** Callback when role is successfully deleted */
  onSuccess?: () => void;
}

/**
 * RoleDeleteDialog Component
 */
export const RoleDeleteDialog: React.FC<RoleDeleteDialogProps> = ({
  isOpen,
  onClose,
  role,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle delete confirmation
   */
  const handleDelete = async () => {
    if (!role) {
      return;
    }

    // Prevent deletion of system roles
    if (role.is_system) {
      setError('System-Rollen können nicht gelöscht werden.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await rolesService.deleteRole(role.id);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      logger.error('Failed to delete role', err);
      const apiError = err as { response?: { data?: { message?: string } } };
      setError(
        apiError.response?.data?.message ||
          'Rolle konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.'
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
    <div className="role-delete-dialog__footer">
      <button
        type="button"
        className="role-delete-dialog__btn role-delete-dialog__btn--secondary"
        onClick={handleClose}
        disabled={isLoading}
      >
        Abbrechen
      </button>
      <button
        type="button"
        className="role-delete-dialog__btn role-delete-dialog__btn--danger"
        onClick={handleDelete}
        disabled={isLoading || role?.is_system}
        data-testid="confirm-delete-button"
      >
        {isLoading ? 'Lösche...' : 'Rolle löschen'}
      </button>
    </div>
  );

  if (!role) {
    return null;
  }

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Rolle löschen"
      size="sm"
      footer={renderFooter()}
      data-testid="delete-confirmation-dialog"
    >
      <div className="role-delete-dialog__content">
        {/* Warning icon */}
        <div className="role-delete-dialog__icon" aria-hidden="true">
          <svg
            className="role-delete-dialog__icon-svg"
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
          <div className="role-delete-dialog__error" role="alert">
            {error}
          </div>
        )}

        {/* System role warning */}
        {role.is_system && (
          <div className="role-delete-dialog__warning" role="alert">
            <svg
              className="role-delete-dialog__warning-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>System-Rollen können nicht gelöscht werden.</span>
          </div>
        )}

        {/* Confirmation message */}
        <p className="role-delete-dialog__message">
          {role.is_system
            ? 'Diese System-Rolle ist geschützt und kann nicht gelöscht werden.'
            : 'Sind Sie sicher, dass Sie diese Rolle löschen möchten?'}
        </p>

        {/* Role info */}
        <div className="role-delete-dialog__role-info">
          <div className="role-delete-dialog__role-row">
            <span className="role-delete-dialog__role-label">Rollenname:</span>
            <span className="role-delete-dialog__role-value">{role.name}</span>
          </div>
          {role.description && (
            <div className="role-delete-dialog__role-row">
              <span className="role-delete-dialog__role-label">Beschreibung:</span>
              <span className="role-delete-dialog__role-value">{role.description}</span>
            </div>
          )}
          <div className="role-delete-dialog__role-row">
            <span className="role-delete-dialog__role-label">Berechtigungen:</span>
            <span className="role-delete-dialog__role-value">
              {role.permissions?.length || 0}
            </span>
          </div>
          {role.userCount !== undefined && role.userCount > 0 && (
            <div className="role-delete-dialog__role-row role-delete-dialog__role-row--warning">
              <span className="role-delete-dialog__role-label">Benutzer:</span>
              <span className="role-delete-dialog__role-value role-delete-dialog__role-value--warning">
                {role.userCount} Benutzer haben diese Rolle
              </span>
            </div>
          )}
        </div>

        {/* Warning note */}
        {!role.is_system && (
          <p className="role-delete-dialog__note">
            Diese Aktion kann nicht rückgängig gemacht werden.
            {role.userCount !== undefined && role.userCount > 0 && (
              <> Die Rolle wird von {role.userCount} Benutzer(n) entfernt.</>
            )}
          </p>
        )}
      </div>
    </ResponsiveModal>
  );
};

export default RoleDeleteDialog;
