/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        gold: {
          light: '#EFE6CC',
          DEFAULT: '#B8973A',
          dark: '#8A6E25',
        },
        ink: {
          DEFAULT: '#1A1814',
          secondary: '#4A4640',
          tertiary: '#8A8580',
        },
        paper: {
          DEFAULT: '#FDFAF5',
          secondary: '#F5F0E8',
          tertiary: '#EDE8DE',
        },
      },
      borderColor: {
        gold: {
          subtle: 'rgba(184,151,58,0.18)',
          DEFAULT: 'rgba(184,151,58,0.32)',
          strong: 'rgba(184,151,58,0.55)',
        },
      },
    },
  },
  plugins: [],
}
