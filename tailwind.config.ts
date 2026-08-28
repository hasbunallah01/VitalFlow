import type { Config } from 'tailwindcss';

/**
 * VitalFlow design tokens — derived from the brand mark.
 *
 * Color philosophy:
 * - Blue is the dominant brand/action color (#1268E8)
 * - Teal/Cyan are supporting accents for positive financial signals, charts, highlights
 * - Do not turn the entire interface blue
 */
const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        brand: {
          DEFAULT: '#1268E8',     // Primary blue
          deep: '#0754C7',         // Deep blue
          bright: '#2F80ED',       // Bright blue
          cyan: '#20C4E8',         // Cyan
          teal: '#35CFA5',         // Teal
          navy: '#0B1F3A',         // Dark navy
        },
        // Surfaces
        canvas: '#F7F9FC',
        card: '#FFFFFF',
        border: '#E6EAF0',
        // Text
        text: {
          primary: '#111827',
          secondary: '#667085',
          muted: '#98A2B3',
        },
        // Semantic
        success: {
          DEFAULT: '#12B76A',
          muted: '#D1FADF',
          subtle: '#ECFDF3',
        },
        warning: {
          DEFAULT: '#F79009',
          muted: '#FEF0C7',
          subtle: '#FFFAEB',
        },
        danger: {
          DEFAULT: '#F04438',
          muted: '#FEE4E2',
          subtle: '#FEF3F2',
        },
        // Health bands — kept stable, mapped from backend enum
        band: {
          strong: '#12B76A',
          healthy: '#35CFA5',
          watch: '#F79009',
          fragile: '#F97066',
          critical: '#F04438',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Page title
        'display': ['32px', { lineHeight: '40px', fontWeight: '700' }],
        // Page title (mobile)
        'display-sm': ['28px', { lineHeight: '36px', fontWeight: '700' }],
        // Page title
        'h1': ['30px', { lineHeight: '38px', fontWeight: '600' }],
        // Section heading
        'h2': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'h3': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'h4': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'h5': ['16px', { lineHeight: '22px', fontWeight: '600' }],
        // Card heading
        'card-h': ['15px', { lineHeight: '20px', fontWeight: '600' }],
        // Body
        'body': ['15px', { lineHeight: '22px', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        // Small labels
        'label': ['13px', { lineHeight: '18px', fontWeight: '500' }],
        'label-sm': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'micro': ['11px', { lineHeight: '14px', fontWeight: '500' }],
        // Big numbers
        'num-xl': ['56px', { lineHeight: '60px', fontWeight: '700' }],
        'num-lg': ['40px', { lineHeight: '46px', fontWeight: '700' }],
        'num-md': ['28px', { lineHeight: '34px', fontWeight: '700' }],
        'num-sm': ['20px', { lineHeight: '26px', fontWeight: '700' }],
      },
      fontVariantNumeric: {
        tabular: 'tabular-nums',
      },
      borderRadius: {
        card: '12px',
        soft: '8px',
        pill: '9999px',
      },
      boxShadow: {
        'card': '0 1px 2px rgba(16, 24, 40, 0.05), 0 1px 3px rgba(16, 24, 40, 0.04)',
        'card-hover': '0 4px 8px -2px rgba(16, 24, 40, 0.08), 0 2px 4px -2px rgba(16, 24, 40, 0.05)',
        'pop': '0 12px 16px -4px rgba(16, 24, 40, 0.08), 0 4px 6px -2px rgba(16, 24, 40, 0.04)',
        'sidebar': '1px 0 0 0 #E6EAF0',
        'focus-brand': '0 0 0 4px rgba(18, 104, 232, 0.12)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'slide-up': 'slide-up 250ms ease-out',
        'spin-slow': 'spin-slow 1s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
