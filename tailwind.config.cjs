/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#464646',
        background: '#F3F3F3',
        surface: '#FFFFFF',
        line: '#ECECEC',
        muted: '#9A9A9A',
        primary: {
          100: '#aec9fc',
          300: '#72A2FF',
          500: '#3A7DFF',
          600: '#285BBE'
        },
        secondary: {
          500: '#F2CA80',
          700: '#9C762F'
        },
        success: {
          500: '#3AFFA1',
          600: '#29EE90'
        },
        danger: '#DB4343'
      },
      boxShadow: {
        panel: '0 20px 60px rgba(58, 125, 255, 0.08)',
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace']
      },
      backgroundImage: {
        'hero-grid': 'linear-gradient(to right, rgba(58,125,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(58,125,255,0.08) 1px, transparent 1px)'
      },
      backgroundSize: {
        'hero-grid': '40px 40px'
      }
    }
  },
  plugins: [],
};