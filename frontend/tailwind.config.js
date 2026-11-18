/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Unslop Graphite neutral ramp
        graphite: {
          deep: '#0f0f10',
          bg: '#141415',
          card: '#19191b',
          raised: '#232325',
          line: 'rgba(237, 237, 237, 0.08)',
          text: '#ededed',
          secondary: '#a1a1a6',
          muted: '#85858b',
        },
        // Neutralize slate completely to pure graphite black & grey
        slate: {
          50: '#fbfbfb',
          100: '#f5f5f7',
          200: '#ededed',
          300: '#c5c5cb',
          400: '#a1a1a6',
          500: '#85858b',
          600: '#45454a',
          700: '#2e2e32',
          800: '#232325',
          850: '#1d1d1f',
          900: '#19191b',
          950: '#141415',
        },
        // Neutralize dark to pure graphite black
        dark: {
          50: '#fbfbfb',
          100: '#ededed',
          800: '#232325',
          850: '#1d1d1f',
          900: '#19191b',
          950: '#141415',
          1000: '#0f0f10',
        },
        // Single deliberate accent
        accent: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          subtle: 'rgba(59, 130, 246, 0.12)',
        },
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#b9dffe',
          300: '#7cc5fd',
          400: '#36a7fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
