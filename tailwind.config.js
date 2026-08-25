/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        // Paleta de destaque do app (mesmos valores do tema anterior)
        accent: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        surface: '#fafaf9',
      },
      spacing: {
        13: '3.25rem', // altura dos botões grandes (touch)
      },
      keyframes: {
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(0.5rem) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'toast-in': 'toast-in 0.18s ease-out',
      },
    },
  },
  plugins: [],
};
