/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: { xs: '390px', sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1440px' },
    extend: {
      colors: {
        // Palette. Colours that change between light and dark themes read CSS variables set in
        // styles/index.css (values for light mode are the original brand colours). Fixed brand
        // colours (navy, blue 600 and 700, teal, sun) stay the same in both themes.
        // Every text pairing meets WCAG AA in both themes.
        surface: 'rgb(var(--surface) / <alpha-value>)',
        heading: 'rgb(var(--heading) / <alpha-value>)',
        navy: { DEFAULT: '#14213D', 700: '#1E3260', 50: 'rgb(var(--navy-50) / <alpha-value>)' },
        blue: { DEFAULT: 'rgb(var(--accent) / <alpha-value>)', 600: 'rgb(var(--accent) / <alpha-value>)', 700: 'rgb(var(--accent-700) / <alpha-value>)', 50: 'rgb(var(--blue-50) / <alpha-value>)', 100: 'rgb(var(--blue-100) / <alpha-value>)' },
        teal: { DEFAULT: '#0F766E', 700: '#115E59', 50: 'rgb(var(--teal-50) / <alpha-value>)', 100: 'rgb(var(--teal-100) / <alpha-value>)' },
        // mint is the soft teal tint used for success states and icon chips.
        mint: { DEFAULT: 'rgb(var(--mint) / <alpha-value>)', 50: 'rgb(var(--teal-50) / <alpha-value>)', 700: 'rgb(var(--mint-700) / <alpha-value>)' },
        // sun is a warm accent from the original brand, for highlights only, never text on white.
        sun: { DEFAULT: '#F7C948', 100: 'rgb(var(--sun-100) / <alpha-value>)', 600: 'rgb(var(--sun-600) / <alpha-value>)' },
        ink: { DEFAULT: 'rgb(var(--ink) / <alpha-value>)', muted: 'rgb(var(--ink-muted) / <alpha-value>)' },
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        line: { DEFAULT: 'rgb(var(--line) / <alpha-value>)', strong: 'rgb(var(--line-strong) / <alpha-value>)' },
        danger: { DEFAULT: 'rgb(var(--danger) / <alpha-value>)', 50: 'rgb(var(--danger-50) / <alpha-value>)' },
        warn: { DEFAULT: 'rgb(var(--warn) / <alpha-value>)', 50: 'rgb(var(--warn-50) / <alpha-value>)' },
        whatsapp: { DEFAULT: '#128C7E', 700: '#075E54' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        play: ['"Nunito Variable"', '"Plus Jakarta Sans Variable"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Type scale: caption, label, body, lead, then headings h4 to display.
        caption: ['0.8125rem', { lineHeight: '1.25rem' }],
        label: ['0.875rem', { lineHeight: '1.25rem', fontWeight: '600' }],
        body: ['1rem', { lineHeight: '1.65rem' }],
        lead: ['1.1875rem', { lineHeight: '1.85rem' }],
        h4: ['1.125rem', { lineHeight: '1.6rem', fontWeight: '700' }],
        h3: ['clamp(1.25rem, 1.15rem + 0.4vw, 1.4rem)', { lineHeight: '1.35', fontWeight: '700', letterSpacing: '-0.01em' }],
        h2: ['clamp(1.65rem, 1.3rem + 1.5vw, 2.4rem)', { lineHeight: '1.18', fontWeight: '750', letterSpacing: '-0.02em' }],
        h1: ['clamp(2rem, 1.35rem + 2.8vw, 3.6rem)', { lineHeight: '1.08', fontWeight: '800', letterSpacing: '-0.025em' }],
      },
      borderRadius: { sm: '0.5rem', DEFAULT: '0.625rem', lg: '0.875rem', xl: '1.25rem', '2xl': '1.75rem' },
      boxShadow: {
        soft: '0 1px 2px rgba(20,33,61,0.05), 0 2px 6px rgba(20,33,61,0.05)',
        card: '0 1px 2px rgba(20,33,61,0.04), 0 8px 24px rgba(20,33,61,0.07)',
        lift: '0 2px 4px rgba(20,33,61,0.05), 0 16px 36px rgba(20,33,61,0.12)',
        focus: '0 0 0 3px rgba(37,99,235,0.4)',
      },
      maxWidth: { content: '76rem', prose: '42rem' },
      keyframes: {
        marquee: { from: { transform: 'translate3d(0,0,0)' }, to: { transform: 'translate3d(-50%,0,0)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        drift: { '0%,100%': { transform: 'translate(0,0) rotate(0deg)' }, '50%': { transform: 'translate(6px,-8px) rotate(6deg)' } },
        twinkle: { '0%,100%': { opacity: '0.35', transform: 'scale(0.9)' }, '50%': { opacity: '1', transform: 'scale(1.05)' } },
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
        // Hero entrance: movement only from opacity 0.35 up, so the text counts as painted at once.
        rise: { '0%': { opacity: '0.35', transform: 'translateY(18px)' }, '100%': { opacity: '1', transform: 'none' } },
        'rise-in': { '0%': { opacity: '0', transform: 'translateY(16px) scale(0.98)' }, '100%': { opacity: '1', transform: 'none' } },
        orb: { '0%,100%': { transform: 'translate3d(0,0,0) scale(1)' }, '33%': { transform: 'translate3d(24px,-18px,0) scale(1.06)' }, '66%': { transform: 'translate3d(-18px,14px,0) scale(0.97)' } },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        'glow-ring': { '0%,100%': { boxShadow: '0 0 0 0 rgba(247,201,72,0)' }, '50%': { boxShadow: '0 0 0 7px rgba(247,201,72,0.35)' } },
        progress: { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
        'float-delayed': 'float 8s ease-in-out 1.5s infinite',
        marquee: 'marquee var(--marquee-duration, 40s) linear infinite',
        'float-slow': 'float 10s ease-in-out infinite',
        drift: 'drift 12s ease-in-out infinite',
        twinkle: 'twinkle 4s ease-in-out infinite',
        shimmer: 'shimmer 1.4s linear infinite',
        rise: 'rise 0.55s cubic-bezier(0.22,1,0.36,1) both',
        'rise-in': 'rise-in 0.55s cubic-bezier(0.22,1,0.36,1) both',
        'glow-ring': 'glow-ring 2.6s ease-in-out infinite',
        orb: 'orb 18s ease-in-out infinite',
        'orb-slow': 'orb 26s ease-in-out infinite reverse',
        'spin-slow': 'spin-slow 60s linear infinite',
      },
    },
  },
  plugins: [],
};
