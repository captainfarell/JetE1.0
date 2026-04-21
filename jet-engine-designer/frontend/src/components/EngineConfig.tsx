import React, { useState } from 'react';
import type { CalculateRequest, DefaultsResponse, EnginePreset } from '../types/engine';
import { FieldLabel, NumberInput, SectionHeader } from './shared';

interface Props {
  formData: CalculateRequest;
  onChange: (updates: Partial<CalculateRequest>) => void;
  defaults: DefaultsResponse | null;
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
      {/* Architecture */}
      <div className="mb-5">
        <SectionHeader title="Architecture" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel label="Engine Type" paramKey="engine_type" defaults={defaults} />
            <select
              className="w-full bg-app-muted border border-app-border text-app-text rounded-md px-3 py-2 text-sm focus:outline-none focus:border-app-accent"
              value={formData.engine_type}
              onChange={e => {
                const t = e.target.value as 'turbojet' | 'turbofan';
                onChange({
                  engine_type: t,
                  ...(t === 'turbofan' && formData.num_spools === 1 ? { num_spools: 2 } : {}),
                  ...(t === 'turbojet' && formData.num_spools === 3 ? { num_spools: 2 } : {}),
                });
              }}
            >
              <option value="turbofan">Turbofan</option>
              <option value="turbojet">Turbojet</option>
            </select>
          </div>
          <div>
            <FieldLabel label="Spools" paramKey="num_spools" defaults={defaults} />
            <div className="flex gap-1">
              {([1, 2, 3] as const).map(n => {
                const disabled = (isTurbofan && n === 1) || (!isTurbofan && n === 3);
                return (
                  <button
                    key={n}
                    onClick={() => !disabled && onChange({ num_spools: n })}
                    disabled={disabled}
                    title={disabled ? 'No commercial production examples' : undefined}
                    className={`flex-1 py-2 rounded-md text-sm font-semibold border transition-colors ${
                      formData.num_spools === n && !disabled
                        ? 'bg-app-accent/20 border-app-accent text-app-accent'
                        : disabled
                        ? 'bg-app-surface border-app-border text-app-dim cursor-not-allowed'
                        : 'spool-btn bg-app-muted border-app-border text-app-text'
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            {(() => {
              const key = `${formData.engine_type}-${formData.num_spools}`;
              const examples: Record<string, string[]> = {
                'turbojet-1': ['de Havilland Ghost', 'General Electric CJ610', 'JetCat P200', 'Microturbo TRI 60'],
                'turbojet-2': ['Pratt & Whitney JT3C', 'Bristol Siddeley Olympus 593', 'General Electric J79 (Civilian CJ805-3)'],
                'turbofan-2': ['CFM56', 'General Electric GE90', 'GEnx', 'Williams FJ44'],
                'turbofan-3': ['Rolls-Royce RB211', 'Rolls-Royce Trent 1000', 'Progress D-18T', 'Garrett ATF3'],
              };
              const list = examples[key];
              const isDisabled = (isTurbofan && formData.num_spools === 1) || (!isTurbofan && formData.num_spools === 3);
              if (isDisabled) {
                return <div className="text-xs text-app-secondary mt-1">{isTurbofan ? '1-spool' : '3-spool'} not available — no commercial production examples</div>;
              }
              if (list) {
                return <div className="text-xs text-app-secondary mt-1"><span className="text-app-dim">Examples: </span>{list.join(' · ')}</div>;
              }
              return null;
            })()}
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
                onChange={v => onChange({ fan_pressure_ratio: isNaN(parseFloat(v)) ? 1 : parseFloat(v) })}
                min={1}
                max={3}
                step={0.05}
              />
            </div>
          </div>
        )}
      </div>

      {/* Pressure Ratios */}
      <div className="mb-5">
        <SectionHeader title="Pressure Ratios" />
        <div>
          <FieldLabel label="Overall Pressure Ratio (OPR)" paramKey="overall_pressure_ratio" defaults={defaults} />
          <NumberInput
            value={formData.overall_pressure_ratio}
            onChange={v => onChange({ overall_pressure_ratio: isNaN(parseFloat(v)) ? 1 : parseFloat(v) })}
            min={1.5}
            max={60}
            step={0.5}
          />
          <div className="text-xs text-app-secondary mt-1">
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
              <label htmlFor="autoSplit" className="text-xs text-app-secondary">
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
      </div>

      {/* Temperature */}
      <div className="mb-5">
        <SectionHeader title="Temperature" />
        <div>
          <FieldLabel label="Turbine Inlet Temp (TIT) [K]" paramKey="tit_max_k" defaults={defaults} />
          <NumberInput
            value={formData.tit_max_k}
            onChange={v => onChange({ tit_max_k: isNaN(parseFloat(v)) ? 1000 : parseFloat(v) })}
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
                      ? 'bg-amber-700 border-amber-500 text-app-text'
                      : 'bg-app-muted border-app-border text-app-secondary hover:border-amber-500'
                  }`}
                >
                  {mat.t_min_k}–{mat.t_max_k} K
                </button>
              ))}
            </div>
          )}
          <div className="text-xs text-app-secondary mt-1">
            {defaults?.material_tit_ranges.find(m => formData.tit_max_k >= m.t_min_k && formData.tit_max_k <= m.t_max_k)?.label ?? ''}
          </div>
        </div>

        {/* Throttle */}
        <div className="mt-4">
          <FieldLabel label="Operating Throttle" tooltip="Fraction of max TIT and (OPR−1) used for this calculation. 1.0 = max thrust / takeoff, 0.8 = typical cruise." />
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0.1}
              max={1.0}
              step={0.01}
              value={formData.throttle_fraction}
              onChange={e => onChange({ throttle_fraction: parseFloat(e.target.value) })}
              className="flex-1 accent-app-accent"
            />
            <span className="text-sm font-bold text-app-text w-12 text-right">
              {(formData.throttle_fraction * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-xs text-app-secondary mt-1">
            TIT&nbsp;=&nbsp;{(formData.throttle_fraction * formData.tit_max_k).toFixed(0)}&nbsp;K
            &nbsp;·&nbsp;Eff. OPR&nbsp;=&nbsp;{(1 + (formData.overall_pressure_ratio - 1) * formData.throttle_fraction).toFixed(1)}
          </div>
        </div>
      </div>

      {/* Flow & Size */}
      <div className="mb-5">
        <SectionHeader title="Flow &amp; Size" />
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            id="autoSizeMassFlow"
            checked={formData.auto_size_mass_flow}
            onChange={e => onChange({ auto_size_mass_flow: e.target.checked })}
            className="accent-blue-500"
          />
          <label htmlFor="autoSizeMassFlow" className="text-xs text-app-secondary">
            Auto-size from thrust requirement
          </label>
        </div>
        <FieldLabel label="Core Mass Flow [kg/s]" paramKey="core_mass_flow_kg_s" defaults={defaults} />
        <NumberInput
          value={formData.core_mass_flow_kg_s}
          onChange={v => onChange({ core_mass_flow_kg_s: isNaN(parseFloat(v)) ? 1 : parseFloat(v) })}
          min={0.1}
          max={1000}
          step={1}
          disabled={formData.auto_size_mass_flow}
        />
        {formData.auto_size_mass_flow && !(formData.compute_thrust_from_drag || formData.target_thrust_n !== null) && (
          <div className="text-xs text-yellow-400 mt-1">⚠ No thrust target set — go to Aircraft tab and set a thrust requirement, or enable "Compute from drag".</div>
        )}
        {!formData.auto_size_mass_flow && formData.engine_type === 'turbofan' && formData.bypass_ratio > 0 && (
          <div className="text-xs text-app-secondary mt-1">
            Total air flow: {(formData.core_mass_flow_kg_s * (1 + formData.bypass_ratio)).toFixed(1)} kg/s
            &nbsp;(bypass: {(formData.core_mass_flow_kg_s * formData.bypass_ratio).toFixed(1)} kg/s)
          </div>
        )}
      </div>
    </div>
  );
}
