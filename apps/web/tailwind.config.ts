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
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
