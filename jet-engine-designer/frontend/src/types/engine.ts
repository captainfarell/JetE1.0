// ─── Request Types ────────────────────────────────────────────────────────────

export interface CalculateRequest {
  engine_type: 'turbojet' | 'turbofan';
  num_spools: 1 | 2 | 3;
  bypass_ratio: number;
  fan_pressure_ratio: number;
  fan_efficiency: number;
  overall_pressure_ratio: number;
  lp_pressure_ratio: number | null;
  ip_pressure_ratio: number | null;
  hp_pressure_ratio: number | null;
  tit_max_k: number;
  eta_compressor: number;
  eta_turbine: number;
  eta_combustor: number;
  core_mass_flow_kg_s: number;
  aircraft_mass_kg: number;
  wing_area_m2: number | null;
  cl_cruise: number;
  cd_cruise: number;
  cruise_speed_kmh: number;
  cruise_altitude_m: number;
  ambient_temperature_override_k: number | null;
  target_thrust_n: number | null;
  compute_thrust_from_drag: boolean;
}

export interface EnvelopeRequest {
  design: CalculateRequest;
  speed_min_kmh: number;
  speed_max_kmh: number;
  speed_steps: number;
  altitude_m: number;
  altitude_min_m: number;
  altitude_max_m: number;
  altitude_steps: number;
  speed_kmh: number;
}

// ─── Response Types ───────────────────────────────────────────────────────────

export interface StationData {
  tt2_k: number;
  tt21_k: number | null;
  tt25_k: number | null;
  tt3_k: number;
  tt4_k: number;
  tt45_k: number | null;
  tt5_k: number;
  tt55_k: number | null;
  pt2_kpa: number;
  pt21_kpa: number | null;
  pt25_kpa: number | null;
  pt3_kpa: number;
  pt4_kpa: number;
  pt45_kpa: number | null;
  pt5_kpa: number;
  pt55_kpa: number | null;
  vj_core_m_s: number;
  vj_bypass_m_s: number | null;
  p_exit_core_pa: number;
  p_exit_bypass_pa: number | null;
  core_nozzle_choked: boolean;
  bypass_nozzle_choked: boolean;
}

export interface GeometryComponent {
  name: string;
  x_start: number;
  x_end: number;
  r_inner: number;
  r_outer: number;
}

export interface GeometryData {
  inlet_diameter_m: number;
  fan_diameter_m: number | null;
  core_diameter_m: number;
  engine_length_m: number;
  component_positions: GeometryComponent[];
}

export interface EngineResults {
  net_thrust_n: number;
  thrust_required_n: number;
  thrust_margin_n: number;
  fuel_flow_kg_s: number;
  fuel_flow_kg_h: number;
  tsfc_kg_n_h: number;
  core_mass_flow_kg_s: number;
  bypass_mass_flow_kg_s: number;
  stations: StationData;
  geometry: GeometryData;
  tit_fraction: number;
  propulsive_efficiency: number;
  errors: string[];
  warnings: string[];
  assumptions: string[];
}

export interface PlotSeries {
  name: string;
  y_values: (number | null)[];
  y_label: string;
  y_unit: string;
  is_limit_line: boolean;
}

export interface PlotData {
  x_values: number[];
  x_label: string;
  x_unit: string;
  series: PlotSeries[];
}

export interface EnvelopeResults {
  thrust_vs_speed: PlotData;
  tsfc_vs_speed: PlotData;
  tit_fraction_vs_speed: PlotData;
  thrust_vs_altitude: PlotData;
  tsfc_vs_altitude: PlotData;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export interface MaterialTitRange {
  label: string;
  t_min_k: number;
  t_max_k: number;
  description: string;
}

export interface ParameterDescription {
  label: string;
  description: string;
  typical_range: string;
  trade_off: string;
}

export interface EnginePreset {
  name: string;
  engine_type: 'turbojet' | 'turbofan';
  num_spools: 1 | 2 | 3;
  bypass_ratio: number;
  fan_pressure_ratio: number;
  fan_efficiency: number;
  overall_pressure_ratio: number;
  lp_pressure_ratio: number | null;
  ip_pressure_ratio: number | null;
  hp_pressure_ratio: number | null;
  tit_max_k: number;
  eta_compressor: number;
  eta_turbine: number;
  eta_combustor: number;
  core_mass_flow_kg_s: number;
  description: string;
}

export interface DefaultsResponse {
  engine_presets: EnginePreset[];
  parameter_descriptions: Record<string, ParameterDescription>;
  material_tit_ranges: MaterialTitRange[];
}
