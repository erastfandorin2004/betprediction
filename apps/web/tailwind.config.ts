import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Neutral surface system (dark = charcoal, light = gray/white)
        pitch: {
          950: 'rgb(var(--pitch-950) / <alpha-value>)',
          900: 'rgb(var(--pitch-900) / <alpha-value>)',
          800: 'rgb(var(--pitch-800) / <alpha-value>)',
          700: 'rgb(var(--pitch-700) / <alpha-value>)',
          600: 'rgb(var(--pitch-600) / <alpha-value>)',
        },
        electric: {
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        goal: { 400: '#4ade80', 500: '#22c55e' },
        loss: { 400: '#f87171', 500: '#ef4444' },
        value: { 400: '#fbbf24', 500: '#f59e0b' },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 3px rgb(0 0 0 / 0.08), 0 1px 2px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 12px rgb(0 0 0 / 0.12)',
        electric: '0 0 20px rgb(59 130 246 / 0.25)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.15s ease-out',
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
