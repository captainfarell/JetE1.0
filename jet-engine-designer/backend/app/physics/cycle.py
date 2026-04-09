# Backwards-compatible re-export shim.
#
# All physics logic has been moved to focused sub-modules:
#   cycle_core.py     — constants + elementary thermodynamic functions
#   cycle_geometry.py — _estimate_geometry() + _num_stages()
#   cycle_engine.py   — splitting helpers + calculate_engine() + calculate_envelope()
#
# This file exists solely so that existing imports of the form
#   from app.physics.cycle import calculate_engine, calculate_envelope
# continue to work without modification.

from .cycle_core import compressor_exit_temp, turbine_exit_pressure, nozzle_exit
from .cycle_geometry import _estimate_geometry, _num_stages
from .cycle_engine import (
    _split_2spool,
    _split_3spool,
    calculate_engine,
    calculate_envelope,
)

__all__ = [
    "compressor_exit_temp",
    "turbine_exit_pressure",
    "nozzle_exit",
    "_num_stages",
    "_estimate_geometry",
    "_split_2spool",
    "_split_3spool",
    "calculate_engine",
    "calculate_envelope",
]
