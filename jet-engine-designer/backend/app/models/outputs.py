"""
Pydantic output models for the Jet Engine Designer API.
"""

from typing import Optional
from pydantic import BaseModel


class StationData(BaseModel):
    """
    Thermodynamic states at key engine stations.

    Station numbering (ARP755 convention):
      2   – Compressor / fan inlet (post-intake)
      21  – Fan exit / LP compressor exit (turbofan)
      25  – IP compressor exit (3-spool turbofan)
      3   – HP compressor exit / combustor inlet
      4   – Combustor exit / turbine inlet (TIT station)
      45  – HP turbine exit
      5   – LP or IP turbine exit
      55  – LP turbine exit (3-spool)
      9   – Core nozzle exit
      19  – Bypass nozzle exit
    """

    # Total temperatures [K]
    tt2_k: float
    tt21_k: Optional[float] = None
    tt25_k: Optional[float] = None
    tt3_k: float
    tt4_k: float
    tt45_k: Optional[float] = None
    tt5_k: float
    tt55_k: Optional[float] = None

    # Total pressures [kPa]
    pt2_kpa: float
    pt21_kpa: Optional[float] = None
    pt25_kpa: Optional[float] = None
    pt3_kpa: float
    pt4_kpa: float
    pt45_kpa: Optional[float] = None
    pt5_kpa: float
    pt55_kpa: Optional[float] = None

    # Nozzle exit quantities
    vj_core_m_s: float
    vj_bypass_m_s: Optional[float] = None
    p_exit_core_pa: float
    p_exit_bypass_pa: Optional[float] = None
    core_nozzle_choked: bool = False
    bypass_nozzle_choked: bool = False


class GeometryComponent(BaseModel):
    """
    Position and size of a single engine component in normalised coordinates.

    Coordinates are fractions:
      x_start, x_end: fraction of total engine length (0 = intake face, 1 = nozzle exit)
      r_inner, r_outer: fraction of fan/inlet radius (0 = centreline, 1 = fan tip)
    """

    name: str
    x_start: float
    x_end: float
    r_inner: float
    r_outer: float


class GeometryData(BaseModel):
    """Estimated engine geometry."""

    inlet_diameter_m: float
    fan_diameter_m: Optional[float] = None
    core_diameter_m: float
    engine_length_m: float
    component_positions: list[GeometryComponent]


class EngineResults(BaseModel):
    """Complete single-point engine performance and geometry results."""

    # ── Performance ──────────────────────────────────────────────────────────
    net_thrust_n: float
    thrust_required_n: float
    thrust_margin_n: float

    fuel_flow_kg_s: float
    fuel_flow_kg_h: float
    tsfc_kg_n_h: float  # kg/(N·h)

    core_mass_flow_kg_s: float
    bypass_mass_flow_kg_s: float

    # ── Cycle States ─────────────────────────────────────────────────────────
    stations: StationData

    # ── Geometry ─────────────────────────────────────────────────────────────
    geometry: GeometryData

    # ── Compressor Stages ────────────────────────────────────────────────────
    compressor_stages: dict[str, int]  # e.g. {"Fan": 2, "LP": 4, "HP": 8}

    # ── Limits & Efficiency ──────────────────────────────────────────────────
    tit_fraction: float          # Tt3 / TIT_max — fraction of TIT already consumed by compression
    propulsive_efficiency: float # η_p = 2·V0 / (Vj_avg + V0)
    thermal_efficiency: float    # η_th = η_overall / η_p
    overall_efficiency: float    # η_overall = F·V0 / (ṁ_f · LHV)  [0 when static]

    # ── Diagnostics ──────────────────────────────────────────────────────────
    errors: list[str]
    warnings: list[str]
    assumptions: list[str]


# ─── Plot / Envelope Models ──────────────────────────────────────────────────

class PlotSeries(BaseModel):
    """A single data series within a plot."""

    name: str
    y_values: list[Optional[float]]
    y_label: str
    y_unit: str
    is_limit_line: bool = False


class PlotData(BaseModel):
    """A complete plot: x-axis values and one or more y-series."""

    x_values: list[float]
    x_label: str
    x_unit: str
    series: list[PlotSeries]


class EnvelopeResults(BaseModel):
    """Performance envelope sweep results."""

    thrust_vs_speed: PlotData
    tsfc_vs_speed: PlotData
    tit_fraction_vs_speed: PlotData
    thrust_vs_altitude: PlotData
    tsfc_vs_altitude: PlotData


# ─── Defaults Response ───────────────────────────────────────────────────────

class DefaultsResponse(BaseModel):
    """Static defaults returned by GET /api/defaults."""

    engine_presets: list[dict]
    parameter_descriptions: dict
    material_tit_ranges: list[dict]
