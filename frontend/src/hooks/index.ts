/**
 * Hooks Index
 * STORY-017B: Component Responsiveness
 * STORY-008B: Permission-System (Frontend)
 *
 * Exports all custom hooks.
 */

export {
  useResponsive,
  useMediaQuery,
  BREAKPOINTS,
} from './useResponsive';

export type {
  Breakpoint,
  UseResponsiveReturn,
} from './useResponsive';

// Re-export permission hook from AuthContext for convenience
export { usePermission } from '../contexts';

// STORY-041F: Feedback Trigger UI
export {
  useFeedbackTrigger,
} from './useFeedbackTrigger';

export type {
  UseFeedbackTriggerReturn,
  UseFeedbackTriggerOptions,
} from './useFeedbackTrigger';
