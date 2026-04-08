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
  note?: string;        // e.g. "turbofan only"
  inputs: IOItem[];
  equations: string[];
  outputs: IOItem[];
}

// ─── Badge ────────────────────────────────────────────────────────────────────

const KIND_STYLE: Record<BadgeKind, string> = {
  user:    'bg-green-900/50 text-green-300 border border-green-700/50',
  atm:     'bg-amber-900/50 text-amber-300 border border-amber-700/50',
  derived: 'bg-blue-900/40 text-blue-300 border border-blue-700/40',
  out:     'bg-purple-900/40 text-purple-300 border border-purple-700/40',
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
            <div className="space-y-1.5">
              {step.equations.map((eq, i) => (
                <div key={i} className="text-xs font-mono text-blue-300 bg-app-raised/60 rounded px-2 py-1 leading-relaxed">
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
      'T_amb, p_amb, ρ = ISA(h)',
      'a = √(γ·R·T_amb)',
      'M₀ = V / a',
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
      'Tt2 = T_amb·(1 + (γ−1)/2·M₀²)',
      'pt2 = p_amb·(Tt2/T_amb)^(γ/(γ−1))',
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
      'Tt21 = Tt2·[1 + (FPR^((γ−1)/γ) − 1) / η_fan]',
      'pt21 = pt2 · FPR',
      'ṁ_bypass = BPR · ṁ_core',
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
      'PR_HP = OPR / (FPR · PR_LP · PR_IP)  [auto-split]',
      'Tt_out = Tt_in·[1 + (PR^((γ−1)/γ) − 1) / η_c]',
      'pt_out = pt_in · PR',
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
      'ṁ_f·LHV·η_b = ṁ_core·cp·(Tt4 − Tt3)',
      'ṁ_f = ṁ_core·cp·(TIT − Tt3) / (LHV·η_b)',
      'pt4 ≈ pt3  [no pressure loss modelled]',
      'LHV = 43.2 MJ/kg  (Jet-A)',
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
      'W_turbine = ṁ_core·cp·ΔTt_turbine',
      'W_turbine = W_compressor (+ W_fan for turbofan)',
      'pt_out = pt_in·[1 − ΔTt/(η_t·Tt_in)]^(γ/(γ−1))',
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
      'PR_crit = ((γ+1)/2)^(γ/(γ−1)) ≈ 1.893',
      'choked if pt/p_amb ≥ PR_crit',
      'vj = √(2·cp·Tt·[1 − (p_amb/pt)^((γ−1)/γ)])',
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
      'F_net = ṁ_core·(vj_core−V₀) + ṁ_bypass·(vj_byp−V₀)',
      'TSFC = ṁ_f / F_net  [kg/(N·h)]',
      'η_p = 2V₀·F_net / Σ(ṁ·vj²−ṁ·V₀²)',
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
                step.id === 'atm'     ? 'T_amb · p_amb · M₀' :
                step.id === 'intake'  ? 'Tt2 · pt2' :
                step.id === 'fan'     ? 'Tt21 · pt21 · ṁ_bypass' :
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
        Constants: γ = 1.4 · cp = 1005 J/(kg·K) · R = 287.058 J/(kg·K) · LHV = 43.2 MJ/kg (Jet-A) ·
        Axial stage ΔPR = 1.3 · No combustor pressure loss · Isentropic intake · Converging nozzle only
      </p>

    </div>
  );
}
