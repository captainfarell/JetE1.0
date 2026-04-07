"""
ISA Standard Atmosphere model (ICAO Doc 7488).

Implements the troposphere (0–11 000 m) and lower stratosphere (11 000–20 000 m)
layers of the International Standard Atmosphere.
"""

import math


def standard_atmosphere(altitude_m: float) -> tuple[float, float, float]:
    """
    Compute ISA ambient conditions at a given geometric altitude.

    Troposphere (0 ≤ h ≤ 11 000 m):
        T = T₀ - L·h          where T₀ = 288.15 K, L = 6.5 K/km
        p = p₀·(T/T₀)^(g/(R·L))

    Lower stratosphere (11 000 < h ≤ 20 000 m):
        T = 216.65 K   (isothermal layer)
        p = p₁₁·exp(−g·(h−11000) / (R·T))

    Parameters
    ----------
    altitude_m : float
        Altitude above mean sea level [m].  Values below 0 are clamped to 0.

    Returns
    -------
    T_amb : float
        Ambient static temperature [K].
    p_amb : float
        Ambient static pressure [Pa].
    rho_amb : float
        Ambient air density [kg/m³].
    """
    # Sea-level ISA constants
    T0 = 288.15       # K
    p0 = 101_325.0    # Pa
    L  = 0.006_5      # K/m  (lapse rate in troposphere)

    # Physical constants
    g = 9.806_65      # m/s²
    R = 287.058       # J/(kg·K)

    # Tropopause constants
    T11 = 216.65      # K
    p11 = 22_632.06   # Pa  (exact value at 11 000 m)

    h = max(0.0, float(altitude_m))

    if h <= 11_000.0:
        # Troposphere: linear temperature lapse
        T = T0 - L * h
        p = p0 * (T / T0) ** (g / (R * L))
    else:
        # Lower stratosphere: isothermal
        T = T11
        p = p11 * math.exp(-g * (h - 11_000.0) / (R * T11))

    rho = p / (R * T)
    return T, p, rho


def speed_of_sound(T_amb_k: float) -> float:
    """
    Speed of sound in air using ideal-gas relation: a = √(γ·R·T).

    Parameters
    ----------
    T_amb_k : float
        Ambient static temperature [K].

    Returns
    -------
    a : float
        Speed of sound [m/s].
    """
    GAMMA = 1.4
    R = 287.058
    return math.sqrt(GAMMA * R * T_amb_k)
