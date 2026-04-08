import React, { useMemo } from 'react';
import { Info } from 'lucide-react';
import type { CalculateRequest, DefaultsResponse } from '../types/engine';

interface Props {
  formData: CalculateRequest;
  onChange: (updates: Partial<CalculateRequest>) => void;
  defaults: DefaultsResponse | null;
}

// ISA temperature at altitude (simplified for display)
function isaTemp(altM: number): number {
  const T0 = 288.15, L = 0.0065;
  if (altM <= 11000) return T0 - L * altM;
  return 216.65;
}

interface FieldLabelProps {
  label: string;
  tooltip?: string;
  defaults?: DefaultsResponse | null;
  paramKey?: string;
}

function FieldLabel({ label, tooltip, defaults, paramKey }: FieldLabelProps) {
  const [visible, setVisible] = React.useState(false);
  const desc = paramKey && defaults ? defaults.parameter_descriptions[paramKey] : null;
  const tip = tooltip ?? (desc ? `${desc.description}\n\nTypical: ${desc.typical_range}` : null);

  return (
    <label className="flex items-center gap-1 text-sm font-medium text-app-text mb-1">
      {label}
      {tip && (
        <span
          className="relative inline-block"
          onMouseEnter={() => setVisible(true)}
          onMouseLeave={() => setVisible(false)}
        >
          <Info size={13} className="text-blue-400 cursor-help" />
          {visible && (
            <div className="tooltip-content absolute z-50 left-full ml-2 top-0 w-72 bg-app-muted border border-app-secondary text-app-text text-xs rounded-lg p-3 shadow-xl whitespace-pre-line">
              {tip}
            </div>
          )}
        </span>
      )}
    </label>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="mb-5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3 pb-1 border-b border-app-border">
        {title}
      </h3>
      {children}
    </div>
  );
}

function NumInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled,
}: {
  value: number | string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      className="w-full bg-app-muted border border-app-border text-app-text rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
    />
  );
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

  return (
    <div>
      {/* Aircraft */}
      <Section title="Aircraft">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel label="Aircraft Mass [kg]" paramKey="aircraft_mass_kg" defaults={defaults} />
            <NumInput
              value={formData.aircraft_mass_kg}
              onChange={v => onChange({ aircraft_mass_kg: parseFloat(v) || 1000 })}
              min={100}
              max={600000}
              step={100}
            />
          </div>
          <div>
            <FieldLabel label="Wing Area [m²]" tooltip="Optional. If provided, enables dynamic-pressure-based drag calculation." />
            <NumInput
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
            <NumInput
              value={formData.cl_cruise}
              onChange={v => onChange({ cl_cruise: parseFloat(v) || 0.1 })}
              min={0.05}
              max={2}
              step={0.01}
            />
          </div>
          <div>
            <FieldLabel label="CD cruise" paramKey="cd_cruise" defaults={defaults} />
            <NumInput
              value={formData.cd_cruise}
              onChange={v => onChange({ cd_cruise: parseFloat(v) || 0.01 })}
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
      </Section>

      {/* Flight Condition */}
      <Section title="Flight Condition">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel label="Cruise Speed [km/h]" paramKey="cruise_speed_kmh" defaults={defaults} />
            <NumInput
              value={formData.cruise_speed_kmh}
              onChange={v => onChange({ cruise_speed_kmh: parseFloat(v) || 100 })}
              min={50}
              max={3000}
              step={10}
            />
            <div className="text-xs text-app-secondary mt-1">
              ≈ {(formData.cruise_speed_kmh / 3.6).toFixed(0)} m/s
            </div>
          </div>
          <div>
            <FieldLabel label="Cruise Altitude [m]" paramKey="cruise_altitude_m" defaults={defaults} />
            <NumInput
              value={formData.cruise_altitude_m}
              onChange={v => onChange({ cruise_altitude_m: parseFloat(v) || 0 })}
              min={0}
              max={20000}
              step={100}
            />
            <div className="text-xs text-app-secondary mt-1">
              ISA T = {isaT.toFixed(1)} K ({(isaT - 273.15).toFixed(1)} °C)
            </div>
          </div>
        </div>

        <div className="mt-3">
          <FieldLabel
            label="Ambient Temp Override [K]"
            tooltip="Override the ISA ambient temperature. Leave empty to use standard ISA."
          />
          <div className="flex gap-2 items-center">
            <NumInput
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
            <div className="text-xs text-app-secondary mt-1">Using ISA: {isaT.toFixed(1)} K</div>
          )}
        </div>
      </Section>

      {/* Thrust Target */}
      <Section title="Thrust Requirement">
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
            <NumInput
              value={formData.target_thrust_n ?? ''}
              onChange={v => onChange({ target_thrust_n: parseFloat(v) || null })}
              min={0}
              step={100}
            />
          </div>
        )}

        {formData.compute_thrust_from_drag && estimatedDrag && (
          <div className="mt-2 text-xs text-blue-400 bg-blue-900/20 rounded-md p-2">
            Required thrust at cruise: ~{estimatedDrag} N per engine
          </div>
        )}
      </Section>
    </div>
  );
}
