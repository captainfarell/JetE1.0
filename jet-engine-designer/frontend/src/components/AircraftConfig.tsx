import React, { useMemo } from 'react';
import type { CalculateRequest, DefaultsResponse } from '../types/engine';
import { FieldLabel, NumberInput, SectionHeader } from './shared';

interface Props {
  formData: CalculateRequest;
  onChange: (updates: Partial<CalculateRequest>) => void;
  defaults: DefaultsResponse | null;
}

// ISA temperature at altitude
function isaTemp(altM: number): number {
  const T0 = 288.15, L = 0.0065;
  if (altM <= 11000) return T0 - L * altM;
  return 216.65;
}

// ISA pressure at altitude (Pa) — matches atmosphere.py
function isaPress(altM: number): number {
  const P0 = 101325, T0 = 288.15, L = 0.0065, R = 287.058, g = 9.80665;
  if (altM <= 11000) return P0 * Math.pow(1 - (L * altM) / T0, g / (R * L));
  const P11 = P0 * Math.pow(1 - (L * 11000) / T0, g / (R * L));
  return P11 * Math.exp(-g * (altM - 11000) / (R * 216.65));
}

export default function AircraftConfig({ formData, onChange, defaults }: Props) {
  const ld = useMemo(() => {
    if (formData.cd_cruise > 0) return (formData.cl_cruise / formData.cd_cruise).toFixed(1);
    return '—';
  }, [formData.cl_cruise, formData.cd_cruise]);

  const estimatedDrag = useMemo(() => {
    if (formData.compute_thrust_from_drag) {
      return (formData.aircraft_mass_kg * 9.80665 * formData.cd_cruise / formData.cl_cruise).toFixed(0);
    }
    return null;
  }, [formData]);

  const isaT = isaTemp(formData.cruise_altitude_m);
  const isaP = isaPress(formData.cruise_altitude_m);

  return (
    <div>
      {/* Aircraft */}
      <div className="mb-5">
        <SectionHeader title="Aircraft" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel label="Aircraft Mass [kg]" paramKey="aircraft_mass_kg" defaults={defaults} />
            <NumberInput
              value={formData.aircraft_mass_kg}
              onChange={v => onChange({ aircraft_mass_kg: isNaN(parseFloat(v)) ? 1000 : parseFloat(v) })}
              min={100}
              max={575000}
              step={100}
            />
          </div>
          <div>
            <FieldLabel label="Wing Area [m²]" tooltip="Optional. If provided, enables dynamic-pressure-based drag calculation." />
            <NumberInput
              value={formData.wing_area_m2 ?? ''}
              onChange={v => {
                const n = parseFloat(v);
                onChange({ wing_area_m2: isNaN(n) || v === '' ? null : n });
              }}
              min={1}
              step={1}
            />
          </div>
          <div>
            <FieldLabel label="CL cruise" paramKey="cl_cruise" defaults={defaults} />
            <NumberInput
              value={formData.cl_cruise}
              onChange={v => onChange({ cl_cruise: isNaN(parseFloat(v)) ? 0.1 : parseFloat(v) })}
              min={0.05}
              max={2}
              step={0.01}
            />
          </div>
          <div>
            <FieldLabel label="CD cruise" paramKey="cd_cruise" defaults={defaults} />
            <NumberInput
              value={formData.cd_cruise}
              onChange={v => onChange({ cd_cruise: isNaN(parseFloat(v)) ? 0.01 : parseFloat(v) })}
              min={0.005}
              max={0.5}
              step={0.001}
            />
          </div>
        </div>
        <div className="mt-2 flex gap-4 text-xs text-app-secondary bg-app-muted/50 rounded-md p-2">
          <span>L/D = <strong className="text-app-text">{ld}</strong></span>
          {estimatedDrag && (
            <span>Estimated cruise drag = <strong className="text-app-text">{estimatedDrag} N</strong></span>
          )}
        </div>
      </div>

      {/* Flight Condition */}
      <div className="mb-5">
        <SectionHeader title="Flight Condition" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel label="Cruise Speed [km/h]" paramKey="cruise_speed_kmh" defaults={defaults} />
            <div className="flex items-center gap-2">
              <NumberInput
                value={formData.cruise_speed_kmh}
                onChange={v => onChange({ cruise_speed_kmh: isNaN(parseFloat(v)) ? 100 : parseFloat(v) })}
                min={50}
                max={3000}
                step={10}
              />
              <span className="text-xs text-app-secondary whitespace-nowrap">≈ {(formData.cruise_speed_kmh / 3.6).toFixed(0)} m/s</span>
            </div>
          </div>
          <div>
            <FieldLabel label="Cruise Altitude [m]" paramKey="cruise_altitude_m" defaults={defaults} />
            <div className="flex items-center gap-2">
              <NumberInput
                value={formData.cruise_altitude_m}
                onChange={v => onChange({ cruise_altitude_m: parseFloat(v) || 0 })}
                min={0}
                max={20000}
                step={100}
              />
              <span className="text-xs text-app-secondary whitespace-nowrap">ISA {isaT.toFixed(1)} K · {(isaP / 1000).toFixed(2)} kPa</span>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <FieldLabel
            label="Ambient Temp Override [K]"
            tooltip="Override the ISA ambient temperature. Leave empty to use standard ISA."
          />
          <div className="flex gap-2 items-center">
            <NumberInput
              value={formData.ambient_temperature_override_k ?? ''}
              onChange={v => {
                const n = parseFloat(v);
                onChange({ ambient_temperature_override_k: isNaN(n) || v === '' ? null : n });
              }}
              min={150}
              max={350}
              step={1}
            />
            {formData.ambient_temperature_override_k !== null && (
              <button
                onClick={() => onChange({ ambient_temperature_override_k: null })}
                className="text-xs text-app-secondary hover:text-red-400 whitespace-nowrap"
              >
                Reset to ISA
              </button>
            )}
          </div>
          {formData.ambient_temperature_override_k === null && (
            <div className="text-xs text-app-secondary mt-1">Using ISA: {isaT.toFixed(1)} K · {(isaP / 1000).toFixed(2)} kPa</div>
          )}
        </div>
      </div>

      {/* Thrust Target */}
      <div className="mb-5">
        <SectionHeader title="Thrust Requirement" />
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="thrustMode"
              checked={formData.compute_thrust_from_drag}
              onChange={() => onChange({ compute_thrust_from_drag: true, target_thrust_n: null })}
              className="accent-blue-500"
            />
            <span className="text-sm text-app-text">Compute from aircraft drag (L/D method)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="thrustMode"
              checked={!formData.compute_thrust_from_drag}
              onChange={() => onChange({ compute_thrust_from_drag: false })}
              className="accent-blue-500"
            />
            <span className="text-sm text-app-text">Specify target thrust manually</span>
          </label>
        </div>

        {!formData.compute_thrust_from_drag && (
          <div className="mt-3">
            <FieldLabel label="Target Thrust [N]" />
            <NumberInput
              value={formData.target_thrust_n ?? ''}
              onChange={v => onChange({ target_thrust_n: parseFloat(v) || null })}
              min={0}
              step={100}
            />
          </div>
        )}

        {formData.compute_thrust_from_drag && estimatedDrag && (
          <div className="mt-2 text-xs text-app-accent bg-app-surface rounded-md p-2">
            Required thrust at cruise: ~{estimatedDrag} N per engine
          </div>
        )}
      </div>
    </div>
  );
}
