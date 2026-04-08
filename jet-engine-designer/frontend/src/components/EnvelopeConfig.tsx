import React from 'react';
import { Play, Loader } from 'lucide-react';
import type { CalculateRequest } from '../types/engine';

interface Props {
  formData: CalculateRequest;
  loading: boolean;
  onGenerate: (config: EnvelopeConfig) => void;
}

export interface EnvelopeConfig {
  speedMinKmh: number;
  speedMaxKmh: number;
  speedSteps: number;
  altitudeM: number;
  altitudeMinM: number;
  altitudeMaxM: number;
  altitudeSteps: number;
  speedKmh: number;
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-app-secondary whitespace-nowrap w-[45%] shrink-0">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function NumInput({
  value,
  onChange,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      className="w-full bg-app-muted border border-app-border text-app-text rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      value={value}
      min={min}
      max={max}
      step={step ?? 1}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
    />
  );
}

interface SectionProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function Section({ title, subtitle, children }: SectionProps) {
  return (
    <div className="mb-6">
      <div className="mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">{title}</h3>
        <p className="text-xs text-app-secondary mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

export default function EnvelopeConfig({ formData, loading, onGenerate }: Props) {
  const [config, setConfig] = React.useState<EnvelopeConfig>({
    speedMinKmh: 100,
    speedMaxKmh: 900,
    speedSteps: 30,
    altitudeM: formData.cruise_altitude_m,
    altitudeMinM: 0,
    altitudeMaxM: 12000,
    altitudeSteps: 30,
    speedKmh: formData.cruise_speed_kmh,
  });

  // Sync defaults when formData changes
  React.useEffect(() => {
    setConfig(prev => ({
      ...prev,
      altitudeM: formData.cruise_altitude_m,
      speedKmh: formData.cruise_speed_kmh,
    }));
  }, [formData.cruise_altitude_m, formData.cruise_speed_kmh]);

  function set(updates: Partial<EnvelopeConfig>) {
    setConfig(prev => ({ ...prev, ...updates }));
  }

  const estimatedPoints = config.speedSteps + config.altitudeSteps;

  return (
    <div>
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 mb-5 text-xs text-blue-300">
        The envelope sweeps compute engine performance at every combination of speed/altitude,
        calling the full Brayton cycle for each point. Use fewer steps for faster computation.
        <span className="ml-1 font-semibold">Est. {estimatedPoints} calculation points.</span>
      </div>

      <Section
        title="Speed Sweep"
        subtitle="Vary speed at a fixed altitude"
      >
        <div className="space-y-2">
          <FieldRow label="Min Speed [km/h]">
            <NumInput value={config.speedMinKmh} onChange={v => set({ speedMinKmh: v })} min={50} max={2000} step={50} />
          </FieldRow>
          <FieldRow label="Max Speed [km/h]">
            <NumInput value={config.speedMaxKmh} onChange={v => set({ speedMaxKmh: v })} min={100} max={3000} step={50} />
          </FieldRow>
          <FieldRow label="Steps">
            <NumInput value={config.speedSteps} onChange={v => set({ speedSteps: Math.round(v) })} min={5} max={100} step={5} />
          </FieldRow>
          <FieldRow label="Fixed Altitude [m]">
            <NumInput value={config.altitudeM} onChange={v => set({ altitudeM: v })} min={0} max={20000} step={500} />
          </FieldRow>
        </div>
        <div className="text-xs text-app-secondary mt-1 ml-[45%]">Cruise altitude: {formData.cruise_altitude_m} m</div>
      </Section>

      <Section
        title="Altitude Sweep"
        subtitle="Vary altitude at a fixed speed"
      >
        <div className="space-y-2">
          <FieldRow label="Min Altitude [m]">
            <NumInput value={config.altitudeMinM} onChange={v => set({ altitudeMinM: v })} min={0} max={20000} step={500} />
          </FieldRow>
          <FieldRow label="Max Altitude [m]">
            <NumInput value={config.altitudeMaxM} onChange={v => set({ altitudeMaxM: v })} min={500} max={20000} step={500} />
          </FieldRow>
          <FieldRow label="Steps">
            <NumInput value={config.altitudeSteps} onChange={v => set({ altitudeSteps: Math.round(v) })} min={5} max={100} step={5} />
          </FieldRow>
          <FieldRow label="Fixed Speed [km/h]">
            <NumInput value={config.speedKmh} onChange={v => set({ speedKmh: v })} min={50} max={3000} step={50} />
          </FieldRow>
        </div>
        <div className="text-xs text-app-secondary mt-1 ml-[45%]">Cruise speed: {formData.cruise_speed_kmh} km/h</div>
      </Section>

      <button
        onClick={() => onGenerate(config)}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-app-muted disabled:cursor-not-allowed text-app-text font-semibold py-3 rounded-lg transition-colors"
      >
        {loading ? (
          <><Loader size={16} className="animate-spin" /> Computing Envelope...</>
        ) : (
          <><Play size={16} /> Generate Envelope</>
        )}
      </button>
    </div>
  );
}
