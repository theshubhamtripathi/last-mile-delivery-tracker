import type { Config } from 'tailwindcss';

/**
 * Modern dark "control-room" theme. The freight identity (monospace data,
 * uppercase eyebrows, the waybill receipt) is preserved, but wrapped in a
 * premium glassy surface system with an indigo→violet accent, soft glows and
 * motion. All hand-built — no component library (charter §13, and the
 * minimal-dependency submission rule).
 */
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Layered surfaces (dark)
        base: '#070A0F',
        surface: '#0E131C',
        raised: '#151C28',
        overlay: '#1B2432',
        line: '#232E40',
        'line-soft': '#1A2230',
        // Text
        ink: '#EAF0F7',
        muted: '#93A1B5',
        faint: '#5C6982',
        // Brand + semantic
        stamp: '#6366F1', // indigo primary
        violet: '#8B5CF6',
        sky: '#38BDF8',
        cleared: '#34D399', // success / delivered
        hold: '#FBBF24', // out for delivery / pending
        consign: '#FB7185', // failed / alerts
        paper: '#EAF0F7', // legacy alias → light ink on dark
      },
      fontFamily: {
        sans: ['var(--font-plex-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 30px -12px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(99,102,241,0.35), 0 8px 30px -8px rgba(99,102,241,0.5)',
        'glow-soft': '0 10px 40px -12px rgba(99,102,241,0.35)',
      },
      backgroundImage: {
        'grad-brand': 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 55%, #38BDF8 120%)',
        'grad-brand-soft': 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.10))',
        'mesh':
          'radial-gradient(60% 60% at 20% 10%, rgba(99,102,241,0.20) 0%, transparent 60%), radial-gradient(50% 50% at 90% 20%, rgba(56,189,248,0.14) 0%, transparent 55%), radial-gradient(60% 60% at 60% 100%, rgba(139,92,246,0.16) 0%, transparent 60%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'grad-move': {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(99,102,241,0.5)' },
          '70%': { boxShadow: '0 0 0 8px rgba(99,102,241,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(99,102,241,0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fade-in 0.4s ease-out both',
        shimmer: 'shimmer 1.6s infinite',
        float: 'float 6s ease-in-out infinite',
        'grad-move': 'grad-move 8s ease infinite',
        'pulse-ring': 'pulse-ring 2s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
