"""
Brayton cycle — engine geometry estimation.

Provides `_num_stages` and `_estimate_geometry`, which translate thermodynamic
cycle parameters into approximate physical dimensions and normalised component
positions for the engine cross-section diagram.

Model assumptions:
  - Compressor-face Mach number = 0.5
  - Axial component lengths proportional to stage counts
  - Per-stage axial compressor PR: 1.3 (from cycle_core._STAGE_PR)
"""

import math

from app.models.outputs import GeometryComponent, GeometryData
from app.physics.cycle_core import GAMMA, R_AIR, _GEXP, _STAGE_PR

# ─── Stage Count Helper ───────────────────────────────────────────────────────

def _num_stages(PR: float) -> int:
    """
    Estimate the number of axial compressor stages needed to achieve pressure ratio PR,
    assuming each stage delivers a pressure ratio of 1.3.
    """
    return max(1, math.ceil(math.log(PR) / math.log(_STAGE_PR)))


# ─── Geometry Estimation ─────────────────────────────────────────────────────

def _estimate_geometry(
    engine_type: str,
    num_spools: int,
    m_total: float,
    m_core: float,
    BPR: float,
    FPR: float,
    OPR: float,
    lpr: float,
    ipr: float,
    hpr: float,
    Tt2: float,
    pt2: float,
) -> GeometryData:
    """
    Estimate engine dimensions and normalised component positions.

    Uses simplified flow-path sizing:
      - Inlet sizing assumes Mach 0.5 at compressor face
      - Component axial lengths are proportional to stage counts

    Returns
    -------
    GeometryData
        Estimated geometry with normalised component positions.
    """
    # ── Compressor-face flow conditions ──────────────────────────────────────
    M_cf = 0.5
    T_cf = Tt2 / (1.0 + (GAMMA - 1.0) / 2.0 * M_cf ** 2)
    p_cf = pt2 / ((1.0 + (GAMMA - 1.0) / 2.0 * M_cf ** 2) ** _GEXP)
    rho_cf = p_cf / (R_AIR * T_cf)
    V_cf = M_cf * math.sqrt(GAMMA * R_AIR * T_cf)

    # ── Diameters ─────────────────────────────────────────────────────────────
    A_inlet = m_total / (rho_cf * V_cf)
    D_inlet = math.sqrt(4.0 * A_inlet / math.pi)

    A_core = m_core / (rho_cf * V_cf)
    D_core = math.sqrt(4.0 * A_core / math.pi)

    fan_diameter = D_inlet if engine_type == "turbofan" else None

    # ── Stage counts ──────────────────────────────────────────────────────────
    fan_stages   = _num_stages(FPR)  if engine_type == "turbofan" else 0
    lpc_stages   = 0
    ipc_stages   = 0
    hpc_stages   = 0

    if engine_type == "turbojet":
        if num_spools == 1:
            hpc_stages = _num_stages(OPR)
        elif num_spools == 2:
            lpc_stages = _num_stages(lpr)
            hpc_stages = _num_stages(hpr)
        else:  # 3-spool
            lpc_stages = _num_stages(lpr)
            ipc_stages = _num_stages(ipr)
            hpc_stages = _num_stages(hpr)
    else:  # turbofan
        if num_spools == 2:
            # FPR handled by fan, HPR = OPR/FPR
            hpc_stages = _num_stages(hpr)
        elif num_spools == 3:
            # fan=FPR, IP=IPR, HP=HPR
            ipc_stages = _num_stages(ipr)
            hpc_stages = _num_stages(hpr)
        else:  # 1-spool
            hpc_stages = _num_stages(OPR / FPR) if FPR > 1.0 else _num_stages(OPR)

    # Turbine stage counts (approximate: same as compressor but fewer stages per PR)
    # HP turbine always exists (single shaft minimum)
    hpt_stages = max(1, math.ceil(hpc_stages / 2))
    # IP turbine only on 3-spool (matches IP compressor)
    ipt_stages = max(1, math.ceil(ipc_stages / 2)) if ipc_stages > 0 else 0
    # LP turbine only on 2+ spool configs where there is a dedicated LP shaft (fan or LPC)
    lpt_stages = max(1, math.ceil((lpc_stages + fan_stages) / 2)) if (num_spools >= 2 and (lpc_stages + fan_stages) > 0) else 0
    # Hard guard: 1-spool engines have no LP shaft — LP turbine must never appear
    if num_spools == 1:
        lpt_stages = 0

    # ── Axial length fractions per component (in D_inlet units) ──────────────
    # These are proportional lengths; we'll normalise at the end
    D = D_inlet  # Reference length

    lengths: dict[str, float] = {
        "Intake":         0.4 * D,
        "Fan":            fan_stages * 0.10 * D if fan_stages > 0 else 0.0,
        "Bypass Duct":    0.0,  # Occupies same axial space as core; drawn as annulus
        "LP Compressor":  lpc_stages * 0.08 * D if lpc_stages > 0 else 0.0,
        "IP Compressor":  ipc_stages * 0.08 * D if ipc_stages > 0 else 0.0,
        "HP Compressor":  hpc_stages * 0.07 * D,
        "Combustor":      0.35 * D,
        "HP Turbine":     hpt_stages * 0.10 * D,
        "IP Turbine":     ipt_stages * 0.10 * D if ipt_stages > 0 else 0.0,
        "LP Turbine":     lpt_stages * 0.10 * D,
        "Core Nozzle":    0.4 * D,
    }

    # Remove zero-length components (except Bypass Duct which needs special handling)
    ordered_components = [k for k, v in lengths.items() if v > 0 or k == "Bypass Duct"]

    # Total length (excluding bypass duct since it's axially parallel)
    total_length = sum(v for k, v in lengths.items() if k != "Bypass Duct")
    if total_length <= 0:
        total_length = D  # Fallback

    # ── Build component_positions ──────────────────────────────────────────────
    # r_inner and r_outer are fractions of fan/inlet radius
    # Fan radius = 1.0; Core radius = D_core / D_inlet

    r_core = D_core / D_inlet  # ≈ sqrt(1/(1+BPR)) for turbofan

    # Flow path tapers: compressor entry is at r_core, exit is smaller (higher density)
    # Simple linear taper from r_core → r_core*0.7 through compressor
    comp_r_out = r_core
    comp_r_in  = r_core * 0.7  # Approximate exit radius (compressed flow)

    components: list[GeometryComponent] = []
    x_cursor = 0.0

    for name in ordered_components:
        length = lengths[name]

        if name == "Bypass Duct":
            continue  # Will be added separately

        x_frac_start = x_cursor / total_length
        x_frac_end   = (x_cursor + length) / total_length

        if name == "Intake":
            r_in  = r_core * 0.0   # Solid spinner not modeled; treat as solid
            r_out = 1.0
        elif name == "Fan":
            r_in  = 0.3  # Hub-to-tip ratio ~0.3 typical for fans
            r_out = 1.0
        elif name == "LP Compressor":
            r_in  = r_core * 0.55
            r_out = r_core
        elif name == "IP Compressor":
            r_in  = r_core * 0.45
            r_out = r_core * 0.85
        elif name == "HP Compressor":
            r_in  = comp_r_in
            r_out = comp_r_out if lpc_stages == 0 and ipc_stages == 0 else r_core * 0.75
        elif name == "Combustor":
            r_in  = comp_r_in * 0.6
            r_out = comp_r_in * 1.1
        elif name == "HP Turbine":
            r_in  = comp_r_in * 0.55
            r_out = comp_r_in * 1.05
        elif name == "IP Turbine":
            r_in  = comp_r_in * 0.4
            r_out = r_core * 0.85
        elif name == "LP Turbine":
            r_in  = 0.2
            r_out = r_core
        elif name == "Core Nozzle":
            r_in  = 0.0
            r_out = r_core * 0.9
        else:
            r_in  = 0.0
            r_out = 0.5

        # Clamp values
        r_in  = max(0.0, min(1.0, r_in))
        r_out = max(r_in + 0.01, min(1.05, r_out))

        components.append(GeometryComponent(
            name=name,
            x_start=round(x_frac_start, 4),
            x_end=round(x_frac_end, 4),
            r_inner=round(r_in, 4),
            r_outer=round(r_out, 4),
        ))

        x_cursor += length

    # ── Bypass duct (turbofan only) ───────────────────────────────────────────
    if engine_type == "turbofan" and fan_stages > 0 and BPR > 0:
        # Bypass duct starts at fan exit and ends just before nozzle
        fan_comp = next((c for c in components if c.name == "Fan"), None)
        nozzle_comp = next((c for c in components if c.name == "Core Nozzle"), None)

        x_bypass_start = fan_comp.x_end if fan_comp else 0.1
        x_bypass_end   = nozzle_comp.x_start if nozzle_comp else 0.9

        components.append(GeometryComponent(
            name="Bypass Duct",
            x_start=round(x_bypass_start, 4),
            x_end=round(x_bypass_end, 4),
            r_inner=round(r_core, 4),
            r_outer=round(min(1.05, r_core + 0.15), 4),
        ))

    return GeometryData(
        inlet_diameter_m=round(D_inlet, 4),
        fan_diameter_m=round(fan_diameter, 4) if fan_diameter else None,
        core_diameter_m=round(D_core, 4),
        engine_length_m=round(total_length, 4),
        component_positions=components,
    )
