/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: '#272D4F', // Noite Serena
          foreground: '#FFFFFF',
          light: '#3A4270',
          dark: '#1A1F36',
        },
        secondary: {
          DEFAULT: '#DDE3F1', // Bruma Suave
          foreground: '#272D4F',
        },
        accent: {
          DEFAULT: '#EA70B0', // Brincadeira Viva
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#FEFDEB', // Toque de Afeto
          foreground: '#272D4F',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#272D4F',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#272D4F',
        },
        destructive: {
          DEFAULT: '#F15040', // Chama da Imaginação
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#ACBD6F', // Folha de Aventuras
          foreground: '#FFFFFF',
        },
        warm: {
          DEFAULT: '#FFC6C5', // Abraço Doce
          foreground: '#272D4F',
        },
        noiteSerena: '#272D4F',
        brumaSuave: '#DDE3F1',
        toqueAfeto: '#FEFDEB',
        abracoDoce: '#FFC6C5',
        brincadeiraViva: '#EA70B0',
        chamaImaginacao: '#F15040',
        folhaAventuras: '#ACBD6F',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "fade-in": {
          from: { opacity: 0, transform: "translateY(10px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "slide-in": {
          from: { opacity: 0, transform: "translateX(-10px)" },
          to: { opacity: 1, transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}