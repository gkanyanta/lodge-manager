import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        lodge: {
          50: '#faf8f5',
          100: '#f0ebe3',
          200: '#e1d5c5',
          300: '#cdb9a0',
          400: '#b89a79',
          500: '#a8835f',
          600: '#9b7253',
          700: '#815d46',
          800: '#694d3d',
          900: '#564034',
          950: '#2e211b',
        },
        gold: {
          50: '#fdfaf3',
          100: '#faf0d5',
          200: '#f4dfaa',
          300: '#ecc974',
          400: '#e4b04a',
          500: '#d4982e',
          600: '#b87a22',
          700: '#995c1e',
          800: '#7d4a20',
          900: '#683e1e',
          950: '#3b1f0d',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.8s ease-out forwards',
        'slide-up': 'slide-up 0.8s ease-out forwards',
      },
    },
  },
  plugins: [],
};

export default config;
