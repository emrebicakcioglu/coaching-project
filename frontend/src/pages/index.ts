/**
 * Pages Index
 * STORY-001: Login System
 * STORY-008: Session Management mit "Remember Me"
 * STORY-008B: Permission-System (Frontend)
 * STORY-009: Password Reset
 * STORY-007B: User Role Assignment
 * STORY-017A: Layout & Grid-System
 * STORY-017B: Component Responsiveness
 * STORY-016A: Context Menu Core Navigation
 * STORY-023: User Registration
 * STORY-005C: MFA UI (Frontend)
 * BUG-006: Privacy Policy Page
 */

// Auth Pages
export { LoginPage } from './LoginPage';
export { ForgotPasswordPage } from './ForgotPasswordPage';
export { ResetPasswordPage } from './ResetPasswordPage';

// Permission Pages (STORY-008B)
export { ForbiddenPage } from './ForbiddenPage';

// Registration Pages (STORY-023)
export { RegisterPage } from './RegisterPage';
export { RegistrationSuccessPage } from './RegistrationSuccessPage';
export { EmailVerificationPage } from './EmailVerificationPage';

// Privacy Policy Page (BUG-006)
export { PrivacyPage } from './PrivacyPage';

// MFA Pages (STORY-005C)
export { MFASetupPage } from './MFASetupPage';

// Session Management
export { SessionsPage } from './SessionsPage';

// User Management (STORY-007B)
export { UsersListPage } from './UsersListPage';
export { UserDetailsPage } from './UserDetailsPage';

// Main Application Pages (STORY-016A)
export { DashboardPage } from './DashboardPage';
export { RolesPage } from './RolesPage';
export { SettingsPage } from './SettingsPage';
export { HelpPage } from './HelpPage';
export { DesignSystemPage } from './DesignSystemPage';
export { default as LanguagesPage } from './LanguagesPage';

// Demo Pages (STORY-017A)
export { GridDemoPage } from './GridDemoPage';

// Demo Pages (STORY-017B: Component Responsiveness)
export { default as ResponsiveDemoPage } from './ResponsiveDemoPage';

// Maintenance Page (STORY-034)
export { MaintenancePage } from './MaintenancePage';

// Feedback Admin Page (STORY-041H)
export { FeedbackAdminPage } from './FeedbackAdminPage';
