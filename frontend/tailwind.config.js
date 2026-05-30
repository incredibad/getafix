/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#13131f',
          hover: '#1a1a2e',
        },
        border: {
          DEFAULT: '#2d2d44',
        },
      },
    },
  },
  plugins: [],
}
