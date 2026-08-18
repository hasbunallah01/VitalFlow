import type { Config } from 'tailwindcss';

/**
 * VitalFlow design tokens.
 * Source of truth: app/globals.css (CSS variables). Keep in sync.
 */

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0F766E',
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        warm: {
          DEFAULT: '#C2410C',
          50: '#FFF7ED',
          100: '#FFEDD5',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
        },
        ink: {
          DEFAULT: '#0F172A',
          900: '#0F172A',
          700: '#334155',
          500: '#64748B',
          300: '#CBD5E1',
        },
        positive: { DEFAULT: '#047857', bg: '#ECFDF5' },
        negative: { DEFAULT: '#B91C1C', bg: '#FEF2F2' },
        warning: { DEFAULT: '#B45309', bg: '#FFFBEB' },
        critical: { DEFAULT: '#991B1B', bg: '#FEF2F2' },
        band: {
          strong: '#047857',
          healthy: '#10B981',
          watch: '#B45309',
          fragile: '#C2410C',
          critical: '#991B1B',
        },
        border: {
          DEFAULT: '#E5E7EB',
          strong: '#D1D5DB',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'display-sm': ['2rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display':    ['2.75rem', { lineHeight: '3rem', letterSpacing: '-0.025em', fontWeight: '600' }],
        'display-lg': ['3.5rem', { lineHeight: '3.75rem', letterSpacing: '-0.03em', fontWeight: '600' }],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(15, 23, 42, 0.04)',
        md: '0 2px 8px rgba(15, 23, 42, 0.06)',
        lg: '0 4px 16px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
