import type { Config } from 'tailwindcss';

/**
 * VitalFlow design tokens — derived from the brand mark.
 *
 *   Brand gradient (sparingly):
 *     #48D8C2 (turquoise) → #20BFE8 (cyan) → #1677E8 (royal blue)
 *
 *   The interface uses subtle depth: soft shadows, layered cards,
 *   thin borders, restrained gradients. No neon, no glassmorphism
 *   overload, no excessive glow. The mark itself is glossy, but
 *   the dashboard translates that into refined 2D/2.5D surfaces.
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
        // Brand palette — derived from the logo
        brand: {
          // Royal / electric blue — primary CTAs, primary UI elements
          DEFAULT: '#1677E8',
          // Deep blue — section accents, navy heading
          deep: '#0757D5',
          // Cyan — secondary highlights
          cyan: '#20BFE8',
          // Turquoise — accent gradient stops, focus rings
          turquoise: '#48D8C2',
          // Mint — soft success accents
          mint: '#8BE5C4',
          // Dark navy — strongest headings
          navy: '#0B1B33',
          // Secondary dark — subdued headings
          'navy-2': '#152842',
        },
        // Backgrounds
        canvas: '#F7F9FC',
        card: '#FFFFFF',
        border: '#E6ECF3',
        // Text
        text: {
          primary: '#0B1B33',
          secondary: '#607086',
          muted: '#8A98AA',
        },
        // Semantic
        positive: {
          DEFAULT: '#18A875',
          muted: '#E6F7F0',
        },
        warning: {
          DEFAULT: '#F4A62A',
          muted: '#FEF4E5',
        },
        negative: {
          DEFAULT: '#E85C5C',
          muted: '#FCEDED',
        },
        // Health bands — match the backend enum (Critical/Fragile/Watch/Healthy/Strong)
        band: {
          strong: '#18A875',
          healthy: '#48D8C2',
          watch: '#F4A62A',
          fragile: '#F07A3F',
          critical: '#E85C5C',
        },
        // Eligibility states for funding
        eligibility: {
          eligible: '#18A875',
          almost: '#F4A62A',
          blocked: '#8A98AA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display': ['32px', { lineHeight: '40px', fontWeight: '700' }],
        'h1': ['28px', { lineHeight: '36px', fontWeight: '700' }],
        'h2': ['24px', { lineHeight: '32px', fontWeight: '650' }],
        'h3': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'h4': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'h5': ['15px', { lineHeight: '22px', fontWeight: '600' }],
        'body': ['15px', { lineHeight: '22px', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'meta': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'meta-sm': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'number': ['36px', { lineHeight: '44px', fontWeight: '700' }],
        'number-lg': ['48px', { lineHeight: '56px', fontWeight: '700' }],
        'score': ['56px', { lineHeight: '64px', fontWeight: '700' }],
      },
      fontVariantNumeric: {
        tabular: 'tabular-nums',
      },
      borderRadius: {
        card: '16px',
        soft: '10px',
        pill: '999px',
      },
      boxShadow: {
        // Very subtle — depth without weight
        card: '0 1px 2px 0 rgba(11, 27, 51, 0.04)',
        'card-hover': '0 4px 16px -4px rgba(11, 27, 51, 0.08), 0 2px 4px -2px rgba(11, 27, 51, 0.04)',
        'pop': '0 8px 24px -8px rgba(11, 27, 51, 0.10), 0 2px 6px -2px rgba(11, 27, 51, 0.05)',
        'inset-soft': 'inset 0 1px 2px 0 rgba(11, 27, 51, 0.04)',
        'focus-brand': '0 0 0 3px rgba(22, 119, 232, 0.15)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'chart-draw': {
          from: { strokeDashoffset: '1000' },
          to: { strokeDashoffset: '0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 250ms ease-out',
        'chart-draw': 'chart-draw 1.2s ease-out forwards',
      },
    },
  },
  plugins: [],
};

export default config;
