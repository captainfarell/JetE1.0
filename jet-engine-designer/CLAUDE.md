# CLAUDE.md — Jet Engine Designer

## Quick orientation

Web app for Brayton cycle jet engine analysis. Backend computes all physics; frontend is pure UI. No physics logic in the frontend — if a calculation is wrong, look in `backend/app/physics/cycle.py`.

**To run:**
```bash
# Backend (port 8000)
cd jet-engine-designer/backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (port 5173)
cd jet-engine-designer/frontend
npm run dev
```
Vite proxies `/api/*` → `http://localhost:8000`. API docs at `http://localhost:8000/api/docs`.

---

## File map — where to find everything

```
jet-engine-designer/
├── backend/app/
│   ├── main.py                  ← FastAPI routes only (4 endpoints, no logic)
│   ├── config/defaults.py       ← ENGINE_PRESETS, MATERIAL_TIT_RANGES, PARAMETER_DESCRIPTIONS
│   ├── models/
│   │   ├── inputs.py            ← CalculateRequest, EnvelopeRequest (Pydantic)
│   │   └── outputs.py           ← EngineResults, EnvelopeResults, GeometryData, PlotData (Pydantic)
│   └── physics/
│       ├── atmosphere.py        ← standard_atmosphere(altitude_m) → (T, p, rho)
│       └── cycle.py             ← ALL thermodynamic calculations (see breakdown below)
└── frontend/src/
    ├── App.tsx                  ← Root: state, tab routing, API calls, form→result flow
    ├── types/engine.ts          ← TypeScript interfaces (must mirror Pydantic models exactly)
    ├── services/api.ts          ← Axios client: calculateEngine(), calculateEnvelope(), getDefaults()
    └── components/
        ├── EngineConfig.tsx     ← Architecture inputs: engine type, spools, OPR, TIT, efficiencies (no presets)
        ├── AircraftConfig.tsx   ← Aircraft + flight condition inputs
        ├── EnvelopeConfig.tsx   ← Sweep range inputs + Generate button
        ├── EngineLayout.tsx     ← Hardcoded engine section list (replaces SVG diagram)
        ├── ResultsPanel.tsx     ← All results display (see section order below)
        ├── PlotsPanel.tsx       ← Recharts envelope plots
        └── HelpSection.tsx      ← Learn tab: Brayton cycle explainer + Further Reading
```

---

## cycle.py — function index

| Function | What it does |
|---|---|
| `compressor_exit_temp(T, PR, η)` | Adiabatic compressor exit temperature |
| `turbine_exit_pressure(Tt_in, Tt_out, pt_in, η)` | Turbine exit pressure from temperature drop |
| `nozzle_exit(Tt, pt, p_amb, m_dot)` | Choked or unchoked converging nozzle |
| `_split_2spool(OPR, lp_pr, hp_pr)` | Auto-splits OPR between LP and HP |
| `_split_3spool(OPR, lp_pr, ip_pr, hp_pr)` | Auto-splits OPR between LP, IP, HP |
| `_num_stages(PR)` | Axial compressor stages for a given PR (assuming 1.3/stage) |
| `_estimate_geometry(...)` | Returns GeometryData (diameters + component_positions) |
| `calculate_engine(request)` | Full Brayton cycle → EngineResults |
| `calculate_envelope(request)` | Speed + altitude sweeps → EnvelopeResults |

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
4. Combustion Headroom — Tt3/TIT progress bar
5. Station Thermodynamic States — table of Tt and pt per station
6. Nozzle Exit Conditions
7. **Model Assumptions** — collapsible accordion
8. **Literature & References** — collapsible accordion (free resources only: NOAA US Std Atmosphere, NASA Glenn, NACA 1135, NASA SP-36, NIST WebBook)

---

## HelpSection.tsx — section order

1. How Does a Jet Engine Work?
2. The Brayton Cycle (4-card grid)
3. Turbofan vs Turbojet (comparison table + 2-card note on disabled architectures)
4. Key Parameters Explained
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

Tab order: 'learn' (default) → 'design' → 'results' → 'envelope'
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
- `.station-row:hover` tinted via `app-muted/40`
- `.tooltip-content` fade-in animation
- Recharts axis/legend colour overrides

**Custom colour tokens** (defined in `tailwind.config.js`):
- `app-bg` `#011F28` — page background
- `app-surface` `#0c2c38` — card/panel background
- `app-raised` `#183644` — table headers, sub-panel backgrounds
- `app-muted` `#324E59` — inputs, badges, lightest panels
- `app-border` `#1c3b4a` — borders
- `app-text` `#E3DBD2` — primary text
- `app-secondary` `#7F888D` — secondary/muted text
- `app-dim` `#4a5e68` — very dim text (bullets, minor labels)
- `blue-600` — primary action button
- `blue-400` — section headings, active tab, accent text
- `green/yellow/red` — status (positive margin / warning / error)
- `amber-400` — choked nozzle indicator

**Number inputs:** spin buttons suppressed globally. Do not add them back.

---

## Git / deployment

- `node_modules/` and `__pycache__/` are gitignored
- Backend containerisable via `backend/Dockerfile`
- Frontend builds to `frontend/dist/` with `npm run build`
- Set `VITE_API_URL` env var to point frontend at a non-localhost backend
