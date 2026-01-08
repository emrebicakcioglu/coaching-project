/**
 * Database Type Definitions
 * STORY-024B: PostgreSQL Schema & Migrations
 * STORY-025: Benutzerdaten (User Data Storage)
 * STORY-013A: In-App Settings Backend
 *
 * TypeScript interfaces for database entities
 */

// =====================================
// User Types (STORY-025: User Data Storage)
// =====================================

/**
 * User status enum
 * STORY-025: Support for status values: active, inactive, suspended, deleted
 * STORY-023: Added 'pending' status for unverified users
 */
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'deleted' | 'pending';

/**
 * User entity interface
 * STORY-025: User profile data structure
 *
 * Required fields:
 * - id: Primary Key (SERIAL)
 * - email: Unique, indexed
 * - password_hash: bcrypt hashed (cost factor 12)
 * - name: User display name
 * - status: User account status
 * - created_at: Auto-populated on creation
 * - updated_at: Auto-updated on modification
 *
 * Optional fields:
 * - mfa_secret: For MFA authentication
 * - last_login: Last login timestamp
 * - deleted_at: Soft delete timestamp
 */
export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  status: UserStatus;
  mfa_enabled: boolean;
  mfa_secret?: string | null;
  created_at: Date;
  updated_at: Date;
  last_login?: Date | null;
  deleted_at?: Date | null;
  // STORY-018A: Language preferences
  language?: string;
  date_format?: string;
  number_format?: string;
  // STORY-023: Email verification fields
  verification_token_hash?: string | null;
  verification_token_expires?: Date | null;
  email_verified_at?: Date | null;
}

export interface UserInsert {
  email: string;
  password_hash: string;
  name: string;
  status?: UserStatus;
  mfa_enabled?: boolean;
  mfa_secret?: string | null;
  // STORY-018A: Language preferences
  language?: string;
  date_format?: string;
  number_format?: string;
  // STORY-023: Email verification fields
  verification_token_hash?: string | null;
  verification_token_expires?: Date | null;
}

export interface UserUpdate {
  email?: string;
  password_hash?: string;
  name?: string;
  status?: UserStatus;
  mfa_enabled?: boolean;
  mfa_secret?: string | null;
  last_login?: Date | null;
  updated_at?: Date;
  deleted_at?: Date | null;
  // STORY-018A: Language preferences
  language?: string;
  date_format?: string;
  number_format?: string;
  // STORY-023: Email verification fields
  verification_token_hash?: string | null;
  verification_token_expires?: Date | null;
  email_verified_at?: Date | null;
}

// =====================================
// Role Types (STORY-007A: Rollen-Management Backend)
// =====================================

export interface Role {
  id: number;
  name: string;
  description?: string | null;
  is_system?: boolean;
  created_at: Date;
}

export interface RoleInsert {
  name: string;
  description?: string | null;
  is_system?: boolean;
}

export interface RoleUpdate {
  name?: string;
  description?: string | null;
  is_system?: boolean;
}

// =====================================
// Permission Types
// =====================================

export interface Permission {
  id: number;
  name: string;
  description?: string | null;
  category?: string | null;
}

export interface PermissionInsert {
  name: string;
  description?: string | null;
  category?: string | null;
}

export interface PermissionUpdate {
  name?: string;
  description?: string | null;
  category?: string | null;
}

// =====================================
// Junction Table Types
// =====================================

export interface UserRole {
  user_id: number;
  role_id: number;
  assigned_at: Date;
  assigned_by?: number | null;
}

/**
 * User with roles attached
 * STORY-007B: User Role Assignment
 */
export interface UserWithRoles extends User {
  roles: Array<{
    id: number;
    name: string;
    description?: string | null;
  }>;
}

/**
 * User with roles and aggregated permissions
 * STORY-007B: User Role Assignment
 */
export interface UserWithPermissions extends UserWithRoles {
  permissions: string[];
}

export interface RolePermission {
  role_id: number;
  permission_id: number;
}

// =====================================
// App Settings Types
// =====================================

/**
 * Background colors configuration
 * STORY-017: Theme-System Backend
 */
export interface ThemeBackgroundColors {
  page?: string;
  card?: string;
}

/**
 * Text colors configuration
 * STORY-017: Theme-System Backend
 */
export interface ThemeTextColors {
  primary?: string;
  secondary?: string;
}

/**
 * Status colors configuration
 * STORY-017: Theme-System Backend
 */
export interface ThemeStatusColors {
  success?: string;
  warning?: string;
  error?: string;
}

/**
 * Theme colors configuration with nested structure
 * STORY-017: Theme-System Backend
 *
 * Structure:
 * - primary: Main brand color
 * - secondary: Secondary brand color
 * - background: { page, card } - Background colors
 * - text: { primary, secondary } - Text colors
 * - status: { success, warning, error } - Status indicator colors
 *
 * @deprecated accent property - use the nested structure instead
 */
export interface ThemeColors {
  primary?: string;
  secondary?: string;
  /** @deprecated Use background.page instead */
  accent?: string;
  /** @deprecated Use background nested object instead */
  background?: string | ThemeBackgroundColors;
  /** @deprecated Use text nested object instead */
  text?: string | ThemeTextColors;
  status?: ThemeStatusColors;
  [key: string]: string | ThemeBackgroundColors | ThemeTextColors | ThemeStatusColors | undefined;
}

/**
 * Enhanced Theme colors with required nested structure
 * STORY-017: Theme-System Backend
 */
export interface EnhancedThemeColors {
  primary: string;
  secondary: string;
  background: ThemeBackgroundColors;
  text: ThemeTextColors;
  status: ThemeStatusColors;
}

export interface FeatureFlags {
  mfa_enabled?: boolean;
  registration_enabled?: boolean;
  password_reset_enabled?: boolean;
  [key: string]: boolean | undefined;
}

export interface MaintenanceSettings {
  enabled: boolean;
  message?: string;
  scheduled_start?: Date | string;
  scheduled_end?: Date | string;
  [key: string]: boolean | string | Date | undefined;
}

/**
 * Security settings configuration
 * STORY-013A: In-App Settings Backend
 */
export interface SecuritySettings {
  max_login_attempts: number;
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_lowercase: boolean;
  password_require_numbers: boolean;
  password_require_special_chars: boolean;
  session_inactivity_timeout: number;
}

/**
 * Email settings configuration
 * STORY-013A: In-App Settings Backend
 */
export interface EmailSettings {
  signature?: string;
  [key: string]: string | undefined;
}

export interface AppSettings {
  id: 1;
  company_name: string;
  app_title: string;
  logo_url?: string | null;
  theme_colors?: ThemeColors | null;
  features?: FeatureFlags | null;
  maintenance?: MaintenanceSettings | null;
  updated_at: Date;
  // STORY-035: Support-E-Mail & Session-Timeout
  support_email?: string | null;
  session_timeout_minutes: number;
  show_timeout_warning: boolean;
  warning_before_timeout_minutes?: number | null;
  last_updated_by?: number | null;
  // STORY-013A: In-App Settings Backend - Security Settings
  max_login_attempts?: number;
  password_min_length?: number;
  password_require_uppercase?: boolean;
  password_require_lowercase?: boolean;
  password_require_numbers?: boolean;
  password_require_special_chars?: boolean;
  session_inactivity_timeout?: number;
  // STORY-013A: In-App Settings Backend - General Settings
  default_language?: string;
  pagination_size?: number;
  // STORY-013A: In-App Settings Backend - Email Settings
  email_settings?: EmailSettings | null;
  // STORY-018A: Language Settings
  supported_languages?: string[];
  fallback_language?: string;
}

export interface AppSettingsUpdate {
  company_name?: string;
  app_title?: string;
  logo_url?: string | null;
  theme_colors?: ThemeColors | null;
  features?: FeatureFlags | null;
  maintenance?: MaintenanceSettings | null;
  updated_at?: Date;
  // STORY-035: Support-E-Mail & Session-Timeout
  support_email?: string | null;
  session_timeout_minutes?: number;
  show_timeout_warning?: boolean;
  warning_before_timeout_minutes?: number | null;
  last_updated_by?: number | null;
  // STORY-013A: In-App Settings Backend - Security Settings
  max_login_attempts?: number;
  password_min_length?: number;
  password_require_uppercase?: boolean;
  password_require_lowercase?: boolean;
  password_require_numbers?: boolean;
  password_require_special_chars?: boolean;
  session_inactivity_timeout?: number;
  // STORY-013A: In-App Settings Backend - General Settings
  default_language?: string;
  pagination_size?: number;
  // STORY-013A: In-App Settings Backend - Email Settings
  email_settings?: EmailSettings | null;
  // STORY-018A: Language Settings
  supported_languages?: string[];
  fallback_language?: string;
}

// =====================================
// Language Settings Types (STORY-018A: Standard-Sprache Backend)
// =====================================

/**
 * Admin language settings configuration
 * STORY-018A: Standard-Sprache Backend (i18n Setup)
 */
export interface AdminLanguageSettings {
  default_language: string;
  supported_languages: string[];
  fallback_language: string;
}

/**
 * User language preference settings
 * STORY-018A: Standard-Sprache Backend (i18n Setup)
 */
export interface UserLanguagePreference {
  language: string;
  date_format: string;
  number_format: string;
}

// =====================================
// Settings History Types (STORY-013A: In-App Settings Backend)
// =====================================

/**
 * Settings history entry for audit trail
 * STORY-013A: In-App Settings Backend
 */
export interface SettingsHistory {
  id: number;
  category: string;
  old_value: Record<string, unknown>;
  new_value: Record<string, unknown>;
  changed_by: number | null;
  changed_at: Date;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
}

/**
 * Settings history insert interface
 * STORY-013A: In-App Settings Backend
 */
export interface SettingsHistoryInsert {
  category: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  changed_by?: number | null;
  ip_address?: string | null;
  user_agent?: string | null;
  request_id?: string | null;
}

/**
 * Settings category type
 * STORY-013A: In-App Settings Backend
 */
export type SettingsCategory = 'general' | 'security' | 'email' | 'branding' | 'features';

// =====================================
// General Settings Types (STORY-035: Support-E-Mail & Session-Timeout)
// =====================================

/**
 * General settings for support email and session timeout
 * These settings are stored in the app_settings table
 */
export interface GeneralSettings {
  support_email: string | null;
  session_timeout_minutes: number;
  show_timeout_warning: boolean;
  warning_before_timeout_minutes: number;
  updated_at: Date;
  updated_by: number | null;
}

/**
 * Update DTO for general settings
 */
export interface GeneralSettingsUpdate {
  support_email?: string | null;
  session_timeout_minutes?: number;
  show_timeout_warning?: boolean;
  warning_before_timeout_minutes?: number;
}

// =====================================
// Refresh Token Types (STORY-008: Session Management)
// =====================================

export interface RefreshToken {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
  revoked_at?: Date | null;
  device_info?: string | null;
  ip_address?: string | null;
  // STORY-008: Session Management additions
  browser?: string | null;
  location?: string | null;
  last_used_at?: Date | null;
  remember_me?: boolean;
  // STORY-107: Session fingerprint for session reuse detection
  fingerprint?: string | null;
}

export interface RefreshTokenInsert {
  user_id: number;
  token_hash: string;
  expires_at: Date;
  device_info?: string | null;
  ip_address?: string | null;
  // STORY-008: Session Management additions
  browser?: string | null;
  location?: string | null;
  remember_me?: boolean;
  // STORY-107: Session fingerprint for session reuse detection
  fingerprint?: string | null;
}

/**
 * Session response for API endpoints (STORY-008)
 * Represents a user session without sensitive data
 */
export interface SessionResponse {
  id: number;
  device: string;
  browser: string;
  ip: string;
  location: string | null;
  lastActivity: string;
  createdAt: string;
  current: boolean;
}

// =====================================
// Migration Types
// =====================================

export interface Migration {
  id: number;
  name: string;
  executed_at: Date;
  checksum: string;
}

export interface MigrationFile {
  version: string;
  name: string;
  up: string;
  down: string;
}

// =====================================
// Audit Log Types (STORY-028)
// =====================================

/**
 * Log level for audit events
 * - info: Standard audit events (login, logout, etc.)
 * - warn: Suspicious or noteworthy events (failed login, permission denied)
 * - error: Error events that need attention
 */
export type AuditLogLevel = 'info' | 'warn' | 'error';

/**
 * Standard audit action types
 * These are the predefined action types for common events
 */
export type AuditAction =
  // Authentication events
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_LOGIN_FAILED'
  // User management events
  | 'USER_REGISTER'
  | 'USER_PASSWORD_CHANGE'
  | 'USER_PROFILE_UPDATE'
  | 'USER_STATUS_CHANGE'
  // Role/Permission events
  | 'ROLE_ASSIGN'
  | 'ROLE_REVOKE'
  | 'PERMISSION_CHANGE'
  // Settings events
  | 'SETTINGS_UPDATE'
  // API request events
  | 'API_REQUEST'
  // Generic events
  | string;

/**
 * Audit log entry interface
 * Represents a single audit log record in the database
 */
export interface AuditLog {
  id: number;
  user_id: number | null;
  action: AuditAction;
  resource: string | null;
  resource_id: number | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  log_level: AuditLogLevel;
  created_at: Date;
}

/**
 * Audit log insert interface
 * Used when creating a new audit log entry
 */
export interface AuditLogInsert {
  user_id?: number | null;
  action: AuditAction;
  resource?: string | null;
  resource_id?: number | null;
  details?: Record<string, unknown>;
  ip_address?: string | null;
  user_agent?: string | null;
  request_id?: string | null;
  log_level?: AuditLogLevel;
}

/**
 * Audit log query filter interface
 * Used for querying/filtering audit logs
 */
export interface AuditLogFilter {
  user_id?: number;
  action?: AuditAction;
  resource?: string;
  resource_id?: number;
  log_level?: AuditLogLevel;
  start_date?: Date;
  end_date?: Date;
  ip_address?: string;
  limit?: number;
  offset?: number;
}

// =====================================
// Email Template Types (STORY-023B)
// =====================================

/**
 * Email template stored in database
 * Supports Handlebars syntax for variable substitution
 */
export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  html_content: string;
  text_content?: string | null;
  variables: string[];
  description?: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface EmailTemplateInsert {
  name: string;
  subject: string;
  html_content: string;
  text_content?: string | null;
  variables?: string[];
  description?: string | null;
  is_active?: boolean;
}

export interface EmailTemplateUpdate {
  name?: string;
  subject?: string;
  html_content?: string;
  text_content?: string | null;
  variables?: string[];
  description?: string | null;
  is_active?: boolean;
  updated_at?: Date;
}

// =====================================
// Email Queue Types (STORY-023B)
// =====================================

/**
 * Queue status for email items
 */
export type EmailQueueStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';

/**
 * Email queue item for async processing
 */
export interface EmailQueueItem {
  id: number;
  template_name: string;
  recipient: string;
  subject: string;
  variables: Record<string, unknown>;
  priority: number;
  status: EmailQueueStatus;
  retry_count: number;
  max_retries: number;
  next_retry_at?: Date | null;
  error?: string | null;
  message_id?: string | null;
  scheduled_at: Date;
  processing_started_at?: Date | null;
  completed_at?: Date | null;
  created_at: Date;
}

export interface EmailQueueItemInsert {
  template_name: string;
  recipient: string;
  subject: string;
  variables?: Record<string, unknown>;
  priority?: number;
  max_retries?: number;
  scheduled_at?: Date;
}

export interface EmailQueueItemUpdate {
  status?: EmailQueueStatus;
  retry_count?: number;
  next_retry_at?: Date | null;
  error?: string | null;
  message_id?: string | null;
  processing_started_at?: Date | null;
  completed_at?: Date | null;
}

/**
 * Queue statistics for monitoring
 */
export interface EmailQueueStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  total: number;
}

/**
 * Email queue filter for querying
 */
export interface EmailQueueFilter {
  status?: EmailQueueStatus;
  template_name?: string;
  recipient?: string;
  start_date?: Date;
  end_date?: Date;
  limit?: number;
  offset?: number;
}

// =====================================
// MFA Types (STORY-005A: MFA Setup Backend)
// =====================================

/**
 * User backup code for MFA recovery
 * Backup codes are hashed with bcrypt and can only be used once
 */
export interface UserBackupCode {
  id: number;
  user_id: number;
  code_hash: string;
  used: boolean;
  used_at?: Date | null;
  created_at: Date;
}

export interface UserBackupCodeInsert {
  user_id: number;
  code_hash: string;
  used?: boolean;
}

/**
 * MFA Setup Response
 * Returned when initiating MFA setup
 */
export interface MFASetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

/**
 * MFA Verify Response
 * Returned after successfully verifying and enabling MFA
 */
export interface MFAVerifyResponse {
  message: string;
  enabled: boolean;
}
