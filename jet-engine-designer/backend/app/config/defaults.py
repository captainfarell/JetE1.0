"""
Default configuration values for the Jet Engine Designer.

Contains physical constants, material limits, engine presets, and parameter descriptions.
"""

# ─── Physical Constants ───────────────────────────────────────────────────────
GAMMA: float = 1.4                  # Ratio of specific heats for air
CP: float = 1005.0                  # Specific heat at constant pressure [J/(kg·K)]
R_AIR: float = 287.058              # Specific gas constant for air [J/(kg·K)]
LHV_JET_A: float = 43.2e6          # Lower heating value of Jet-A fuel [J/kg]

# ─── Material TIT Ranges ─────────────────────────────────────────────────────
# Each entry: (label, T_min_K, T_max_K, description)
MATERIAL_TIT_RANGES = [
    {
        "label": "Steels",
        "t_min_k": 800,
        "t_max_k": 900,
        "description": "Basic carbon and alloy steels. Used only in low-temperature sections. Inexpensive but limited temperature capability.",
    },
    {
        "label": "High-temp stainless / Basic Ni",
        "t_min_k": 900,
        "t_max_k": 1100,
        "description": "Stainless steels and basic nickel alloys (e.g. Nimonic 75). Found in early jet engines and auxiliary components.",
    },
    {
        "label": "Advanced Ni superalloys",
        "t_min_k": 1100,
        "t_max_k": 1300,
        "description": "Cast nickel superalloys (e.g. IN738, René 80). Standard for modern uncooled turbine blades. Directionally solidified or equiaxed.",
    },
    {
        "label": "Cooled Ni superalloys / SX",
        "t_min_k": 1300,
        "t_max_k": 1600,
        "description": "Actively cooled single-crystal nickel superalloys (e.g. CMSX-4, René N5). Used in HPT first-stage blades of high-performance engines. TBC coatings push towards upper bound.",
    },
]

# ─── Engine Presets ──────────────────────────────────────────────────────────
ENGINE_PRESETS = [
    {
        "name": "Small Turbofan",
        "engine_type": "turbofan",
        "num_spools": 2,
        "bypass_ratio": 3.0,
        "fan_pressure_ratio": 1.4,
        "fan_efficiency": 0.88,
        "overall_pressure_ratio": 8.0,
        "lp_pressure_ratio": None,
        "ip_pressure_ratio": None,
        "hp_pressure_ratio": None,
        "tit_max_k": 1200.0,
        "eta_compressor": 0.85,
        "eta_turbine": 0.88,
        "eta_combustor": 0.99,
        "core_mass_flow_kg_s": 10.0,
        "description": "Representative of small regional jet or business jet engines (e.g. Williams FJ44). BPR=3, OPR=8.",
    },
    {
        "name": "Medium Turbofan",
        "engine_type": "turbofan",
        "num_spools": 2,
        "bypass_ratio": 5.0,
        "fan_pressure_ratio": 1.6,
        "fan_efficiency": 0.88,
        "overall_pressure_ratio": 15.0,
        "lp_pressure_ratio": None,
        "ip_pressure_ratio": None,
        "hp_pressure_ratio": None,
        "tit_max_k": 1400.0,
        "eta_compressor": 0.85,
        "eta_turbine": 0.88,
        "eta_combustor": 0.99,
        "core_mass_flow_kg_s": 50.0,
        "description": "Representative of medium narrowbody engines (e.g. CFM56 class). BPR=5, OPR=15.",
    },
    {
        "name": "Large Turbofan",
        "engine_type": "turbofan",
        "num_spools": 3,
        "bypass_ratio": 8.0,
        "fan_pressure_ratio": 1.7,
        "fan_efficiency": 0.90,
        "overall_pressure_ratio": 35.0,
        "lp_pressure_ratio": None,
        "ip_pressure_ratio": None,
        "hp_pressure_ratio": None,
        "tit_max_k": 1600.0,
        "eta_compressor": 0.87,
        "eta_turbine": 0.90,
        "eta_combustor": 0.99,
        "core_mass_flow_kg_s": 300.0,
        "description": "Representative of large widebody engines (e.g. Trent 1000, GE90 class). BPR=8, OPR=35.",
    },
    {
        "name": "Turbojet",
        "engine_type": "turbojet",
        "num_spools": 2,
        "bypass_ratio": 0.0,
        "fan_pressure_ratio": 1.0,
        "fan_efficiency": 0.88,
        "overall_pressure_ratio": 12.0,
        "lp_pressure_ratio": None,
        "ip_pressure_ratio": None,
        "hp_pressure_ratio": None,
        "tit_max_k": 1400.0,
        "eta_compressor": 0.85,
        "eta_turbine": 0.88,
        "eta_combustor": 0.99,
        "core_mass_flow_kg_s": 40.0,
        "description": "Classic turbojet (e.g. early military jets, Olympus class). All thrust from core nozzle. High specific thrust but poor fuel efficiency.",
    },
]

# ─── Parameter Descriptions ──────────────────────────────────────────────────
PARAMETER_DESCRIPTIONS = {
    "engine_type": {
        "label": "Engine Type",
        "description": "Turbojet accelerates all ingested air through a single nozzle for maximum specific thrust. Turbofan adds a large fan that bypasses most air around the core, greatly improving subsonic efficiency and reducing noise.",
        "typical_range": "turbojet or turbofan",
        "trade_off": "Turbojet: high specific thrust, poor fuel efficiency. Turbofan: lower specific thrust, much better fuel efficiency at subsonic speeds.",
    },
    "num_spools": {
        "label": "Number of Spools",
        "description": "Each spool is an independent shaft connecting a turbine to a compressor (and fan). More spools allow each compressor to run at its optimal speed, improving efficiency and surge margin.",
        "typical_range": "1 (simple/small), 2 (most commercial), 3 (Rolls-Royce, some military)",
        "trade_off": "More spools = better efficiency and flexibility, but higher mechanical complexity and cost.",
    },
    "bypass_ratio": {
        "label": "Bypass Ratio (BPR)",
        "description": "Ratio of bypass air mass flow to core air mass flow. Higher BPR means more air is accelerated by the fan at lower velocity, which is thermodynamically more efficient for thrust production.",
        "typical_range": "0 (turbojet) to 12+ (ultra-high bypass engines like PW1000G)",
        "trade_off": "Higher BPR = lower TSFC and noise, but larger/heavier engine and higher nacelle drag at high speeds.",
    },
    "fan_pressure_ratio": {
        "label": "Fan Pressure Ratio (FPR)",
        "description": "Total pressure ratio across the fan stage. A higher FPR gives more pressure to both the bypass stream and core, but reduces the bypass jet velocity advantage.",
        "typical_range": "1.3–1.8 for modern turbofans; lower is better for very high-BPR engines",
        "trade_off": "Lower FPR with high BPR = better efficiency; higher FPR = more compact but louder.",
    },
    "overall_pressure_ratio": {
        "label": "Overall Pressure Ratio (OPR)",
        "description": "Total pressure ratio from inlet to combustor entry. Higher OPR increases the thermodynamic efficiency of the Brayton cycle (more expansion work available), but requires more compressor stages and stronger materials.",
        "typical_range": "8–12 (older/small), 15–25 (modern narrowbody), 35–50 (latest technology)",
        "trade_off": "Higher OPR = better thermal efficiency and TSFC, but higher compressor exit temperature limits fuel savings, and surge margin becomes critical.",
    },
    "tit_max_k": {
        "label": "Turbine Inlet Temperature (TIT)",
        "description": "Maximum temperature of gas entering the first turbine stage. Higher TIT allows more energy to be extracted for thrust, but is strictly limited by turbine blade material capabilities.",
        "typical_range": "1100–1300 K (uncooled), 1300–1600 K (actively cooled single-crystal blades with TBC)",
        "trade_off": "Higher TIT = more thrust per kg of air, but requires expensive cooled turbine blades and reduces engine life.",
    },
    "eta_compressor": {
        "label": "Compressor Isentropic Efficiency",
        "description": "Ratio of ideal (isentropic) compressor work to actual work input. Accounts for aerodynamic losses in the compressor blades and diffuser.",
        "typical_range": "0.82–0.90 for modern axial compressors",
        "trade_off": "Higher efficiency = less shaft power wasted as heat, allowing higher OPR without excessive compressor exit temperatures.",
    },
    "eta_turbine": {
        "label": "Turbine Isentropic Efficiency",
        "description": "Ratio of actual turbine work output to ideal (isentropic) work. Accounts for aerodynamic losses in turbine nozzle guide vanes and rotor blades.",
        "typical_range": "0.86–0.92 for modern high-pressure turbines",
        "trade_off": "Higher efficiency = more shaft power extracted per degree of temperature drop, allowing lower turbine exit temperatures and more efficient exhaust.",
    },
    "eta_combustor": {
        "label": "Combustor Efficiency",
        "description": "Fraction of fuel chemical energy released as heat. Modern annular combustors are highly efficient, with losses from incomplete combustion being very small.",
        "typical_range": "0.97–0.999 for modern combustors",
        "trade_off": "Near unity for modern engines; lower combustor efficiency directly increases fuel consumption.",
    },
    "core_mass_flow_kg_s": {
        "label": "Core Mass Flow Rate",
        "description": "Mass flow rate of air entering the engine core (compressor inlet). Together with bypass ratio, determines total air intake and overall engine size.",
        "typical_range": "5–30 kg/s (small), 50–150 kg/s (medium), 200–600 kg/s (large)",
        "trade_off": "Larger core = more thrust but heavier engine. Matched to aircraft requirement and desired T/W ratio.",
    },
    "aircraft_mass_kg": {
        "label": "Aircraft Mass",
        "description": "Total aircraft mass including fuel, payload, and structure. Used to compute lift and drag forces, and therefore the thrust required for cruise.",
        "typical_range": "500–5,000 kg (GA/light jet), 5,000–100,000 kg (regional/narrowbody), 100,000–600,000 kg (widebody)",
        "trade_off": "Heavier aircraft requires more thrust, larger engines, and more fuel — all of which add weight in a spiral.",
    },
    "cl_cruise": {
        "label": "Cruise Lift Coefficient",
        "description": "Dimensionless measure of lift generated per unit dynamic pressure and wing area. Aircraft cruise most efficiently near the CL for maximum L/D.",
        "typical_range": "0.3–0.6 for typical cruise (lower for fast/swept wings, higher for slower aircraft)",
        "trade_off": "Higher CL allows slower, more fuel-efficient cruise but requires larger wings and may approach stall margin limits.",
    },
    "cd_cruise": {
        "label": "Cruise Drag Coefficient",
        "description": "Total aircraft drag coefficient at cruise, including induced drag, parasite drag, and wave drag. The L/D ratio = CL/CD determines cruise efficiency.",
        "typical_range": "0.02–0.04 (modern clean airliners), 0.04–0.08 (older or less optimized designs)",
        "trade_off": "Lower CD = less thrust required = lower fuel burn. Every drag count (0.0001) matters at airline scale.",
    },
    "cruise_speed_kmh": {
        "label": "Cruise Speed",
        "description": "True airspeed during cruise. Higher speeds reduce trip time but increase drag (especially wave drag near Mach 0.8+) and require more thrust.",
        "typical_range": "400–600 km/h (turboprops), 700–900 km/h (turbofans at M0.75–0.85)",
        "trade_off": "Faster cruise = shorter trip time but higher fuel burn. Optimal cruise speed balances time cost vs fuel cost.",
    },
    "cruise_altitude_m": {
        "label": "Cruise Altitude",
        "description": "Altitude above sea level during cruise. Higher altitude means lower air density, reducing drag and allowing higher true airspeed for the same dynamic pressure.",
        "typical_range": "3,000–7,000 m (regional turboprops), 9,000–13,000 m (commercial jets)",
        "trade_off": "Higher altitude = lower density = less drag but engine must work harder to maintain mass flow. Tropopause (~11,000 m) is optimal for many jets.",
    },
    "fan_efficiency": {
        "label": "Fan Isentropic Efficiency",
        "description": "Ratio of ideal work to actual work for the fan stage. Fans typically achieve slightly higher efficiency than core compressors due to lower pressure ratios.",
        "typical_range": "0.86–0.92 for modern wide-chord fans",
        "trade_off": "Higher fan efficiency directly improves bypass stream velocity ratio and thus propulsive efficiency.",
    },
}
