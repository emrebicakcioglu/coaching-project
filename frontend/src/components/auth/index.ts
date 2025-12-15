/**
 * Auth Components Index
 * STORY-007B: Login System Frontend UI
 * STORY-008: Session Management mit "Remember Me"
 * STORY-008B: Permission-System (Frontend)
 * STORY-009: Password Reset
 * STORY-023: User Registration
 * STORY-005C: MFA UI (Frontend)
 */

// STORY-007B: Login System Frontend UI
export { LoginForm } from './LoginForm';
export type { LoginFormProps, LoginFormData } from './LoginForm';

export { PrivateRoute } from './PrivateRoute';
export type { PrivateRouteProps } from './PrivateRoute';

// STORY-008: Session Management mit "Remember Me"
export { RememberMeCheckbox } from './RememberMeCheckbox';
export type { RememberMeCheckboxProps } from './RememberMeCheckbox';

// STORY-008B: Permission-System (Frontend)
export { ProtectedRoute } from './ProtectedRoute';
export type { ProtectedRouteProps } from './ProtectedRoute';

export { IfHasPermission } from './IfHasPermission';
export type { IfHasPermissionProps } from './IfHasPermission';

export { withPermission } from './withPermission';
export type { WithPermissionOptions, WithPermissionComponent, InjectedPermissionProps } from './withPermission';

// STORY-009: Password Reset
export { PasswordStrengthIndicator, usePasswordValidation } from './PasswordStrengthIndicator';

// STORY-023: User Registration
export { RegisterForm } from './RegisterForm';
export type { RegisterFormProps, RegisterFormData } from './RegisterForm';

// STORY-005C: MFA UI (Frontend)
export { MFACodeInput } from './MFACodeInput';
export type { MFACodeInputProps } from './MFACodeInput';

export { BackupCodesList } from './BackupCodesList';
export type { BackupCodesListProps } from './BackupCodesList';

export { MFALoginPrompt } from './MFALoginPrompt';
export type { MFALoginPromptProps } from './MFALoginPrompt';

// STORY-CAPTCHA: Login Security
export { CaptchaInput } from './CaptchaInput';
export type { CaptchaInputProps } from './CaptchaInput';
