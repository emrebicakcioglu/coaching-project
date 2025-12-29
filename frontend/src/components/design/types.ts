/**
 * Design System Types
 * Shared type definitions for design system components
 */

import { ColorScheme } from '../../services/designService';

/**
 * Tab type for design system navigation
 */
export type TabType = 'base' | 'buttons' | 'typography' | 'inputs' | 'cards' | 'badges' | 'alerts';

/**
 * Translation function type
 */
export type TranslationFunction = (key: string) => string;

/**
 * Base props shared by all tab components
 */
export interface BaseTabProps {
  scheme: ColorScheme;
  canEdit: boolean;
}

/**
 * Props for tabs that use translation and color change handler
 */
export interface TabProps extends BaseTabProps {
  t: TranslationFunction;
  onColorChange: (path: string, value: string) => void;
}

/**
 * Props for TypographyTab which uses a different handler name
 */
export interface TypographyTabProps extends BaseTabProps {
  onTypographyChange: (path: string, value: string) => void;
}

/**
 * Props for ColorInput component
 */
export interface ColorInputProps {
  label: string;
  path: string;
  value: string;
  onColorChange: (path: string, value: string) => void;
  canEdit: boolean;
}

/**
 * Tab definition for navigation
 */
export interface TabDefinition {
  id: TabType;
  label: string;
}
