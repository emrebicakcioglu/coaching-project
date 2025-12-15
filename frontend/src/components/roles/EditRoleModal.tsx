/**
 * EditRoleModal Component
 * STORY-025B: Roles Management UI
 *
 * Modal form for editing existing roles.
 * Includes role name, description, and permission selection.
 * Existing permissions are pre-selected when editing.
 *
 * @example
 * ```tsx
 * <EditRoleModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   role={selectedRole}
 *   onSuccess={(role) => handleRoleUpdated(role)}
 * />
 * ```
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ResponsiveModal } from '../responsive';
import { rolesService, Role, Permission, UpdateRoleDto } from '../../services/rolesService';
import { PermissionCheckboxGroup } from './PermissionCheckboxGroup';
import './RoleFormModal.css';

/**
 * Props for EditRoleModal component
 */
export interface EditRoleModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Role to edit */
  role: Role | null;
  /** Callback when role is successfully updated */
  onSuccess?: (role: Role) => void;
}

/**
 * Form data interface for role editing
 */
interface RoleFormData {
  name: string;
  description: string;
  permissionIds: number[];
}

/**
 * Form errors interface
 */
interface FormErrors {
  name?: string;
  description?: string;
  permissions?: string;
  general?: string;
}

/**
 * EditRoleModal Component
 */
export const EditRoleModal: React.FC<EditRoleModalProps> = ({
  isOpen,
  onClose,
  role,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    permissionIds: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialPermissionIds, setInitialPermissionIds] = useState<number[]>([]);

  // Initialize form when role changes or modal opens
  useEffect(() => {
    if (isOpen && role) {
      const rolePermissionIds = role.permissions?.map((p) => p.id) || [];
      setFormData({
        name: role.name,
        description: role.description || '',
        permissionIds: rolePermissionIds,
      });
      setInitialPermissionIds(rolePermissionIds);
      setErrors({});
      setHasChanges(false);
      loadPermissions();
    }
  }, [isOpen, role]);

  /**
   * Load available permissions
   */
  const loadPermissions = async () => {
    setLoadingPermissions(true);
    try {
      const allPermissions = await rolesService.listPermissions();
      setPermissions(allPermissions);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      setErrors({ general: 'Berechtigungen konnten nicht geladen werden.' });
    } finally {
      setLoadingPermissions(false);
    }
  };

  /**
   * Check if form has changes
   */
  const checkForChanges = useCallback(
    (newFormData: RoleFormData) => {
      if (!role) return false;

      const nameChanged = newFormData.name !== role.name;
      const descriptionChanged = newFormData.description !== (role.description || '');

      // Check if permissions changed
      const sortedNew = [...newFormData.permissionIds].sort();
      const sortedInitial = [...initialPermissionIds].sort();
      const permissionsChanged =
        sortedNew.length !== sortedInitial.length ||
        sortedNew.some((id, index) => id !== sortedInitial[index]);

      return nameChanged || descriptionChanged || permissionsChanged;
    },
    [role, initialPermissionIds]
  );

  /**
   * Handle input change
   */
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
    setHasChanges(checkForChanges(newFormData));
    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  /**
   * Handle permission selection change
   */
  const handlePermissionChange = (selectedIds: number[]) => {
    const newFormData = { ...formData, permissionIds: selectedIds };
    setFormData(newFormData);
    setHasChanges(checkForChanges(newFormData));
    if (errors.permissions) {
      setErrors((prev) => ({ ...prev, permissions: undefined }));
    }
  };

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation (only for non-system roles)
    if (!role?.is_system) {
      if (!formData.name.trim()) {
        newErrors.name = 'Rollenname ist erforderlich';
      } else if (formData.name.trim().length < 2) {
        newErrors.name = 'Rollenname muss mindestens 2 Zeichen lang sein';
      } else if (formData.name.trim().length > 100) {
        newErrors.name = 'Rollenname darf maximal 100 Zeichen lang sein';
      }
    }

    // Description validation (optional but max length)
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Beschreibung darf maximal 500 Zeichen lang sein';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!role) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Build update data - only include changed fields
      const updateData: UpdateRoleDto = {};

      // Only update name if changed and not a system role
      if (!role.is_system && formData.name.trim() !== role.name) {
        updateData.name = formData.name.trim();
      }

      // Only update description if changed
      const newDescription = formData.description.trim() || undefined;
      if (newDescription !== (role.description || undefined)) {
        updateData.description = newDescription;
      }

      // Handle permission changes
      const sortedNew = [...formData.permissionIds].sort();
      const sortedInitial = [...initialPermissionIds].sort();
      const permissionsChanged =
        sortedNew.length !== sortedInitial.length ||
        sortedNew.some((id, index) => id !== sortedInitial[index]);

      if (permissionsChanged) {
        updateData.permissionIds = formData.permissionIds;
      }

      // Update role if there are changes
      let updatedRole = role;
      if (Object.keys(updateData).length > 0) {
        updatedRole = await rolesService.updateRole(role.id, updateData);
      }

      onSuccess?.(updatedRole);
      onClose();
    } catch (error: unknown) {
      console.error('Failed to update role:', error);
      const apiError = error as { response?: { data?: { message?: string } } };
      setErrors({
        general:
          apiError.response?.data?.message ||
          'Rolle konnte nicht aktualisiert werden. Bitte versuchen Sie es erneut.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Render footer buttons
   */
  const renderFooter = () => (
    <div className="role-form-modal__footer">
      <button
        type="button"
        className="role-form-modal__btn role-form-modal__btn--secondary"
        onClick={onClose}
        disabled={isLoading}
      >
        Abbrechen
      </button>
      <button
        type="submit"
        form="role-edit-form"
        className="role-form-modal__btn role-form-modal__btn--primary"
        disabled={isLoading || loadingPermissions || !hasChanges}
      >
        {isLoading ? 'Speichere...' : 'Änderungen speichern'}
      </button>
    </div>
  );

  if (!role) {
    return null;
  }

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Rolle bearbeiten"
      size="lg"
      footer={renderFooter()}
      data-testid="edit-role-modal"
    >
      <form
        id="role-edit-form"
        className="role-form-modal__form"
        onSubmit={handleSubmit}
        noValidate
      >
        {/* General error message */}
        {errors.general && (
          <div className="role-form-modal__error" role="alert">
            {errors.general}
          </div>
        )}

        {/* Role info header */}
        <div className="role-form-modal__info">
          <span className="role-form-modal__info-label">Rollen-ID:</span>
          <span className="role-form-modal__info-value">{role.id}</span>
          {role.is_system && (
            <span className="role-form-modal__system-badge">System-Rolle</span>
          )}
        </div>

        {/* Name field */}
        <div className="role-form-modal__field">
          <label htmlFor="edit-role-name" className="role-form-modal__label">
            Rollenname *
          </label>
          <input
            type="text"
            id="edit-role-name"
            name="name"
            className={`role-form-modal__input ${errors.name ? 'role-form-modal__input--error' : ''}`}
            value={formData.name}
            onChange={handleInputChange}
            disabled={isLoading || role.is_system}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'edit-role-name-error' : undefined}
          />
          {role.is_system && (
            <span className="role-form-modal__hint">
              System-Rollen können nicht umbenannt werden.
            </span>
          )}
          {errors.name && (
            <span id="edit-role-name-error" className="role-form-modal__field-error" role="alert">
              {errors.name}
            </span>
          )}
        </div>

        {/* Description field */}
        <div className="role-form-modal__field">
          <label htmlFor="edit-role-description" className="role-form-modal__label">
            Beschreibung
          </label>
          <textarea
            id="edit-role-description"
            name="description"
            className={`role-form-modal__textarea ${errors.description ? 'role-form-modal__textarea--error' : ''}`}
            value={formData.description}
            onChange={handleInputChange}
            disabled={isLoading}
            rows={3}
            placeholder="Optionale Beschreibung der Rolle..."
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? 'edit-role-description-error' : undefined}
          />
          {errors.description && (
            <span id="edit-role-description-error" className="role-form-modal__field-error" role="alert">
              {errors.description}
            </span>
          )}
          <span className="role-form-modal__hint">
            {formData.description.length}/500 Zeichen
          </span>
        </div>

        {/* Permissions field */}
        <div className="role-form-modal__field">
          <label className="role-form-modal__label">
            Berechtigungen
            <span className="role-form-modal__label-hint">
              ({formData.permissionIds.length} ausgewählt)
            </span>
          </label>
          {loadingPermissions ? (
            <div className="role-form-modal__loading">
              <div className="role-form-modal__spinner" />
              <span>Lade Berechtigungen...</span>
            </div>
          ) : (
            <PermissionCheckboxGroup
              permissions={permissions}
              selectedIds={formData.permissionIds}
              onChange={handlePermissionChange}
              disabled={isLoading}
              data-testid="edit-role-permissions"
            />
          )}
          {errors.permissions && (
            <span className="role-form-modal__field-error" role="alert">
              {errors.permissions}
            </span>
          )}
        </div>
      </form>
    </ResponsiveModal>
  );
};

export default EditRoleModal;
