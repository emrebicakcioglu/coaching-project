-- Migration: 036-seed-dark-mode-scheme
-- Description: Create a Dark Mode color scheme
-- Ensures there is always a dark mode scheme available for the dark mode toggle
-- Date: 2025-01-10

-- UP

-- Insert Dark Mode color scheme if it doesn't exist
INSERT INTO color_schemes (
  name,
  description,
  description_key,
  is_active,
  is_default,
  is_light_scheme,
  is_dark_scheme,
  colors,
  buttons,
  typography,
  inputs,
  cards,
  badges,
  alerts
)
SELECT
  'Dark Mode',
  'Dark color scheme for reduced eye strain',
  'schemeDescriptions.darkMode',
  false,
  false,
  false,
  true,
  '{
    "primary": "#3b82f6",
    "primaryHover": "#2563eb",
    "primaryLight": "#1e3a5f",
    "secondary": "#8b5cf6",
    "secondaryHover": "#7c3aed",
    "secondaryLight": "#312e81",
    "accent": "#22d3ee",
    "accentHover": "#06b6d4",
    "accentLight": "#164e63",
    "background": {
      "page": "#0f172a",
      "card": "#1e293b",
      "sidebar": "#0f172a",
      "modal": "#1e293b",
      "input": "#334155",
      "surface": "#1e293b"
    },
    "text": {
      "primary": "#f1f5f9",
      "secondary": "#94a3b8",
      "muted": "#64748b",
      "inverse": "#0f172a",
      "link": "#60a5fa"
    },
    "border": {
      "light": "#334155",
      "default": "#475569",
      "dark": "#64748b"
    },
    "status": {
      "success": "#22c55e",
      "successLight": "#14532d",
      "warning": "#f59e0b",
      "warningLight": "#713f12",
      "error": "#ef4444",
      "errorLight": "#7f1d1d",
      "info": "#3b82f6",
      "infoLight": "#1e3a5f"
    }
  }'::jsonb,
  '{
    "normal": {
      "background": "#3b82f6",
      "text": "#ffffff",
      "border": "#3b82f6",
      "hoverBackground": "#2563eb",
      "hoverText": "#ffffff",
      "hoverBorder": "#2563eb"
    },
    "inactive": {
      "background": "#334155",
      "text": "#64748b",
      "border": "#334155",
      "hoverBackground": "#334155",
      "hoverText": "#64748b",
      "hoverBorder": "#334155"
    },
    "abort": {
      "background": "#1e293b",
      "text": "#94a3b8",
      "border": "#475569",
      "hoverBackground": "#334155",
      "hoverText": "#f1f5f9",
      "hoverBorder": "#64748b"
    },
    "special": {
      "background": "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
      "text": "#ffffff",
      "border": "transparent",
      "hoverBackground": "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
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
      "background": "#22c55e",
      "text": "#ffffff",
      "border": "#22c55e",
      "hoverBackground": "#16a34a",
      "hoverText": "#ffffff",
      "hoverBorder": "#16a34a"
    }
  }'::jsonb,
  '{
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
      "background": "#1e293b",
      "color": "#e2e8f0"
    }
  }'::jsonb,
  '{
    "normal": {
      "background": "#334155",
      "text": "#f1f5f9",
      "border": "#475569",
      "placeholder": "#64748b",
      "focusBorder": "#3b82f6",
      "focusRing": "rgba(59, 130, 246, 0.3)"
    },
    "error": {
      "background": "#334155",
      "text": "#f1f5f9",
      "border": "#ef4444",
      "placeholder": "#64748b",
      "focusBorder": "#ef4444",
      "focusRing": "rgba(239, 68, 68, 0.3)"
    },
    "disabled": {
      "background": "#1e293b",
      "text": "#64748b",
      "border": "#334155",
      "placeholder": "#475569",
      "focusBorder": "#334155",
      "focusRing": "transparent"
    }
  }'::jsonb,
  '{
    "default": {
      "background": "#1e293b",
      "border": "#475569",
      "shadow": "0 1px 3px rgba(0, 0, 0, 0.3)",
      "borderRadius": "8px"
    },
    "elevated": {
      "background": "#1e293b",
      "border": "transparent",
      "shadow": "0 10px 15px -3px rgba(0, 0, 0, 0.4)",
      "borderRadius": "8px"
    },
    "flat": {
      "background": "#0f172a",
      "border": "transparent",
      "shadow": "none",
      "borderRadius": "8px"
    }
  }'::jsonb,
  '{
    "default": {"background": "#334155", "text": "#e2e8f0"},
    "primary": {"background": "#1e3a5f", "text": "#60a5fa"},
    "secondary": {"background": "#312e81", "text": "#a78bfa"},
    "success": {"background": "#14532d", "text": "#4ade80"},
    "warning": {"background": "#713f12", "text": "#fbbf24"},
    "error": {"background": "#7f1d1d", "text": "#f87171"},
    "info": {"background": "#1e3a5f", "text": "#60a5fa"}
  }'::jsonb,
  '{
    "success": {
      "background": "#14532d",
      "border": "#22c55e",
      "text": "#86efac",
      "icon": "#22c55e"
    },
    "warning": {
      "background": "#713f12",
      "border": "#f59e0b",
      "text": "#fcd34d",
      "icon": "#f59e0b"
    },
    "error": {
      "background": "#7f1d1d",
      "border": "#ef4444",
      "text": "#fca5a5",
      "icon": "#ef4444"
    },
    "info": {
      "background": "#1e3a5f",
      "border": "#3b82f6",
      "text": "#93c5fd",
      "icon": "#3b82f6"
    }
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM color_schemes WHERE is_dark_scheme = true
);

-- DOWN
DELETE FROM color_schemes WHERE name = 'Dark Mode' AND is_dark_scheme = true AND is_default = false;
