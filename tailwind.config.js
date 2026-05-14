/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Roboto', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        terra: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          // Primary: Emerald Green
          emerald: {
            DEFAULT: '#10B981',
            hover: '#059669',
            light: '#D1FAE5',
          },
          // Secondary: Deep Indigo/Purple
          indigo: {
            DEFAULT: '#4F46E5',
            hover: '#4338CA',
            light: '#EDE9FE',
          },
          // Text
          heading: '#0F172A',   // slate-900
          body: '#475569',      // slate-600
          muted: '#94A3B8',     // slate-400
          // Borders
          border: '#E2E8F0',    // slate-200
        },
      },
      animation: {
        'scanner-sweep': 'scannerSweep 2s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        scannerSweep: {
          '0%': { top: '0%' },
          '100%': { top: '100%' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(16, 185, 129, 0)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
