/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        fraunces: ['var(--font-fraunces)', 'Georgia', 'serif'],
        mono:     ['var(--font-dm-mono)', 'monospace'],
        inter:    ['var(--font-inter)', 'sans-serif'],
      },
      colors: {
        base:    '#0c0b0a',
        surface: '#1a1917',
        deep:    '#0a0908',
        border:  '#2a2825',
        amber:   '#b88320',
        cream:   '#f5f0e8',
        muted:   '#6b6560',
        prose:   '#c8c3bb',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-600px 0' },
          '100%': { backgroundPosition: '600px 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s ease-in-out infinite',
      },
    },
  },
}
module.exports = config;
