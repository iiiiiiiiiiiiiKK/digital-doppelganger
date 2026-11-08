/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', '"Inter"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        ink: {
          950: '#05070c',
          900: '#080b12',
          850: '#0b0f18',
          800: '#10151f',
          700: '#171d2a',
          600: '#212936',
        },
        signal: {
          300: '#8ff0e0',
          400: '#57e3cd',
          500: '#22c8b2',
          600: '#12a894',
          700: '#0b7f70',
        },
        ember: {
          400: '#ff9d6b',
          500: '#ff7d43',
          600: '#e15f27',
        },
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 18px 40px -24px rgba(0,0,0,0.9)',
        glow: '0 0 0 1px rgba(87,227,205,0.28), 0 0 34px -8px rgba(87,227,205,0.35)',
      },
      borderRadius: {
        xl2: '1.15rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        orbit: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        pulseSoft: {
          '0%,100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        orbit: 'orbit 26s linear infinite',
        'pulse-soft': 'pulseSoft 3.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
