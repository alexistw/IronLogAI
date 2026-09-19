import typography from '@tailwindcss/typography';
import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#10b981', // Emerald 500
        secondary: '#3b82f6', // Blue 500
        dark: '#0f172a', // Slate 900
        card: '#1e293b', // Slate 800
        accent: '#8b5cf6', // Violet 500
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  // animate: powers the animate-in / fade-in / zoom-in / slide-in-from-* classes.
  // typography: powers the prose / prose-invert / prose-sm classes.
  plugins: [animate, typography],
};
