"""
Brayton cycle — core constants and elementary turbomachinery functions.

This module contains only the physical constants and the three stateless
thermodynamic functions that every other sub-module depends on. No model
imports, no I/O — pure physics.

Constants (do not change without updating tooltips in config/defaults.py):
  Cold air (compressor/fan/intake): γ_c = 1.4,  cp_c = 1005 J/(kg·K)
  Hot gas  (turbine/nozzle):        γ_t = 1.33, cp_t = 1148 J/(kg·K)
  R = 287.058 J/(kg·K)
  Fuel: Jet-A, LHV = 43.2 MJ/kg
  Per-stage axial compressor PR: 1.3
"""

import math

# ─── Physical Constants ───────────────────────────────────────────────────────
GAMMA: float = 1.4
CP: float = 1005.0       # J/(kg·K)
R_AIR: float = 287.058   # J/(kg·K)
LHV_JET_A: float = 43.2e6  # J/kg

_GEXP: float = GAMMA / (GAMMA - 1.0)          # γ/(γ−1) = 3.5
_GEXP_INV: float = (GAMMA - 1.0) / GAMMA      # (γ−1)/γ ≈ 0.2857
_STAGE_PR: float = 1.3   # Assumed pressure ratio per axial compressor stage

# Hot combustion gas — turbine and nozzle sections
# γ_t = 1.33 is the standard textbook approximation for combustion products
# cp_t consistent with γ_t and R_AIR: cp = γ·R/(γ−1) = 1.33·287.058/0.33 ≈ 1157 J/(kg·K)
# Rounded to 1148 J/(kg·K) per Mattingly / AGARD convention
GAMMA_HOT: float = 1.33
CP_HOT: float = 1148.0    # J/(kg·K)

_GEXP_HOT: float = GAMMA_HOT / (GAMMA_HOT - 1.0)      # γ_t/(γ_t−1) ≈ 4.030
_GEXP_INV_HOT: float = (GAMMA_HOT - 1.0) / GAMMA_HOT  # (γ_t−1)/γ_t ≈ 0.2481

# ─── Elementary Turbomachinery Functions ─────────────────────────────────────

def compressor_exit_temp(T_inlet: float, PR: float, eta_c: float) -> float:
    """
    Adiabatic (isentropic + polytropic-efficiency) compressor exit total temperature.

    Formula:
        Tt_out = Tt_in · [1 + (PR^((γ-1)/γ) - 1) / η_c]

    Parameters
    ----------
    T_inlet : float
        Compressor inlet total temperature [K].
    PR : float
        Stage total pressure ratio.
    eta_c : float
        Isentropic efficiency (0 < η_c ≤ 1).

    Returns
    -------
    float
        Compressor exit total temperature [K].
    """
    return T_inlet * (1.0 + (PR ** _GEXP_INV - 1.0) / eta_c)


def turbine_exit_pressure(
    Tt_in: float, Tt_out: float, pt_in: float, eta_t: float
) -> float:
    """
    Turbine exit total pressure from known temperature drop and isentropic efficiency.

    From the definition of turbine isentropic efficiency:
        η_t = (Tt_in − Tt_out) / (Tt_in − Tt_out_s)

    where Tt_out_s is the isentropic exit temperature:
        Tt_out_s = Tt_in · (pt_out / pt_in)^((γ-1)/γ)

    Rearranging:
        pt_out = pt_in · [1 − (Tt_in − Tt_out) / (η_t · Tt_in)]^(γ_t/(γ_t-1))

    Parameters
    ----------
    Tt_in : float
        Turbine inlet total temperature [K].
    Tt_out : float
        Turbine exit total temperature [K].
    pt_in : float
        Turbine inlet total pressure [Pa].
    eta_t : float
        Isentropic efficiency (0 < η_t ≤ 1).

    Returns
    -------
    float
        Turbine exit total pressure [Pa].
    """
    ratio = 1.0 - (Tt_in - Tt_out) / (eta_t * Tt_in)
    ratio = max(ratio, 1e-6)  # Prevent negative/zero before exponentiation
    return pt_in * ratio ** _GEXP_HOT


def nozzle_exit(
    Tt: float,
    pt: float,
    p_amb: float,
    m_dot: float,
    eta_n: float = 1.0,
    gamma: float = GAMMA_HOT,
    cp_nozzle: float = CP_HOT,
) -> tuple[float, float, float, bool]:
    """
    Converging nozzle exit conditions.

    Accepts `gamma` and `cp_nozzle` so the same function can be used for both
    the hot core nozzle (γ_t = 1.33, cp_t = 1148 J/(kg·K)) and the cold bypass
    nozzle (γ_c = 1.4, cp_c = 1005 J/(kg·K)).

    Critical pressure ratio (choke threshold):
        PRcrit = ((γ+1)/2)^(γ/(γ-1))
        Core (γ=1.33): ≈ 1.852   Bypass (γ=1.4): ≈ 1.893

    If choked (pt/p_amb ≥ PRcrit):
        T_exit = Tt · 2/(γ+1)
        Vj     = √(γ·R·T_exit)
        p_exit = pt · (2/(γ+1))^(γ/(γ-1))

    If unchoked:
        Vj     = √(2·η_n·cp·Tt·[1 − (p_amb/pt)^((γ-1)/γ)])
        p_exit = p_amb

    Parameters
    ----------
    Tt : float
        Nozzle inlet total temperature [K].
    pt : float
        Nozzle inlet total pressure [Pa].
    p_amb : float
        Ambient static pressure [Pa].
    m_dot : float
        Mass flow rate through nozzle [kg/s].
    eta_n : float
        Nozzle isentropic efficiency (default 1.0 — ideal).
    gamma : float
        Ratio of specific heats for the gas (default GAMMA_HOT = 1.33 for core).
    cp_nozzle : float
        Specific heat at constant pressure [J/(kg·K)] (default CP_HOT = 1148).

    Returns
    -------
    Vj : float
        Jet exit velocity [m/s].
    p_exit : float
        Nozzle exit static pressure [Pa].
    A_exit : float
        Nozzle exit area [m²] (only meaningful when choked).
    choked : bool
        True if the nozzle is choked.
    """
    gexp     = gamma / (gamma - 1.0)
    gexp_inv = (gamma - 1.0) / gamma
    critical_PR = ((gamma + 1.0) / 2.0) ** gexp

    if (p_amb > 0) and (pt / p_amb >= critical_PR):
        # ── Choked flow ──────────────────────────────────────────────────────
        T_exit = Tt * 2.0 / (gamma + 1.0)
        Vj = math.sqrt(gamma * R_AIR * T_exit)
        p_exit = pt * (2.0 / (gamma + 1.0)) ** gexp
        rho_exit = p_exit / (R_AIR * T_exit)
        A_exit = m_dot / (rho_exit * Vj) if (rho_exit * Vj) > 0 else 0.0
        return Vj, p_exit, A_exit, True
    else:
        # ── Unchoked flow ─────────────────────────────────────────────────────
        if pt > 0 and p_amb > 0:
            T_exit_s = Tt * (p_amb / pt) ** gexp_inv
        else:
            T_exit_s = Tt
        dT = Tt - T_exit_s
        Vj = math.sqrt(max(0.0, 2.0 * eta_n * cp_nozzle * dT))
        A_exit = 0.0
        return Vj, p_amb, A_exit, False
