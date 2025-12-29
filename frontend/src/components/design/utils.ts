/**
 * Design System Utilities
 * Helper functions for design system components
 */

/**
 * Deep merge helper for nested objects
 * Recursively merges source into target, only overwriting defined values
 *
 * @param target - The target object to merge into
 * @param source - The source object to merge from
 * @returns A new merged object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deepMerge<T>(target: T, source: any): T {
  if (!source || typeof source !== 'object') return target;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = { ...target } as any;
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof result[key] === 'object' &&
        result[key] !== null
      ) {
        result[key] = deepMerge(result[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  return result as T;
}
