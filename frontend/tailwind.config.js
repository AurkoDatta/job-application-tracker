/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Postal / shipment-tracking manifest palette — see project design
        // brief. Reused across board, cards, and stats in later tasks, so
        // these tokens (not ad-hoc hex values) are the single source of truth.
        paper: '#F1F3F2', // page background — cool, quiet, not warm cream
        ink: '#1B2027', // primary text
        card: '#FFFFFF', // card/surface background
        stamp: '#274690', // primary accent — deep indigo, rubber-stamp ink; buttons/links/active states
        stampLight: '#4F6FB0', // hover/lighter variant of stamp
        amber: '#C98A2C', // Medium priority tag
        rust: '#B24C3A', // High priority tag / destructive actions
        moss: '#3F7A52', // Low priority tag / success states
        slate: '#8A94A6', // muted text, borders, secondary labels
      },
      fontFamily: {
        // Override Tailwind's default stacks so font-sans/font-mono use our
        // self-hosted fonts everywhere by default (no per-component overrides needed).
        mono: ['"IBM Plex Mono"', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
