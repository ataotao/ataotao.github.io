/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0f0f0f',
        'bg-card': '#1a1a1a',
        'bg-card-back': '#1e1e1e',
        'text-primary': '#f5f5f5',
        'text-secondary': '#a0a0a0',
        'accent-green': '#22c55e',
        'accent-red': '#ef4444',
        'accent-blue': '#3b82f6',
        'accent-purple': '#8b5cf6',
        'border-subtle': '#2a2a2a',
      },
      fontFamily: {
        'display': ['system-ui', 'sans-serif'],
        'body': ['system-ui', 'sans-serif'],
        'mono': ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      animation: {
        'flip': 'flip 0.6s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        flip: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
