# Jet Engine Designer

A web-based application for designing and analysing jet engines (turbojet and turbofan) using Brayton cycle thermodynamics. The app computes engine performance from user-defined architecture and flight conditions and presents results, plots, and a cross-section diagram.

---

## Tech Stack

| Layer    | Technology             |
|----------|------------------------|
| Backend  | Python 3.11 + FastAPI  |
| Physics  | Pure Python (NumPy for sweeps) |
| Frontend | TypeScript + React 18 + Vite |
| Charts   | Recharts               |
| Styling  | Tailwind CSS           |

---

## Quick Start

### Prerequisites

- Python 3.10+ with `pip`
- Node.js 18+ with `npm`

### 1. Install dependencies (first time only)

```bash
cd backend
pip install -r requirements.txt

cd ../frontend
npm install
```

### 2. Start both servers

From the project root, run the launcher script:

```
powershell -ExecutionPolicy Bypass -File start.ps1
```

This kills any stale processes on ports 8000 and 5173, then opens the backend and frontend in separate terminal windows.

The app will be available at `http://localhost:5173`.  
Interactive API docs: `http://localhost:8000/api/docs`

The Vite dev server proxies `/api/*` to `http://localhost:8000`, so no CORS configuration is needed during development.

---

## Docker (Backend)

```bash
cd backend
docker build -t jet-engine-backend .
docker run -p 8000:8000 jet-engine-backend
```

### Frontend static build

```bash
cd frontend
npm run build
# Output in frontend/dist/ — serve with any static host or the backend itself
```

To serve the frontend from FastAPI, copy `dist/` to `backend/static/` and add a `StaticFiles` mount in `main.py`.

---

## Architecture Overview

```
jet-engine-designer/
├── start.ps1             ← Dev launcher: kills stale processes, starts backend + frontend
├── backend/
│   ├── app/
│   │   ├── config/
│   │   │   └── defaults.py       ← Engine presets, material TIT ranges, parameter descriptions
│   │   ├── models/
│   │   │   ├── inputs.py         ← Pydantic request models (CalculateRequest, EnvelopeRequest)
│   │   │   └── outputs.py        ← Pydantic response models (EngineResults, PlotData, ...)
│   │   ├── physics/
│   │   │   ├── atmosphere.py     ← ISA standard atmosphere (troposphere + stratosphere)
│   │   │   └── cycle.py          ← Brayton cycle calculations (all engine types and spools)
│   │   └── main.py               ← FastAPI app, routes, CORS
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.tsx               ← Root: state management, tab routing, API calls
        ├── types/engine.ts       ← TypeScript interfaces (mirrors Pydantic models)
        ├── services/api.ts       ← Axios API client (calculateEngine, calculateEnvelope, getDefaults)
        ├── themes/
        │   ├── palette-original.css  ← Dark teal / navy (original)
        │   └── palette-3125.css      ← Earthy green / olive-black (active)
        └── components/
            ├── EngineConfig.tsx      ← Architecture inputs (type, spools, OPR, TIT, efficiencies)
            ├── AircraftConfig.tsx    ← Aircraft and flight condition inputs
            ├── EnvelopeConfig.tsx    ← Envelope sweep configuration
            ├── ResultsPanel.tsx      ← Performance metrics, compressor stages, station table, geometry
            ├── EngineLayout.tsx      ← Hardcoded engine section flow diagram
            ├── PlotsPanel.tsx        ← Recharts line plots (thrust, TSFC, TIT fraction vs speed/altitude)
            ├── WorkflowSection.tsx   ← Step-by-step calculation workflow with rendered equations
            └── HelpSection.tsx       ← Educational content, ISA explainer, architecture notes, further reading
```

---

## Features

- **Turbojet and Turbofan** architectures, 1–3 spools (invalid combos disabled with explanations)
- **Brayton cycle thermodynamics** — full station-by-station calculation per ARP755 numbering
- **Compressor stage count** estimate per spool (axial, ~1.3 PR/stage)
- **Performance envelope** sweeps — thrust, TSFC, TIT fraction vs speed and altitude
- **ISA atmosphere model** — troposphere + stratosphere, with deviation (ISA+ΔT) support
- **Workflow tab** — step-by-step equations rendered with stacked fractions, subscripts, and Greek letters
- **Learn tab** — Brayton cycle explainer, ISA description, key parameters, further reading
- **Earthy colour theme** — palette-3125 (olive-black / amber gold accent)

---

## Developer Guide

### Where the physics code lives

All thermodynamic calculations are in `backend/app/physics/cycle.py`.

| Function | Purpose |
|---|---|
| `compressor_exit_temp(T_in, PR, eta_c)` | Adiabatic compressor temperature rise |
| `turbine_exit_pressure(Tt_in, Tt_out, pt_in, eta_t)` | Turbine exit pressure from temperature drop |
| `nozzle_exit(Tt, pt, p_amb, m_dot)` | Converging nozzle: choked or unchoked exit conditions |
| `_num_stages(PR)` | Approximate axial compressor stage count (1.3 PR/stage) |
| `calculate_engine(request)` | Full cycle: all engine types and spool counts |
| `calculate_envelope(request)` | Speed and altitude sweeps using `calculate_engine` |
| `_estimate_geometry(...)` | Inlet/fan diameter from flow area; component length estimates |

The atmosphere model is in `backend/app/physics/atmosphere.py`:

| Function | Purpose |
|---|---|
| `standard_atmosphere(altitude_m)` | ISA temperature, pressure, density at any altitude |

### How to add or change parameters

1. **Add a new input field**: Add the field to `CalculateRequest` in `models/inputs.py` with a Pydantic `Field()` default. Add the matching TypeScript field to `src/types/engine.ts`.

2. **Use the field in physics**: Reference it inside `calculate_engine()` in `cycle.py`.

3. **Add a description/tooltip**: Add an entry to `PARAMETER_DESCRIPTIONS` in `config/defaults.py`. The frontend automatically shows this as an info tooltip in `EngineConfig`.

4. **Add a new output value**: Add the field to `EngineResults` in `models/outputs.py`. Add it to the TypeScript `EngineResults` interface. Display it in `ResultsPanel.tsx`.

### How to add a new plot

1. Add the series to the relevant `PlotData` object in `calculate_envelope()` in `cycle.py`.
2. Add the new field to `EnvelopeResults` in `models/outputs.py` and `src/types/engine.ts`.
3. In `PlotsPanel.tsx`, add a `<SinglePlot>` for the new `PlotData`.

### How to add a new engine architecture (e.g. turboprop, afterburner)

1. Add the new type string to the `engine_type` field in `CalculateRequest`.
2. Add a new `elif eng == "turboprop":` block inside `calculate_engine()` in `cycle.py`.
3. Add geometry logic to `_estimate_geometry()`.
4. Add a preset to `ENGINE_PRESETS` in `config/defaults.py`.
5. Update the frontend dropdown in `EngineConfig.tsx`.
6. Add an entry to the `LAYOUTS` dict in `EngineLayout.tsx`.

### Theming

To swap the colour palette, change the import line in `frontend/src/main.tsx`:

```ts
import './themes/palette-3125.css'   // ← change to another palette file
```

Create new palette files in `frontend/src/themes/` by copying an existing one and redefining the `--app-*` CSS variables.

---

## Physics Reference

### Intake (isentropic)
```
Tt2 = T_amb * (1 + (γ-1)/2 * M0²)
pt2 = p_amb * (Tt2/T_amb)^(γ/(γ-1))
```

### Compressor (adiabatic efficiency)
```
Tt_out = Tt_in * [1 + (PR^((γ-1)/γ) - 1) / η_c]
pt_out = pt_in * PR
```

### Combustor
```
ṁ_f * LHV * η_b = ṁ_core * cp * (Tt4 - Tt3)
```
Fuel: Jet-A, LHV = 43.2 MJ/kg.

### Turbine (adiabatic efficiency)
```
pt_out = pt_in * [1 − (Tt_in − Tt_out) / (η_t * Tt_in)]^(γ/(γ-1))
```

### Nozzle (converging)
Critical pressure ratio: `PRcrit = ((γ+1)/2)^(γ/(γ-1)) ≈ 1.893`

### Thrust
```
T = ṁ_core*(Vj_core − V0) + (p_exit_core − p_amb)*A_exit_core
  + ṁ_bypass*(Vj_bypass − V0) + (p_exit_bypass − p_amb)*A_exit_bypass
```

### TSFC
```
TSFC = ṁ_f / T   [kg/(N·s)] or [kg/(N·h)]
```

---

## Key Assumptions

- Ideal gas: γ = 1.4, cp = 1005 J/(kg·K) throughout all stations
- No combustor total pressure loss
- No duct pressure losses
- No turbine cooling air
- 100% shaft mechanical efficiency
- Converging-only nozzle (no supersonic expansion)
- ISA standard atmosphere unless temperature override is specified

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `/api` | Backend base URL for the frontend |

Set `VITE_API_URL=http://localhost:8000/api` in a `.env` file if running the frontend against a remote backend.
