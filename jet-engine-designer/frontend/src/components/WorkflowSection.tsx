import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type BadgeKind = 'user' | 'atm' | 'derived' | 'out';

interface IOItem {
  sym: string;
  label: string;
  kind: BadgeKind;
}

interface EqItem {
  eq: React.ReactNode;
  label?: string;
}

interface SymDef {
  sym: string;
  meaning: string;
  unit?: string;
}

interface StepNode {
  id: string;
  station: string;
  title: string;
  subtitle?: string;
  note?: string;
  inputs: IOItem[];
  equations: EqItem[];
  symbols?: SymDef[];
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
      {item.sym && <span className="font-semibold">{item.sym}</span>}
      {item.label && <span className="opacity-70 font-sans text-[10px]">{item.label}</span>}
    </span>
  );
}

// ─── Connector arrow ──────────────────────────────────────────────────────────

function Arrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-1 select-none">
      <div className="w-px h-3 bg-app-dim" />
      {label && (
        <span className="text-xs text-app-dim px-2 py-0.5 rounded bg-app-raised border border-app-border font-mono">
          {label}
        </span>
      )}
      <div className="flex flex-col items-center">
        <div className="w-px h-3 bg-app-dim" />
        <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid rgb(var(--app-dim))' }} />
      </div>
    </div>
  );
}

// ─── Step card ────────────────────────────────────────────────────────────────

function StepCard({ step, stepNum, open, onToggle }: {
  step: StepNode;
  stepNum: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-app-raised/50 transition-colors"
        onClick={onToggle}
      >
        <span className="shrink-0 text-xs font-mono bg-app-accent/20 border border-app-accent/40 text-app-accent px-2 py-0.5 rounded tabular-nums">
          {String(stepNum).padStart(2, '0')}
        </span>
        <span className="shrink-0 text-xs font-mono bg-app-raised border border-app-border text-app-dim px-2 py-0.5 rounded">
          STA {step.station}
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-app-text">{step.title}</span>
          {step.subtitle && (
            <span className="ml-2 text-xs text-app-secondary">{step.subtitle}</span>
          )}
        </div>
        {step.note && (
          <span className="text-xs bg-amber-900/40 text-amber-300 border border-amber-700/40 px-2 py-0.5 rounded shrink-0">
            {step.note}
          </span>
        )}
        {open
          ? <ChevronDown size={14} className="text-app-dim shrink-0" />
          : <ChevronRight size={14} className="text-app-dim shrink-0" />}
      </button>

      {open && (
        <div
          className="grid grid-cols-1 md:divide-x divide-y md:divide-y-0 divide-app-border border-t border-app-border"
          style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,2.5fr) minmax(0,1fr)' }}
        >
          {/* Inputs */}
          <div className="p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-app-secondary mb-2">Inputs</p>
            <div className="flex flex-wrap gap-1.5">
              {step.inputs.map((item, i) => <Badge key={i} item={item} />)}
            </div>
          </div>

          {/* Equations */}
          <div className="p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-app-secondary mb-2">Equations</p>
            <div className="space-y-1.5">
              {step.equations.map((eq, i) => (
                <div key={i} className="bg-app-raised/60 rounded overflow-hidden">
                  {eq.label && (
                    <div className="text-[10px] font-sans uppercase tracking-wider text-app-dim px-2 pt-1.5 leading-none">
                      {eq.label}
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <div className="text-sm font-mono text-app-text px-2 py-1.5 leading-relaxed whitespace-nowrap">
                      {eq.eq}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Per-step symbol glossary */}
            {step.symbols && step.symbols.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-app-border/50 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-app-dim mb-1">Where</p>
                {step.symbols.map((s, i) => (
                  <div key={i} className="flex items-baseline gap-2 text-xs">
                    <span className="font-mono text-app-accent shrink-0 w-16">{s.sym}</span>
                    <span className="text-app-secondary">{s.meaning}</span>
                    {s.unit && <span className="text-app-dim text-[10px] ml-auto shrink-0 font-mono">{s.unit}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outputs */}
          <div className="p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-app-secondary mb-2">Outputs</p>
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
      {
        label: 'ISA lookup',
        eq: <span>T<sub>amb</sub>, p<sub>amb</sub>, ρ = ISA(h)</span>,
      },
      {
        label: 'Speed of sound',
        eq: <span>a = √(γ · R · T<sub>amb</sub>)</span>,
      },
      {
        label: 'Mach number',
        eq: <span>M<sub>0</sub> = <Frac num="V" den="a" /></span>,
      },
    ],
    symbols: [
      { sym: 'a',   meaning: 'Speed of sound in ambient air',           unit: 'm/s'      },
      { sym: 'γ',   meaning: 'Heat capacity ratio = 1.4 (ideal air)',    unit: '—'        },
      { sym: 'R',   meaning: 'Specific gas constant for air',            unit: 'J/(kg·K)' },
      { sym: 'M₀',  meaning: 'Flight Mach number',                       unit: '—'        },
      { sym: 'ρ',   meaning: 'Ambient air density (ISA)',                 unit: 'kg/m³'   },
    ],
    outputs: [
      { sym: 'T_amb', label: 'static temp [K]',   kind: 'out' },
      { sym: 'p_amb', label: 'static press [Pa]', kind: 'out' },
      { sym: 'M₀',    label: 'Mach number',        kind: 'out' },
    ],
  },
  {
    id: 'intake',
    station: '0→2',
    title: 'Intake',
    subtitle: 'Isentropic ram compression',
    inputs: [
      { sym: 'T_amb', label: 'static temp',   kind: 'derived' },
      { sym: 'p_amb', label: 'static press',  kind: 'derived' },
      { sym: 'M₀',    label: 'Mach number',   kind: 'derived' },
    ],
    equations: [
      {
        label: 'Stagnation temperature',
        eq: <span>T<sub>t2</sub> = T<sub>amb</sub> · (1 + <Frac num="γ−1" den="2" /> · M<sub>0</sub><sup>2</sup>)</span>,
      },
      {
        label: 'Stagnation pressure (isentropic)',
        eq: <span>p<sub>t2</sub> = p<sub>amb</sub> · (T<sub>t2</sub> / T<sub>amb</sub>)<sup><Frac num="γ" den="γ−1" /></sup></span>,
      },
    ],
    symbols: [
      { sym: 'Tt2', meaning: 'Stagnation (total) temperature at compressor inlet', unit: 'K'  },
      { sym: 'pt2', meaning: 'Stagnation (total) pressure at compressor inlet',    unit: 'Pa' },
    ],
    outputs: [
      { sym: 'Tt2', label: 'total temp [K]',    kind: 'out' },
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
      { sym: 'Tt2',   label: 'inlet total temp',   kind: 'derived' },
      { sym: 'pt2',   label: 'inlet total press',  kind: 'derived' },
      { sym: 'FPR',   label: 'fan pressure ratio',  kind: 'user'    },
      { sym: 'η_fan', label: 'fan efficiency',      kind: 'user'    },
      { sym: 'BPR',   label: 'bypass ratio',        kind: 'user'    },
    ],
    equations: [
      {
        label: 'Fan exit temperature',
        eq: <span>T<sub>t21</sub> = T<sub>t2</sub> · [1 + <Frac num={<span>FPR<sup><Frac num="γ−1" den="γ" /></sup> − 1</span>} den="η_fan" />]</span>,
      },
      {
        label: 'Fan exit pressure',
        eq: <span>p<sub>t21</sub> = p<sub>t2</sub> · FPR</span>,
      },
      {
        label: 'Bypass mass flow',
        eq: <span>ṁ<sub>bypass</sub> = BPR · ṁ<sub>core</sub></span>,
      },
    ],
    symbols: [
      { sym: 'FPR',   meaning: 'Fan pressure ratio',                            unit: '—' },
      { sym: 'η_fan', meaning: 'Fan isentropic efficiency',                      unit: '—' },
      { sym: 'BPR',   meaning: 'Bypass ratio = ṁ_bypass / ṁ_core',              unit: '—' },
      { sym: 'Tt21',  meaning: 'Stagnation temperature at fan exit / bypass inlet', unit: 'K'  },
      { sym: 'pt21',  meaning: 'Stagnation pressure at fan exit',                unit: 'Pa' },
    ],
    outputs: [
      { sym: 'Tt21',     label: 'fan exit temp [K]',   kind: 'out' },
      { sym: 'pt21',     label: 'fan exit press [kPa]', kind: 'out' },
      { sym: 'ṁ_bypass', label: 'bypass flow [kg/s]',  kind: 'out' },
    ],
  },
  {
    id: 'compressor',
    station: '21→3',
    title: 'Core Compressor(s)',
    subtitle: 'LP / IP / HP stages — OPR split across spools',
    inputs: [
      { sym: 'Tt_in', label: 'spool inlet temp',        kind: 'derived' },
      { sym: 'pt_in', label: 'spool inlet press',       kind: 'derived' },
      { sym: 'OPR',   label: 'overall pressure ratio',  kind: 'user'    },
      { sym: 'η_c',   label: 'compressor efficiency',   kind: 'user'    },
    ],
    equations: [
      {
        label: 'HP spool PR (auto-split)',
        eq: <span>PR<sub>HP</sub> = <Frac num="OPR" den="FPR · PR_LP · PR_IP" /> <span className="text-app-secondary font-sans">[auto-split]</span></span>,
      },
      {
        label: 'Exit temperature (per spool)',
        eq: <span>T<sub>t,out</sub> = T<sub>t,in</sub> · [1 + <Frac num={<span>PR<sup><Frac num="γ−1" den="γ" /></sup> − 1</span>} den="η_c" />]</span>,
      },
      {
        label: 'Exit pressure',
        eq: <span>p<sub>t,out</sub> = p<sub>t,in</sub> · PR</span>,
      },
    ],
    symbols: [
      { sym: 'OPR',  meaning: 'Overall pressure ratio across all compressor stages combined', unit: '—' },
      { sym: 'PR',   meaning: 'Individual spool pressure ratio (from auto-split)',             unit: '—' },
      { sym: 'η_c',  meaning: 'Compressor isentropic efficiency',                              unit: '—' },
    ],
    outputs: [
      { sym: 'Tt3', label: 'HP exit temp [K]',    kind: 'out' },
      { sym: 'pt3', label: 'HP exit press [kPa]', kind: 'out' },
    ],
  },
  {
    id: 'combustor',
    station: '3→4',
    title: 'Combustor',
    subtitle: 'Fuel addition at constant pressure',
    inputs: [
      { sym: 'Tt3',    label: 'compressor exit temp',  kind: 'derived' },
      { sym: 'pt3',    label: 'compressor exit press', kind: 'derived' },
      { sym: 'TIT',    label: 'turbine inlet temp [K]', kind: 'user'   },
      { sym: 'η_b',    label: 'combustor efficiency',   kind: 'user'   },
      { sym: 'ṁ_core', label: 'core mass flow',         kind: 'user'   },
    ],
    equations: [
      {
        label: 'Energy balance',
        eq: <span>ṁ<sub>f</sub> · LHV · η<sub>b</sub> = ṁ<sub>core</sub> · c<sub>p</sub> · (T<sub>t4</sub> − T<sub>t3</sub>)</span>,
      },
      {
        label: 'Fuel flow (solved from energy balance)',
        eq: <span>ṁ<sub>f</sub> = <Frac num={<span>ṁ<sub>core</sub> · c<sub>p</sub> · (TIT − T<sub>t3</sub>)</span>} den={<span>LHV · η<sub>b</sub></span>} /></span>,
      },
      {
        label: 'Combustor exit pressure',
        eq: <span>p<sub>t4</sub> ≈ p<sub>t3</sub> <span className="text-app-secondary font-sans">[no pressure loss modelled]</span></span>,
      },
    ],
    symbols: [
      { sym: 'LHV', meaning: 'Lower heating value of Jet-A fuel',      unit: '43.2 MJ/kg'  },
      { sym: 'cp',  meaning: 'Specific heat at constant pressure',      unit: '1005 J/(kg·K)' },
      { sym: 'η_b', meaning: 'Combustor efficiency',                    unit: '—'           },
      { sym: 'TIT', meaning: 'Turbine inlet temperature = throttle × TIT_max', unit: 'K'  },
      { sym: 'ṁ_f', meaning: 'Fuel mass flow rate',                     unit: 'kg/s'        },
    ],
    outputs: [
      { sym: 'Tt4', label: 'TIT [K]',               kind: 'out' },
      { sym: 'pt4', label: 'combustor exit press',   kind: 'out' },
      { sym: 'ṁ_f', label: 'fuel flow [kg/s]',       kind: 'out' },
    ],
  },
  {
    id: 'turbine',
    station: '4→5(→55)',
    title: 'Turbine(s)',
    subtitle: 'Shaft work extraction — power equals compressor + fan work',
    inputs: [
      { sym: 'Tt4', label: 'TIT',                    kind: 'derived' },
      { sym: 'pt4', label: 'combustor exit press',   kind: 'derived' },
      { sym: 'η_t', label: 'turbine efficiency',     kind: 'user'    },
      { sym: 'W_c', label: 'compressor work',        kind: 'derived' },
    ],
    equations: [
      {
        label: 'Turbine shaft power',
        eq: <span>W<sub>turbine</sub> = ṁ<sub>core</sub> · c<sub>p</sub> · ΔT<sub>t,turbine</sub></span>,
      },
      {
        label: 'Power balance (turbofan)',
        eq: <span>W<sub>turbine</sub> = W<sub>compressor</sub> + W<sub>fan</sub></span>,
      },
      {
        label: 'Turbine exit pressure',
        eq: <span>p<sub>t,out</sub> = p<sub>t,in</sub> · (1 − <Frac num="ΔT_t" den={<span>η<sub>t</sub> · T<sub>t,in</sub></span>} />)<sup><Frac num="γ" den="γ−1" /></sup></span>,
      },
    ],
    symbols: [
      { sym: 'η_t',  meaning: 'Turbine isentropic efficiency',                   unit: '—' },
      { sym: 'ΔT_t', meaning: 'Stagnation temperature drop across turbine stage', unit: 'K' },
      { sym: 'W',    meaning: 'Shaft power (turbine must supply compressor + fan work)', unit: 'W' },
    ],
    outputs: [
      { sym: 'Tt45', label: 'HP turbine exit [K]',  kind: 'out' },
      { sym: 'Tt5',  label: 'LP turbine exit [K]',  kind: 'out' },
      { sym: 'pt5',  label: 'LP turbine exit press', kind: 'out' },
    ],
  },
  {
    id: 'nozzle',
    station: '5→9  /  21→19',
    title: 'Nozzle(s)',
    subtitle: 'Converging nozzle — choked or unchoked',
    inputs: [
      { sym: 'Tt5',  label: 'core total temp',    kind: 'derived' },
      { sym: 'pt5',  label: 'core total press',   kind: 'derived' },
      { sym: 'Tt21', label: 'bypass total temp',  kind: 'derived' },
      { sym: 'pt21', label: 'bypass total press', kind: 'derived' },
      { sym: 'p_amb', label: 'ambient pressure',  kind: 'derived' },
    ],
    equations: [
      {
        label: 'Critical pressure ratio for choking',
        eq: <span>PR<sub>crit</sub> = (<Frac num="γ+1" den="2" />)<sup><Frac num="γ" den="γ−1" /></sup> ≈ 1.893</span>,
      },
      {
        label: 'Choked condition',
        eq: <span>choked if <Frac num="p_t" den="p_amb" /> ≥ PR<sub>crit</sub></span>,
      },
      {
        label: 'Jet velocity (unchoked)',
        eq: <span>v<sub>j</sub> = √(2 · c<sub>p</sub> · T<sub>t</sub> · [1 − (<Frac num="p_amb" den="p_t" />)<sup><Frac num="γ−1" den="γ" /></sup>])</span>,
      },
    ],
    symbols: [
      { sym: 'PR_crit', meaning: 'Critical nozzle pressure ratio — above this the throat is sonic', unit: '≈ 1.893' },
      { sym: 'p_t',     meaning: 'Nozzle inlet stagnation pressure',                                 unit: 'Pa'      },
      { sym: 'vj',      meaning: 'Nozzle exit (jet) velocity',                                        unit: 'm/s'     },
    ],
    outputs: [
      { sym: 'vj_core', label: 'core jet vel [m/s]',   kind: 'out' },
      { sym: 'vj_byp',  label: 'bypass jet vel [m/s]', kind: 'out' },
    ],
  },
  {
    id: 'thrust',
    station: '—',
    title: 'Thrust & Performance',
    subtitle: 'Net thrust, TSFC, propulsive efficiency',
    inputs: [
      { sym: 'ṁ_core',   label: 'core mass flow',     kind: 'user'    },
      { sym: 'ṁ_bypass', label: 'bypass mass flow',   kind: 'derived' },
      { sym: 'vj_core',  label: 'core jet velocity',  kind: 'derived' },
      { sym: 'vj_byp',   label: 'bypass jet velocity', kind: 'derived' },
      { sym: 'V₀',       label: 'flight velocity',    kind: 'derived' },
      { sym: 'ṁ_f',      label: 'fuel flow',           kind: 'derived' },
    ],
    equations: [
      {
        label: 'Net thrust (momentum + pressure thrust)',
        eq: <span>F<sub>net</sub> = ṁ<sub>core</sub> · (v<sub>j,core</sub> − V<sub>0</sub>) + ṁ<sub>bypass</sub> · (v<sub>j,byp</sub> − V<sub>0</sub>)</span>,
      },
      {
        label: 'Thrust specific fuel consumption',
        eq: <span>TSFC = <Frac num="ṁ_f" den={<span>F<sub>net</sub></span>} /></span>,
      },
      {
        label: 'Propulsive efficiency',
        eq: <span>η<sub>p</sub> = <Frac num={<span>2 · V<sub>0</sub> · F<sub>net</sub></span>} den={<span>Σ (ṁ · v<sub>j</sub><sup>2</sup> − ṁ · V<sub>0</sub><sup>2</sup>)</span>} /></span>,
      },
    ],
    symbols: [
      { sym: 'F_net', meaning: 'Net thrust',                                              unit: 'N'       },
      { sym: 'V₀',    meaning: 'Flight velocity = cruise speed converted to m/s',          unit: 'm/s'     },
      { sym: 'TSFC',  meaning: 'Thrust specific fuel consumption — fuel burned per unit thrust per hour', unit: '—' },
      { sym: 'η_p',   meaning: 'Propulsive efficiency — useful power / jet kinetic power', unit: '—'       },
    ],
    outputs: [
      { sym: 'F_net', label: 'net thrust [N]',        kind: 'out' },
      { sym: 'TSFC',  label: 'specific fuel consump.', kind: 'out' },
      { sym: 'η_p',   label: 'propulsive efficiency',  kind: 'out' },
    ],
  },
];

// ─── Legend ───────────────────────────────────────────────────────────────────

const LEGEND: { kind: BadgeKind; label: string }[] = [
  { kind: 'user',    label: 'User input'              },
  { kind: 'atm',    label: 'Atmosphere / ISA lookup' },
  { kind: 'derived', label: 'Passed from previous step' },
  { kind: 'out',    label: 'Calculated output'        },
];

// ─── Constants table data ─────────────────────────────────────────────────────

const CONSTANTS = [
  { sym: 'γ_c',      val: '1.4',              desc: 'Heat capacity ratio — cold air (compressor, fan, intake)' },
  { sym: 'γ_t',      val: '1.33',             desc: 'Heat capacity ratio — hot combustion gas (turbine, nozzle)' },
  { sym: 'cp_c',     val: '1005 J/(kg·K)',     desc: 'Specific heat at constant pressure — cold air side' },
  { sym: 'cp_t',     val: '1148 J/(kg·K)',     desc: 'Specific heat at constant pressure — hot gas side' },
  { sym: 'R',        val: '287.058 J/(kg·K)',  desc: 'Specific gas constant for air (= cp − cv)' },
  { sym: 'LHV',      val: '43.2 MJ/kg',        desc: 'Lower heating value of Jet-A fuel' },
  { sym: 'ΔPR/stage', val: '1.3',             desc: 'Axial compressor PR per stage — used only for stage count estimate' },
];

const ASSUMPTIONS = [
  'Calorically split ideal gas: γ = 1.4, cp = 1005 J/(kg·K) for compressor/fan/intake (cold air); γ = 1.33, cp = 1148 J/(kg·K) for turbine/nozzle (hot combustion gas)',
  'Isentropic intake — no shock losses or wall friction',
  'No combustor total pressure loss (pt4 = pt3)',
  'No turbine cooling air (full core mass flow through turbine)',
  'Converging-only nozzle — no supersonic expansion (no de Laval geometry)',
  '100% shaft mechanical efficiency — all turbine work reaches compressor / fan',
  'No duct pressure losses between stages',
  'Fuel mass fraction added to core flow (small correction, typically < 3%)',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function WorkflowSection() {
  const allIds = STEPS.map(s => s.id);
  const [openSteps, setOpenSteps] = useState<Set<string>>(() => new Set(allIds));
  const [showConstants, setShowConstants] = useState(false);

  const allOpen = openSteps.size === STEPS.length;

  function toggleStep(id: string) {
    setOpenSteps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setOpenSteps(allOpen ? new Set() : new Set(allIds));
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-app-text mb-1">Calculation Workflow</h2>
          <p className="text-sm text-app-secondary">
            Step-by-step state flow through the Brayton cycle. Each card shows what values it
            consumes, how it transforms them, and what it passes to the next stage.
            Hover over equations for horizontal scroll if they overflow.
          </p>
        </div>
        <button
          onClick={toggleAll}
          className="shrink-0 text-xs px-3 py-1.5 rounded border border-app-border text-app-secondary hover:text-app-text hover:border-app-accent/50 transition-colors"
        >
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
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
            <StepCard
              step={step}
              stepNum={i + 1}
              open={openSteps.has(step.id)}
              onToggle={() => toggleStep(step.id)}
            />
            {i < STEPS.length - 1 && (
              <Arrow label={
                step.id === 'atm'        ? 'T_amb · p_amb · M₀'       :
                step.id === 'intake'     ? 'Tt2 · pt2'                 :
                step.id === 'fan'        ? 'Tt21 · pt21 · ṁ_bypass'   :
                step.id === 'compressor' ? 'Tt3 · pt3'                 :
                step.id === 'combustor'  ? 'Tt4 · pt4 · ṁ_f'          :
                step.id === 'turbine'    ? 'Tt5 · pt5'                 :
                step.id === 'nozzle'     ? 'vj_core · vj_bypass'       :
                undefined
              } />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Constants & Assumptions */}
      <div className="border border-app-border rounded-xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-app-raised/50 transition-colors"
          onClick={() => setShowConstants(v => !v)}
        >
          <div>
            <span className="text-sm font-semibold text-app-text">Constants &amp; Model Assumptions</span>
            <span className="ml-2 text-xs text-app-secondary">γ_c · γ_t · cp · R · LHV · model limits</span>
          </div>
          {showConstants
            ? <ChevronDown size={14} className="text-app-dim shrink-0" />
            : <ChevronRight size={14} className="text-app-dim shrink-0" />}
        </button>

        {showConstants && (
          <div className="border-t border-app-border grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-app-border">

            {/* Physical constants */}
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-app-secondary mb-3">Physical Constants</p>
              <div className="space-y-2">
                {CONSTANTS.map(({ sym, val, desc }) => (
                  <div key={sym} className="flex items-baseline gap-2 text-sm">
                    <span className="font-mono text-app-accent w-20 shrink-0">{sym}</span>
                    <span className="font-mono text-app-text w-36 shrink-0">{val}</span>
                    <span className="text-app-secondary text-xs">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Assumptions */}
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-app-secondary mb-3">Model Assumptions</p>
              <ul className="space-y-1.5">
                {ASSUMPTIONS.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-app-secondary">
                    <span className="text-app-accent mt-0.5 shrink-0">·</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
