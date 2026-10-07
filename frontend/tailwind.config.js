/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary brand color — Electric Sapphire Blue
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Accent — Ice Blue & Cyan
        accent: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49',
        },
        // Dark theme backgrounds (Deep Midnight Sapphire & Charcoal)
        dark: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          800: '#1e293b',
          850: '#151f32',
          900: '#0b1220',
          950: '#060a12',
        },
        // Surface cards
        surface: {
          DEFAULT: '#131c2e',
          light: '#1a2438',
          border: 'rgba(255, 255, 255, 0.08)',
          glow: 'rgba(59, 130, 246, 0.15)',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger:  '#f43f5e',
        info:    '#38bdf8',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-in':      'fadeIn 0.3s ease-in-out',
        'slide-up':     'slideUp 0.3s ease-out',
        'slide-in':     'slideIn 0.3s ease-out',
        'pulse-ring':   'pulseRing 1.5s ease-in-out infinite',
        'glow':         'glow 2s ease-in-out infinite alternate',
        'scan-line':    'scanLine 2.5s linear infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 },                       to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideIn:   { from: { opacity: 0, transform: 'translateX(-10px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        pulseRing: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.4)' },
          '50%':      { boxShadow: '0 0 0 12px rgba(59, 130, 246, 0)' },
        },
        glow: {
          from: { textShadow: '0 0 10px rgba(59,130,246,0.4), 0 0 20px rgba(59,130,246,0.2)' },
          to:   { textShadow: '0 0 20px rgba(59,130,246,0.7), 0 0 40px rgba(59,130,246,0.4)' },
        },
        scanLine: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)",
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      boxShadow: {
        'glow-primary': '0 0 25px rgba(59, 130, 246, 0.3)',
        'glow-accent':  '0 0 25px rgba(56, 189, 248, 0.3)',
        'glow-success': '0 0 20px rgba(16, 185, 129, 0.3)',
        'glow-danger':  '0 0 20px rgba(244, 63, 94, 0.3)',
        'card':         '0 8px 32px rgba(0, 0, 0, 0.5)',
        'card-hover':   '0 12px 36px rgba(59, 130, 246, 0.2)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
