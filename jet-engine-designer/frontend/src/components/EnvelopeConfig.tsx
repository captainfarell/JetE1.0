import React from 'react';
import { Play, Loader } from 'lucide-react';
import type { CalculateRequest } from '../types/engine';
import { NumberInput } from './shared';

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

interface SectionProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function Section({ title, subtitle, children }: SectionProps) {
  return (
    <div className="mb-6">
      <div className="mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-app-accent">{title}</h3>
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
      <div className="bg-app-raised border border-app-border rounded-lg p-3 mb-5 text-xs text-app-secondary">
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
            <NumberInput value={config.speedMinKmh} onChange={v => set({ speedMinKmh: parseFloat(v) || 0 })} min={50} max={2000} step={50} />
          </FieldRow>
          <FieldRow label="Max Speed [km/h]">
            <NumberInput value={config.speedMaxKmh} onChange={v => set({ speedMaxKmh: parseFloat(v) || 0 })} min={100} max={3000} step={50} />
          </FieldRow>
          <FieldRow label="Steps">
            <NumberInput value={config.speedSteps} onChange={v => set({ speedSteps: Math.round(parseFloat(v) || 0) })} min={5} max={100} step={5} />
          </FieldRow>
          <FieldRow label="Fixed Altitude [m]">
            <NumberInput value={config.altitudeM} onChange={v => set({ altitudeM: parseFloat(v) || 0 })} min={0} max={20000} step={500} />
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
            <NumberInput value={config.altitudeMinM} onChange={v => set({ altitudeMinM: parseFloat(v) || 0 })} min={0} max={20000} step={500} />
          </FieldRow>
          <FieldRow label="Max Altitude [m]">
            <NumberInput value={config.altitudeMaxM} onChange={v => set({ altitudeMaxM: parseFloat(v) || 0 })} min={500} max={20000} step={500} />
          </FieldRow>
          <FieldRow label="Steps">
            <NumberInput value={config.altitudeSteps} onChange={v => set({ altitudeSteps: Math.round(parseFloat(v) || 0) })} min={5} max={100} step={5} />
          </FieldRow>
          <FieldRow label="Fixed Speed [km/h]">
            <NumberInput value={config.speedKmh} onChange={v => set({ speedKmh: parseFloat(v) || 0 })} min={50} max={3000} step={50} />
          </FieldRow>
        </div>
        <div className="text-xs text-app-secondary mt-1 ml-[45%]">Cruise speed: {formData.cruise_speed_kmh} km/h</div>
      </Section>

      <button
        onClick={() => onGenerate(config)}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-btn-primary hover:bg-btn-primary-hover disabled:bg-app-muted disabled:cursor-not-allowed text-btn-primary-text font-semibold py-3 rounded-lg transition-colors"
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
