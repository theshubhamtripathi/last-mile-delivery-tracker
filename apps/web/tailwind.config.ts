import type { Config } from 'tailwindcss';

/**
 * The freight palette from the design direction (charter §13). Colours are the
 * only ones used across the app — the language of waybills and terminal boards,
 * deliberately not a generic SaaS theme.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F1F3F4',
        ink: '#12181D',
        rule: '#CFD6DA',
        stamp: '#1B4DE4',
        consign: '#C2410C',
        cleared: '#0E7A5F',
        hold: '#B45309',
      },
      fontFamily: {
        sans: ['var(--font-plex-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
