# CLAUDE-STYLE.md — Styling & Theming Reference

## Styling conventions

All styling via Tailwind utility classes — no custom CSS except in `index.css`:
- Spin buttons removed from `<input type="number">`
- Custom scrollbar (`app-bg` track, `app-muted` thumb)
- `.station-row:hover` tinted via `--station-hover-bg` CSS variable
- `.spool-btn:hover` overrides colour via `.spool-btn:hover` rule in `index.css`
- `.tooltip-content` fade-in animation
- Recharts axis/legend colour overrides via `--recharts-axis-fill` / `--recharts-legend`

**Number inputs:** spin buttons suppressed globally. Do not add them back.

---

## Theming / palette swapping

Colours are defined as CSS custom properties. To switch the entire palette, change the import in `main.tsx`:

```
frontend/src/themes/
├── palette-original.css   — dark teal / navy (original)
├── palette-3125.css       — earthy green / olive-black
└── palette-blueprint.css  — Prussian blue / sky blue (ACTIVE)
```

To try a new palette:
1. Create `frontend/src/themes/palette-XXXX.css` — copy an existing file, redefine all `--app-*` and semantic vars
2. Change the `import './themes/palette-XXXX.css'` line in `main.tsx`
3. Restart Vite (`start.ps1`) — Tailwind must rebuild to pick up new token values

`tailwind.config.js` reads `var(--app-*)` and `var(--btn-*)` / `var(--highlight-*)` — no changes needed there when swapping palettes.

---

## Design token groups (semantic layer)

All UI element groups have a single token source. Change one variable in the palette file to restyle the entire group:

| Group | Tokens | Elements |
|---|---|---|
| **Primary buttons** | `--btn-primary-bg/text/hover` | Calculate Performance, Generate Envelope, Go to Engine Design |
| **Toggle/spool active** | `app-accent/20 + border-app-accent + text-app-accent` | Spool count buttons (selected state) |
| **Toggle/spool hover** | `.spool-btn:hover` in `index.css` | Spool count buttons (hover) |
| **Active tab** | `border-app-accent text-app-accent` | Ribbon tab indicator |
| **Input fields** | `bg-app-muted border-app-border focus:border-app-accent` | All number inputs, selects |
| **Highlight/info** | `--highlight-bg/border/text` | Required Thrust MetricCard, envelope info banner |
| **Section headings** | `text-app-accent` | All h2/h3 section titles |
| **Status** | Tailwind `green/yellow/red-400` (not tokenized) | Thrust margin, TIT fraction, errors/warnings |
| **Tooltip icons** | `text-blue-400` | Info (ℹ) icon next to field labels |

---

## Base colour tokens

Declared in the active palette file as bare RGB channels (so Tailwind opacity modifiers work):

| Token | Role |
|---|---|
| `--app-bg` | Page background |
| `--app-surface` | Card/panel background |
| `--app-raised` | Table headers, sub-panel backgrounds |
| `--app-muted` | Inputs, badges |
| `--app-border` | Borders |
| `--app-text` | Primary text |
| `--app-secondary` | Secondary/muted text |
| `--app-dim` | Very dim text, bullets, minor labels |
| `--app-accent` | Accent — headings, active states, highlights |

**Semantic tokens** (also in palette file):

| Token group | Elements |
|---|---|
| `--btn-primary-bg/text/hover` | Primary action buttons |
| `--highlight-bg/border/text` | Info panels |
| `--input-focus-border` | Input focus ring |
