import { useState, useCallback, useEffect } from 'react';
import { getDefaults } from '../services/api';
import type { CalculateRequest, DefaultsResponse } from '../types/engine';

const DEFAULT_FORM: CalculateRequest = {
  engine_type: 'turbofan',
  num_spools: 2,
  bypass_ratio: 3.0,
  fan_pressure_ratio: 1.6,
  fan_efficiency: 0.88,
  overall_pressure_ratio: 10.0,
  lp_pressure_ratio: null,
  ip_pressure_ratio: null,
  hp_pressure_ratio: null,
  tit_max_k: 1200,
  eta_compressor: 0.85,
  eta_turbine: 0.88,
  eta_combustor: 0.99,
  core_mass_flow_kg_s: 1,
  aircraft_mass_kg: 500,
  wing_area_m2: null,
  cl_cruise: 0.4,
  cd_cruise: 0.04,
  cruise_speed_kmh: 500,
  cruise_altitude_m: 200,
  ambient_temperature_override_k: null,
  target_thrust_n: null,
  compute_thrust_from_drag: true,
  auto_size_mass_flow: true,
};

type StatusCallback = (msg: string | null) => void;

interface UseEngineFormReturn {
  formData: CalculateRequest;
  defaults: DefaultsResponse | null;
  updateForm: (updates: Partial<CalculateRequest>, onArchitectureChange?: () => void) => void;
}

export function useEngineForm(onWakeUpStatus?: StatusCallback): UseEngineFormReturn {
  const [formData, setFormData] = useState<CalculateRequest>(DEFAULT_FORM);
  const [defaults, setDefaults] = useState<DefaultsResponse | null>(null);

  useEffect(() => {
    getDefaults(onWakeUpStatus)
      .then(setDefaults)
      .catch(() => {
        // Silently ignore — defaults are optional for the UI to function
      });
  // onWakeUpStatus is a stable setState reference — safe to omit from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateForm = useCallback(
    (updates: Partial<CalculateRequest>, onArchitectureChange?: () => void) => {
      setFormData(prev => ({ ...prev, ...updates }));
      if ('engine_type' in updates || 'num_spools' in updates) {
        onArchitectureChange?.();
      }
    },
    [],
  );

  return { formData, defaults, updateForm };
}
