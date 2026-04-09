"""
Brayton cycle — spool splitting helpers, main engine calculator, and envelope sweep.

This module contains:
  - `_split_2spool` / `_split_3spool`: pressure ratio distribution between spools
  - `calculate_engine`: full single-point Brayton cycle analysis
  - `calculate_envelope`: speed and altitude performance sweep

All thermodynamic constants and elementary functions are imported from
`cycle_core`; geometry estimation from `cycle_geometry`; ISA atmosphere
from `atmosphere`.

Reference station numbering (ARP755):
  0  – Far-field freestream
  2  – Compressor / fan inlet
  21 – LP compressor / fan exit
  25 – IP compressor exit (3-spool only)
  3  – HP compressor exit / combustor inlet
  4  – Combustor exit / HPT inlet  (TIT)
  45 – HP turbine exit
  5  – IP or LP turbine exit
  55 – LP turbine exit (3-spool)
  9  – Core nozzle exit
  19 – Bypass nozzle exit
"""

import math
from typing import Optional

import numpy as np

from app.models.inputs import CalculateRequest, EnvelopeRequest
from app.models.outputs import (
    EnvelopeResults,
    EngineResults,
    GeometryData,
    PlotData,
    PlotSeries,
    StationData,
)
from app.physics.atmosphere import standard_atmosphere
from app.physics.cycle_core import (
    GAMMA, CP, R_AIR, LHV_JET_A,
    _GEXP, _GEXP_INV,
    compressor_exit_temp,
    turbine_exit_pressure,
    nozzle_exit,
)
from app.physics.cycle_geometry import _estimate_geometry, _num_stages

# ─── Spool Pressure Ratio Splitting ──────────────────────────────────────────

def _split_2spool(
    OPR: float,
    lp_pr: Optional[float],
    hp_pr: Optional[float],
) -> tuple[float, float]:
    """Return (LPR, HPR) for a 2-spool compressor section, auto-splitting if needed."""
    if lp_pr is not None and hp_pr is not None:
        return float(lp_pr), float(hp_pr)
    if lp_pr is not None:
        return float(lp_pr), OPR / lp_pr
    if hp_pr is not None:
        return OPR / hp_pr, float(hp_pr)
    # Default: equal split
    sq = math.sqrt(OPR)
    return sq, sq


def _split_3spool(
    OPR: float,
    lp_pr: Optional[float],
    ip_pr: Optional[float],
    hp_pr: Optional[float],
) -> tuple[float, float, float]:
    """Return (LPR, IPR, HPR) for a 3-spool compressor section, auto-splitting if needed."""
    # If all three given, use them directly
    if lp_pr is not None and ip_pr is not None and hp_pr is not None:
        return float(lp_pr), float(ip_pr), float(hp_pr)
    # Default: equal cube-root split
    cbrt = OPR ** (1.0 / 3.0)
    lpr = lp_pr if lp_pr is not None else cbrt
    ipr = ip_pr if ip_pr is not None else cbrt
    hpr = hp_pr if hp_pr is not None else cbrt
    # Re-scale if only partial specification
    if lp_pr is None and ip_pr is None and hp_pr is None:
        return cbrt, cbrt, cbrt
    # Attempt consistent split from given values
    given_product = (lpr if lp_pr else 1.0) * (ipr if ip_pr else 1.0) * (hpr if hp_pr else 1.0)
    if given_product > 0:
        scale = (OPR / given_product) ** (1.0 / max(1, (lp_pr is None) + (ip_pr is None) + (hp_pr is None)))
        if lp_pr is None:
            lpr = scale
        if ip_pr is None:
            ipr = scale
        if hp_pr is None:
            hpr = scale
    return lpr, ipr, hpr


# ─── Main Cycle Calculator ────────────────────────────────────────────────────

def calculate_engine(request: CalculateRequest) -> EngineResults:
    """
    Compute single-point engine performance using the ideal Brayton cycle.

    Supports:
      - Turbojet: 1-spool, 2-spool, 3-spool
      - Turbofan: 1-spool (simple), 2-spool, 3-spool

    Parameters
    ----------
    request : CalculateRequest
        Full engine and flight condition specification.

    Returns
    -------
    EngineResults
        Thermodynamic cycle results, geometry estimates, and diagnostics.
    """
    errors:      list[str] = []
    warnings:    list[str] = []
    assumptions: list[str] = [
        "Ideal gas with γ = 1.4, cp = 1005 J/(kg·K) throughout",
        "Isentropic intake (no pressure loss)",
        "No combustor pressure loss assumed",
        "No turbine cooling air modeled",
        "Fuel: Jet-A with LHV = 43.2 MJ/kg",
        "Converging nozzle (no diverging section for supersonic expansion)",
        "Shaft mechanical efficiency = 100%",
        "No duct pressure losses",
        "Fuel mass fraction added to core flow (small, usually <3%)",
    ]

    # ── Input Validation ──────────────────────────────────────────────────────
    if request.engine_type not in ("turbojet", "turbofan"):
        errors.append(f"Invalid engine_type '{request.engine_type}'. Must be 'turbojet' or 'turbofan'.")
    if request.num_spools not in (1, 2, 3):
        errors.append(f"Invalid num_spools {request.num_spools}. Must be 1, 2, or 3.")
    if request.overall_pressure_ratio <= 1.0:
        errors.append("overall_pressure_ratio must be > 1. Set OPR to a realistic value (e.g. 10–40 for modern engines).")
    if request.core_mass_flow_kg_s <= 0:
        errors.append("core_mass_flow_kg_s must be > 0. Set a positive core mass flow (e.g. 10–500 kg/s), or enable Auto-size from thrust requirement.")
    if request.bypass_ratio < 0:
        errors.append("bypass_ratio must be ≥ 0. Set BPR to 0 for a turbojet, or a positive value (e.g. 5–12) for a turbofan.")
    if request.engine_type == "turbofan" and request.fan_pressure_ratio > request.overall_pressure_ratio:
        errors.append("fan_pressure_ratio cannot exceed overall_pressure_ratio. Reduce Fan PR below OPR, or increase OPR.")
    for eff_name, eff_val in [
        ("fan_efficiency", request.fan_efficiency),
        ("eta_compressor", request.eta_compressor),
        ("eta_turbine",    request.eta_turbine),
        ("eta_combustor",  request.eta_combustor),
    ]:
        if not (0.0 < eff_val <= 1.0):
            errors.append(f"{eff_name} must be in (0, 1]; got {eff_val}. Set a realistic efficiency (e.g. 0.85–0.92 for compressor/turbine, 0.98–0.99 for combustor).")

    # ── Convenience aliases ───────────────────────────────────────────────────
    eng   = request.engine_type
    ns    = request.num_spools
    BPR   = request.bypass_ratio if eng == "turbofan" else 0.0
    FPR   = request.fan_pressure_ratio if eng == "turbofan" else 1.0
    OPR   = request.overall_pressure_ratio
    TIT   = request.tit_max_k
    eta_c = request.eta_compressor
    eta_t = request.eta_turbine
    eta_b = request.eta_combustor
    eta_f = request.fan_efficiency
    m_core = request.core_mass_flow_kg_s

    # Total mass flow
    m_total = m_core * (1.0 + BPR)
    m_bypass = m_core * BPR

    # ── Atmosphere & Intake ───────────────────────────────────────────────────
    T_amb, p_amb, rho_amb = standard_atmosphere(request.cruise_altitude_m)
    if request.ambient_temperature_override_k is not None:
        T_amb = request.ambient_temperature_override_k
        # Recompute density with overridden T (keep pressure from ISA)
        rho_amb = p_amb / (R_AIR * T_amb)

    V0 = request.cruise_speed_kmh / 3.6  # m/s
    a0 = math.sqrt(GAMMA * R_AIR * T_amb)
    M0 = V0 / a0 if a0 > 0 else 0.0

    if M0 > 1.0:
        warnings.append("Model assumes subsonic flight; Mach > 1 not fully modeled (no intake shock losses). Reduce cruise speed to subsonic, or interpret results with caution.")

    # Stagnation conditions at intake exit (station 2) — ideal intake
    Tt2 = T_amb * (1.0 + (GAMMA - 1.0) / 2.0 * M0 ** 2)
    pt2 = p_amb * (Tt2 / T_amb) ** _GEXP

    # ── Spool PR Splitting ─────────────────────────────────────────────────────
    if eng == "turbojet":
        if ns == 1:
            lpr, ipr, hpr = 1.0, 1.0, OPR
        elif ns == 2:
            lpr, hpr = _split_2spool(OPR, request.lp_pressure_ratio, request.hp_pressure_ratio)
            ipr = 1.0
        else:  # 3-spool
            lpr, ipr, hpr = _split_3spool(OPR, request.lp_pressure_ratio, request.ip_pressure_ratio, request.hp_pressure_ratio)
    else:  # turbofan
        # Fan = FPR on LP spool; remaining OPR split between IP and HP
        if ns == 1:
            # Single spool: fan at FPR, then one compressor for remaining OPR/FPR
            lpr = FPR
            hpr = OPR / FPR if FPR > 0 else OPR
            ipr = 1.0
        elif ns == 2:
            # Fan = LP spool at FPR, HP compressor at OPR/FPR
            lpr = FPR
            hpr_given = request.hp_pressure_ratio
            hpr = hpr_given if hpr_given is not None else (OPR / FPR)
            ipr = 1.0
        else:  # 3-spool turbofan: Fan(LP)=FPR, IP compressor, HP compressor
            lpr = FPR
            # IP and HP share the remaining pressure ratio
            remaining = OPR / FPR
            _ipr, _hpr = _split_2spool(
                remaining, request.ip_pressure_ratio, request.hp_pressure_ratio
            )
            ipr, hpr = _ipr, _hpr

    # ── Return early template ─────────────────────────────────────────────────
    def _make_empty_results() -> EngineResults:
        stations_empty = StationData(
            tt2_k=Tt2, tt3_k=0.0, tt4_k=TIT, tt5_k=0.0,
            pt2_kpa=pt2 / 1000.0, pt3_kpa=0.0, pt4_kpa=0.0, pt5_kpa=0.0,
            vj_core_m_s=0.0, p_exit_core_pa=p_amb,
            core_nozzle_choked=False,
        )
        geo_empty = GeometryData(
            inlet_diameter_m=0.0, core_diameter_m=0.0, engine_length_m=0.0,
            component_positions=[],
        )
        return EngineResults(
            net_thrust_n=0.0, thrust_required_n=0.0, thrust_margin_n=0.0,
            fuel_flow_kg_s=0.0, fuel_flow_kg_h=0.0, tsfc_kg_n_h=0.0,
            core_mass_flow_kg_s=m_core, bypass_mass_flow_kg_s=m_bypass,
            stations=stations_empty, geometry=geo_empty,
            compressor_stages={},
            tit_fraction=0.0, propulsive_efficiency=0.0,
            errors=errors, warnings=warnings, assumptions=assumptions,
        )

    if errors:
        return _make_empty_results()

    # ── Thrust Required ───────────────────────────────────────────────────────
    if request.compute_thrust_from_drag:
        if request.wing_area_m2 is not None:
            # Dynamic pressure method
            q = 0.5 * rho_amb * V0 ** 2
            drag = q * request.wing_area_m2 * request.cd_cruise
        else:
            # Weight × (CD/CL) method (level flight: L = W)
            drag = request.aircraft_mass_kg * 9.80665 * (request.cd_cruise / request.cl_cruise)
        thrust_required = drag
    elif request.target_thrust_n is not None:
        thrust_required = request.target_thrust_n
    else:
        thrust_required = 0.0

    # ── Brayton Cycle ─────────────────────────────────────────────────────────
    # Initialise station temperatures and pressures
    Tt21 = Tt25 = Tt3 = Tt4 = Tt45 = Tt5 = Tt55 = Tt2
    pt21 = pt25 = pt3 = pt4 = pt45 = pt5 = pt55 = pt2
    Vj_core = Vj_bypass = 0.0
    p_exit_c = p_exit_b = p_amb
    A_exit_c = A_exit_b = 0.0
    choked_c = choked_b = False
    fuel_flow = 0.0

    try:
        if eng == "turbojet":
            # ── Turbojet ──────────────────────────────────────────────────────
            if ns == 1:
                # Single spool: one compressor + one turbine
                Tt3 = compressor_exit_temp(Tt2, OPR, eta_c)
                pt3 = pt2 * OPR
                Tt4 = TIT
                pt4 = pt3  # No combustor pressure loss
                fuel_flow = m_core * CP * (Tt4 - Tt3) / (eta_b * LHV_JET_A)
                if fuel_flow < 0:
                    errors.append("TIT is below compressor exit temperature — impossible to add heat. Increase TIT, or reduce OPR.")
                    return _make_empty_results()
                # Turbine: extract exactly the compressor work (work balance)
                Tt5 = Tt4 - (Tt3 - Tt2)
                pt5 = turbine_exit_pressure(Tt4, Tt5, pt4, eta_t)
                Vj_core, p_exit_c, A_exit_c, choked_c = nozzle_exit(Tt5, pt5, p_amb, m_core)

            elif ns == 2:
                # Two spools: LP compressor + HP compressor / HP turbine + LP turbine
                Tt21 = compressor_exit_temp(Tt2, lpr, eta_c)
                pt21 = pt2 * lpr
                Tt3  = compressor_exit_temp(Tt21, hpr, eta_c)
                pt3  = pt21 * hpr
                Tt4  = TIT
                pt4  = pt3
                fuel_flow = m_core * CP * (Tt4 - Tt3) / (eta_b * LHV_JET_A)
                if fuel_flow < 0:
                    errors.append("TIT is below compressor exit temperature — impossible to add heat. Increase TIT, or reduce OPR.")
                    return _make_empty_results()
                # HP turbine drives HP compressor
                Tt45 = Tt4 - (Tt3 - Tt21)
                pt45 = turbine_exit_pressure(Tt4, Tt45, pt4, eta_t)
                # LP turbine drives LP compressor
                Tt5  = Tt45 - (Tt21 - Tt2)
                pt5  = turbine_exit_pressure(Tt45, Tt5, pt45, eta_t)
                Vj_core, p_exit_c, A_exit_c, choked_c = nozzle_exit(Tt5, pt5, p_amb, m_core)

            else:  # ns == 3
                # Three spools: LP + IP + HP compressors; HP + IP + LP turbines
                Tt21 = compressor_exit_temp(Tt2, lpr, eta_c)
                pt21 = pt2 * lpr
                Tt25 = compressor_exit_temp(Tt21, ipr, eta_c)
                pt25 = pt21 * ipr
                Tt3  = compressor_exit_temp(Tt25, hpr, eta_c)
                pt3  = pt25 * hpr
                Tt4  = TIT
                pt4  = pt3
                fuel_flow = m_core * CP * (Tt4 - Tt3) / (eta_b * LHV_JET_A)
                if fuel_flow < 0:
                    errors.append("TIT is below compressor exit temperature — impossible to add heat. Increase TIT, or reduce OPR.")
                    return _make_empty_results()
                # HP turbine → HP compressor
                Tt45 = Tt4  - (Tt3  - Tt25)
                pt45 = turbine_exit_pressure(Tt4,  Tt45, pt4,  eta_t)
                # IP turbine → IP compressor
                Tt5  = Tt45 - (Tt25 - Tt21)
                pt5  = turbine_exit_pressure(Tt45, Tt5,  pt45, eta_t)
                # LP turbine → LP compressor
                Tt55 = Tt5  - (Tt21 - Tt2)
                pt55 = turbine_exit_pressure(Tt5,  Tt55, pt5,  eta_t)
                Vj_core, p_exit_c, A_exit_c, choked_c = nozzle_exit(Tt55, pt55, p_amb, m_core)
                # For station reporting, map Tt55 to Tt5 slot if 3-spool
                # (we keep separate tt55 field for display)

        else:
            # ── Turbofan ──────────────────────────────────────────────────────
            if ns == 1:
                # Simple 1-spool turbofan: single shaft drives fan + core compressor + turbine
                # Fan raises all flow to FPR; core compressor raises core to OPR
                Tt21 = compressor_exit_temp(Tt2, FPR, eta_f)
                pt21 = pt2 * FPR
                Tt3  = compressor_exit_temp(Tt21, hpr, eta_c)  # hpr = OPR/FPR
                pt3  = pt21 * hpr
                Tt4  = TIT
                pt4  = pt3
                fuel_flow = m_core * CP * (Tt4 - Tt3) / (eta_b * LHV_JET_A)
                if fuel_flow < 0:
                    errors.append("TIT is below compressor exit temperature — impossible to add heat. Increase TIT, or reduce OPR.")
                    return _make_empty_results()
                # Single turbine drives fan (all flow) + core compressor (core flow only)
                # Energy balance: m_core*(Tt4 - Tt5) = m_core*(Tt3 - Tt21) + m_total*(Tt21 - Tt2)
                work_total = m_core * (Tt3 - Tt21) + m_total * (Tt21 - Tt2)
                Tt5 = Tt4 - work_total / m_core
                pt5 = turbine_exit_pressure(Tt4, Tt5, pt4, eta_t)
                Vj_core,   p_exit_c, A_exit_c, choked_c = nozzle_exit(Tt5,  pt5,  p_amb, m_core)
                Vj_bypass, p_exit_b, A_exit_b, choked_b = nozzle_exit(Tt21, pt21, p_amb, m_bypass)

            elif ns == 2:
                # Two-spool turbofan: LP spool = fan; HP spool = HP compressor + HP turbine
                # Fan / LP compressor (raises entire flow to FPR)
                Tt21 = compressor_exit_temp(Tt2, FPR, eta_f)
                pt21 = pt2 * FPR
                # HP compressor (core only, raises from FPR to OPR)
                Tt3  = compressor_exit_temp(Tt21, hpr, eta_c)
                pt3  = pt21 * hpr
                Tt4  = TIT
                pt4  = pt3
                fuel_flow = m_core * CP * (Tt4 - Tt3) / (eta_b * LHV_JET_A)
                if fuel_flow < 0:
                    errors.append("TIT is below compressor exit temperature — impossible to add heat. Increase TIT, or reduce OPR.")
                    return _make_empty_results()
                # HP turbine drives HP compressor (core flow energy balance)
                #   m_core*(Tt4 - Tt45) = m_core*(Tt3 - Tt21)
                Tt45 = Tt4 - (Tt3 - Tt21)
                pt45 = turbine_exit_pressure(Tt4, Tt45, pt4, eta_t)
                # LP turbine drives fan (total flow energy balance)
                #   m_core*(Tt45 - Tt5) = m_total*(Tt21 - Tt2)
                Tt5  = Tt45 - (1.0 + BPR) * (Tt21 - Tt2)
                pt5  = turbine_exit_pressure(Tt45, Tt5, pt45, eta_t)
                Vj_core,   p_exit_c, A_exit_c, choked_c = nozzle_exit(Tt5,  pt5,  p_amb, m_core)
                Vj_bypass, p_exit_b, A_exit_b, choked_b = nozzle_exit(Tt21, pt21, p_amb, m_bypass)

            else:  # ns == 3
                # Three-spool turbofan: Fan(LP), IP compressor, HP compressor
                Tt21 = compressor_exit_temp(Tt2, FPR, eta_f)
                pt21 = pt2 * FPR
                Tt25 = compressor_exit_temp(Tt21, ipr, eta_c)
                pt25 = pt21 * ipr
                Tt3  = compressor_exit_temp(Tt25, hpr, eta_c)
                pt3  = pt25 * hpr
                Tt4  = TIT
                pt4  = pt3
                fuel_flow = m_core * CP * (Tt4 - Tt3) / (eta_b * LHV_JET_A)
                if fuel_flow < 0:
                    errors.append("TIT is below compressor exit temperature — impossible to add heat. Increase TIT, or reduce OPR.")
                    return _make_empty_results()
                # HP turbine → HP compressor (core only)
                Tt45 = Tt4  - (Tt3  - Tt25)
                pt45 = turbine_exit_pressure(Tt4,  Tt45, pt4,  eta_t)
                # IP turbine → IP compressor (core only)
                Tt5  = Tt45 - (Tt25 - Tt21)
                pt5  = turbine_exit_pressure(Tt45, Tt5,  pt45, eta_t)
                # LP turbine → fan (total flow)
                #   m_core*(Tt5 - Tt55) = m_total*(Tt21 - Tt2)
                Tt55 = Tt5  - (1.0 + BPR) * (Tt21 - Tt2)
                pt55 = turbine_exit_pressure(Tt5,  Tt55, pt5,  eta_t)
                Vj_core,   p_exit_c, A_exit_c, choked_c = nozzle_exit(Tt55, pt55, p_amb, m_core)
                Vj_bypass, p_exit_b, A_exit_b, choked_b = nozzle_exit(Tt21, pt21, p_amb, m_bypass)

    except (ValueError, ZeroDivisionError, OverflowError) as exc:
        errors.append(f"Thermodynamic calculation error: {exc}")
        return _make_empty_results()

    # ── Core Nozzle Pressure Check ────────────────────────────────────────────
    # pt of the final turbine stage must exceed ambient for the nozzle to produce
    # any thrust.  When it falls below p_amb (over-expanded LP turbine — typically
    # caused by high BPR × FPR at altitude), nozzle_exit silently returns Vj = 0.
    pt_core_exhaust = pt55 if ns == 3 else pt5
    if pt_core_exhaust < p_amb:
        errors.append(
            f"Core nozzle pressure ({pt_core_exhaust / 1000:.1f} kPa) is below ambient "
            f"({p_amb / 1000:.1f} kPa) — LP turbine is over-expanded. "
            "Reduce bypass ratio (BPR) or fan PR, or increase TIT."
        )
        return _make_empty_results()

    # ── Turbine Exit Temperature Check ────────────────────────────────────────
    # Determine final turbine exit temperature for validation
    if eng == "turbojet" and ns == 3:
        Tt_exhaust = Tt55
    elif eng == "turbofan" and ns == 3:
        Tt_exhaust = Tt55
    elif eng == "turbofan" and ns == 2:
        Tt_exhaust = Tt5
    elif eng == "turbojet" and ns == 2:
        Tt_exhaust = Tt5
    else:
        Tt_exhaust = Tt5

    if Tt_exhaust < Tt2:
        errors.append(
            f"Turbine exit temperature ({Tt_exhaust:.1f} K) is below intake temperature "
            f"({Tt2:.1f} K) — turbine is over-expanded. Increase TIT, reduce OPR, or reduce BPR/fan PR."
        )
        return _make_empty_results()

    if Tt_exhaust < 400.0:
        warnings.append(
            f"Turbine exit temperature very low ({Tt_exhaust:.1f} K) — turbines are extracting too much work. "
            "Increase TIT, reduce OPR, or reduce BPR/fan PR."
        )

    # ── Net Thrust ────────────────────────────────────────────────────────────
    # Thrust = momentum thrust + pressure thrust for each nozzle
    # Pressure thrust only non-zero when nozzle is choked (p_exit > p_amb)
    thrust_core   = m_core   * (Vj_core - V0) + (p_exit_c - p_amb) * A_exit_c
    thrust_bypass = m_bypass * (Vj_bypass - V0) + (p_exit_b - p_amb) * A_exit_b
    net_thrust = thrust_core + thrust_bypass

    # ── Auto-size mass flow to hit thrust target ──────────────────────────────
    if request.auto_size_mass_flow:
        if thrust_required <= 0:
            warnings.append(
                "Auto-size mass flow is enabled but no thrust requirement is set "
                "— using manual core_mass_flow_kg_s. Set a thrust target in the Aircraft tab, or enable Compute from drag."
            )
        elif net_thrust <= 0:
            errors.append(
                f"Engine produces no positive net thrust ({net_thrust:.0f} N) at this operating point "
                "— cannot auto-size mass flow. Increase TIT, reduce BPR/fan PR, or reduce cruise speed."
            )
            return _make_empty_results()
        else:
            scale     = thrust_required / net_thrust
            m_core   *= scale
            m_bypass *= scale
            m_total  *= scale
            fuel_flow *= scale
            net_thrust = thrust_required

    # ── TSFC ─────────────────────────────────────────────────────────────────
    fuel_flow_kg_h = fuel_flow * 3600.0
    tsfc = (fuel_flow_kg_h / net_thrust) if net_thrust > 0 else 0.0  # kg/(N·h)

    # ── Propulsive Efficiency ─────────────────────────────────────────────────
    # η_p = 2 * V0 / (Vj + V0)  for a single stream (turbojet)
    # For turbofan, use mass-weighted average jet velocity
    if eng == "turbojet":
        Vj_avg = Vj_core
    else:
        if m_total > 0:
            Vj_avg = (m_core * Vj_core + m_bypass * Vj_bypass) / m_total
        else:
            Vj_avg = Vj_core

    prop_eff = (2.0 * V0 / (Vj_avg + V0)) if (Vj_avg + V0) > 0 else 0.0

    # ── TIT Utilisation ────────────────────────────────────────────────────────
    # tit_fraction = Tt4 / TIT_max = 1.0 at design point (we always run at max TIT).
    # For the envelope, report Tt3/Tt4: the fraction of TIT already "used" by compression.
    # This varies with flight condition (higher speed → higher ram temperature → higher Tt3
    # → less headroom for combustion → higher tit_fraction → approaching a "compression limit").
    # When tit_fraction approaches 1.0, there is little room to add heat: the combustor
    # temperature rise ΔT = TIT - Tt3 → 0, meaning the engine cannot burn enough fuel.
    # This serves as a meaningful envelope constraint that varies with speed and altitude.
    tit_fraction = Tt3 / TIT if TIT > 0 else 1.0

    if OPR > 40.0:
        warnings.append("Very high OPR (>40) — check stage count and surge margin. Consider reducing OPR or splitting across more spools.")

    if tit_fraction > 0.95:
        warnings.append(
            f"Compressor exit temperature (Tt3 = {Tt3:.0f} K) is {tit_fraction*100:.1f}% of TIT "
            f"({TIT:.0f} K) — little headroom for combustion. Increase TIT, reduce OPR, or reduce cruise speed."
        )

    thrust_margin = net_thrust - thrust_required
    if thrust_margin < 0:
        warnings.append(
            f"Thrust deficit at cruise: engine produces {net_thrust:.0f} N "
            f"but requires {thrust_required:.0f} N. Increase TIT, OPR, core mass flow, or enable Auto-size from thrust requirement."
        )

    # ── Compressor Stage Counts ───────────────────────────────────────────────
    compressor_stages: dict[str, int] = {}
    if eng == "turbojet":
        if ns == 1:
            compressor_stages["HP"] = _num_stages(OPR)
        elif ns == 2:
            compressor_stages["LP"] = _num_stages(lpr)
            compressor_stages["HP"] = _num_stages(hpr)
        else:  # 3-spool turbojet
            compressor_stages["LP"] = _num_stages(lpr)
            compressor_stages["IP"] = _num_stages(ipr)
            compressor_stages["HP"] = _num_stages(hpr)
    else:  # turbofan
        compressor_stages["Fan"] = _num_stages(FPR)
        if ns == 1:
            compressor_stages["HP"] = _num_stages(hpr)
        elif ns == 2:
            compressor_stages["HP"] = _num_stages(hpr)
        else:  # 3-spool turbofan
            compressor_stages["IP"] = _num_stages(ipr)
            compressor_stages["HP"] = _num_stages(hpr)

    # ── Geometry ─────────────────────────────────────────────────────────────
    geometry = _estimate_geometry(
        engine_type=eng,
        num_spools=ns,
        m_total=m_total,
        m_core=m_core,
        BPR=BPR,
        FPR=FPR,
        OPR=OPR,
        lpr=lpr,
        ipr=ipr,
        hpr=hpr,
        Tt2=Tt2,
        pt2=pt2,
    )

    # ── Assemble StationData ──────────────────────────────────────────────────
    # Determine which stations are active
    # For 3-spool engines, we store Tt55 in the tt55 field
    # For 2-spool turbofan, Tt5 is LP turbine exit
    # For 2-spool turbojet, Tt5 is LP turbine exit

    def _opt(v: float, active: bool) -> Optional[float]:
        return round(v, 2) if active else None

    is_turbofan = eng == "turbofan"
    has_25 = (eng == "turbofan" and ns == 3) or (eng == "turbojet" and ns == 3)
    has_21 = (ns >= 2) or is_turbofan
    has_45 = ns >= 2
    has_55 = ns == 3

    # Map final turbine exit to correct field
    tt5_val  = Tt5
    tt55_val = Tt55 if ns == 3 else None

    stations = StationData(
        tt2_k=round(Tt2, 2),
        tt21_k=_opt(Tt21, has_21),
        tt25_k=_opt(Tt25, has_25),
        tt3_k=round(Tt3, 2),
        tt4_k=round(Tt4, 2),
        tt45_k=_opt(Tt45, has_45),
        tt5_k=round(tt5_val, 2),
        tt55_k=_opt(tt55_val, has_55) if tt55_val is not None else None,

        pt2_kpa=round(pt2 / 1000.0, 3),
        pt21_kpa=_opt(pt21 / 1000.0, has_21),
        pt25_kpa=_opt(pt25 / 1000.0, has_25),
        pt3_kpa=round(pt3 / 1000.0, 3),
        pt4_kpa=round(pt4 / 1000.0, 3),
        pt45_kpa=_opt(pt45 / 1000.0, has_45),
        pt5_kpa=round(pt5 / 1000.0, 3),
        pt55_kpa=_opt(pt55 / 1000.0, has_55) if ns == 3 else None,

        vj_core_m_s=round(Vj_core, 2),
        vj_bypass_m_s=round(Vj_bypass, 2) if is_turbofan else None,
        p_exit_core_pa=round(p_exit_c, 1),
        p_exit_bypass_pa=round(p_exit_b, 1) if is_turbofan else None,
        core_nozzle_choked=choked_c,
        bypass_nozzle_choked=choked_b,
    )

    return EngineResults(
        net_thrust_n=round(net_thrust, 1),
        thrust_required_n=round(thrust_required, 1),
        thrust_margin_n=round(thrust_margin, 1),
        fuel_flow_kg_s=round(fuel_flow, 4),
        fuel_flow_kg_h=round(fuel_flow_kg_h, 2),
        tsfc_kg_n_h=round(tsfc, 6),
        core_mass_flow_kg_s=round(m_core, 3),
        bypass_mass_flow_kg_s=round(m_bypass, 3),
        stations=stations,
        geometry=geometry,
        compressor_stages=compressor_stages,
        tit_fraction=round(tit_fraction, 4),
        propulsive_efficiency=round(prop_eff, 4),
        errors=errors,
        warnings=warnings,
        assumptions=assumptions,
    )


# ─── Envelope Calculator ──────────────────────────────────────────────────────

def calculate_envelope(request: EnvelopeRequest) -> EnvelopeResults:
    """
    Compute the engine performance envelope over ranges of speed and altitude.

    Performs two sweeps:
      1. Speed sweep at fixed altitude (thrust, TSFC, TIT fraction vs speed)
      2. Altitude sweep at fixed speed (thrust, TSFC vs altitude)

    Each sweep calls calculate_engine() for each point and collects results.

    Parameters
    ----------
    request : EnvelopeRequest
        Envelope sweep specification (see models/inputs.py).

    Returns
    -------
    EnvelopeResults
        Five PlotData objects covering both sweeps.
    """
    design = request.design

    # ── Speed Sweep ───────────────────────────────────────────────────────────
    speeds = list(np.linspace(request.speed_min_kmh, request.speed_max_kmh, request.speed_steps))

    thrust_speed:       list[Optional[float]] = []
    thrust_req_speed:   list[Optional[float]] = []
    tsfc_speed:         list[Optional[float]] = []
    tit_frac_speed:     list[Optional[float]] = []

    for spd in speeds:
        req = design.model_copy(update={"cruise_speed_kmh": spd, "cruise_altitude_m": request.altitude_m})
        res = calculate_engine(req)
        if res.errors:
            thrust_speed.append(None)
            thrust_req_speed.append(None)
            tsfc_speed.append(None)
            tit_frac_speed.append(None)
        else:
            thrust_speed.append(res.net_thrust_n)
            thrust_req_speed.append(res.thrust_required_n)
            tsfc_speed.append(res.tsfc_kg_n_h * (1e6 / 3600))   # convert kg/(N·h) → mg/(N·s)
            tit_frac_speed.append(res.tit_fraction * 100.0)

    # Thrust Required only varies with speed when wing_area is set (dynamic pressure method).
    # Without wing_area it uses weight×(CD/CL) which is constant — omit to avoid a flat line.
    thrust_vs_speed_series = [
        PlotSeries(name="Net Thrust", y_values=thrust_speed, y_label="Thrust", y_unit="N", is_limit_line=False),
    ]
    if design.wing_area_m2 is not None:
        thrust_vs_speed_series.append(
            PlotSeries(name="Thrust Required", y_values=thrust_req_speed, y_label="Thrust", y_unit="N", is_limit_line=False)
        )

    thrust_vs_speed = PlotData(
        x_values=speeds,
        x_label="Speed",
        x_unit="km/h",
        series=thrust_vs_speed_series,
    )

    tsfc_vs_speed = PlotData(
        x_values=speeds,
        x_label="Speed",
        x_unit="km/h",
        series=[
            PlotSeries(name="TSFC", y_values=tsfc_speed, y_label="TSFC", y_unit="mg/(N·s)", is_limit_line=False),
        ],
    )

    tit_frac_vs_speed = PlotData(
        x_values=speeds,
        x_label="Speed",
        x_unit="km/h",
        series=[
            PlotSeries(name="TIT Utilisation",  y_values=tit_frac_speed,
                       y_label="TIT / TIT_max",  y_unit="%", is_limit_line=False),
            PlotSeries(name="100% Limit",
                       y_values=[100.0] * len(speeds),
                       y_label="TIT / TIT_max",  y_unit="%", is_limit_line=True),
        ],
    )

    # ── Altitude Sweep ─────────────────────────────────────────────────────────
    altitudes = list(np.linspace(request.altitude_min_m, request.altitude_max_m, request.altitude_steps))

    thrust_alt: list[Optional[float]] = []
    tsfc_alt:   list[Optional[float]] = []

    for alt in altitudes:
        req = design.model_copy(update={"cruise_altitude_m": alt, "cruise_speed_kmh": request.speed_kmh})
        res = calculate_engine(req)
        if res.errors:
            thrust_alt.append(None)
            tsfc_alt.append(None)
        else:
            thrust_alt.append(res.net_thrust_n)
            tsfc_alt.append(res.tsfc_kg_n_h * (1e6 / 3600))   # convert kg/(N·h) → mg/(N·s)

    thrust_vs_altitude = PlotData(
        x_values=altitudes,
        x_label="Altitude",
        x_unit="m",
        series=[
            PlotSeries(name="Net Thrust", y_values=thrust_alt, y_label="Thrust", y_unit="N", is_limit_line=False),
        ],
    )

    tsfc_vs_altitude = PlotData(
        x_values=altitudes,
        x_label="Altitude",
        x_unit="m",
        series=[
            PlotSeries(name="TSFC", y_values=tsfc_alt, y_label="TSFC", y_unit="mg/(N·s)", is_limit_line=False),
        ],
    )

    return EnvelopeResults(
        thrust_vs_speed=thrust_vs_speed,
        tsfc_vs_speed=tsfc_vs_speed,
        tit_fraction_vs_speed=tit_frac_vs_speed,
        thrust_vs_altitude=thrust_vs_altitude,
        tsfc_vs_altitude=tsfc_vs_altitude,
    )
