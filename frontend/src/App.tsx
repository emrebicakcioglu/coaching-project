/**
 * Main Application Component
 * STORY-007B: Login System Frontend UI
 * STORY-008B: Permission-System (Frontend)
 * STORY-017A: Layout & Grid-System
 * STORY-017B: Theme-System Frontend
 * STORY-016A: Context Menu Core Navigation
 * STORY-023: User Registration
 * STORY-005C: MFA UI (Frontend)
 * STORY-034: Maintenance Mode
 * STORY-041F: Feedback Trigger UI
 * STORY-041G: Feedback Modal UI
 * STORY-041H: Feedback Admin Page
 *
 * Root component with routing configuration for all pages.
 * Wrapped in ThemeProvider for dynamic theming and AuthProvider for authentication.
 * Uses PrivateRoute for protected routes with authentication checking.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ThemeProvider, DarkModeProvider, LanguageProvider, FeedbackProvider } from './contexts';
import { AppLayout } from './components/layout';
import { PrivateRoute } from './components/auth';
import { MaintenanceGuard } from './components/maintenance';
import { FeedbackButton, FeedbackModal } from './components/feedback';
import { useFeedback } from './contexts';
import {
  LoginPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  ForbiddenPage,
  RegisterPage,
  RegistrationSuccessPage,
  EmailVerificationPage,
  MFASetupPage,
  SessionsPage,
  UsersListPage,
  UserDetailsPage,
  DashboardPage,
  RolesPage,
  SettingsPage,
  HelpPage,
  GridDemoPage,
  ResponsiveDemoPage,
  DesignSystemPage,
  LanguagesPage,
  FeedbackAdminPage,
} from './pages';

/**
 * ProtectedRouteWithLayout Component
 *
 * Wrapper that combines PrivateRoute (authentication check) with AppLayout.
 * Optionally accepts a permission requirement.
 */
interface ProtectedRouteWithLayoutProps {
  children: React.ReactNode;
  permission?: string;
}

const ProtectedRouteWithLayout: React.FC<ProtectedRouteWithLayoutProps> = ({
  children,
  permission,
}) => {
  return (
    <PrivateRoute permission={permission}>
      <AppLayout>{children}</AppLayout>
    </PrivateRoute>
  );
};

/**
 * FeedbackModalWrapper Component
 * STORY-041G: Feedback Modal UI
 *
 * Wrapper component that uses FeedbackContext to show/hide the modal.
 * Must be rendered inside FeedbackProvider.
 */
const FeedbackModalWrapper: React.FC = () => {
  const { isModalOpen, screenshot, closeModal } = useFeedback();

  return (
    <FeedbackModal
      isOpen={isModalOpen}
      onClose={closeModal}
      screenshot={screenshot}
      data-testid="app-feedback-modal"
    />
  );
};

/**
 * App Component
 *
 * Main application component with route definitions.
 * Wrapped in ThemeProvider for dynamic theming and AuthProvider for authentication.
 * ThemeProvider wraps AuthProvider to ensure theme is available throughout the app.
 */
const App: React.FC = () => {
  return (
    <ThemeProvider data-testid="app-theme-provider">
      <DarkModeProvider>
        <LanguageProvider>
          <AuthProvider>
            <FeedbackProvider>
              <MaintenanceGuard>
                <Routes>
                  {/* Auth Routes (No Layout) */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />

                  {/* Registration Routes (STORY-023 - No Layout) */}
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/registration-success" element={<RegistrationSuccessPage />} />
                  <Route path="/verify-email" element={<EmailVerificationPage />} />

                  {/* Permission Denied Route (STORY-008B - No Layout) */}
                  <Route path="/forbidden" element={<ForbiddenPage />} />

                  {/* Protected Routes (With Sidebar Layout and Auth Check) */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRouteWithLayout>
                        <DashboardPage />
                      </ProtectedRouteWithLayout>
                    }
                  />

                  {/* Session Management */}
                  <Route
                    path="/sessions"
                    element={
                      <ProtectedRouteWithLayout>
                        <SessionsPage />
                      </ProtectedRouteWithLayout>
                    }
                  />

                  {/* User Management */}
                  <Route
                    path="/users"
                    element={
                      <ProtectedRouteWithLayout permission="users.read">
                        <UsersListPage />
                      </ProtectedRouteWithLayout>
                    }
                  />
                  {/* /users/new redirects to /users - user creation is handled via modal in UsersListPage */}
                  <Route
                    path="/users/new"
                    element={<Navigate to="/users" replace />}
                  />
                  <Route
                    path="/users/:id"
                    element={
                      <ProtectedRouteWithLayout permission="users.read">
                        <UserDetailsPage />
                      </ProtectedRouteWithLayout>
                    }
                  />

                  {/* Roles & Permissions */}
                  <Route
                    path="/roles"
                    element={
                      <ProtectedRouteWithLayout permission="roles.read">
                        <RolesPage />
                      </ProtectedRouteWithLayout>
                    }
                  />

                  {/* Settings */}
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRouteWithLayout permission="settings.read">
                        <SettingsPage />
                      </ProtectedRouteWithLayout>
                    }
                  />

                  {/* Design System */}
                  <Route
                    path="/design"
                    element={
                      <ProtectedRouteWithLayout permission="design.read">
                        <DesignSystemPage />
                      </ProtectedRouteWithLayout>
                    }
                  />

                  {/* Languages Management */}
                  <Route
                    path="/languages"
                    element={
                      <ProtectedRouteWithLayout permission="languages.manage">
                        <LanguagesPage />
                      </ProtectedRouteWithLayout>
                    }
                  />

                  {/* MFA Setup (STORY-005C) */}
                  <Route
                    path="/settings/security/mfa"
                    element={
                      <ProtectedRouteWithLayout>
                        <MFASetupPage />
                      </ProtectedRouteWithLayout>
                    }
                  />

                  {/* Help */}
                  <Route
                    path="/help"
                    element={
                      <ProtectedRouteWithLayout>
                        <HelpPage />
                      </ProtectedRouteWithLayout>
                    }
                  />

                  {/* Feedback Admin (STORY-041H) */}
                  <Route
                    path="/admin/feedback"
                    element={
                      <ProtectedRouteWithLayout permission="feedback.manage">
                        <FeedbackAdminPage />
                      </ProtectedRouteWithLayout>
                    }
                  />

                  {/* Demo Pages (STORY-017A & STORY-017B) */}
                  {/* GridDemo is public to enable E2E testing without authentication */}
                  <Route path="/grid-demo" element={<GridDemoPage />} />
                  <Route
                    path="/responsive-demo"
                    element={
                      <ProtectedRouteWithLayout>
                        <ResponsiveDemoPage />
                      </ProtectedRouteWithLayout>
                    }
                  />

                  {/* Default redirect to dashboard (or login if not authenticated) */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />

                  {/* 404 - Redirect to dashboard */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
                {/* STORY-041F: Feedback Trigger UI - Floating Button */}
                <FeedbackButton />
                {/* STORY-041G: Feedback Modal UI */}
                <FeedbackModalWrapper />
              </MaintenanceGuard>
            </FeedbackProvider>
          </AuthProvider>
        </LanguageProvider>
      </DarkModeProvider>
    </ThemeProvider>
  );
};

export default App;
