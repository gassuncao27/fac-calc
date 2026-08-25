/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        /*
         * "wide" = a coluna do formulário tem pelo menos ~880px.
         * Não dá para usar breakpoints de viewport puros porque a largura
         * útil depende da sidebar (240px), do respiro (64px) e do painel de
         * Resumo (364px), que só entra ao lado a partir de xl (1280px).
         * Por isso as duas faixas. Mantenha em sinergia com TABLE_QUERY
         * em src/components/ReceivableTable.tsx.
         */
        wide: { raw: '(min-width: 1184px) and (max-width: 1279.98px), (min-width: 1548px)' },
      },
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
