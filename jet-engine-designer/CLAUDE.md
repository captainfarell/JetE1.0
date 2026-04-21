# CLAUDE.md — Jet Engine Designer

## Quick orientation

Web app for Brayton cycle jet engine analysis. Backend computes all physics; frontend is pure UI. No physics logic in the frontend — if a calculation is wrong, look in `backend/app/physics/cycle_engine.py`.

**To run (use the launcher — never start servers manually):**
```bash
powershell -ExecutionPolicy Bypass -File start.ps1
```
Kills stale processes on 8000/5173 and opens both servers. Vite proxies `/api/*` → `http://localhost:8000`. API docs at `http://localhost:8000/api/docs`.

**Agent rule:** Only edit files. When a server restart is needed, say so. Never spawn background server processes.

---

## File map

```
jet-engine-designer/
├── start.ps1
├── backend/app/
│   ├── main.py                  ← FastAPI routes (4 endpoints, no logic)
│   ├── config/defaults.py       ← ENGINE_PRESETS, MATERIAL_TIT_RANGES, PARAMETER_DESCRIPTIONS (no physics constants — those are in cycle_core.py)
│   ├── models/
│   │   ├── inputs.py            ← CalculateRequest, EnvelopeRequest (Pydantic)
│   │   └── outputs.py           ← EngineResults, EnvelopeResults, GeometryData, PlotData
│   └── physics/
│       ├── atmosphere.py        ← standard_atmosphere(altitude_m) → (T, p, rho)
│       ├── cycle.py             ← Thin re-export shim (do not add logic here)
│       ├── cycle_core.py        ← Constants + compressor/turbine/nozzle functions
│       ├── cycle_geometry.py    ← _num_stages(), _estimate_geometry()
│       └── cycle_engine.py      ← _split_*spool(), calculate_engine(), calculate_envelope()
└── frontend/src/
    ├── App.tsx                  ← Root: tab routing, API calls, results state
    ├── hooks/useEngineForm.ts   ← formData + defaults state + updateForm
    ├── types/engine.ts          ← TypeScript interfaces (must mirror Pydantic models exactly)
    ├── services/api.ts          ← Axios client: calculateEngine(), calculateEnvelope(), getDefaults()
    ├── themes/                  ← Palette CSS files — see CLAUDE-STYLE.md
    └── components/
        ├── shared/              ← Reusable UI primitives: FieldLabel, NumberInput, SectionHeader (import from here, not inline)
        ├── EngineConfig.tsx     ← Architecture, pressure ratios, TIT, efficiencies, mass flow
        ├── AircraftConfig.tsx   ← Aircraft + flight condition inputs
        ├── EnvelopeConfig.tsx   ← Sweep range inputs + Generate button
        ├── EngineLayout.tsx     ← Hardcoded engine section list (LAYOUTS dict)
        ├── ResultsPanel.tsx     ← All results display
        ├── PlotsPanel.tsx       ← Recharts envelope plots
        ├── WorkflowSection.tsx  ← Step-by-step calculation flow with equations
        └── HelpSection.tsx      ← Brayton cycle explainer + Further Reading
```

---

## Physics module index

| Module | Function | What it does |
|---|---|---|
| `cycle_core` | `compressor_exit_temp(T, PR, η)` | Adiabatic compressor exit temperature |
| `cycle_core` | `turbine_exit_pressure(Tt_in, Tt_out, pt_in, η)` | Turbine exit pressure from temperature drop |
| `cycle_core` | `nozzle_exit(Tt, pt, p_amb, m_dot)` | Choked or unchoked converging nozzle |
| `cycle_geometry` | `_num_stages(PR)` | Axial compressor stages (1.3 PR/stage) |
| `cycle_geometry` | `_estimate_geometry(...)` | Returns GeometryData |
| `cycle_engine` | `calculate_engine(request)` | Full Brayton cycle → EngineResults |
| `cycle_engine` | `calculate_envelope(request)` | Speed + altitude + throttle sweeps → EnvelopeResults. Mass flow scaled by intake stagnation density ratio relative to design point so thrust vs altitude/speed responds to air density changes. |

**Constants:** γ = 1.4, cp = 1005 J/(kg·K), R = 287.058 J/(kg·K), LHV (Jet-A) = 43.2 MJ/kg, axial PR/stage = 1.3

---

## API endpoints

| Method | Path | Returns |
|---|---|---|
| GET | `/api/health` | `{status, service}` |
| GET | `/api/defaults` | `DefaultsResponse` |
| POST | `/api/calculate` | `EngineResults` |
| POST | `/api/envelope` | `EnvelopeResults` |

Errors go in `errors: string[]` in the response body — not HTTP errors. HTTP 422 only for unrecoverable exceptions.

---

## Engine architectures

Valid: turbojet 1-spool, 2-spool | turbofan 2-spool, 3-spool. **Disabled:** 1-spool turbofan, 3-spool turbojet (no commercial production examples). Switching engine type auto-resets to a valid spool count. Layouts hardcoded in `EngineLayout.tsx` LAYOUTS dict, keyed by `"${engine_type}-${num_spools}"`.

Engine examples (hardcoded in `EngineConfig.tsx`):
- `turbojet-1`: de Havilland Ghost, GE CJ610, JetCat P200, Microturbo TRI 60
- `turbojet-2`: P&W JT3C, Bristol Siddeley Olympus 593, GE J79
- `turbofan-2`: CFM56, GE90, GEnx, Williams FJ44
- `turbofan-3`: RR RB211, RR Trent 1000, Progress D-18T, Garrett ATF3

---

## Frontend state flow

```
App.tsx state: formData, results, envelopeResults, activeTab, loading*, apiError, calcErrors/Warnings

updateForm(updates) → merges into formData
  → if engine_type or num_spools changed: clears results + envelopeResults

handleCalculate()  → POST /api/calculate(formData) → setResults() → switch to 'results' on success
handleEnvelope(c)  → POST /api/envelope({design: formData, ...c})

Tab order: 'learn' (default) → 'design' → 'results' → 'envelope' → 'workflow'
```

**Key constraint:** `EngineLayout` reads `formData` (not `results`) — always shows current config.

---

## Key component behaviours

**EngineConfig:** 1-spool disabled for turbofan; 3-spool disabled for turbojet. Auto-resets spool on type switch. Spool PR manual override shown when `num_spools >= 2` and `autoSplit === false`. Material TIT buttons set `tit_max_k` to midpoint. `auto_size_mass_flow` checkbox scales core mass flow to match thrust requirement at calculation time.

**ResultsPanel order:** Errors/Warnings → Performance Summary → Estimated Geometry → Compressor Stage Counts → Combustion Headroom → Station States → Nozzle Exit → Model Assumptions (collapsible) → Literature & References (collapsible)

**HelpSection order:** How Does a Jet Engine Work? → Brayton Cycle (4-card) → Turbofan vs Turbojet → Key Parameters → Further Reading (free resources / textbooks / standards)

---

## Physics formulas

```
Intake:     Tt2 = T_amb·(1+(γ-1)/2·M²)    pt2 = p_amb·(Tt2/T_amb)^(γ/(γ-1))
Compressor: Tt_out = Tt_in·[1+(PR^((γ-1)/γ)−1)/η_c]
Combustor:  ṁ_f·LHV·η_b = ṁ_core·cp·(Tt4−Tt3)
Turbine:    pt_out = pt_in·[1−(Tt_in−Tt_out)/(η_t·Tt_in)]^(γ/(γ-1))
Nozzle:     critical PR = ((γ+1)/2)^(γ/(γ-1)) ≈ 1.893
```

**TSFC display:** API returns `tsfc_kg_n_h` [kg/(N·h)]. Display as mg/(N·s): multiply by `1e6 / 3600`.
**tit_fraction:** `Tt3 / TIT_max` — fraction of TIT consumed by compression (not material utilisation).
**Station numbering (ARP755):** 0 → 2 → 21 → 25 → 3 → 4 → 45 → 5 → 55 → 9 → 19

---

## How to add things

**New input:** `inputs.py` Field() → `types/engine.ts` → use in `cycle_engine.py` → `PARAMETER_DESCRIPTIONS` in `defaults.py` (auto-tooltip)
**New output:** `outputs.py` → `types/engine.ts` → `ResultsPanel.tsx`
**New plot:** `calculate_envelope()` → `outputs.py` + `types/engine.ts` → `PlotsPanel.tsx` `<SinglePlot>`
**New architecture:** `inputs.py` type string → `cycle_engine.py` elif + geometry → `defaults.py` preset → `EngineConfig.tsx` dropdown → `EngineLayout.tsx` LAYOUTS dict

---

## Validation rules

**Hard errors** (return zeroed results): invalid `engine_type`/`num_spools`, OPR ≤ 1, mass_flow ≤ 0, fan_PR > OPR, any efficiency outside (0, 1], fuel_flow < 0, turbine exit temp < intake temp.

**Warnings** (calculation proceeds): M0 > 1.0, OPR > 40, tit_fraction > 0.95, exhaust < 400 K, thrust_margin < 0.

---

## Model assumptions (shown to users — do not silently change)

Ideal gas γ=1.4, cp=1005 J/(kg·K) · Isentropic intake · No combustor pressure loss · No turbine cooling air · Converging nozzle only · 100% shaft mechanical efficiency · No duct pressure losses

---

## Styling & theming

> For colour tokens, palette files, design token groups, Tailwind conventions, and theming instructions, see **[CLAUDE-STYLE.md](CLAUDE-STYLE.md)**.

---

## Deployment

**Production stack:**
- Backend → [Render](https://render.com) (Docker, free tier, spins down after 15 min inactivity)
- Frontend → [Vercel](https://vercel.com) (static, auto-deploy on push)

**Environment variables:**

| Where | Variable | Value |
|---|---|---|
| Render | `ALLOWED_ORIGINS` | `https://your-app.vercel.app` |
| Vercel | `VITE_API_URL` | `https://your-service.onrender.com/api` |

`VITE_API_URL` is baked in at build time — after changing it in Vercel, redeploy with **build cache disabled**.

**Auto-deploy:** every `git push origin master` triggers a rebuild on both platforms.

**Local dev:**
- `ALLOWED_ORIGINS` defaults to `*` when unset
- `VITE_API_URL` defaults to `/api` (proxied by Vite to `localhost:8000`)

**Other:**
- `node_modules/` and `__pycache__/` are gitignored
- Frontend builds to `frontend/dist/` with `npm run build`
