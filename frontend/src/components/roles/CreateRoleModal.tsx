/**
 * CreateRoleModal Component
 * STORY-025B: Roles Management UI
 *
 * Modal form for creating new roles.
 * Includes role name, description, and permission selection.
 *
 * @example
 * ```tsx
 * <CreateRoleModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   onSuccess={(role) => handleRoleCreated(role)}
 * />
 * ```
 */

import React, { useState, useEffect } from 'react';
import { ResponsiveModal } from '../responsive';
import { rolesService, Role, Permission, CreateRoleDto } from '../../services/rolesService';
import { PermissionCheckboxGroup } from './PermissionCheckboxGroup';
import { logger } from '../../services/loggerService';
import './RoleFormModal.css';

/**
 * Props for CreateRoleModal component
 */
export interface CreateRoleModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when role is successfully created */
  onSuccess?: (role: Role) => void;
}

/**
 * Form data interface for role creation
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
 * Initial form state
 */
const initialFormData: RoleFormData = {
  name: '',
  description: '',
  permissionIds: [],
};

/**
 * CreateRoleModal Component
 */
export const CreateRoleModal: React.FC<CreateRoleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<RoleFormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  // Reset form and load permissions when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setErrors({});
      loadPermissions();
    }
  }, [isOpen]);

  /**
   * Load available permissions
   */
  const loadPermissions = async () => {
    setLoadingPermissions(true);
    try {
      const allPermissions = await rolesService.listPermissions();
      setPermissions(allPermissions);
    } catch (error) {
      logger.error('Failed to load permissions', error);
      setErrors({ general: 'Berechtigungen konnten nicht geladen werden.' });
    } finally {
      setLoadingPermissions(false);
    }
  };

  /**
   * Handle input change
   */
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  /**
   * Handle permission selection change
   */
  const handlePermissionChange = (selectedIds: number[]) => {
    setFormData((prev) => ({ ...prev, permissionIds: selectedIds }));
    if (errors.permissions) {
      setErrors((prev) => ({ ...prev, permissions: undefined }));
    }
  };

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Rollenname ist erforderlich';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Rollenname muss mindestens 2 Zeichen lang sein';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Rollenname darf maximal 100 Zeichen lang sein';
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

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const createData: CreateRoleDto = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        permissionIds: formData.permissionIds.length > 0 ? formData.permissionIds : undefined,
      };

      const newRole = await rolesService.createRole(createData);
      onSuccess?.(newRole);
      onClose();
    } catch (error: unknown) {
      logger.error('Failed to create role', error);
      const apiError = error as { response?: { data?: { message?: string } } };
      setErrors({
        general:
          apiError.response?.data?.message ||
          'Rolle konnte nicht erstellt werden. Bitte versuchen Sie es erneut.',
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
        form="role-create-form"
        className="role-form-modal__btn role-form-modal__btn--primary"
        disabled={isLoading || loadingPermissions}
      >
        {isLoading ? 'Erstelle...' : 'Rolle erstellen'}
      </button>
    </div>
  );

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Neue Rolle"
      size="lg"
      footer={renderFooter()}
      data-testid="create-role-modal"
    >
      <form
        id="role-create-form"
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

        {/* Name field */}
        <div className="role-form-modal__field">
          <label htmlFor="create-role-name" className="role-form-modal__label">
            Rollenname *
          </label>
          <input
            type="text"
            id="create-role-name"
            name="name"
            className={`role-form-modal__input ${errors.name ? 'role-form-modal__input--error' : ''}`}
            value={formData.name}
            onChange={handleInputChange}
            disabled={isLoading}
            autoFocus
            placeholder="z.B. Editor, Moderator, Viewer"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'create-role-name-error' : undefined}
          />
          {errors.name && (
            <span id="create-role-name-error" className="role-form-modal__field-error" role="alert">
              {errors.name}
            </span>
          )}
        </div>

        {/* Description field */}
        <div className="role-form-modal__field">
          <label htmlFor="create-role-description" className="role-form-modal__label">
            Beschreibung
          </label>
          <textarea
            id="create-role-description"
            name="description"
            className={`role-form-modal__textarea ${errors.description ? 'role-form-modal__textarea--error' : ''}`}
            value={formData.description}
            onChange={handleInputChange}
            disabled={isLoading}
            rows={3}
            placeholder="Optionale Beschreibung der Rolle..."
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? 'create-role-description-error' : undefined}
          />
          {errors.description && (
            <span id="create-role-description-error" className="role-form-modal__field-error" role="alert">
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
              data-testid="create-role-permissions"
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

export default CreateRoleModal;
