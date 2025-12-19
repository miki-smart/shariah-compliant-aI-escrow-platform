/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Islamic banking color palette
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Status colors
        status: {
          success: '#10b981', // Green for approved/completed
          warning: '#f59e0b', // Amber for pending
          error: '#ef4444', // Red for rejected/failed
          info: '#3b82f6', // Blue for in-progress
          neutral: '#6b7280', // Gray for neutral states
        },
        // Shariah compliance colors
        shariah: {
          halal: '#10b981', // Green
          haram: '#ef4444', // Red
          pending: '#f59e0b', // Amber
        },
        // Escrow state colors
        escrow: {
          pending: '#6b7280',
          locked: '#3b82f6',
          released: '#10b981',
          reverted: '#ef4444',
          frozen: '#f59e0b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}


