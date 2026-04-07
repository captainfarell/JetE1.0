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

### 1. Start the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`.  
Interactive API docs: `http://localhost:8000/api/docs`

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The app will open at `http://localhost:5173`.

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
        └── components/
            ├── EngineConfig.tsx  ← Architecture inputs (type, spools, OPR, TIT, efficiencies, presets)
            ├── AircraftConfig.tsx← Aircraft and flight condition inputs
            ├── EnvelopeConfig.tsx← Envelope sweep configuration
            ├── ResultsPanel.tsx  ← Performance metrics, station table, geometry table, assumptions
            ├── EngineDiagram.tsx ← SVG cross-section diagram (from geometry data)
            ├── PlotsPanel.tsx    ← Recharts line plots (thrust, TSFC, TIT fraction vs speed/altitude)
            └── HelpSection.tsx   ← Educational content, BPR interactive demo
```

---

## Developer Guide

### Where the physics code lives

All thermodynamic calculations are in `backend/app/physics/cycle.py`.

| Function | Purpose |
|---|---|
| `compressor_exit_temp(T_in, PR, eta_c)` | Adiabatic compressor temperature rise |
| `turbine_exit_pressure(Tt_in, Tt_out, pt_in, eta_t)` | Turbine exit pressure from temperature drop |
| `nozzle_exit(Tt, pt, p_amb, m_dot)` | Converging nozzle: choked or unchoked exit conditions |
| `calculate_engine(request)` | Full cycle: all engine types and spool counts |
| `calculate_envelope(request)` | Speed and altitude sweeps using `calculate_engine` |
| `_estimate_geometry(...)` | Inlet/fan diameter from flow area; component length estimates |

The atmosphere model is in `backend/app/physics/atmosphere.py`:

| Function | Purpose |
|---|---|
| `standard_atmosphere(altitude_m)` | ISA temperature, pressure, density at any altitude |

### How to add or change parameters

1. **Add a new input field**: Add the field to `CalculateRequest` in `models/inputs.py` with a Pydantic `Field()` default and description. Add the matching TypeScript field to `src/types/engine.ts`.

2. **Use the field in physics**: Reference it inside `calculate_engine()` in `cycle.py`.

3. **Add a description/tooltip**: Add an entry to `PARAMETER_DESCRIPTIONS` in `config/defaults.py`. The frontend automatically shows this as an info tooltip in `EngineConfig`.

4. **Add a new output value**: Add the field to `EngineResults` (or a sub-model like `StationData`) in `models/outputs.py`. Add it to the TypeScript `EngineResults` interface. Display it in `ResultsPanel.tsx`.

### How to add a new plot

1. Add the series to the relevant `PlotData` object returned by `calculate_envelope()` in `cycle.py` (or create a new `PlotData` and add it to `EnvelopeResults`).
2. Add the new field to `EnvelopeResults` in `models/outputs.py` and `src/types/engine.ts`.
3. In `PlotsPanel.tsx`, add a `<SinglePlot>` for the new `PlotData`.

### How to add a new engine architecture (e.g. turboprop, afterburner)

1. Add the new type string to the `engine_type` field in `CalculateRequest`.
2. Add a new `elif eng == "turboprop":` block inside `calculate_engine()` in `cycle.py`.
3. Add geometry logic to `_estimate_geometry()`.
4. Add a preset to `ENGINE_PRESETS` in `config/defaults.py`.
5. Update the frontend dropdown in `EngineConfig.tsx`.

---

## Physics Reference

The following equations are used throughout `cycle.py`:

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

### Work balance (shaft power)
Each turbine drives its corresponding compressor spool. For turbofan, the LP turbine additionally drives the fan, so the work balance accounts for total mass flow:
```
m_core * cp * (Tt_turbine_in − Tt_turbine_out) = m_total * cp * (Tt_fan_out − Tt_fan_in)
```

### Nozzle (converging)
Critical pressure ratio: `PRcrit = ((γ+1)/2)^(γ/(γ-1)) ≈ 1.893`

Choked: `Vj = √(γ·R·Tt·2/(γ+1))`, `p_exit = pt·(2/(γ+1))^(γ/(γ-1))`

Unchoked: `Vj = √(2·η_n·cp·Tt·[1 − (p_amb/pt)^((γ-1)/γ)])`, `p_exit = p_amb`

### Thrust
```
T = ṁ_core*(Vj_core − V0) + (p_exit_core − p_amb)*A_exit_core
  + ṁ_bypass*(Vj_bypass − V0) + (p_exit_bypass − p_amb)*A_exit_bypass
```

### TSFC
```
TSFC = ṁ_f / T   [kg/(N·s)] or [kg/(N·h)]
```

### Aircraft drag (cruise)
```
D = m * g * (CD / CL)   (simplified level-flight steady state)
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
