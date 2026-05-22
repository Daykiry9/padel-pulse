/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        court: {
          DEFAULT: '#0a8e73',
          50: '#eafdf8',
          100: '#cef9ee',
          200: '#9ef1dc',
          300: '#5fe1c3',
          400: '#2dcaa6',
          500: '#13b18d',
          600: '#0a8e73',
          700: '#0a715c',
          800: '#0c5a4b',
          900: '#0b4a3f',
          950: '#042a24',
        },
        pulse: {
          DEFAULT: '#ec4899',
          50: '#fdf2f8',
          100: '#fce7f3',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
        },
        ink: {
          50: '#f6f7f9',
          900: '#343844',
          950: '#0f1117',
        },
      },
      fontFamily: {
        display: ['SpaceGrotesk_700Bold'],
        sans: ['Inter_400Regular'],
      },
    },
  },
  plugins: [],
};
