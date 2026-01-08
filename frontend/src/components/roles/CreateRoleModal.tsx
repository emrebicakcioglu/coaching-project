/**
 * CreateRoleModal Component
 * STORY-025B: Roles Management UI
 * STORY-106: Roles & Permissions UX Improvements
 *
 * Modal form for creating new roles.
 * Includes role name, description, and permission selection.
 *
 * STORY-106 Fixes:
 * - Added scroll-to-error behavior when validation fails
 * - Added error summary with jump-to-field functionality
 * - Using translation keys for all text (no hardcoded strings)
 * - Permission descriptions are now translated
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

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('roles');
  const [formData, setFormData] = useState<RoleFormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  // STORY-106: Refs for scroll-to-error behavior
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  // Reset form and load permissions when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setErrors({});
      loadPermissions();
    }
  }, [isOpen]);

  // STORY-106: Scroll to error summary when errors change
  useEffect(() => {
    const errorKeys = Object.keys(errors).filter(key => key !== 'general' && errors[key as keyof FormErrors]);
    if (errorKeys.length > 0 && errorSummaryRef.current) {
      errorSummaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Focus first error field for accessibility
      const firstErrorKey = errorKeys[0];
      if (firstErrorKey === 'name' && nameInputRef.current) {
        nameInputRef.current.focus();
      } else if (firstErrorKey === 'description' && descriptionInputRef.current) {
        descriptionInputRef.current.focus();
      }
    }
  }, [errors]);

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
      setErrors({ general: t('modal.errors.loadPermissions') });
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
   * STORY-106: Focus a specific field (for error summary links)
   */
  const focusField = useCallback((fieldName: string) => {
    if (fieldName === 'name' && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (fieldName === 'description' && descriptionInputRef.current) {
      descriptionInputRef.current.focus();
      descriptionInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = t('modal.validation.nameRequired');
    } else if (formData.name.trim().length < 2) {
      newErrors.name = t('modal.validation.nameMinLength');
    } else if (formData.name.trim().length > 100) {
      newErrors.name = t('modal.validation.nameMaxLength');
    }

    // Description validation (optional but max length)
    if (formData.description && formData.description.length > 500) {
      newErrors.description = t('modal.validation.descriptionMaxLength');
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
        general: apiError.response?.data?.message || t('modal.errors.createFailed'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get field-level errors for error summary
   */
  const getFieldErrors = (): Array<{ field: string; label: string; message: string }> => {
    const fieldErrors: Array<{ field: string; label: string; message: string }> = [];
    if (errors.name) {
      fieldErrors.push({ field: 'name', label: t('modal.fields.name'), message: errors.name });
    }
    if (errors.description) {
      fieldErrors.push({ field: 'description', label: t('modal.fields.description'), message: errors.description });
    }
    if (errors.permissions) {
      fieldErrors.push({ field: 'permissions', label: t('modal.fields.permissions'), message: errors.permissions });
    }
    return fieldErrors;
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
        {t('modal.cancel')}
      </button>
      <button
        type="submit"
        form="role-create-form"
        className="role-form-modal__btn role-form-modal__btn--primary"
        disabled={isLoading || loadingPermissions}
      >
        {isLoading ? t('modal.creating') : t('modal.create')}
      </button>
    </div>
  );

  const fieldErrors = getFieldErrors();

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('modal.createTitle')}
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
        {/* STORY-106: Error summary with jump-to-field links */}
        {fieldErrors.length > 0 && (
          <div
            ref={errorSummaryRef}
            className="role-form-modal__error-summary"
            role="alert"
            aria-live="polite"
          >
            <h3 className="role-form-modal__error-summary-title">
              {t('modal.errors.validationErrors')} ({fieldErrors.length})
            </h3>
            <ul className="role-form-modal__error-summary-list">
              {fieldErrors.map(({ field, label, message }) => (
                <li key={field}>
                  <button
                    type="button"
                    className="role-form-modal__error-summary-link"
                    onClick={() => focusField(field)}
                  >
                    <strong>{label}:</strong> {message}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* General error message */}
        {errors.general && (
          <div className="role-form-modal__error" role="alert">
            {errors.general}
          </div>
        )}

        {/* Name field */}
        <div className="role-form-modal__field">
          <label htmlFor="create-role-name" className="role-form-modal__label">
            {t('modal.fields.name')} *
          </label>
          <input
            ref={nameInputRef}
            type="text"
            id="create-role-name"
            name="name"
            className={`role-form-modal__input ${errors.name ? 'role-form-modal__input--error' : ''}`}
            value={formData.name}
            onChange={handleInputChange}
            disabled={isLoading}
            autoFocus
            placeholder={t('modal.fields.namePlaceholder')}
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
            {t('modal.fields.description')}
          </label>
          <textarea
            ref={descriptionInputRef}
            id="create-role-description"
            name="description"
            className={`role-form-modal__textarea ${errors.description ? 'role-form-modal__textarea--error' : ''}`}
            value={formData.description}
            onChange={handleInputChange}
            disabled={isLoading}
            rows={3}
            placeholder={t('modal.fields.descriptionPlaceholder')}
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? 'create-role-description-error' : undefined}
          />
          {errors.description && (
            <span id="create-role-description-error" className="role-form-modal__field-error" role="alert">
              {errors.description}
            </span>
          )}
          <span className="role-form-modal__hint">
            {t('modal.fields.charactersCount', { count: formData.description.length, max: 500 })}
          </span>
        </div>

        {/* Permissions field */}
        <div className="role-form-modal__field">
          <label className="role-form-modal__label">
            {t('modal.fields.permissions')}
            <span className="role-form-modal__label-hint">
              ({t('modal.fields.permissionsSelected', { count: formData.permissionIds.length })})
            </span>
          </label>
          {loadingPermissions ? (
            <div className="role-form-modal__loading">
              <div className="role-form-modal__spinner" />
              <span>{t('modal.loading.permissions')}</span>
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
