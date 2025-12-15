-- Migration: Create Color Schemes Table
-- Design System: Color Schemes Management
-- Version: 026
--
-- Creates table for storing multiple color schemes that can be applied to the UI.
-- Each scheme contains a complete set of design tokens for:
-- - Colors (primary, secondary, accent, backgrounds, text, status, borders)
-- - Button styles (normal, inactive, abort, special)
-- - Typography styles (headers, body text, labels, etc.)

-- UP
CREATE TABLE color_schemes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Color tokens stored as JSONB for flexibility
  colors JSONB NOT NULL DEFAULT '{
    "primary": "#2563eb",
    "primaryHover": "#1d4ed8",
    "primaryLight": "#dbeafe",
    "secondary": "#7c3aed",
    "secondaryHover": "#6d28d9",
    "secondaryLight": "#ede9fe",
    "accent": "#06b6d4",
    "accentHover": "#0891b2",
    "accentLight": "#cffafe",
    "background": {
      "page": "#f9fafb",
      "card": "#ffffff",
      "sidebar": "#1f2937",
      "modal": "#ffffff",
      "input": "#ffffff"
    },
    "text": {
      "primary": "#111827",
      "secondary": "#6b7280",
      "muted": "#9ca3af",
      "inverse": "#ffffff",
      "link": "#2563eb"
    },
    "border": {
      "light": "#e5e7eb",
      "default": "#d1d5db",
      "dark": "#9ca3af"
    },
    "status": {
      "success": "#10b981",
      "successLight": "#d1fae5",
      "warning": "#f59e0b",
      "warningLight": "#fef3c7",
      "error": "#ef4444",
      "errorLight": "#fee2e2",
      "info": "#3b82f6",
      "infoLight": "#dbeafe"
    }
  }'::jsonb,

  -- Button styles
  buttons JSONB NOT NULL DEFAULT '{
    "normal": {
      "background": "#2563eb",
      "text": "#ffffff",
      "border": "#2563eb",
      "hoverBackground": "#1d4ed8",
      "hoverText": "#ffffff",
      "hoverBorder": "#1d4ed8"
    },
    "inactive": {
      "background": "#e5e7eb",
      "text": "#9ca3af",
      "border": "#e5e7eb",
      "hoverBackground": "#e5e7eb",
      "hoverText": "#9ca3af",
      "hoverBorder": "#e5e7eb"
    },
    "abort": {
      "background": "#ffffff",
      "text": "#6b7280",
      "border": "#d1d5db",
      "hoverBackground": "#f9fafb",
      "hoverText": "#374151",
      "hoverBorder": "#9ca3af"
    },
    "special": {
      "background": "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
      "text": "#ffffff",
      "border": "transparent",
      "hoverBackground": "linear-gradient(135deg, #1d4ed8 0%, #6d28d9 100%)",
      "hoverText": "#ffffff",
      "hoverBorder": "transparent"
    },
    "danger": {
      "background": "#ef4444",
      "text": "#ffffff",
      "border": "#ef4444",
      "hoverBackground": "#dc2626",
      "hoverText": "#ffffff",
      "hoverBorder": "#dc2626"
    },
    "success": {
      "background": "#10b981",
      "text": "#ffffff",
      "border": "#10b981",
      "hoverBackground": "#059669",
      "hoverText": "#ffffff",
      "hoverBorder": "#059669"
    }
  }'::jsonb,

  -- Typography styles
  typography JSONB NOT NULL DEFAULT '{
    "fontFamily": {
      "primary": "Inter, system-ui, -apple-system, sans-serif",
      "mono": "ui-monospace, SFMono-Regular, Menlo, monospace"
    },
    "heading": {
      "h1": {"fontSize": "2.25rem", "fontWeight": "700", "lineHeight": "1.2", "color": "text.primary"},
      "h2": {"fontSize": "1.875rem", "fontWeight": "600", "lineHeight": "1.25", "color": "text.primary"},
      "h3": {"fontSize": "1.5rem", "fontWeight": "600", "lineHeight": "1.3", "color": "text.primary"},
      "h4": {"fontSize": "1.25rem", "fontWeight": "600", "lineHeight": "1.4", "color": "text.primary"},
      "h5": {"fontSize": "1.125rem", "fontWeight": "500", "lineHeight": "1.4", "color": "text.primary"},
      "h6": {"fontSize": "1rem", "fontWeight": "500", "lineHeight": "1.5", "color": "text.primary"}
    },
    "body": {
      "large": {"fontSize": "1.125rem", "fontWeight": "400", "lineHeight": "1.75", "color": "text.primary"},
      "normal": {"fontSize": "1rem", "fontWeight": "400", "lineHeight": "1.5", "color": "text.primary"},
      "small": {"fontSize": "0.875rem", "fontWeight": "400", "lineHeight": "1.5", "color": "text.secondary"}
    },
    "label": {
      "large": {"fontSize": "0.875rem", "fontWeight": "500", "lineHeight": "1.25", "color": "text.primary"},
      "normal": {"fontSize": "0.75rem", "fontWeight": "500", "lineHeight": "1.25", "color": "text.secondary"},
      "small": {"fontSize": "0.625rem", "fontWeight": "500", "lineHeight": "1.25", "color": "text.muted", "textTransform": "uppercase", "letterSpacing": "0.05em"}
    },
    "code": {
      "fontSize": "0.875rem",
      "fontWeight": "400",
      "lineHeight": "1.5",
      "fontFamily": "mono",
      "background": "#f3f4f6",
      "color": "#111827"
    }
  }'::jsonb,

  -- Input field styles
  inputs JSONB NOT NULL DEFAULT '{
    "normal": {
      "background": "#ffffff",
      "text": "#111827",
      "border": "#d1d5db",
      "placeholder": "#9ca3af",
      "focusBorder": "#2563eb",
      "focusRing": "rgba(37, 99, 235, 0.2)"
    },
    "error": {
      "background": "#ffffff",
      "text": "#111827",
      "border": "#ef4444",
      "placeholder": "#9ca3af",
      "focusBorder": "#ef4444",
      "focusRing": "rgba(239, 68, 68, 0.2)"
    },
    "disabled": {
      "background": "#f3f4f6",
      "text": "#9ca3af",
      "border": "#e5e7eb",
      "placeholder": "#d1d5db",
      "focusBorder": "#e5e7eb",
      "focusRing": "transparent"
    }
  }'::jsonb,

  -- Card/Panel styles
  cards JSONB NOT NULL DEFAULT '{
    "default": {
      "background": "#ffffff",
      "border": "#e5e7eb",
      "shadow": "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      "borderRadius": "0.75rem"
    },
    "elevated": {
      "background": "#ffffff",
      "border": "transparent",
      "shadow": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      "borderRadius": "0.75rem"
    },
    "flat": {
      "background": "#f9fafb",
      "border": "transparent",
      "shadow": "none",
      "borderRadius": "0.5rem"
    }
  }'::jsonb,

  -- Badge/Tag styles
  badges JSONB NOT NULL DEFAULT '{
    "default": {"background": "#e5e7eb", "text": "#374151"},
    "primary": {"background": "#dbeafe", "text": "#1d4ed8"},
    "secondary": {"background": "#ede9fe", "text": "#6d28d9"},
    "success": {"background": "#d1fae5", "text": "#059669"},
    "warning": {"background": "#fef3c7", "text": "#d97706"},
    "error": {"background": "#fee2e2", "text": "#dc2626"},
    "info": {"background": "#dbeafe", "text": "#2563eb"}
  }'::jsonb,

  -- Alert/Notification styles
  alerts JSONB NOT NULL DEFAULT '{
    "success": {
      "background": "#d1fae5",
      "border": "#10b981",
      "text": "#065f46",
      "icon": "#10b981"
    },
    "warning": {
      "background": "#fef3c7",
      "border": "#f59e0b",
      "text": "#92400e",
      "icon": "#f59e0b"
    },
    "error": {
      "background": "#fee2e2",
      "border": "#ef4444",
      "text": "#991b1b",
      "icon": "#ef4444"
    },
    "info": {
      "background": "#dbeafe",
      "border": "#3b82f6",
      "text": "#1e40af",
      "icon": "#3b82f6"
    }
  }'::jsonb
);

-- Create indexes
CREATE INDEX idx_color_schemes_name ON color_schemes(name);
CREATE INDEX idx_color_schemes_is_active ON color_schemes(is_active);
CREATE INDEX idx_color_schemes_is_default ON color_schemes(is_default);
CREATE INDEX idx_color_schemes_created_by ON color_schemes(created_by);

-- Create unique constraint for default scheme (only one can be default)
CREATE UNIQUE INDEX idx_color_schemes_single_default
  ON color_schemes(is_default)
  WHERE is_default = true;

-- Insert default color scheme
INSERT INTO color_schemes (name, description, is_active, is_default)
VALUES (
  'Default',
  'Standard color scheme with blue primary colors',
  true,
  true
);

-- DOWN
DROP INDEX IF EXISTS idx_color_schemes_single_default;
DROP INDEX IF EXISTS idx_color_schemes_created_by;
DROP INDEX IF EXISTS idx_color_schemes_is_default;
DROP INDEX IF EXISTS idx_color_schemes_is_active;
DROP INDEX IF EXISTS idx_color_schemes_name;
DROP TABLE IF EXISTS color_schemes;
