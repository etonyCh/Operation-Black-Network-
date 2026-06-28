import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Core dark background
        navy: {
          DEFAULT: '#0a0e1a',
          50: '#e8eaf0',
          100: '#c5c9d8',
          200: '#9ea5be',
          300: '#7780a4',
          400: '#5a6490',
          500: '#3d4876',
          600: '#2e3761',
          700: '#1f274d',
          800: '#111827',
          900: '#0a0e1a',
          950: '#050710',
        },
        // Accent red — alerts, destructive actions, critical findings
        accent: {
          DEFAULT: '#ff2d55',
          50: '#fff0f3',
          100: '#ffdde3',
          200: '#ffb3c1',
          300: '#ff7a93',
          400: '#ff4d6d',
          500: '#ff2d55',
          600: '#ed0a34',
          700: '#c8002a',
          800: '#a50027',
          900: '#880026',
        },
        // Teal — success states, safe findings, active scans
        teal: {
          DEFAULT: '#00d4aa',
          50: '#edfff9',
          100: '#c6fff0',
          200: '#90ffe3',
          300: '#4dfdd2',
          400: '#1af0be',
          500: '#00d4aa',
          600: '#00ab8a',
          700: '#008870',
          800: '#006b59',
          900: '#005748',
        },
        // UI surface colors
        panel: {
          DEFAULT: '#111827',
          light: '#1a2332',
          dark: '#0d1421',
        },
        // Border colors
        border: {
          DEFAULT: '#1f2937',
          light: '#374151',
          focus: '#00d4aa',
        },
        // Severity levels for findings
        severity: {
          critical: '#ff2d55',
          high: '#ff6b35',
          medium: '#ffc107',
          low: '#00d4aa',
          info: '#60a5fa',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(rgba(0, 212, 170, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 212, 170, 0.03) 1px, transparent 1px)',
        'glow-teal':
          'radial-gradient(circle at center, rgba(0, 212, 170, 0.15) 0%, transparent 70%)',
        'glow-red':
          'radial-gradient(circle at center, rgba(255, 45, 85, 0.15) 0%, transparent 70%)',
      },
      backgroundSize: {
        grid: '32px 32px',
      },
      boxShadow: {
        'glow-teal': '0 0 20px rgba(0, 212, 170, 0.3)',
        'glow-red': '0 0 20px rgba(255, 45, 85, 0.3)',
        panel: '0 4px 24px rgba(0, 0, 0, 0.4)',
        'panel-lg': '0 8px 48px rgba(0, 0, 0, 0.6)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan-line': 'scanLine 2s linear infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
    },
  },
  plugins: [],
}

export default config
