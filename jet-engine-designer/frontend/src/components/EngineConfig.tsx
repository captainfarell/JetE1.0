import React, { useState } from 'react';
import { Info } from 'lucide-react';
import type { CalculateRequest, DefaultsResponse, EnginePreset } from '../types/engine';

interface Props {
  formData: CalculateRequest;
  onChange: (updates: Partial<CalculateRequest>) => void;
  defaults: DefaultsResponse | null;
}

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

function Tooltip({ text, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className="tooltip-content absolute z-50 left-full ml-2 top-0 w-72 bg-slate-700 border border-slate-500 text-slate-200 text-xs rounded-lg p-3 shadow-xl">
          {text}
        </div>
      )}
    </span>
  );
}

interface FieldLabelProps {
  label: string;
  paramKey?: string;
  defaults: DefaultsResponse | null;
}

function FieldLabel({ label, paramKey, defaults }: FieldLabelProps) {
  const desc = paramKey && defaults ? defaults.parameter_descriptions[paramKey] : null;
  return (
    <label className="flex items-center gap-1 text-sm font-medium text-slate-300 mb-1">
      {label}
      {desc && (
        <Tooltip text={`${desc.description}\n\nTypical: ${desc.typical_range}\n\nTrade-off: ${desc.trade_off}`}>
          <Info size={13} className="text-blue-400 cursor-help" />
        </Tooltip>
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
      <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3 pb-1 border-b border-slate-700">
        {title}
      </h3>
      {children}
    </div>
  );
}

interface InputProps {
  value: number | string;
  onChange: (v: string) => void;
  type?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

function NumberInput({ value, onChange, min, max, step = 0.01, disabled, className = '' }: InputProps) {
  return (
    <input
      type="number"
      className={`w-full bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 ${className}`}
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
    />
  );
}

export default function EngineConfig({ formData, onChange, defaults }: Props) {
  const [autoSplit, setAutoSplit] = useState(true);
  const isTurbofan = formData.engine_type === 'turbofan';

  function applyPreset(preset: EnginePreset) {
    onChange({
      engine_type: preset.engine_type,
      num_spools: preset.num_spools,
      bypass_ratio: preset.bypass_ratio,
      fan_pressure_ratio: preset.fan_pressure_ratio,
      fan_efficiency: preset.fan_efficiency,
      overall_pressure_ratio: preset.overall_pressure_ratio,
      lp_pressure_ratio: preset.lp_pressure_ratio,
      ip_pressure_ratio: preset.ip_pressure_ratio,
      hp_pressure_ratio: preset.hp_pressure_ratio,
      tit_max_k: preset.tit_max_k,
      eta_compressor: preset.eta_compressor,
      eta_turbine: preset.eta_turbine,
      eta_combustor: preset.eta_combustor,
      core_mass_flow_kg_s: preset.core_mass_flow_kg_s,
    });
    setAutoSplit(true);
  }

  return (
    <div>
      {/* Presets */}
      <Section title="Quick Presets">
        <div className="grid grid-cols-2 gap-2">
          {defaults?.engine_presets.map(preset => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              title={preset.description}
              className="text-xs bg-slate-700 hover:bg-blue-700 border border-slate-600 hover:border-blue-500 text-slate-200 rounded-md px-2 py-2 transition-colors text-left"
            >
              <div className="font-semibold">{preset.name}</div>
              <div className="text-slate-400">
                {preset.engine_type === 'turbofan'
                  ? `BPR=${preset.bypass_ratio}, OPR=${preset.overall_pressure_ratio}`
                  : `OPR=${preset.overall_pressure_ratio}`}
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* Architecture */}
      <Section title="Architecture">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel label="Engine Type" paramKey="engine_type" defaults={defaults} />
            <select
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              value={formData.engine_type}
              onChange={e => onChange({ engine_type: e.target.value as 'turbojet' | 'turbofan' })}
            >
              <option value="turbofan">Turbofan</option>
              <option value="turbojet">Turbojet</option>
            </select>
          </div>
          <div>
            <FieldLabel label="Spools" paramKey="num_spools" defaults={defaults} />
            <div className="flex gap-1">
              {([1, 2, 3] as const).map(n => (
                <button
                  key={n}
                  onClick={() => onChange({ num_spools: n })}
                  className={`flex-1 py-2 rounded-md text-sm font-semibold border transition-colors ${
                    formData.num_spools === n
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-blue-500'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isTurbofan && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <FieldLabel label="Bypass Ratio" paramKey="bypass_ratio" defaults={defaults} />
              <NumberInput
                value={formData.bypass_ratio}
                onChange={v => onChange({ bypass_ratio: parseFloat(v) || 0 })}
                min={0}
                max={20}
                step={0.5}
              />
            </div>
            <div>
              <FieldLabel label="Fan PR" paramKey="fan_pressure_ratio" defaults={defaults} />
              <NumberInput
                value={formData.fan_pressure_ratio}
                onChange={v => onChange({ fan_pressure_ratio: parseFloat(v) || 1 })}
                min={1}
                max={3}
                step={0.05}
              />
            </div>
          </div>
        )}
      </Section>

      {/* Pressure Ratios */}
      <Section title="Pressure Ratios">
        <div>
          <FieldLabel label="Overall Pressure Ratio (OPR)" paramKey="overall_pressure_ratio" defaults={defaults} />
          <NumberInput
            value={formData.overall_pressure_ratio}
            onChange={v => onChange({ overall_pressure_ratio: parseFloat(v) || 1 })}
            min={1.5}
            max={60}
            step={0.5}
          />
          <div className="text-xs text-slate-500 mt-1">
            {formData.overall_pressure_ratio < 8 && 'Low OPR — low efficiency'}
            {formData.overall_pressure_ratio >= 8 && formData.overall_pressure_ratio < 20 && 'Moderate OPR — good balance'}
            {formData.overall_pressure_ratio >= 20 && formData.overall_pressure_ratio < 40 && 'High OPR — excellent efficiency'}
            {formData.overall_pressure_ratio >= 40 && 'Very high OPR — check surge margin'}
          </div>
        </div>

        {formData.num_spools >= 2 && (
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="autoSplit"
                checked={autoSplit}
                onChange={e => {
                  setAutoSplit(e.target.checked);
                  if (e.target.checked) {
                    onChange({ lp_pressure_ratio: null, ip_pressure_ratio: null, hp_pressure_ratio: null });
                  }
                }}
                className="accent-blue-500"
              />
              <label htmlFor="autoSplit" className="text-xs text-slate-400">
                Auto-split OPR equally between spools
              </label>
            </div>
            {!autoSplit && (
              <div className={`grid gap-3 ${formData.num_spools === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <div>
                  <FieldLabel label="LP PR" defaults={null} />
                  <NumberInput
                    value={formData.lp_pressure_ratio ?? ''}
                    onChange={v => onChange({ lp_pressure_ratio: parseFloat(v) || null })}
                    min={1}
                    step={0.1}
                  />
                </div>
                {formData.num_spools === 3 && (
                  <div>
                    <FieldLabel label="IP PR" defaults={null} />
                    <NumberInput
                      value={formData.ip_pressure_ratio ?? ''}
                      onChange={v => onChange({ ip_pressure_ratio: parseFloat(v) || null })}
                      min={1}
                      step={0.1}
                    />
                  </div>
                )}
                <div>
                  <FieldLabel label="HP PR" defaults={null} />
                  <NumberInput
                    value={formData.hp_pressure_ratio ?? ''}
                    onChange={v => onChange({ hp_pressure_ratio: parseFloat(v) || null })}
                    min={1}
                    step={0.1}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Temperature & Efficiencies */}
      <Section title="Temperature &amp; Efficiencies">
        <div>
          <FieldLabel label="Turbine Inlet Temp (TIT) [K]" paramKey="tit_max_k" defaults={defaults} />
          <NumberInput
            value={formData.tit_max_k}
            onChange={v => onChange({ tit_max_k: parseFloat(v) || 1000 })}
            min={800}
            max={1800}
            step={10}
          />
          {/* Material selector */}
          {defaults && (
            <div className="mt-2 flex flex-wrap gap-1">
              {defaults.material_tit_ranges.map(mat => (
                <button
                  key={mat.label}
                  title={mat.description}
                  onClick={() => onChange({ tit_max_k: Math.round((mat.t_min_k + mat.t_max_k) / 2) })}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    formData.tit_max_k >= mat.t_min_k && formData.tit_max_k <= mat.t_max_k
                      ? 'bg-amber-700 border-amber-500 text-white'
                      : 'bg-slate-700 border-slate-600 text-slate-400 hover:border-amber-500'
                  }`}
                >
                  {mat.t_min_k}–{mat.t_max_k} K
                </button>
              ))}
            </div>
          )}
          <div className="text-xs text-slate-500 mt-1">
            {defaults?.material_tit_ranges.find(m => formData.tit_max_k >= m.t_min_k && formData.tit_max_k <= m.t_max_k)?.label ?? ''}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <FieldLabel label="Compressor η" paramKey="eta_compressor" defaults={defaults} />
            <NumberInput
              value={formData.eta_compressor}
              onChange={v => onChange({ eta_compressor: parseFloat(v) || 0.85 })}
              min={0.5}
              max={1}
              step={0.01}
            />
          </div>
          <div>
            <FieldLabel label="Turbine η" paramKey="eta_turbine" defaults={defaults} />
            <NumberInput
              value={formData.eta_turbine}
              onChange={v => onChange({ eta_turbine: parseFloat(v) || 0.88 })}
              min={0.5}
              max={1}
              step={0.01}
            />
          </div>
          <div>
            <FieldLabel label="Combustor η" paramKey="eta_combustor" defaults={defaults} />
            <NumberInput
              value={formData.eta_combustor}
              onChange={v => onChange({ eta_combustor: parseFloat(v) || 0.99 })}
              min={0.8}
              max={1}
              step={0.001}
            />
          </div>
          {isTurbofan && (
            <div>
              <FieldLabel label="Fan η" paramKey="fan_efficiency" defaults={defaults} />
              <NumberInput
                value={formData.fan_efficiency}
                onChange={v => onChange({ fan_efficiency: parseFloat(v) || 0.88 })}
                min={0.5}
                max={1}
                step={0.01}
              />
            </div>
          )}
        </div>
      </Section>

      {/* Flow & Size */}
      <Section title="Flow &amp; Size">
        <FieldLabel label="Core Mass Flow [kg/s]" paramKey="core_mass_flow_kg_s" defaults={defaults} />
        <NumberInput
          value={formData.core_mass_flow_kg_s}
          onChange={v => onChange({ core_mass_flow_kg_s: parseFloat(v) || 1 })}
          min={0.1}
          max={1000}
          step={1}
        />
        {formData.engine_type === 'turbofan' && formData.bypass_ratio > 0 && (
          <div className="text-xs text-slate-500 mt-1">
            Total air flow: {(formData.core_mass_flow_kg_s * (1 + formData.bypass_ratio)).toFixed(1)} kg/s
            &nbsp;(bypass: {(formData.core_mass_flow_kg_s * formData.bypass_ratio).toFixed(1)} kg/s)
          </div>
        )}
      </Section>
    </div>
  );
}
