/**
 * User Role Selector Component
 * STORY-007B: User Role Assignment
 *
 * Multi-select dropdown component for selecting and managing user roles.
 * Supports selecting multiple roles and displays selected roles as badges.
 */

import React, { useState, useEffect, useRef } from 'react';
import { RoleBadge } from './RoleBadge';
import { rolesService } from '../../services/rolesService';
import { usersService } from '../../services/usersService';
import type { Role } from '../../services/usersService';
import { logger } from '../../services/loggerService';
import './UserRoleSelector.css';

export interface UserRoleSelectorProps {
  /** User ID to manage roles for */
  userId: number;
  /** Current roles assigned to the user */
  currentRoles: Role[];
  /** Callback when roles are updated */
  onRolesUpdated?: (roles: Role[]) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
}

/**
 * UserRoleSelector Component
 *
 * Provides a dropdown for selecting roles and shows current roles as badges.
 * Automatically syncs changes with the backend API.
 */
export const UserRoleSelector: React.FC<UserRoleSelectorProps> = ({
  userId,
  currentRoles,
  onRolesUpdated,
  disabled = false,
}) => {
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Role[]>(currentRoles);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load available roles on mount
  useEffect(() => {
    const fetchRoles = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const roles = await rolesService.listRoles();
        setAvailableRoles(roles);
      } catch (err) {
        logger.error('Failed to load roles', err);
        setError('Failed to load available roles');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoles();
  }, []);

  // Update selected roles when currentRoles prop changes
  useEffect(() => {
    setSelectedRoles(currentRoles);
  }, [currentRoles]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if there are unsaved changes
  useEffect(() => {
    const currentIds = new Set(currentRoles.map((r) => r.id));
    const selectedIds = new Set(selectedRoles.map((r) => r.id));

    const hasChanges =
      currentIds.size !== selectedIds.size ||
      [...currentIds].some((id) => !selectedIds.has(id));

    setHasChanges(hasChanges);
  }, [currentRoles, selectedRoles]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  /**
   * Toggle role selection
   */
  const toggleRole = (role: Role) => {
    setError(null);
    setSuccessMessage(null);

    const isSelected = selectedRoles.some((r) => r.id === role.id);
    if (isSelected) {
      setSelectedRoles(selectedRoles.filter((r) => r.id !== role.id));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  /**
   * Remove a role from selection
   */
  const removeRole = (roleId: number) => {
    setError(null);
    setSuccessMessage(null);
    setSelectedRoles(selectedRoles.filter((r) => r.id !== roleId));
  };

  /**
   * Save role changes to the backend
   */
  const saveChanges = async () => {
    if (!hasChanges || isSaving) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const currentRoleNames = new Set(currentRoles.map((r) => r.name));
      const selectedRoleNames = new Set(selectedRoles.map((r) => r.name));

      // Determine roles to add and remove
      const toAdd = selectedRoles.filter((r) => !currentRoleNames.has(r.name)).map((r) => r.name);
      const toRemove = currentRoles.filter((r) => !selectedRoleNames.has(r.name)).map((r) => r.name);

      // Execute API calls
      if (toAdd.length > 0) {
        await usersService.assignRoles(userId, toAdd);
      }
      if (toRemove.length > 0) {
        await usersService.removeRoles(userId, toRemove);
      }

      setSuccessMessage('Roles updated! User needs to re-login for changes to take effect.');

      // Notify parent of the update
      if (onRolesUpdated) {
        onRolesUpdated(selectedRoles);
      }
    } catch (err) {
      logger.error('Failed to update roles', err);
      setError('Failed to save role changes. Please try again.');
      // Revert to original selection
      setSelectedRoles(currentRoles);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Cancel changes and revert to original roles
   */
  const cancelChanges = () => {
    setSelectedRoles(currentRoles);
    setError(null);
    setSuccessMessage(null);
  };

  const unselectedRoles = availableRoles.filter(
    (role) => !selectedRoles.some((r) => r.id === role.id)
  );

  return (
    <div className="user-role-selector" ref={dropdownRef}>
      <label className="user-role-selector__label">Roles</label>

      {/* Selected roles as badges */}
      <div className="user-role-selector__badges">
        {selectedRoles.length > 0 ? (
          selectedRoles.map((role) => (
            <RoleBadge
              key={role.id}
              name={role.name}
              onRemove={disabled ? undefined : () => removeRole(role.id)}
            />
          ))
        ) : (
          <span className="user-role-selector__empty">No roles assigned</span>
        )}
      </div>

      {/* Dropdown toggle */}
      {!disabled && (
        <div className="user-role-selector__dropdown-container">
          <button
            type="button"
            className="user-role-selector__toggle"
            onClick={() => setIsOpen(!isOpen)}
            disabled={isLoading}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
          >
            <span>{isOpen ? 'Close' : 'Add Role'}</span>
            <svg
              className={`user-role-selector__toggle-icon ${isOpen ? 'user-role-selector__toggle-icon--open' : ''}`}
              viewBox="0 0 24 24"
              width="16"
              height="16"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {isOpen && (
            <div className="user-role-selector__menu" role="listbox">
              {isLoading ? (
                <div className="user-role-selector__loading">Loading roles...</div>
              ) : unselectedRoles.length > 0 ? (
                unselectedRoles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    className="user-role-selector__option"
                    onClick={() => {
                      toggleRole(role);
                      setIsOpen(false);
                    }}
                    role="option"
                    aria-selected={false}
                  >
                    <span className="user-role-selector__option-name">{role.name}</span>
                    {role.description && (
                      <span className="user-role-selector__option-desc">{role.description}</span>
                    )}
                  </button>
                ))
              ) : (
                <div className="user-role-selector__no-options">All roles assigned</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="user-role-selector__error" role="alert">
          {error}
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className="user-role-selector__success" role="status">
          {successMessage}
        </div>
      )}

      {/* Save/Cancel buttons */}
      {hasChanges && !disabled && (
        <div className="user-role-selector__actions">
          <button
            type="button"
            className="user-role-selector__btn user-role-selector__btn--secondary"
            onClick={cancelChanges}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="user-role-selector__btn user-role-selector__btn--primary"
            onClick={saveChanges}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
};

export default UserRoleSelector;
