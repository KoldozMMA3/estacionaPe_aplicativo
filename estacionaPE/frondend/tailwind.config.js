/** @type {import('tailwindcss').Config} */
module.exports = {
  // IMPORTANTE: Esto asegura que Tailwind escanee tu App.js
  content: ["./App.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Tu paleta de colores profesional
        brand: { DEFAULT: '#2563EB', dark: '#1E3A8A', light: '#60A5FA' },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        dark: '#0F172A',
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
      },
      fontFamily: {
        // Usaremos la fuente por defecto del sistema para evitar problemas de carga ahora
        sans: ['System'],
      }
    },
  },
  plugins: [],
}