import type { Config } from 'tailwindcss';

/**
 * VitalFlow design tokens — match the spec in docs/DESIGN_SYSTEM.md and the
 * MINIMAX prompt section 4 (Brand Colors).
 *
 * Keep the band colors stable — they are referenced by the band labels
 * returned from the analysis engine (Critical/Fragile/Watch/Healthy/Strong).
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
        // Primary brand palette
        brand: {
          // Primary blue — major actions, primary UI elements
          DEFAULT: '#155EEF',
          bright: '#2F80ED',
          // Teal / mint — secondary highlights
          teal: '#16B8A6',
          mint: '#35D0BA',
          // Dark navy — strong headings
          navy: '#0B1F3A',
        },
        // Backgrounds
        canvas: '#F8FAFC',
        card: '#FFFFFF',
        border: '#E5EAF0',
        // Text
        text: {
          primary: '#172033',
          secondary: '#64748B',
        },
        // Semantic
        positive: {
          DEFAULT: '#16B8A6',
          muted: '#E6F7F5',
        },
        warning: {
          DEFAULT: '#F59E0B',
          muted: '#FEF3C7',
        },
        negative: {
          DEFAULT: '#DC2626',
          muted: '#FEE2E2',
        },
        // Health bands — match the backend enum
        band: {
          strong: '#16B8A6',
          healthy: '#22C55E',
          watch: '#F59E0B',
          fragile: '#EA580C',
          critical: '#DC2626',
        },
        // Eligibility states for funding
        eligibility: {
          eligible: '#16B8A6',
          almost: '#F59E0B',
          blocked: '#94A3B8',
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
        'h5': ['16px', { lineHeight: '22px', fontWeight: '600' }],
        'body': ['15px', { lineHeight: '22px', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'meta': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'meta-sm': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'number': ['36px', { lineHeight: '44px', fontWeight: '700' }],
        'number-lg': ['48px', { lineHeight: '56px', fontWeight: '700' }],
      },
      fontVariantNumeric: {
        tabular: 'tabular-nums',
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 1px 0 rgba(15, 23, 42, 0.02)',
        'card-hover': '0 4px 12px -2px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)',
        'glow-teal': '0 0 0 1px rgba(22, 184, 166, 0.18), 0 8px 32px -8px rgba(22, 184, 166, 0.35)',
        'glow-brand': '0 0 0 1px rgba(21, 94, 239, 0.18), 0 8px 32px -8px rgba(21, 94, 239, 0.35)',
        'glow-mint': '0 0 0 1px rgba(53, 208, 186, 0.22), 0 12px 40px -8px rgba(53, 208, 186, 0.4)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.4)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'score-fill': {
          from: { strokeDashoffset: '283' },
          to: { strokeDashoffset: 'var(--target-offset)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', opacity: '0.7' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'pulse-dot': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.4)', opacity: '0.55' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'ambient-1': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -20px) scale(1.05)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.95)' },
        },
        'ambient-2': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(-25px, 15px) scale(0.95)' },
          '66%': { transform: 'translate(20px, -25px) scale(1.05)' },
        },
        'glow-breathe': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '0.9' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'score-fill': 'score-fill 800ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'pulse-ring': 'pulse-ring 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'pulse-dot': 'pulse-dot 1.6s ease-in-out infinite',
        'spin-slow': 'spin-slow 12s linear infinite',
        'float-slow': 'float-slow 5s ease-in-out infinite',
        'ambient-1': 'ambient-1 18s ease-in-out infinite',
        'ambient-2': 'ambient-2 22s ease-in-out infinite',
        'glow-breathe': 'glow-breathe 3.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
