"""
Pydantic input models for the Jet Engine Designer API.
"""

from typing import Optional
from pydantic import BaseModel, Field


class CalculateRequest(BaseModel):
    """
    Full specification for a single-point engine cycle calculation.
    """

    # ── Architecture ─────────────────────────────────────────────────────────
    engine_type: str = Field(
        "turbofan",
        description="Engine type: 'turbojet' or 'turbofan'",
    )
    num_spools: int = Field(
        2,
        ge=1,
        le=3,
        description="Number of independent shaft spools (1, 2, or 3)",
    )

    # ── Bypass (turbofan only) ────────────────────────────────────────────────
    bypass_ratio: float = Field(
        0.0,
        ge=0.0,
        description="Bypass ratio: m_bypass / m_core",
    )
    fan_pressure_ratio: float = Field(
        1.0,
        ge=1.0,
        description="Fan total pressure ratio",
    )
    fan_efficiency: float = Field(
        0.88,
        gt=0.0,
        le=1.0,
        description="Fan isentropic efficiency",
    )

    # ── Compression ──────────────────────────────────────────────────────────
    overall_pressure_ratio: float = Field(
        15.0,
        gt=1.0,
        description="Overall pressure ratio (intake exit to combustor inlet)",
    )
    lp_pressure_ratio: Optional[float] = Field(
        None,
        description="LP compressor pressure ratio (auto-computed if None)",
    )
    ip_pressure_ratio: Optional[float] = Field(
        None,
        description="IP compressor pressure ratio (3-spool only; auto-computed if None)",
    )
    hp_pressure_ratio: Optional[float] = Field(
        None,
        description="HP compressor pressure ratio (auto-computed if None)",
    )

    # ── Combustion ───────────────────────────────────────────────────────────
    tit_max_k: float = Field(
        1400.0,
        gt=0.0,
        description="Maximum turbine inlet temperature [K]",
    )
    eta_compressor: float = Field(
        0.85,
        gt=0.0,
        le=1.0,
        description="Core compressor isentropic efficiency",
    )
    eta_turbine: float = Field(
        0.88,
        gt=0.0,
        le=1.0,
        description="Turbine isentropic efficiency (all turbine stages)",
    )
    eta_combustor: float = Field(
        0.99,
        gt=0.0,
        le=1.0,
        description="Combustor efficiency",
    )

    # ── Mass Flow ────────────────────────────────────────────────────────────
    core_mass_flow_kg_s: float = Field(
        25.0,
        gt=0.0,
        description="Core air mass flow rate [kg/s]",
    )

    # ── Aircraft / Flight Condition ──────────────────────────────────────────
    aircraft_mass_kg: float = Field(
        5000.0,
        gt=0.0,
        description="Aircraft total mass [kg]",
    )
    wing_area_m2: Optional[float] = Field(
        None,
        description="Wing reference area [m²] (optional; enables dynamic pressure drag calc)",
    )
    cl_cruise: float = Field(
        0.4,
        gt=0.0,
        description="Cruise lift coefficient",
    )
    cd_cruise: float = Field(
        0.04,
        gt=0.0,
        description="Cruise drag coefficient",
    )
    cruise_speed_kmh: float = Field(
        500.0,
        gt=0.0,
        description="Cruise true airspeed [km/h]",
    )
    cruise_altitude_m: float = Field(
        8000.0,
        ge=0.0,
        description="Cruise altitude above MSL [m]",
    )
    ambient_temperature_override_k: Optional[float] = Field(
        None,
        description="Override ISA ambient temperature [K] (None = use ISA)",
    )

    # ── Thrust Targeting ─────────────────────────────────────────────────────
    target_thrust_n: Optional[float] = Field(
        None,
        description="Target net thrust [N] (if not computing from drag)",
    )
    compute_thrust_from_drag: bool = Field(
        True,
        description="If True, compute required thrust from aircraft drag model",
    )


class EnvelopeRequest(BaseModel):
    """
    Request for a performance envelope sweep (speed and altitude sweeps).
    """

    design: CalculateRequest = Field(
        ...,
        description="Base engine and aircraft design parameters",
    )

    # ── Speed Sweep ──────────────────────────────────────────────────────────
    speed_min_kmh: float = Field(
        100.0,
        gt=0.0,
        description="Minimum speed for sweep [km/h]",
    )
    speed_max_kmh: float = Field(
        900.0,
        gt=0.0,
        description="Maximum speed for sweep [km/h]",
    )
    speed_steps: int = Field(
        30,
        ge=5,
        le=200,
        description="Number of speed points in sweep",
    )
    altitude_m: float = Field(
        8000.0,
        ge=0.0,
        description="Fixed altitude for speed sweep [m]",
    )

    # ── Altitude Sweep ───────────────────────────────────────────────────────
    altitude_min_m: float = Field(
        0.0,
        ge=0.0,
        description="Minimum altitude for sweep [m]",
    )
    altitude_max_m: float = Field(
        12000.0,
        ge=0.0,
        description="Maximum altitude for sweep [m]",
    )
    altitude_steps: int = Field(
        30,
        ge=5,
        le=200,
        description="Number of altitude points in sweep",
    )
    speed_kmh: float = Field(
        500.0,
        gt=0.0,
        description="Fixed speed for altitude sweep [km/h]",
    )
