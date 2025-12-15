/**
 * Tailwind CSS Configuration
 * STORY-017A: Layout & Grid-System
 *
 * Custom breakpoints, colors, and responsive design configuration.
 * Implements 12-column grid system with responsive utilities.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    /**
     * Custom Breakpoints
     * - sm: 640px (Small tablets, large phones landscape)
     * - md: 768px (Tablets, mobile breakpoint)
     * - lg: 1024px (Small desktops, tablets landscape)
     * - xl: 1280px (Desktop breakpoint)
     */
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
    },
    extend: {
      /**
       * Custom Colors - Using CSS Custom Properties
       * These map to CSS variables defined in globals.css
       * Allows runtime theme switching and consistency.
       */
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          50: 'var(--color-secondary-50)',
          100: 'var(--color-secondary-100)',
          200: 'var(--color-secondary-200)',
          300: 'var(--color-secondary-300)',
          400: 'var(--color-secondary-400)',
          500: 'var(--color-secondary-500)',
          600: 'var(--color-secondary-600)',
          700: 'var(--color-secondary-700)',
          800: 'var(--color-secondary-800)',
          900: 'var(--color-secondary-900)',
        },
      },
      /**
       * Custom Spacing Scale
       * Extends default Tailwind spacing with additional values.
       */
      spacing: {
        '18': '4.5rem',  // 72px
        '22': '5.5rem',  // 88px
        '26': '6.5rem',  // 104px
        '30': '7.5rem',  // 120px
      },
      /**
       * Container Configuration
       * Centers container and sets responsive padding.
       */
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '1.5rem',
          md: '2rem',
          lg: '2.5rem',
          xl: '3rem',
        },
      },
      /**
       * Grid Column Extensions
       * Adds additional column configurations for 12-column grid.
       */
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
        '14': 'repeat(14, minmax(0, 1fr))',
        '15': 'repeat(15, minmax(0, 1fr))',
        '16': 'repeat(16, minmax(0, 1fr))',
      },
      /**
       * Max Width Extensions
       * Custom max-width values for containers.
       */
      maxWidth: {
        '8xl': '88rem',  // 1408px
        '9xl': '96rem',  // 1536px
      },
    },
  },
  plugins: [],
};
