/**
 * UserEditModal Component
 * STORY-006B: User CRUD Frontend UI
 *
 * Modal form for editing existing users.
 * Displays a responsive modal with user form fields pre-filled with user data.
 *
 * @example
 * ```tsx
 * <UserEditModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   user={selectedUser}
 *   onSuccess={(user) => handleUserUpdated(user)}
 * />
 * ```
 */

import React, { useState, useEffect } from 'react';
import { ResponsiveModal } from '../responsive';
import { usersService, UpdateUserDto, User } from '../../services/usersService';
import { rolesService, Role } from '../../services/rolesService';
import './UserFormModal.css';

/**
 * Props for UserEditModal component
 */
export interface UserEditModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** User to edit */
  user: User | null;
  /** Callback when user is successfully updated */
  onSuccess?: (user: User) => void;
}

/**
 * Form data interface for user editing
 */
interface UserFormData {
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
  status: 'active' | 'inactive' | 'suspended';
  roles: string[];
}

/**
 * Form errors interface
 */
interface FormErrors {
  email?: string;
  name?: string;
  password?: string;
  confirmPassword?: string;
  status?: string;
  roles?: string;
  general?: string;
}

/**
 * UserEditModal Component
 */
export const UserEditModal: React.FC<UserEditModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    status: 'active',
    roles: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when user changes or modal opens
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        email: user.email,
        name: user.name,
        password: '',
        confirmPassword: '',
        status: user.status === 'deleted' ? 'inactive' : user.status,
        roles: user.roles?.map((r) => r.name) || [],
      });
      setErrors({});
      setHasChanges(false);
      loadRoles();
    }
  }, [isOpen, user]);

  /**
   * Load available roles
   */
  const loadRoles = async () => {
    try {
      const roles = await rolesService.listRoles();
      setAvailableRoles(roles);
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  /**
   * Handle input change
   */
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setHasChanges(true);
    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  /**
   * Handle role selection change
   */
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, (option) => option.value);
    setFormData((prev) => ({ ...prev, roles: selectedOptions }));
    setHasChanges(true);
    if (errors.roles) {
      setErrors((prev) => ({ ...prev, roles: undefined }));
    }
  };

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'E-Mail ist erforderlich';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ungültige E-Mail-Adresse';
    }

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name ist erforderlich';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name muss mindestens 2 Zeichen lang sein';
    }

    // Password validation (only if password is provided)
    if (formData.password) {
      if (formData.password.length < 8) {
        newErrors.password = 'Passwort muss mindestens 8 Zeichen lang sein';
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwort-Bestätigung ist erforderlich';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwörter stimmen nicht überein';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Build update data - only include changed fields
      const updateData: UpdateUserDto = {};

      if (formData.email.trim() !== user.email) {
        updateData.email = formData.email.trim();
      }
      if (formData.name.trim() !== user.name) {
        updateData.name = formData.name.trim();
      }
      if (formData.status !== user.status) {
        updateData.status = formData.status;
      }
      if (formData.password) {
        updateData.password = formData.password;
      }

      // Update user data
      let updatedUser = user;
      if (Object.keys(updateData).length > 0) {
        updatedUser = await usersService.updateUser(user.id, updateData);
      }

      // Handle role changes
      const currentRoles = user.roles?.map((r) => r.name) || [];
      const newRoles = formData.roles;

      const rolesToAdd = newRoles.filter((r) => !currentRoles.includes(r));
      const rolesToRemove = currentRoles.filter((r) => !newRoles.includes(r));

      if (rolesToAdd.length > 0) {
        await usersService.assignRoles(user.id, rolesToAdd);
      }
      if (rolesToRemove.length > 0) {
        await usersService.removeRoles(user.id, rolesToRemove);
      }

      // Re-fetch user to get updated data with roles
      if (rolesToAdd.length > 0 || rolesToRemove.length > 0) {
        updatedUser = await usersService.getUser(user.id);
      }

      onSuccess?.(updatedUser);
      onClose();
    } catch (error: unknown) {
      console.error('Failed to update user:', error);
      const apiError = error as { response?: { data?: { message?: string } } };
      setErrors({
        general:
          apiError.response?.data?.message ||
          'Benutzer konnte nicht aktualisiert werden. Bitte versuchen Sie es erneut.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Render footer buttons
   */
  const renderFooter = () => (
    <div className="user-form-modal__footer">
      <button
        type="button"
        className="user-form-modal__btn user-form-modal__btn--secondary"
        onClick={onClose}
        disabled={isLoading}
      >
        Abbrechen
      </button>
      <button
        type="submit"
        form="user-edit-form"
        className="user-form-modal__btn user-form-modal__btn--primary"
        disabled={isLoading || !hasChanges}
      >
        {isLoading ? 'Speichere...' : 'Änderungen speichern'}
      </button>
    </div>
  );

  if (!user) {
    return null;
  }

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Benutzer bearbeiten"
      size="md"
      footer={renderFooter()}
      data-testid="user-edit-modal"
    >
      <form
        id="user-edit-form"
        className="user-form-modal__form"
        onSubmit={handleSubmit}
        noValidate
      >
        {/* General error message */}
        {errors.general && (
          <div className="user-form-modal__error" role="alert">
            {errors.general}
          </div>
        )}

        {/* User info header */}
        <div className="user-form-modal__info">
          <span className="user-form-modal__info-label">Benutzer-ID:</span>
          <span className="user-form-modal__info-value">{user.id}</span>
        </div>

        {/* Email field */}
        <div className="user-form-modal__field">
          <label htmlFor="edit-email" className="user-form-modal__label">
            E-Mail *
          </label>
          <input
            type="email"
            id="edit-email"
            name="email"
            className={`user-form-modal__input ${errors.email ? 'user-form-modal__input--error' : ''}`}
            value={formData.email}
            onChange={handleInputChange}
            disabled={isLoading}
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'edit-email-error' : undefined}
          />
          {errors.email && (
            <span id="edit-email-error" className="user-form-modal__field-error" role="alert">
              {errors.email}
            </span>
          )}
        </div>

        {/* Name field */}
        <div className="user-form-modal__field">
          <label htmlFor="edit-name" className="user-form-modal__label">
            Name *
          </label>
          <input
            type="text"
            id="edit-name"
            name="name"
            className={`user-form-modal__input ${errors.name ? 'user-form-modal__input--error' : ''}`}
            value={formData.name}
            onChange={handleInputChange}
            disabled={isLoading}
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'edit-name-error' : undefined}
          />
          {errors.name && (
            <span id="edit-name-error" className="user-form-modal__field-error" role="alert">
              {errors.name}
            </span>
          )}
        </div>

        {/* Password field (optional for edit) */}
        <div className="user-form-modal__field">
          <label htmlFor="edit-password" className="user-form-modal__label">
            Neues Passwort
            <span className="user-form-modal__hint-inline"> (leer lassen, um nicht zu ändern)</span>
          </label>
          <input
            type="password"
            id="edit-password"
            name="password"
            className={`user-form-modal__input ${errors.password ? 'user-form-modal__input--error' : ''}`}
            value={formData.password}
            onChange={handleInputChange}
            disabled={isLoading}
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'edit-password-error' : undefined}
          />
          {errors.password && (
            <span id="edit-password-error" className="user-form-modal__field-error" role="alert">
              {errors.password}
            </span>
          )}
        </div>

        {/* Confirm Password field (only shown when password is entered) */}
        {formData.password && (
          <div className="user-form-modal__field">
            <label htmlFor="edit-confirm-password" className="user-form-modal__label">
              Neues Passwort bestätigen *
            </label>
            <input
              type="password"
              id="edit-confirm-password"
              name="confirmPassword"
              className={`user-form-modal__input ${errors.confirmPassword ? 'user-form-modal__input--error' : ''}`}
              value={formData.confirmPassword}
              onChange={handleInputChange}
              disabled={isLoading}
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? 'edit-confirm-password-error' : undefined}
            />
            {errors.confirmPassword && (
              <span id="edit-confirm-password-error" className="user-form-modal__field-error" role="alert">
                {errors.confirmPassword}
              </span>
            )}
          </div>
        )}

        {/* Status field */}
        <div className="user-form-modal__field">
          <label htmlFor="edit-status" className="user-form-modal__label">
            Status
          </label>
          <select
            id="edit-status"
            name="status"
            className="user-form-modal__select"
            value={formData.status}
            onChange={handleInputChange}
            disabled={isLoading}
          >
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
            <option value="suspended">Gesperrt</option>
          </select>
        </div>

        {/* Roles field */}
        {availableRoles.length > 0 && (
          <div className="user-form-modal__field">
            <label htmlFor="edit-roles" className="user-form-modal__label">
              Rollen
            </label>
            <select
              id="edit-roles"
              name="roles"
              className="user-form-modal__select user-form-modal__select--multi"
              multiple
              value={formData.roles}
              onChange={handleRoleChange}
              disabled={isLoading}
              size={Math.min(availableRoles.length, 4)}
            >
              {availableRoles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name}
                  {role.description && ` - ${role.description}`}
                </option>
              ))}
            </select>
            <span className="user-form-modal__hint">
              Halten Sie Strg/Cmd gedrückt, um mehrere Rollen auszuwählen
            </span>
          </div>
        )}
      </form>
    </ResponsiveModal>
  );
};

export default UserEditModal;
