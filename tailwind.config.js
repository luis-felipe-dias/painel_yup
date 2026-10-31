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
        // ── Tokens semânticos (seguem as variáveis do index.css e trocam
        //    sozinhos entre claro e escuro). Use SEMPRE estes nos componentes.
        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          muted: "rgb(var(--surface-muted) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground) / <alpha-value>)",
          soft: "rgb(var(--accent-soft) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
          foreground: "rgb(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "rgb(var(--destructive) / <alpha-value>)",
          foreground: "rgb(var(--destructive-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "rgb(var(--popover) / <alpha-value>)",
          foreground: "rgb(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "rgb(var(--card) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground) / <alpha-value>)",
        },

        // ── Status de atendimento (nomeados pela função, não pela cor)
        aguardando: {
          DEFAULT: "rgb(var(--st-aguardando) / <alpha-value>)",
          ink: "rgb(var(--st-aguardando-ink) / <alpha-value>)",
        },
        atendendo: {
          DEFAULT: "rgb(var(--st-atendendo) / <alpha-value>)",
          ink: "rgb(var(--st-atendendo-ink) / <alpha-value>)",
        },
        finalizada: {
          DEFAULT: "rgb(var(--st-finalizada) / <alpha-value>)",
          ink: "rgb(var(--st-finalizada-ink) / <alpha-value>)",
        },

        // ── Paleta da marca com os nomes oficiais, para quando for preciso
        //    a cor exata (logo, gráfico, ilustração). No dia a dia use os
        //    tokens semânticos acima, que respeitam o tema escuro.
        noite: { DEFAULT: "#272D4F", light: "#3A4270", dark: "#1A1F36" },
        bruma: { DEFAULT: "#DDE3F1", light: "#EEF1F8", dark: "#C5CDDF", ink: "#6B7299" },
        afeto: { DEFAULT: "#FEFDEB", light: "#FFFEF5", dark: "#FDFCD7" },
        abraco: { DEFAULT: "#FFC6C5", light: "#FFD9D8", dark: "#FFB0AF" },
        brincadeira: { DEFAULT: "#EA70B0", light: "#EF8DC2", dark: "#E3539E", ink: "#A82D6F" },
        chama: { DEFAULT: "#F15040", light: "#F47062", dark: "#E83A28", ink: "#C5331F" },
        folha: { DEFAULT: "#ACBD6F", light: "#BDCB86", dark: "#9BAF58", ink: "#5F7030" },
      },
      fontFamily: {
        // Poppins é a tipografia de texto corrido da marca. Fica o fallback
        // do sistema para não quebrar caso a fonte não esteja carregada.
        sans: ['Poppins', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        // Escada de raios do padrão Apple. Regra: o raio acompanha o
        // tamanho do elemento — chip usa sm, card usa lg, painel usa 2xl.
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
        "2xl": "var(--r-2xl)",
      },
      spacing: {
        // Grade de 4pt: toda medida do painel é múltipla de 4.
        header: "56px",   // altura da barra superior
        barra: "64px",    // altura da barra de digitação
        toque: "44px",    // alvo mínimo de toque (acessibilidade)
      },
      // O Tailwind 3.3 (versão deste projeto) NÃO faz minHeight/minWidth
      // herdarem a escala de `spacing` — isso só vale do 3.4 em diante.
      // Sem estas duas linhas, `min-h-toque` sai do build como classe
      // inexistente e o alvo de toque simplesmente não acontece.
      minHeight: {
        toque: "44px",
        header: "56px",
      },
      minWidth: {
        toque: "44px",
      },
      // Unidades de viewport dinâmicas: no celular, 100vh inclui a barra
      // de endereço que some ao rolar, então o rodapé fica escondido
      // atrás dela. 100dvh acompanha o que está realmente visível.
      height: {
        tela: ["100vh", "100dvh"],
      },
      boxShadow: {
        card: "0 1px 2px rgb(39 45 79 / 0.06), 0 4px 12px rgb(39 45 79 / 0.04)",
        pop: "0 8px 28px rgb(39 45 79 / 0.14)",
        // Elevação por desfoque e brilho, não por sombra pesada.
        vidro: "inset 0 1px 0 0 rgb(255 255 255 / 0.5), 0 8px 24px -8px rgb(39 45 79 / 0.12)",
        "vidro-alto": "inset 0 1px 0 0 rgb(255 255 255 / 0.6), 0 16px 48px -12px rgb(39 45 79 / 0.28)",
      },
      backdropBlur: {
        vidro: "20px",
        "vidro-forte": "36px",
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
