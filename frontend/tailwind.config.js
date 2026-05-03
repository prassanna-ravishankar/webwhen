/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/neocron/dist/**/*.{js,mjs}",
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
      // webwhen tri-font stack — Instrument Sans (UI), Instrument Serif (display),
      // JetBrains Mono (technical specimens). Inter remains as fallback during
      // the migration; design/webwhen/colors_and_type.css is canonical.
      fontFamily: {
        sans:  ['Instrument Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Iowan Old Style', 'Apple Garamond', 'Baskerville', 'Times New Roman', 'serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },

      // Soft shadows from the --ww-shadow-* token surface.
      // Brutalist offset shadows (4px 4px 0 0 black, etc.) are deprecated.
      boxShadow: {
        'ww-xs':    'var(--ww-shadow-xs)',
        'ww-sm':    'var(--ww-shadow-sm)',
        'ww-md':    'var(--ww-shadow-md)',
        'ww-lg':    'var(--ww-shadow-lg)',
        'ww-focus': 'var(--ww-shadow-focus)',
        'ww-inset': 'var(--ww-shadow-inset)',
      },

      colors: {
        // Direct token consumers — for cases where the shadcn alias indirection
        // isn't appropriate (e.g. ember as a literal accent on a non-semantic surface).
        ink: {
          0: 'var(--ww-ink-0)',
          1: 'var(--ww-ink-1)',
          2: 'var(--ww-ink-2)',
          3: 'var(--ww-ink-3)',
          4: 'var(--ww-ink-4)',
          5: 'var(--ww-ink-5)',
          6: 'var(--ww-ink-6)',
          7: 'var(--ww-ink-7)',
          8: 'var(--ww-ink-8)',
        },
        canvas: 'var(--ww-canvas)',
        paper:  'var(--ww-paper)',
        ember: {
          DEFAULT: 'var(--ww-ember)',
          hover:   'var(--ww-ember-hover)',
          soft:    'var(--ww-ember-soft)',
          ink:     'var(--ww-ember-ink)',
        },

        // shadcn alias layer — derives from --ww-* via index.css :root block.
        // DO NOT hand-edit values in index.css without updating --ww-* first.
        border:     "hsl(var(--border))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      transitionTimingFunction: {
        'ww-out':   'var(--ww-ease-out)',
        'ww-inout': 'var(--ww-ease-inout)',
      },
      transitionDuration: {
        'ww-fast':   'var(--ww-dur-fast)',
        'ww-normal': 'var(--ww-dur-normal)',
        'ww-slow':   'var(--ww-dur-slow)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
