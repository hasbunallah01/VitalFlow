import type { Config } from 'tailwindcss';

/**
 * Design tokens mirror docs/DESIGN_SYSTEM.md.
 * Keep the two in sync — the document is the source of truth.
 */
const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0F766E',
          accent: '#0EA5E9',
        },
        ink: {
          DEFAULT: '#0F172A',
          muted: '#64748B',
        },
        positive: '#059669',
        negative: '#DC2626',
        warning: '#D97706',
        critical: '#B91C1C',
        band: {
          strong: '#059669',
          healthy: '#10B981',
          watch: '#D97706',
          fragile: '#EA580C',
          critical: '#B91C1C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontVariantNumeric: {
        tabular: 'tabular-nums',
      },
    },
  },
  plugins: [],
};

export default config;
