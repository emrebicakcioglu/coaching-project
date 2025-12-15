/**
 * Icon Components
 * STORY-016A: Context Menu Core Navigation
 *
 * SVG icon components for navigation and UI elements.
 * Using inline SVGs for flexibility and no external dependencies.
 *
 * @example
 * ```tsx
 * import { HomeIcon, UsersIcon, getIcon } from './Icons';
 *
 * <HomeIcon className="w-5 h-5" />
 * <Icon name="users" className="w-5 h-5" />
 * ```
 */

import React from 'react';
import { IconName } from '../../config/navigation';

/**
 * Common icon props
 */
export interface IconProps {
  /** Additional CSS classes */
  className?: string;
  /** Accessibility label */
  'aria-label'?: string;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/**
 * Base SVG wrapper component
 */
const SvgIcon: React.FC<IconProps & { children: React.ReactNode }> = ({
  className = 'w-5 h-5',
  'aria-label': ariaLabel,
  'data-testid': testId,
  children,
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden={!ariaLabel}
    aria-label={ariaLabel}
    data-testid={testId}
  >
    {children}
  </svg>
);

/**
 * Home/Dashboard Icon
 */
export const HomeIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </SvgIcon>
);

/**
 * Users Icon
 */
export const UsersIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </SvgIcon>
);

/**
 * Shield/Security Icon
 */
export const ShieldIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </SvgIcon>
);

/**
 * Settings/Cog Icon
 */
export const SettingsIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </SvgIcon>
);

/**
 * Help/Question Icon
 */
export const HelpIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </SvgIcon>
);

/**
 * User Plus/Add User Icon
 */
export const UserPlusIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
    />
  </SvgIcon>
);

/**
 * List Icon
 */
export const ListIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 6h16M4 10h16M4 14h16M4 18h16"
    />
  </SvgIcon>
);

/**
 * Key Icon
 */
export const KeyIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
    />
  </SvgIcon>
);

/**
 * Layout Icon
 */
export const LayoutIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
    />
  </SvgIcon>
);

/**
 * Grid Icon
 */
export const GridIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
    />
  </SvgIcon>
);

/**
 * Monitor/Screen Icon
 */
export const MonitorIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </SvgIcon>
);

/**
 * Sessions/Clock Icon
 */
export const SessionsIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </SvgIcon>
);

/**
 * Chevron Down Icon (for expandable menus)
 */
export const ChevronDownIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </SvgIcon>
);

/**
 * Chevron Right Icon (for collapsed items)
 */
export const ChevronRightIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5l7 7-7 7"
    />
  </SvgIcon>
);

/**
 * Chevron Left Icon (for sidebar collapse)
 */
export const ChevronLeftIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 19l-7-7 7-7"
    />
  </SvgIcon>
);

/**
 * Menu/Hamburger Icon
 */
export const MenuIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 6h16M4 12h16M4 18h16"
    />
  </SvgIcon>
);

/**
 * Close/X Icon
 */
export const CloseIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </SvgIcon>
);

/**
 * Logout Icon
 */
export const LogoutIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
    />
  </SvgIcon>
);

/**
 * Palette/Design Icon
 */
export const PaletteIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
    />
  </SvgIcon>
);

/**
 * Globe/Language Icon
 */
export const GlobeIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
    />
  </SvgIcon>
);

/**
 * User/Profile Icon
 */
export const UserIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </SvgIcon>
);

/**

/**
 * Sun Icon (for light mode toggle)
 */
export const SunIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </SvgIcon>
);

/**
 * Moon Icon (for dark mode toggle)
 */
export const MoonIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    />
  </SvgIcon>
);

/**
 * Icon name to component mapping
 */
const iconMap: Record<IconName, React.FC<IconProps>> = {
  home: HomeIcon,
  users: UsersIcon,
  shield: ShieldIcon,
  settings: SettingsIcon,
  help: HelpIcon,
  'user-plus': UserPlusIcon,
  list: ListIcon,
  key: KeyIcon,
  layout: LayoutIcon,
  grid: GridIcon,
  monitor: MonitorIcon,
  sessions: SessionsIcon,
  palette: PaletteIcon,
  globe: GlobeIcon,
};

/**
 * Get icon component by name
 *
 * @param name - Icon name
 * @returns Icon component or null if not found
 */
export function getIcon(name: IconName): React.FC<IconProps> | null {
  return iconMap[name] || null;
}

/**
 * Icon component that renders based on name
 *
 * @example
 * ```tsx
 * <Icon name="home" className="w-5 h-5" />
 * ```
 */
export const Icon: React.FC<IconProps & { name: IconName }> = ({ name, ...props }) => {
  const IconComponent = iconMap[name];
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }
  return <IconComponent {...props} />;
};

export default Icon;
