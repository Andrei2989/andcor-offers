import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0f2744',
          light: '#1e3a5f',
        },
        gold: '#b8863a',
        ink: {
          900: '#1a1a1a',
          700: '#4a4a4a',
          500: '#8a8a8a',
          200: '#e5e7eb',
          100: '#f5f6f8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
