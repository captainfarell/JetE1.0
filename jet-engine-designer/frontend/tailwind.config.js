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
        'app-accent':    'rgb(var(--app-accent) / <alpha-value>)',
        // Semantic tokens
        'btn-primary':       'rgb(var(--btn-primary-bg) / <alpha-value>)',
        'btn-primary-text':  'rgb(var(--btn-primary-text) / <alpha-value>)',
        'btn-primary-hover': 'rgb(var(--btn-primary-hover) / <alpha-value>)',
        'highlight':         'rgb(var(--highlight-bg) / <alpha-value>)',
        'highlight-border':  'rgb(var(--highlight-border) / <alpha-value>)',
        'highlight-text':    'rgb(var(--highlight-text) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}
