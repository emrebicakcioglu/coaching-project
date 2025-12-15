/**
 * UserCreateModal Component
 * STORY-006B: User CRUD Frontend UI
 *
 * Modal form for creating new users.
 * Displays a responsive modal with user form fields.
 *
 * @example
 * ```tsx
 * <UserCreateModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   onSuccess={(user) => handleUserCreated(user)}
 * />
 * ```
 */

import React, { useState, useEffect } from 'react';
import { ResponsiveModal } from '../responsive';
import { usersService, CreateUserDto, User } from '../../services/usersService';
import { rolesService, Role } from '../../services/rolesService';
import './UserFormModal.css';

/**
 * Props for UserCreateModal component
 */
export interface UserCreateModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when user is successfully created */
  onSuccess?: (user: User) => void;
}

/**
 * Form data interface for user creation
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
 * Initial form state
 */
const initialFormData: UserFormData = {
  email: '',
  name: '',
  password: '',
  confirmPassword: '',
  status: 'active',
  roles: [],
};

/**
 * UserCreateModal Component
 */
export const UserCreateModal: React.FC<UserCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setErrors({});
      loadRoles();
    }
  }, [isOpen]);

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

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Passwort ist erforderlich';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Passwort muss mindestens 8 Zeichen lang sein';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwort-Bestätigung ist erforderlich';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwörter stimmen nicht überein';
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
      const createData: CreateUserDto = {
        email: formData.email.trim(),
        name: formData.name.trim(),
        password: formData.password,
        status: formData.status,
        roles: formData.roles.length > 0 ? formData.roles : undefined,
      };

      const newUser = await usersService.createUser(createData);
      onSuccess?.(newUser);
      onClose();
    } catch (error: unknown) {
      console.error('Failed to create user:', error);
      const apiError = error as { response?: { data?: { message?: string } } };
      setErrors({
        general:
          apiError.response?.data?.message ||
          'Benutzer konnte nicht erstellt werden. Bitte versuchen Sie es erneut.',
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
        form="user-create-form"
        className="user-form-modal__btn user-form-modal__btn--primary"
        disabled={isLoading}
      >
        {isLoading ? 'Erstelle...' : 'Benutzer erstellen'}
      </button>
    </div>
  );

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Neuer Benutzer"
      size="md"
      footer={renderFooter()}
      data-testid="user-create-modal"
    >
      <form
        id="user-create-form"
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

        {/* Email field */}
        <div className="user-form-modal__field">
          <label htmlFor="create-email" className="user-form-modal__label">
            E-Mail *
          </label>
          <input
            type="email"
            id="create-email"
            name="email"
            className={`user-form-modal__input ${errors.email ? 'user-form-modal__input--error' : ''}`}
            value={formData.email}
            onChange={handleInputChange}
            disabled={isLoading}
            autoFocus
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'create-email-error' : undefined}
          />
          {errors.email && (
            <span id="create-email-error" className="user-form-modal__field-error" role="alert">
              {errors.email}
            </span>
          )}
        </div>

        {/* Name field */}
        <div className="user-form-modal__field">
          <label htmlFor="create-name" className="user-form-modal__label">
            Name *
          </label>
          <input
            type="text"
            id="create-name"
            name="name"
            className={`user-form-modal__input ${errors.name ? 'user-form-modal__input--error' : ''}`}
            value={formData.name}
            onChange={handleInputChange}
            disabled={isLoading}
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'create-name-error' : undefined}
          />
          {errors.name && (
            <span id="create-name-error" className="user-form-modal__field-error" role="alert">
              {errors.name}
            </span>
          )}
        </div>

        {/* Password field */}
        <div className="user-form-modal__field">
          <label htmlFor="create-password" className="user-form-modal__label">
            Passwort *
          </label>
          <input
            type="password"
            id="create-password"
            name="password"
            className={`user-form-modal__input ${errors.password ? 'user-form-modal__input--error' : ''}`}
            value={formData.password}
            onChange={handleInputChange}
            disabled={isLoading}
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'create-password-error' : undefined}
          />
          {errors.password && (
            <span id="create-password-error" className="user-form-modal__field-error" role="alert">
              {errors.password}
            </span>
          )}
        </div>

        {/* Confirm Password field */}
        <div className="user-form-modal__field">
          <label htmlFor="create-confirm-password" className="user-form-modal__label">
            Passwort bestätigen *
          </label>
          <input
            type="password"
            id="create-confirm-password"
            name="confirmPassword"
            className={`user-form-modal__input ${errors.confirmPassword ? 'user-form-modal__input--error' : ''}`}
            value={formData.confirmPassword}
            onChange={handleInputChange}
            disabled={isLoading}
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? 'create-confirm-password-error' : undefined}
          />
          {errors.confirmPassword && (
            <span id="create-confirm-password-error" className="user-form-modal__field-error" role="alert">
              {errors.confirmPassword}
            </span>
          )}
        </div>

        {/* Status field */}
        <div className="user-form-modal__field">
          <label htmlFor="create-status" className="user-form-modal__label">
            Status
          </label>
          <select
            id="create-status"
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
            <label htmlFor="create-roles" className="user-form-modal__label">
              Rollen
            </label>
            <select
              id="create-roles"
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

export default UserCreateModal;
