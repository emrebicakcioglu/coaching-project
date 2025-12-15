/**
 * Responsive Components Index
 * STORY-017B: Component Responsiveness
 *
 * Exports all responsive components for mobile-first design.
 *
 * @example
 * ```tsx
 * import {
 *   ResponsiveSidebar,
 *   ResponsiveTable,
 *   ResponsiveForm,
 *   ResponsiveModal,
 *   ResponsiveNavigation,
 * } from '@/components/responsive';
 * ```
 */

// Sidebar Component
export { ResponsiveSidebar } from './ResponsiveSidebar';
export type { ResponsiveSidebarProps } from './ResponsiveSidebar';

// Table Component
export { ResponsiveTable } from './ResponsiveTable';
export type {
  ResponsiveTableProps,
  TableColumn,
} from './ResponsiveTable';

// Form Components
export {
  ResponsiveForm,
  ResponsiveFormRow,
  ResponsiveFormField,
  FormInput,
  FormSelect,
  FormButton,
} from './ResponsiveForm';
export type {
  ResponsiveFormProps,
  ResponsiveFormRowProps,
  ResponsiveFormFieldProps,
  FormInputProps,
  FormSelectProps,
  FormButtonProps,
} from './ResponsiveForm';

// Modal Component
export { ResponsiveModal } from './ResponsiveModal';
export type {
  ResponsiveModalProps,
  ModalSize,
} from './ResponsiveModal';

// Navigation Component
export { ResponsiveNavigation } from './ResponsiveNavigation';
export type {
  ResponsiveNavigationProps,
  NavItem,
} from './ResponsiveNavigation';
