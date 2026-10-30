/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1B1B3A',
        field: '#E8E9F3',
        lane: '#F3F3F9',
        line: '#D5D7E6',
        muted: '#62647F',
        violet: { DEFAULT: '#5B3DF5', dark: '#4528D6', soft: '#E6E1FF' },
        danger: '#D63C42',
        amber: '#E08A00',
        ok: '#1E9A6C',
      },
      fontFamily: {
        display: ['"Familjen Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(27,27,58,.08), 0 2px 8px -2px rgba(27,27,58,.10)',
        lift: '0 12px 28px -8px rgba(27,27,58,.35)',
      },
    },
  },
  plugins: [],
};
