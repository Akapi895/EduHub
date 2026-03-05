/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
          light: '#DBEAFE',
          lighter: '#EFF6FF',
        },
        background: '#F3F4F6',
        card: '#FFFFFF',
        border: '#E5E7EB',
        accent: {
          pink: '#FBCFE8',
          purple: '#DDD6FE',
          mint: '#BBF7D0',
          yellow: '#FEF9C3',
        },
      },
      borderRadius: {
        card: '20px',
        button: '12px',
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'Nunito', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
