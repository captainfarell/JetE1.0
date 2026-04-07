"""
Jet Engine Designer — FastAPI Application

Provides REST endpoints for:
  - Engine cycle performance calculation (single point)
  - Performance envelope sweeps (speed and altitude)
  - Default values and presets

Run with:
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config.defaults import ENGINE_PRESETS, MATERIAL_TIT_RANGES, PARAMETER_DESCRIPTIONS
from app.models.inputs import CalculateRequest, EnvelopeRequest
from app.models.outputs import DefaultsResponse, EngineResults, EnvelopeResults
from app.physics.cycle import calculate_engine, calculate_envelope

# ─── Application Setup ────────────────────────────────────────────────────────

app = FastAPI(
    title="Jet Engine Designer API",
    description=(
        "Thermodynamic cycle analysis for turbojet and turbofan engines. "
        "Implements the ideal Brayton cycle with configurable spool architectures."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Allow all origins for development; tighten in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get(
    "/api/health",
    tags=["Utility"],
    summary="Health check",
)
async def health_check() -> dict:
    """Returns a simple status indicator to confirm the server is running."""
    return {"status": "ok", "service": "jet-engine-designer"}


@app.get(
    "/api/defaults",
    response_model=DefaultsResponse,
    tags=["Configuration"],
    summary="Get default parameters, presets and material limits",
)
async def get_defaults() -> DefaultsResponse:
    """
    Returns static configuration data:
    - Engine architecture presets (Small Turbofan, Medium Turbofan, etc.)
    - Parameter descriptions with typical ranges and trade-offs
    - Material TIT ranges for turbine blade selection
    """
    return DefaultsResponse(
        engine_presets=ENGINE_PRESETS,
        parameter_descriptions=PARAMETER_DESCRIPTIONS,
        material_tit_ranges=MATERIAL_TIT_RANGES,
    )


@app.post(
    "/api/calculate",
    response_model=EngineResults,
    tags=["Analysis"],
    summary="Calculate single-point engine performance",
)
async def calculate(request: CalculateRequest) -> EngineResults:
    """
    Perform a single-point Brayton cycle analysis.

    Returns thrust, fuel flow, TSFC, station thermodynamic states,
    estimated geometry, and a list of errors/warnings/assumptions.

    If the engine configuration is physically invalid (e.g. TIT < compressor
    exit temperature), the `errors` field will be populated and performance
    values will be zero.
    """
    try:
        return calculate_engine(request)
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Calculation failed: {exc}",
        ) from exc


@app.post(
    "/api/envelope",
    response_model=EnvelopeResults,
    tags=["Analysis"],
    summary="Calculate performance envelope (speed and altitude sweeps)",
)
async def envelope(request: EnvelopeRequest) -> EnvelopeResults:
    """
    Sweep engine performance over a range of speeds (at fixed altitude)
    and altitudes (at fixed speed).

    Returns five PlotData objects suitable for use with Recharts:
    - thrust_vs_speed
    - tsfc_vs_speed
    - tit_fraction_vs_speed
    - thrust_vs_altitude
    - tsfc_vs_altitude
    """
    try:
        return calculate_envelope(request)
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Envelope calculation failed: {exc}",
        ) from exc
