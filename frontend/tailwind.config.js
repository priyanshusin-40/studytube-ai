/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Manrope', 'sans-serif'],
      },
      colors: {
        ink: '#17162b',
        cream: '#fbfaf7',
        coral: '#ff6b55',
        violet: '#7667f5',
      },
      boxShadow: {
        lift: '0 24px 80px -36px rgba(44, 37, 99, 0.38)',
      },
    },
  },
  plugins: [],
};
