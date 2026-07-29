import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['"Cairo"', '"Tajawal"', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef7ff',
          100: '#d9edff',
          200: '#bde0ff',
          300: '#8fccff',
          400: '#59aeff',
          500: '#2f8dff',
          600: '#1a6fea',
          700: '#1657c3',
          800: '#164a9c',
          900: '#183f7c',
        },
      },
      keyframes: {
        'shine': {
          '0%': { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        'shine': 'shine 6s linear infinite',
        'float': 'float 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
