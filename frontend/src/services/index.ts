/**
 * Services Index
 * STORY-008: Session Management mit "Remember Me"
 * STORY-007B: User Role Assignment
 *
 * Exports all service modules for easy importing
 */

export { authService, passwordResetService } from './authService';
export type {
  Session,
  LoginRequest,
  LoginResponse,
  TokenRefreshResponse,
  SessionsResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from './authService';

export { usersService } from './usersService';
export type {
  User,
  UserWithPermissions,
  Role,
  Pagination,
  PaginatedResponse,
  ListUsersParams,
  CreateUserDto,
  UpdateUserDto,
  AssignRolesDto,
} from './usersService';

export { rolesService } from './rolesService';
export type { Permission } from './rolesService';

// STORY-030: Application Versioning
export { versionService } from './versionService';
export type { VersionInfo } from './versionService';

// STORY-017B: Theme-System Frontend
export { themeService, DEFAULT_THEME_COLORS } from './themeService';
export type {
  ThemeColors,
  ThemeBackgroundColors,
  ThemeTextColors,
  ThemeStatusColors,
  UpdateThemeColorsDto,
} from './themeService';

// STORY-013B: In-App Settings Frontend UI
export { settingsService } from './settingsService';
export type {
  GeneralSettings,
  SecuritySettings,
  EmailSettings,
  AllSettings,
  UpdateGeneralSettingsDto,
  UpdateSecuritySettingsDto,
  UpdateEmailSettingsDto,
  SettingsCategory,
  ResetResponse,
} from './settingsService';
