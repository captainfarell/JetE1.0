# CLAUDE.md — Jet Engine Designer

## Project Overview

Web application for designing and analysing jet engines (turbojet / turbofan) using Brayton cycle thermodynamics. Users configure engine architecture, flight conditions, and aircraft parameters; the app computes performance, plots envelopes, and renders a cross-section diagram.

## Architecture

```
jet-engine-designer/
├── backend/          Python 3.11 + FastAPI — all physics and API
│   └── app/
│       ├── config/defaults.py     Engine presets, material TIT ranges, param descriptions
│       ├── models/inputs.py       Pydantic request models (CalculateRequest, EnvelopeRequest)
│       ├── models/outputs.py      Pydantic response models (EngineResults, PlotData, …)
│       ├── physics/atmosphere.py  ISA standard atmosphere
│       ├── physics/cycle.py       Brayton cycle — all engine types, spool configs, geometry
│       └── main.py                FastAPI app, CORS, routes
└── frontend/         TypeScript + React 18 + Vite — UI only, no physics logic
    └── src/
        ├── App.tsx                Root: state, tab routing, API calls
        ├── types/engine.ts        TS interfaces (mirror Pydantic models exactly)
        ├── services/api.ts        Axios client (calculateEngine, calculateEnvelope, getDefaults)
        └── components/
            ├── EngineConfig.tsx   Architecture inputs + presets
            ├── AircraftConfig.tsx Aircraft and flight condition inputs
            ├── EnvelopeConfig.tsx Sweep range configuration
            ├── ResultsPanel.tsx   Performance metrics, station table, assumptions
            ├── EngineDiagram.tsx  SVG cross-section from geometry data
            ├── PlotsPanel.tsx     Recharts line plots (thrust, TSFC, TIT vs speed/altitude)
            └── HelpSection.tsx    Educational content + BPR interactive demo
```

## Running the App

**Backend** (terminal in `backend/`):
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend** (terminal in `frontend/`):
```bash
npm run dev
```

App: `http://localhost:5173` — Vite proxies `/api/*` to `http://localhost:8000`.  
API docs: `http://localhost:8000/api/docs`

## Key Physics — What Lives Where

All thermodynamic calculations are in `backend/app/physics/cycle.py`. The key functions:

| Function | Equation |
|---|---|
| `compressor_exit_temp(T, PR, η)` | `Tt_out = Tt_in · [1 + (PR^((γ-1)/γ) − 1) / η_c]` |
| `turbine_exit_pressure(Tt_in, Tt_out, pt_in, η)` | `pt_out = pt_in · [1 − ΔT/(η·Tt_in)]^(γ/(γ-1))` |
| `nozzle_exit(Tt, pt, p_amb, m_dot)` | Converging nozzle; choked if `pt/p_amb ≥ 1.893` |
| `calculate_engine(request)` | Full Brayton cycle for all engine/spool combinations |
| `calculate_envelope(request)` | Speed + altitude sweeps calling `calculate_engine` |
| `_estimate_geometry(...)` | Inlet diameter from Mach 0.5 compressor face; component lengths from stage counts |

**Constants** (do not change without updating frontend tooltips too):
- `γ = 1.4`, `cp = 1005 J/(kg·K)`, `R = 287.058 J/(kg·K)`
- Fuel: Jet-A, `LHV = 43.2 MJ/kg`
- Per-stage axial compressor PR assumption: `1.3`

**`tit_fraction`** in results = `Tt3 / TIT` (compressor exit / turbine inlet temp). Measures combustion headroom — not a material utilisation fraction. Approaches 1.0 when OPR is so high that there is little room to add heat.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/defaults` | Presets, material TIT ranges, param descriptions |
| POST | `/api/calculate` | Single-point Brayton cycle → `EngineResults` |
| POST | `/api/envelope` | Speed + altitude sweeps → `EnvelopeResults` |

Errors (bad physics) are returned as `errors: string[]` inside the response body, not as HTTP errors. HTTP 422 is only raised for unrecoverable exceptions.

## How to Add Things

### New input parameter
1. Add field with `Field()` default to `CalculateRequest` in `models/inputs.py`
2. Add matching field to `CalculateRequest` interface in `frontend/src/types/engine.ts`
3. Use it in `calculate_engine()` in `physics/cycle.py`
4. Add description to `PARAMETER_DESCRIPTIONS` in `config/defaults.py` — frontend shows it as a tooltip automatically

### New output value
1. Add field to `EngineResults` (or sub-model) in `models/outputs.py`
2. Mirror in `frontend/src/types/engine.ts`
3. Display in `ResultsPanel.tsx`

### New plot
1. Add a `PlotData` field to `EnvelopeResults` in `models/outputs.py` and populate it in `calculate_envelope()`
2. Mirror in `frontend/src/types/engine.ts`
3. Add `<SinglePlot>` in `PlotsPanel.tsx`

### New engine architecture (e.g. turboprop, afterburner)
1. Add type string to `engine_type` field in `models/inputs.py`
2. Add `elif eng == "..."` block in `calculate_engine()` with work balance equations
3. Add geometry logic to `_estimate_geometry()`
4. Add preset to `ENGINE_PRESETS` in `config/defaults.py`
5. Update dropdown in `frontend/src/components/EngineConfig.tsx`

## Important Constraints / Assumptions

These are hard-coded assumptions shown to users in the `assumptions` field of every response. Do not silently change them:

- Ideal gas throughout (γ = 1.4, cp = 1005 J/kg·K)
- Isentropic intake — no intake pressure loss
- No combustor pressure loss
- No turbine cooling air
- Converging nozzle only — no supersonic expansion
- 100% shaft mechanical efficiency
- No duct pressure losses

## Validation Rules (in `calculate_engine`)

**Hard errors** (block calculation, return zeroed results):
- `engine_type` not in `{turbojet, turbofan}`
- `num_spools` not in `{1, 2, 3}`
- `overall_pressure_ratio ≤ 1`
- `core_mass_flow_kg_s ≤ 0`
- `fan_pressure_ratio > overall_pressure_ratio`
- Any efficiency outside `(0, 1]`
- `fuel_flow < 0` (TIT below compressor exit temperature)
- Turbine exit temperature below intake temperature (over-expanded)

**Warnings** (logged but calculation proceeds):
- `Mach > 1.0` — model not designed for supersonic
- `OPR > 40` — surge margin concern
- `tit_fraction > 0.95` — little combustion headroom
- `Tt_exhaust < 400 K` — unusually low turbine exit
- `thrust_margin < 0` — engine undersized for cruise

## Frontend State Flow

```
App.tsx (formData, results, envelopeResults)
  ├── EngineConfig  → onChange(Partial<CalculateRequest>)
  ├── AircraftConfig → onChange(Partial<CalculateRequest>)
  ├── [Calculate button] → POST /api/calculate → setResults()
  ├── ResultsPanel(results) + EngineDiagram(results)
  ├── EnvelopeConfig → onGenerate(config) → POST /api/envelope → setEnvelopeResults()
  └── PlotsPanel(envelopeResults)
```

`EngineDiagram` draws from `results.geometry.component_positions` — normalised fractions, not hardcoded pixel positions. Adding new engine components requires updating `_estimate_geometry()` to emit them; the SVG renderer handles them automatically by name → colour mapping.

## Git / Deployment Notes

- `node_modules/` and `__pycache__/` are gitignored
- Backend is containerisable via `backend/Dockerfile`
- Frontend builds to `frontend/dist/` with `npm run build`
- Set `VITE_API_URL` env var to point frontend at a non-localhost backend
