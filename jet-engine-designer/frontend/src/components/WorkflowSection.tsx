import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type BadgeKind = 'user' | 'atm' | 'derived' | 'out';

interface IOItem {
  sym: string;
  label: string;
  kind: BadgeKind;
}

interface StepNode {
  id: string;
  station: string;
  title: string;
  subtitle?: string;
  note?: string;
  inputs: IOItem[];
  equations: React.ReactNode[];
  outputs: IOItem[];
}

// ─── Math helpers ─────────────────────────────────────────────────────────────

function Frac({ num, den }: { num: React.ReactNode; den: React.ReactNode }) {
  return (
    <span className="inline-flex flex-col items-center align-middle mx-0.5" style={{ lineHeight: 1.1 }}>
      <span className="border-b border-current px-0.5 leading-tight text-[0.7em]">{num}</span>
      <span className="px-0.5 leading-tight text-[0.7em]">{den}</span>
    </span>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

const KIND_STYLE: Record<BadgeKind, string> = {
  user:    'bg-app-muted text-green-300 border border-green-700/50',
  atm:     'bg-amber-900/50 text-amber-300 border border-amber-700/50',
  derived: 'bg-app-surface text-app-accent border border-app-border',
  out:     'bg-app-raised text-app-text border border-app-border',
};

function Badge({ item }: { item: IOItem }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-mono ${KIND_STYLE[item.kind]}`}>
      <span className="font-semibold">{item.sym}</span>
      <span className="opacity-70 font-sans text-[10px]">{item.label}</span>
    </span>
  );
}

// ─── Connector arrow ──────────────────────────────────────────────────────────

function Arrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-1 select-none">
      <div className="w-px h-3 bg-app-dim" />
      {label && (
        <span className="text-[10px] text-app-dim px-2 py-0.5 rounded bg-app-raised border border-app-border font-mono">
          {label}
        </span>
      )}
      <div className="flex flex-col items-center">
        <div className="w-px h-3 bg-app-dim" />
        <div
          style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid var(--app-dim)' }}
        />
      </div>
    </div>
  );
}

// ─── Step card ────────────────────────────────────────────────────────────────

function StepCard({ step }: { step: StepNode }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-app-raised/50 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <span className="shrink-0 text-[10px] font-mono bg-app-raised border border-app-border text-app-secondary px-2 py-0.5 rounded">
          STA {step.station}
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-app-text">{step.title}</span>
          {step.subtitle && (
            <span className="ml-2 text-xs text-app-secondary">{step.subtitle}</span>
          )}
        </div>
        {step.note && (
          <span className="text-[10px] bg-amber-900/40 text-amber-300 border border-amber-700/40 px-2 py-0.5 rounded shrink-0">
            {step.note}
          </span>
        )}
        {open ? <ChevronDown size={14} className="text-app-dim shrink-0" /> : <ChevronRight size={14} className="text-app-dim shrink-0" />}
      </button>

      {open && (
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-app-border border-t border-app-border">

          {/* Inputs */}
          <div className="p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-app-secondary mb-2">Inputs</p>
            <div className="flex flex-wrap gap-1.5">
              {step.inputs.map((item, i) => <Badge key={i} item={item} />)}
            </div>
          </div>

          {/* Equations */}
          <div className="p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-app-secondary mb-2">Equations</p>
            <div className="space-y-2">
              {step.equations.map((eq, i) => (
                <div key={i} className="text-sm font-mono text-app-text bg-app-raised/60 rounded px-2 py-1.5 leading-relaxed flex items-center flex-wrap gap-x-0.5">
                  {eq}
                </div>
              ))}
            </div>
          </div>

          {/* Outputs */}
          <div className="p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-app-secondary mb-2">Outputs</p>
            <div className="flex flex-wrap gap-1.5">
              {step.outputs.map((item, i) => <Badge key={i} item={item} />)}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// ─── Flow data ────────────────────────────────────────────────────────────────

const STEPS: StepNode[] = [
  {
    id: 'atm',
    station: '0',
    title: 'Atmosphere & Flight Condition',
    subtitle: 'ISA standard atmosphere lookup',
    inputs: [
      { sym: 'h', label: 'altitude [m]', kind: 'user' },
      { sym: 'V', label: 'cruise speed [km/h]', kind: 'user' },
    ],
    equations: [
      <span>T<sub>amb</sub>, p<sub>amb</sub>, ρ = ISA(h)</span>,
      <span>a = √(γ · R · T<sub>amb</sub>)</span>,
      <span>M<sub>0</sub> = <Frac num="V" den="a" /></span>,
    ],
    outputs: [
      { sym: 'T_amb', label: 'static temp [K]', kind: 'out' },
      { sym: 'p_amb', label: 'static press [Pa]', kind: 'out' },
      { sym: 'M₀', label: 'Mach number', kind: 'out' },
    ],
  },
  {
    id: 'intake',
    station: '0→2',
    title: 'Intake',
    subtitle: 'Isentropic ram compression',
    inputs: [
      { sym: 'T_amb', label: 'static temp', kind: 'derived' },
      { sym: 'p_amb', label: 'static press', kind: 'derived' },
      { sym: 'M₀', label: 'Mach number', kind: 'derived' },
    ],
    equations: [
      <span>
        T<sub>t2</sub> = T<sub>amb</sub> · (1 + <Frac num="γ−1" den="2" /> · M<sub>0</sub><sup>2</sup>)
      </span>,
      <span>
        p<sub>t2</sub> = p<sub>amb</sub> · (T<sub>t2</sub> / T<sub>amb</sub>)<sup><Frac num="γ" den="γ−1" /></sup>
      </span>,
    ],
    outputs: [
      { sym: 'Tt2', label: 'total temp [K]', kind: 'out' },
      { sym: 'pt2', label: 'total press [kPa]', kind: 'out' },
    ],
  },
  {
    id: 'fan',
    station: '2→21',
    title: 'Fan',
    subtitle: 'Low-pressure compression of total airflow',
    note: 'turbofan only',
    inputs: [
      { sym: 'Tt2', label: 'inlet total temp', kind: 'derived' },
      { sym: 'pt2', label: 'inlet total press', kind: 'derived' },
      { sym: 'FPR', label: 'fan pressure ratio', kind: 'user' },
      { sym: 'η_fan', label: 'fan efficiency', kind: 'user' },
      { sym: 'BPR', label: 'bypass ratio', kind: 'user' },
    ],
    equations: [
      <span>
        T<sub>t21</sub> = T<sub>t2</sub> · [1 + <Frac num={<span>FPR<sup><Frac num="γ−1" den="γ" /></sup> − 1</span>} den="η_fan" />]
      </span>,
      <span>
        p<sub>t21</sub> = p<sub>t2</sub> · FPR
      </span>,
      <span>
        ṁ<sub>bypass</sub> = BPR · ṁ<sub>core</sub>
      </span>,
    ],
    outputs: [
      { sym: 'Tt21', label: 'fan exit temp [K]', kind: 'out' },
      { sym: 'pt21', label: 'fan exit press [kPa]', kind: 'out' },
      { sym: 'ṁ_bypass', label: 'bypass flow [kg/s]', kind: 'out' },
    ],
  },
  {
    id: 'compressor',
    station: '21→3',
    title: 'Core Compressor(s)',
    subtitle: 'LP / IP / HP stages — OPR split across spools',
    inputs: [
      { sym: 'Tt_in', label: 'spool inlet temp', kind: 'derived' },
      { sym: 'pt_in', label: 'spool inlet press', kind: 'derived' },
      { sym: 'OPR', label: 'overall pressure ratio', kind: 'user' },
      { sym: 'η_c', label: 'compressor efficiency', kind: 'user' },
    ],
    equations: [
      <span>
        PR<sub>HP</sub> = <Frac num="OPR" den="FPR · PR_LP · PR_IP" /> <span className="text-app-secondary font-sans">[auto-split]</span>
      </span>,
      <span>
        T<sub>t,out</sub> = T<sub>t,in</sub> · [1 + <Frac num={<span>PR<sup><Frac num="γ−1" den="γ" /></sup> − 1</span>} den="η_c" />]
      </span>,
      <span>
        p<sub>t,out</sub> = p<sub>t,in</sub> · PR
      </span>,
    ],
    outputs: [
      { sym: 'Tt3', label: 'HP exit temp [K]', kind: 'out' },
      { sym: 'pt3', label: 'HP exit press [kPa]', kind: 'out' },
    ],
  },
  {
    id: 'combustor',
    station: '3→4',
    title: 'Combustor',
    subtitle: 'Fuel addition at constant pressure',
    inputs: [
      { sym: 'Tt3', label: 'compressor exit temp', kind: 'derived' },
      { sym: 'pt3', label: 'compressor exit press', kind: 'derived' },
      { sym: 'TIT', label: 'turbine inlet temp [K]', kind: 'user' },
      { sym: 'η_b', label: 'combustor efficiency', kind: 'user' },
      { sym: 'ṁ_core', label: 'core mass flow', kind: 'user' },
    ],
    equations: [
      <span>
        ṁ<sub>f</sub> · LHV · η<sub>b</sub> = ṁ<sub>core</sub> · c<sub>p</sub> · (T<sub>t4</sub> − T<sub>t3</sub>)
      </span>,
      <span>
        ṁ<sub>f</sub> = <Frac num={<span>ṁ<sub>core</sub> · c<sub>p</sub> · (TIT − T<sub>t3</sub>)</span>} den={<span>LHV · η<sub>b</sub></span>} />
      </span>,
      <span>
        p<sub>t4</sub> ≈ p<sub>t3</sub> <span className="text-app-secondary font-sans">[no pressure loss modelled]</span>
      </span>,
      <span>
        LHV = 43.2 MJ/kg <span className="text-app-secondary font-sans">(Jet-A)</span>
      </span>,
    ],
    outputs: [
      { sym: 'Tt4', label: 'TIT [K]', kind: 'out' },
      { sym: 'pt4', label: 'combustor exit press', kind: 'out' },
      { sym: 'ṁ_f', label: 'fuel flow [kg/s]', kind: 'out' },
    ],
  },
  {
    id: 'turbine',
    station: '4→5(→55)',
    title: 'Turbine(s)',
    subtitle: 'Shaft work extraction — power equals compressor + fan work',
    inputs: [
      { sym: 'Tt4', label: 'TIT', kind: 'derived' },
      { sym: 'pt4', label: 'combustor exit press', kind: 'derived' },
      { sym: 'η_t', label: 'turbine efficiency', kind: 'user' },
      { sym: 'W_c', label: 'compressor work', kind: 'derived' },
    ],
    equations: [
      <span>
        W<sub>turbine</sub> = ṁ<sub>core</sub> · c<sub>p</sub> · ΔT<sub>t,turbine</sub>
      </span>,
      <span>
        W<sub>turbine</sub> = W<sub>compressor</sub> + W<sub>fan</sub> <span className="text-app-secondary font-sans">(turbofan)</span>
      </span>,
      <span>
        p<sub>t,out</sub> = p<sub>t,in</sub> · (1 − <Frac num="ΔT_t" den={<span>η<sub>t</sub> · T<sub>t,in</sub></span>} />)<sup><Frac num="γ" den="γ−1" /></sup>
      </span>,
    ],
    outputs: [
      { sym: 'Tt45', label: 'HP turbine exit [K]', kind: 'out' },
      { sym: 'Tt5', label: 'LP turbine exit [K]', kind: 'out' },
      { sym: 'pt5', label: 'LP turbine exit press', kind: 'out' },
    ],
  },
  {
    id: 'nozzle',
    station: '5→9  /  21→19',
    title: 'Nozzle(s)',
    subtitle: 'Converging nozzle — choked or unchoked',
    inputs: [
      { sym: 'Tt5', label: 'core total temp', kind: 'derived' },
      { sym: 'pt5', label: 'core total press', kind: 'derived' },
      { sym: 'Tt21', label: 'bypass total temp', kind: 'derived' },
      { sym: 'pt21', label: 'bypass total press', kind: 'derived' },
      { sym: 'p_amb', label: 'ambient pressure', kind: 'derived' },
    ],
    equations: [
      <span>
        PR<sub>crit</sub> = (<Frac num="γ+1" den="2" />)<sup><Frac num="γ" den="γ−1" /></sup> ≈ 1.893
      </span>,
      <span>
        choked if <Frac num="p_t" den="p_amb" /> ≥ PR<sub>crit</sub>
      </span>,
      <span>
        v<sub>j</sub> = √(2 · c<sub>p</sub> · T<sub>t</sub> · [1 − (<Frac num="p_amb" den="p_t" />)<sup><Frac num="γ−1" den="γ" /></sup>])
      </span>,
    ],
    outputs: [
      { sym: 'vj_core', label: 'core jet velocity [m/s]', kind: 'out' },
      { sym: 'vj_byp', label: 'bypass jet vel [m/s]', kind: 'out' },
    ],
  },
  {
    id: 'thrust',
    station: '—',
    title: 'Thrust & Performance',
    subtitle: 'Net thrust, TSFC, propulsive efficiency',
    inputs: [
      { sym: 'ṁ_core', label: 'core mass flow', kind: 'user' },
      { sym: 'ṁ_bypass', label: 'bypass mass flow', kind: 'derived' },
      { sym: 'vj_core', label: 'core jet velocity', kind: 'derived' },
      { sym: 'vj_byp', label: 'bypass jet velocity', kind: 'derived' },
      { sym: 'V₀', label: 'flight velocity [m/s]', kind: 'derived' },
      { sym: 'ṁ_f', label: 'fuel flow', kind: 'derived' },
    ],
    equations: [
      <span>
        F<sub>net</sub> = ṁ<sub>core</sub> · (v<sub>j,core</sub> − V<sub>0</sub>) + ṁ<sub>bypass</sub> · (v<sub>j,byp</sub> − V<sub>0</sub>)
      </span>,
      <span>
        TSFC = <Frac num="ṁ_f" den={<span>F<sub>net</sub></span>} /> <span className="text-app-secondary font-sans">[kg/(N·h)]</span>
      </span>,
      <span>
        η<sub>p</sub> = <Frac num={<span>2 · V<sub>0</sub> · F<sub>net</sub></span>} den={<span>Σ (ṁ · v<sub>j</sub><sup>2</sup> − ṁ · V<sub>0</sub><sup>2</sup>)</span>} />
      </span>,
    ],
    outputs: [
      { sym: 'F_net', label: 'net thrust [N]', kind: 'out' },
      { sym: 'TSFC', label: 'specific fuel consump.', kind: 'out' },
      { sym: 'η_p', label: 'propulsive efficiency', kind: 'out' },
    ],
  },
];

// ─── Legend ───────────────────────────────────────────────────────────────────

const LEGEND: { kind: BadgeKind; label: string }[] = [
  { kind: 'user',    label: 'User input' },
  { kind: 'atm',    label: 'Atmosphere / ISA lookup' },
  { kind: 'derived', label: 'Passed from previous step' },
  { kind: 'out',    label: 'Calculated output' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function WorkflowSection() {
  return (
    <div className="space-y-4">

      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-app-text mb-1">Calculation Workflow</h2>
        <p className="text-sm text-app-secondary">
          Step-by-step state flow through the Brayton cycle. Each stage shows what inputs it
          consumes, which equation transforms them, and what values it passes downstream.
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-app-border">
        {LEGEND.map(({ kind, label }) => (
          <Badge key={kind} item={{ sym: '', label, kind }} />
        ))}
      </div>

      {/* Flow */}
      <div className="space-y-0">
        {STEPS.map((step, i) => (
          <React.Fragment key={step.id}>
            <StepCard step={step} />
            {i < STEPS.length - 1 && (
              <Arrow label={
                step.id === 'atm'        ? 'T_amb · p_amb · M₀' :
                step.id === 'intake'     ? 'Tt2 · pt2' :
                step.id === 'fan'        ? 'Tt21 · pt21 · ṁ_bypass' :
                step.id === 'compressor' ? 'Tt3 · pt3' :
                step.id === 'combustor'  ? 'Tt4 · pt4 · ṁ_f' :
                step.id === 'turbine'    ? 'Tt5 · pt5' :
                step.id === 'nozzle'     ? 'vj_core · vj_bypass' :
                undefined
              } />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-xs text-app-dim pt-2 border-t border-app-border">
        Constants: γ = 1.4 · c<sub>p</sub> = 1005 J/(kg·K) · R = 287.058 J/(kg·K) · LHV = 43.2 MJ/kg (Jet-A) ·
        Axial stage ΔPR = 1.3 · No combustor pressure loss · Isentropic intake · Converging nozzle only
      </p>

    </div>
  );
}
