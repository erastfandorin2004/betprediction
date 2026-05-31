import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pitch: {
          950: '#040812',
          900: '#080f1e',
          800: '#0f1829',
          700: '#162235',
          600: '#1e304a',
        },
        electric: {
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        goal: {
          400: '#4ade80',
          500: '#22c55e',
        },
        loss: {
          400: '#f87171',
          500: '#ef4444',
        },
        value: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-electric': 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
        'gradient-pitch':
          'linear-gradient(180deg, #040812 0%, #080f1e 50%, #0f1829 100%)',
      },
      boxShadow: {
        electric: '0 0 20px rgb(59 130 246 / 0.25)',
        'electric-lg': '0 0 40px rgb(59 130 246 / 0.35)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
