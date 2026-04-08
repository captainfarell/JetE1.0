export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // RGB-channel CSS variables — opacity modifiers (e.g. bg-app-surface/80) work correctly
        'app-bg':        'rgb(var(--app-bg) / <alpha-value>)',
        'app-surface':   'rgb(var(--app-surface) / <alpha-value>)',
        'app-raised':    'rgb(var(--app-raised) / <alpha-value>)',
        'app-muted':     'rgb(var(--app-muted) / <alpha-value>)',
        'app-border':    'rgb(var(--app-border) / <alpha-value>)',
        'app-text':      'rgb(var(--app-text) / <alpha-value>)',
        'app-secondary': 'rgb(var(--app-secondary) / <alpha-value>)',
        'app-dim':       'rgb(var(--app-dim) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}
