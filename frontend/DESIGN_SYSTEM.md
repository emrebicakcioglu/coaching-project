# Design System Documentation

This document defines the design system standards for the Core Application frontend. All main pages (post-login) should follow these patterns for a consistent user experience.

## Table of Contents

1. [Page Layout](#page-layout)
2. [Typography](#typography)
3. [Spacing](#spacing)
4. [Buttons](#buttons)
5. [Cards](#cards)
6. [Form Fields](#form-fields)
7. [CSS Utilities](#css-utilities)
8. [Theming](#theming)

---

## Page Layout

### Standard Page Structure

All main pages should use the `Container` component with consistent padding:

```tsx
import { Container } from '../components/layout';

export const ExamplePage: React.FC = () => {
  return (
    <Container className="py-8">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Page Title</h1>
        <p className="page-subtitle">Optional description text</p>
      </div>

      {/* Page Content */}
      <div className="page-content">
        {/* Your content here */}
      </div>
    </Container>
  );
};
```

### Page Header with Actions

When a page has action buttons (e.g., "Create New" button):

```tsx
<div className="page-header page-header--with-actions">
  <div>
    <h1 className="page-title">Users</h1>
    <p className="page-subtitle">Manage user accounts</p>
  </div>
  <Button variant="primary" onClick={handleCreate}>
    Create User
  </Button>
</div>
```

---

## Typography

### Type Scale

| Element | Size | Weight | CSS Class |
|---------|------|--------|-----------|
| Page Title (H1) | 2rem (32px) | 700 | `.page-title` |
| Section Title (H2) | 1.5rem (24px) | 600 | `.section-title` |
| Subsection (H3) | 1.25rem (20px) | 600 | `.subsection-title` |
| Card Title (H4) | 1.125rem (18px) | 600 | `.card-title` |
| Card Description | 0.875rem (14px) | 400 | `.card-description` |
| Body Large | 1rem (16px) | 400 | - |
| Body Normal | 0.875rem (14px) | 400 | - |
| Body Small | 0.75rem (12px) | 400 | - |

### Color Variables

```css
/* Primary text */
color: var(--color-text-primary, #111827);

/* Secondary text (descriptions, labels) */
color: var(--color-text-secondary, #6b7280);

/* Muted text (hints, placeholders) */
color: var(--color-text-muted, #9ca3af);
```

---

## Spacing

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--spacing-1` | 0.25rem (4px) | Minimal spacing |
| `--spacing-2` | 0.5rem (8px) | Compact spacing |
| `--spacing-3` | 0.75rem (12px) | Button padding |
| `--spacing-4` | 1rem (16px) | Standard spacing |
| `--spacing-5` | 1.25rem (20px) | Form gap |
| `--spacing-6` | 1.5rem (24px) | Card padding |
| `--spacing-8` | 2rem (32px) | Section gap |

### Page Padding

- Container padding: `py-8` (2rem / 32px top and bottom)
- Page header margin: `mb-8` (2rem / 32px bottom, handled by `.page-header`)

---

## Buttons

### Button Component

Always use the `Button` component for consistent styling:

```tsx
import { Button } from '../components/ui';

// Primary action
<Button variant="primary">Save Changes</Button>

// Secondary action
<Button variant="outline">Cancel</Button>

// Destructive action
<Button variant="destructive">Delete</Button>

// Ghost action (subtle)
<Button variant="ghost">View Details</Button>
```

### Button Sizes

| Size | Padding | Font Size | Border Radius |
|------|---------|-----------|---------------|
| `sm` | 6px 12px | 14px | 6px |
| `md` | 8px 16px | 14px | 6px |
| `lg` | 12px 24px | 16px | 8px |

### Button Variants

| Variant | Use Case |
|---------|----------|
| `primary` | Primary actions (Save, Create, Submit) |
| `outline` | Secondary actions, Cancel, Navigation to other pages |
| `destructive` | Delete, Remove, Dangerous actions |
| `ghost` | Subtle actions in tables, View/Edit links |
| `link` | Inline text links |

---

## Cards

### Card Component

Use the `Card` component for content sections:

```tsx
import { Card } from '../components/ui';

<Card variant="default">
  <Card.Header>
    <h2 className="card-title">Section Title</h2>
    <p className="card-description">Optional description</p>
  </Card.Header>
  <Card.Content>
    {/* Card content */}
  </Card.Content>
</Card>
```

### Card Styling

```css
/* Card defaults */
border-radius: 8px; /* rounded-lg */
padding: 24px;
background: var(--color-background-card, #ffffff);
border: 1px solid var(--color-border-default, #2b2d31);
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); /* shadow-sm */
```

---

## Form Fields

### Standard Input

```tsx
<div className="space-y-2">
  <label className="block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
    Field Label
  </label>
  <input
    type="text"
    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
    style={{
      backgroundColor: 'var(--color-background-input, #ffffff)',
      borderColor: 'var(--color-border-default, #d1d5db)',
      color: 'var(--color-text-primary, #111827)',
    }}
  />
</div>
```

### Form Layout

- Vertical spacing between fields: `space-y-6` (24px)
- Two-column layout on larger screens: `grid grid-cols-1 sm:grid-cols-2 gap-6`

---

## CSS Utilities

### Page Layout Classes

```css
/* Page header container */
.page-header {
  margin-bottom: var(--spacing-xl);  /* 32px */
}

/* Page header with action buttons */
.page-header--with-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-md);
}

/* Page title (H1) */
.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text-primary, #111827);
  margin: 0;
}

/* Page subtitle */
.page-subtitle {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
  margin-top: 0.25rem;
}
```

### Typography Classes

```css
/* Section title (H2) */
.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
}

/* Card title (H4) */
.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
}

/* Card description */
.card-description {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
  margin-top: 0.25rem;
}
```

---

## Theming

### CSS Variables

The application uses CSS variables for theming. All colors should reference these variables with fallbacks:

```css
/* Backgrounds */
--color-background-page
--color-background-card
--color-background-surface
--color-background-input

/* Text */
--color-text-primary
--color-text-secondary
--color-text-muted

/* Borders */
--color-border-default
--color-border-light

/* Buttons (by type) */
--color-button-normal-bg
--color-button-normal-text
--color-button-danger-bg
--color-button-danger-text
/* etc. */
```

### Using Theme Colors

Always include fallback values:

```tsx
// Inline styles
style={{ color: 'var(--color-text-primary, #111827)' }}

// CSS
.my-element {
  background-color: var(--color-background-card, #ffffff);
  border-color: var(--color-border-default, #2b2d31);
}
```

---

## Component Quick Reference

### Imports

```tsx
// Layout
import { Container } from '../components/layout';

// UI Components
import { Button, Card, Badge } from '../components/ui';

// Feedback
import { Toast } from '../components/feedback';
```

### Page Template

```tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Container } from '../components/layout';
import { Button, Card } from '../components/ui';

export const MyPage: React.FC = () => {
  const { t } = useTranslation('myNamespace');

  return (
    <Container className="py-8">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">{t('title')}</h1>
        <p className="page-subtitle">{t('subtitle')}</p>
      </div>

      {/* Content */}
      <Card variant="default">
        <Card.Header>
          <h2 className="card-title">{t('section.title')}</h2>
          <p className="card-description">{t('section.description')}</p>
        </Card.Header>
        <Card.Content>
          {/* Your content */}
        </Card.Content>
      </Card>
    </Container>
  );
};
```

---

## Pages Using This System

The following pages have been standardized to use this design system:

- `DashboardPage.tsx`
- `SettingsPage.tsx`
- `UsersListPage.tsx`
- `UserDetailsPage.tsx`
- `RolesPage.tsx`
- `HelpPage.tsx`
- `LanguagesPage.tsx`
- `SessionsPage.tsx`
- `MFASetupPage.tsx`

**Note:** Authentication pages (Login, Register, Forgot Password, Reset Password) use a separate centered layout and are not covered by this design system.
