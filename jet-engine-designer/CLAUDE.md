# CLAUDE.md — Jet Engine Designer

## Quick orientation

Web app for Brayton cycle jet engine analysis. Backend computes all physics; frontend is pure UI. No physics logic in the frontend — if a calculation is wrong, look in `backend/app/physics/cycle.py`.

**To run (use the launcher script — never start servers manually):**
```bash
powershell -ExecutionPolicy Bypass -File start.ps1
```
This kills stale processes on 8000/5173 and opens both servers in separate windows.
Vite proxies `/api/*` → `http://localhost:8000`. API docs at `http://localhost:8000/api/docs`.

**Agent rule:** Only edit files. When a server restart is needed, say so and tell the user to re-run `start.ps1`. Never spawn background server processes.

---

## File map — where to find everything

```
jet-engine-designer/
├── start.ps1                ← Dev launcher: kills stale processes, starts backend + frontend
├── backend/app/
│   ├── main.py                  ← FastAPI routes only (4 endpoints, no logic)
│   ├── config/defaults.py       ← ENGINE_PRESETS, MATERIAL_TIT_RANGES, PARAMETER_DESCRIPTIONS
│   ├── models/
│   │   ├── inputs.py            ← CalculateRequest, EnvelopeRequest (Pydantic)
│   │   └── outputs.py           ← EngineResults, EnvelopeResults, GeometryData, PlotData (Pydantic)
│   └── physics/
│       ├── atmosphere.py        ← standard_atmosphere(altitude_m) → (T, p, rho)
│       ├── cycle.py             ← Thin re-export shim (backwards compatibility — do not add logic here)
│       ├── cycle_core.py        ← Constants (γ, cp, R, LHV) + elementary functions (compressor, turbine, nozzle)
│       ├── cycle_geometry.py    ← _num_stages(), _estimate_geometry()
│       └── cycle_engine.py      ← _split_*spool(), calculate_engine(), calculate_envelope()
└── frontend/src/
    ├── App.tsx                  ← Root: tab routing, API calls, results state (form state in hook)
    ├── hooks/
    │   └── useEngineForm.ts     ← formData + defaults state + updateForm (with architecture-change callback)
    ├── types/engine.ts          ← TypeScript interfaces (must mirror Pydantic models exactly)
    ├── services/api.ts          ← Axios client: calculateEngine(), calculateEnvelope(), getDefaults()
    ├── themes/
    │   ├── palette-original.css — dark teal / navy (original)
    │   ├── palette-3125.css     — earthy green / olive-black
    │   └── palette-blueprint.css— Prussian blue / sky blue (ACTIVE — imported in main.tsx)
    └── components/
        ├── shared/              ← Reusable UI primitives (import from here, not inline)
        │   ├── Tooltip.tsx      ← Hover tooltip, positioned right of children
        │   ├── FieldLabel.tsx   ← Label + optional info icon + tooltip (accepts paramKey or tooltip string)
        │   ├── NumberInput.tsx  ← Styled number input with app-* token classes
        │   ├── SectionHeader.tsx← h3 with standard section heading style
        │   └── index.ts         ← Barrel export for all shared components
        ├── EngineConfig.tsx     ← Architecture inputs: engine type, spools, OPR, TIT, efficiencies
        ├── AircraftConfig.tsx   ← Aircraft + flight condition inputs
        ├── EnvelopeConfig.tsx   ← Sweep range inputs + Generate button
        ├── EngineLayout.tsx     ← Hardcoded engine section list
        ├── ResultsPanel.tsx     ← All results display (see section order below)
        ├── PlotsPanel.tsx       ← Recharts envelope plots
        ├── WorkflowSection.tsx  ← Workflow tab: step-by-step calculation flow with rendered equations
        └── HelpSection.tsx      ← Learn tab: Brayton cycle explainer + Further Reading
```

---

## Physics module index

`cycle.py` is now a thin shim — add logic to the sub-modules below.

| Module | Function | What it does |
|---|---|---|
| `cycle_core` | `compressor_exit_temp(T, PR, η)` | Adiabatic compressor exit temperature |
| `cycle_core` | `turbine_exit_pressure(Tt_in, Tt_out, pt_in, η)` | Turbine exit pressure from temperature drop |
| `cycle_core` | `nozzle_exit(Tt, pt, p_amb, m_dot)` | Choked or unchoked converging nozzle |
| `cycle_geometry` | `_num_stages(PR)` | Axial compressor stages for a given PR (assuming 1.3/stage) |
| `cycle_geometry` | `_estimate_geometry(...)` | Returns GeometryData (diameters + component_positions) |
| `cycle_engine` | `_split_2spool(OPR, lp_pr, hp_pr)` | Auto-splits OPR between LP and HP |
| `cycle_engine` | `_split_3spool(OPR, lp_pr, ip_pr, hp_pr)` | Auto-splits OPR between LP, IP, HP |
| `cycle_engine` | `calculate_engine(request)` | Full Brayton cycle → EngineResults |
| `cycle_engine` | `calculate_envelope(request)` | Speed + altitude sweeps → EnvelopeResults |

**Constants (do not change without updating tooltips):**
- `γ = 1.4`, `cp = 1005 J/(kg·K)`, `R = 287.058 J/(kg·K)`
- Fuel: Jet-A, `LHV = 43.2 MJ/kg`
- Per-stage axial compressor PR: `1.3`

---

## API endpoints

| Method | Path | Handler | Returns |
|---|---|---|---|
| GET | `/api/health` | `health_check()` | `{status, service}` |
| GET | `/api/defaults` | `get_defaults()` | `DefaultsResponse` |
| POST | `/api/calculate` | `calculate()` | `EngineResults` |
| POST | `/api/envelope` | `envelope()` | `EnvelopeResults` |

Errors from bad physics go in `errors: string[]` in the response body — not HTTP errors. HTTP 422 only for unrecoverable exceptions.

---

## Engine configurations supported

### Turbojet
| Sections | 1-spool | 2-spool | 3-spool (disabled) |
|---|---|---|---|
| | Intake | Intake | — |
| | HP Compressor | LP Compressor | — |
| | Combustor | HP Compressor | — |
| | HP Turbine | Combustor | — |
| | Exhaust | HP Turbine | — |
| | | LP Turbine | — |
| | | Exhaust | — |

### Turbofan
| Sections | 1-spool (disabled) | 2-spool | 3-spool |
|---|---|---|---|
| | — | Intake | Intake |
| | — | Fan | Fan |
| | — | HP Compressor | IP Compressor |
| | — | Combustor | HP Compressor |
| | — | HP Turbine | Combustor |
| | — | LP Turbine | HP Turbine |
| | — | Exhaust | IP Turbine |
| | — | — | LP Turbine |
| | — | — | Exhaust |

**Disabled configurations:** 1-spool turbofan and 3-spool turbojet are disabled in the UI (no commercial production examples). Switching engine type auto-resets to a valid spool count.

**These tables are hardcoded in `EngineLayout.tsx` — `LAYOUTS` dict, keyed by `"${engine_type}-${num_spools}"`.**
Do not compute them dynamically; edit the dict directly.

---

## ResultsPanel.tsx — section order

1. Errors & Warnings banners
2. **Performance Summary** (MetricCard grid: thrust, TSFC, fuel flow, propulsive efficiency, mass flows)
3. **Estimated Geometry** (inline table: inlet/fan/core diameter, engine length)
4. **Compressor Stage Counts** — table of stages per compressor section (Fan, LP, IP, HP as applicable); note: axial only, ~1.3 PR/stage
5. Combustion Headroom — Tt3/TIT progress bar
6. Station Thermodynamic States — table of Tt and pt per station
7. Nozzle Exit Conditions
8. **Model Assumptions** — collapsible accordion
9. **Literature & References** — collapsible accordion (free resources only: NOAA US Std Atmosphere, NASA Glenn, NACA 1135, NASA SP-36, NIST WebBook)

---

## HelpSection.tsx — section order

1. How Does a Jet Engine Work?
2. The Brayton Cycle (4-card grid)
3. Turbofan vs Turbojet (comparison table + 2-card note on disabled architectures)
4. Key Parameters Explained (ISA first, then engine parameters)
5. **Further Reading** — three sub-groups:
   - Free resources (NASA Glenn, NIST WebBook, YouTube)
   - Textbooks — purchase required (Rolls-Royce, Saravanamuttoo, Mattingly, Walsh & Fletcher)
   - Standards — purchase required (SAE ARP755, ISO 2533, ASTM D1655)

---

## Frontend state flow

```
App.tsx state: formData, results, envelopeResults, activeTab, loading*, apiError, calcErrors/Warnings

updateForm(updates)
  → merges into formData
  → if engine_type or num_spools changed: clears results + envelopeResults (prevents stale diagram)

handleCalculate()
  → POST /api/calculate(formData) → setResults() → switch to 'results' tab on success

handleEnvelope(config)
  → POST /api/envelope({design: formData, ...config}) → setEnvelopeResults()

Tab order: 'learn' (default) → 'design' → 'results' → 'envelope' → 'workflow'
```

**Key constraint:** `EngineLayout` reads from `formData` (not `results`) so it always shows the current configuration, even before calculation.

---

## EngineConfig.tsx — key behaviours

- **Quick Presets section removed** — presets are gone from the UI; `applyPreset()` function and logic remain in case they are re-added
- 1-spool button **disabled** for turbofan; 3-spool button **disabled** for turbojet — tooltip: "No commercial production examples"
- Switching to turbofan while on 1-spool auto-resets to 2 spools; switching to turbojet while on 3-spools auto-resets to 2 spools
- Below the spool buttons: shows real engine examples for valid combos, or unavailability note for disabled combos
- Spool PR split: manual override shown only when `num_spools >= 2` and `autoSplit === false`
- Material TIT buttons set `tit_max_k` to midpoint of the material range

**Engine examples per configuration (hardcoded in `EngineConfig.tsx`):**
- `turbojet-1`: de Havilland Ghost, GE CJ610, JetCat P200, Microturbo TRI 60
- `turbojet-2`: P&W JT3C, Bristol Siddeley Olympus 593, GE J79 (CJ805-3)
- `turbofan-2`: CFM56, GE90, GEnx, Williams FJ44
- `turbofan-3`: RR RB211, RR Trent 1000, Progress D-18T, Garrett ATF3

---

## Physics constants & key formulas

### Intake (isentropic)
```
Tt2 = T_amb · (1 + (γ-1)/2 · M0²)
pt2 = p_amb · (Tt2/T_amb)^(γ/(γ-1))
```

### Compressor
```
Tt_out = Tt_in · [1 + (PR^((γ-1)/γ) − 1) / η_c]
```

### Combustor
```
ṁ_f · LHV · η_b = ṁ_core · cp · (Tt4 − Tt3)
```

### Turbine exit pressure
```
pt_out = pt_in · [1 − (Tt_in − Tt_out) / (η_t · Tt_in)]^(γ/(γ-1))
```

### Nozzle choke
Critical PR = `((γ+1)/2)^(γ/(γ-1)) ≈ 1.893`

### TSFC display
API returns `tsfc_kg_n_h` in kg/(N·h). Display as mg/(N·s): multiply by `1e6 / 3600`. Do **not** use `× 1e4`.

### tit_fraction
`= Tt3 / TIT_max` — fraction of TIT already consumed by compression. Not a material utilisation fraction.

---

## How to add things

### New input parameter
1. `models/inputs.py` — add `Field()` with default
2. `frontend/src/types/engine.ts` — add matching field to `CalculateRequest`
3. `physics/cycle.py` — use it in `calculate_engine()`
4. `config/defaults.py` — add to `PARAMETER_DESCRIPTIONS` (auto-shows as tooltip in EngineConfig)

### New output value
1. `models/outputs.py` — add to `EngineResults` or sub-model
2. `frontend/src/types/engine.ts` — mirror the field
3. `components/ResultsPanel.tsx` — display it (see section order above)

### New plot
1. `physics/cycle.py` — add series to `calculate_envelope()`, return new `PlotData` in `EnvelopeResults`
2. `models/outputs.py` + `frontend/src/types/engine.ts` — add field to `EnvelopeResults`
3. `components/PlotsPanel.tsx` — add `<SinglePlot>`

### New engine architecture (e.g. turboprop)
1. `models/inputs.py` — add type string to `engine_type` field
2. `physics/cycle.py` — add `elif eng == "..."` block in `calculate_engine()` and geometry in `_estimate_geometry()`
3. `config/defaults.py` — add preset to `ENGINE_PRESETS`
4. `components/EngineConfig.tsx` — add option to engine type dropdown
5. `components/EngineLayout.tsx` — add entry to `LAYOUTS` dict and `SECTION_STYLE` if new section names needed

---

## Validation rules (in calculate_engine)

**Hard errors** (return zeroed results):
- `engine_type` not in `{turbojet, turbofan}`
- `num_spools` not in `{1, 2, 3}`
- `overall_pressure_ratio ≤ 1`
- `core_mass_flow_kg_s ≤ 0`
- `fan_pressure_ratio > overall_pressure_ratio`
- Any efficiency outside `(0, 1]`
- `fuel_flow < 0` (TIT below compressor exit temp)
- Turbine exit temp below intake temp

**Warnings** (logged, calculation proceeds):
- `M0 > 1.0` — no intake shock modelled
- `OPR > 40` — surge margin concern
- `tit_fraction > 0.95` — little combustion headroom
- `Tt_exhaust < 400 K` — unusually cold exhaust
- `thrust_margin < 0` — engine undersized for cruise

---

## Model assumptions (shown to users, do not silently change)

- Ideal gas: γ = 1.4, cp = 1005 J/(kg·K)
- Isentropic intake — no intake pressure loss
- No combustor pressure loss
- No turbine cooling air
- Converging nozzle only — no supersonic expansion
- 100% shaft mechanical efficiency
- No duct pressure losses

---

## Station numbering (ARP755)

`0` freestream → `2` compressor/fan inlet → `21` LP/fan exit → `25` IP exit (3-spool) → `3` HP compressor exit → `4` combustor exit (TIT) → `45` HP turbine exit → `5` IP/LP turbine exit → `55` LP turbine exit (3-spool) → `9` core nozzle exit → `19` bypass nozzle exit

---

## Styling conventions

All styling via Tailwind utility classes — no custom CSS except in `index.css`:
- Spin buttons removed from `<input type="number">`
- Custom scrollbar (`app-bg` track, `app-muted` thumb)
- `.station-row:hover` tinted via `--station-hover-bg` CSS variable
- `.tooltip-content` fade-in animation
- Recharts axis/legend colour overrides via `--recharts-axis-fill` / `--recharts-legend`

### Theming / palette swapping

Colours are defined as CSS custom properties. To switch the entire palette, change the import in `main.tsx`:

```
frontend/src/themes/
├── palette-original.css   — dark teal / navy (original)
├── palette-3125.css       — earthy green / olive-black
└── palette-blueprint.css  — Prussian blue / sky blue (ACTIVE)
```

To try a new palette:
1. Create `frontend/src/themes/palette-XXXX.css` — define all `--app-*` and semantic vars (copy an existing file as template)
2. Change the `import './themes/palette-XXXX.css'` line in `main.tsx`
3. Restart Vite (`start.ps1`) — Tailwind must rebuild to pick up new token values

`tailwind.config.js` reads `var(--app-*)` and `var(--btn-*)` / `var(--highlight-*)` — no changes needed there when swapping palettes.

### Design token groups (semantic layer)

All UI element groups have a single token source. Change one variable in the palette file to restyle the entire group:

| Group | Tokens | Elements |
|---|---|---|
| **Primary buttons** | `--btn-primary-bg/text/hover` | Calculate Performance, Generate Envelope, Go to Engine Design |
| **Toggle/spool active** | `app-accent/20 + border-app-accent + text-app-accent` | Spool count buttons (selected state) |
| **Toggle/spool hover** | `hover:border-app-accent hover:text-app-accent` | Spool count buttons (hover) |
| **Active tab** | `border-app-accent text-app-accent` | Ribbon tab indicator |
| **Input fields** | `bg-app-muted border-app-border focus:border-app-accent` | All number inputs, selects |
| **Highlight/info** | `--highlight-bg/border/text` | Required Thrust MetricCard, envelope info banner |
| **Section headings** | `text-app-accent` | All h2/h3 section titles |
| **Status** | Tailwind `green/yellow/red-400` (not tokenized) | Thrust margin, TIT fraction, errors/warnings |
| **Tooltip icons** | `text-blue-400` | Info (ℹ) icon next to field labels |

**Base colour tokens** (declared in active palette file, variables stored as bare RGB channels):
- `--app-bg` — page background
- `--app-surface` — card/panel background
- `--app-raised` — table headers, sub-panel backgrounds
- `--app-muted` — inputs, badges
- `--app-border` — borders
- `--app-text` — primary text
- `--app-secondary` — secondary/muted text
- `--app-dim` — very dim text
- `--app-accent` — accent (headings, active states, highlights)

**Number inputs:** spin buttons suppressed globally. Do not add them back.

---

## Git / deployment

- `node_modules/` and `__pycache__/` are gitignored
- Backend containerisable via `backend/Dockerfile`
- Frontend builds to `frontend/dist/` with `npm run build`
- Set `VITE_API_URL` env var to point frontend at a non-localhost backend
