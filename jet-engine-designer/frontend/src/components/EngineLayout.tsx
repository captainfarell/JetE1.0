import React from 'react';

interface Props {
  engine_type: 'turbojet' | 'turbofan';
  num_spools: 1 | 2 | 3;
}

// ── Hardcoded engine section tables ──────────────────────────────────────────
// Each entry is the ordered list of sections from intake to exhaust.

const LAYOUTS: Record<string, string[]> = {
  'turbojet-1': [
    'Intake',
    'HP Compressor',
    'Combustor',
    'HP Turbine',
    'Exhaust',
  ],
  'turbojet-2': [
    'Intake',
    'LP Compressor',
    'HP Compressor',
    'Combustor',
    'HP Turbine',
    'LP Turbine',
    'Exhaust',
  ],
  'turbojet-3': [
    'Intake',
    'LP Compressor',
    'IP Compressor',
    'HP Compressor',
    'Combustor',
    'HP Turbine',
    'IP Turbine',
    'LP Turbine',
    'Exhaust',
  ],
  'turbofan-2': [
    'Intake',
    'Fan',
    'HP Compressor',
    'Combustor',
    'HP Turbine',
    'LP Turbine',
    'Exhaust',
  ],
  'turbofan-3': [
    'Intake',
    'Fan',
    'IP Compressor',
    'HP Compressor',
    'Combustor',
    'HP Turbine',
    'IP Turbine',
    'LP Turbine',
    'Exhaust',
  ],
};

// Tailwind colour classes per section
const SECTION_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  'Intake':        { bg: 'bg-slate-700',   border: 'border-slate-500', text: 'text-slate-200' },
  'Fan':           { bg: 'bg-sky-800',     border: 'border-sky-500',   text: 'text-sky-100'   },
  'LP Compressor': { bg: 'bg-blue-800',    border: 'border-blue-500',  text: 'text-blue-100'  },
  'IP Compressor': { bg: 'bg-blue-900',    border: 'border-blue-600',  text: 'text-blue-100'  },
  'HP Compressor': { bg: 'bg-indigo-900',  border: 'border-indigo-600','text': 'text-indigo-100' },
  'Combustor':     { bg: 'bg-amber-800',   border: 'border-amber-500', text: 'text-amber-100' },
  'HP Turbine':    { bg: 'bg-red-800',     border: 'border-red-500',   text: 'text-red-100'   },
  'IP Turbine':    { bg: 'bg-orange-800',  border: 'border-orange-500',text: 'text-orange-100'},
  'LP Turbine':    { bg: 'bg-orange-700',  border: 'border-orange-400',text: 'text-orange-100'},
  'Exhaust':       { bg: 'bg-slate-600',   border: 'border-slate-400', text: 'text-slate-200' },
};

const DEFAULT_STYLE = { bg: 'bg-slate-700', border: 'border-slate-500', text: 'text-slate-200' };

export default function EngineLayout({ engine_type, num_spools }: Props) {
  const key = `${engine_type}-${num_spools}`;
  const sections = LAYOUTS[key];

  if (!sections) {
    return (
      <div className="text-xs text-slate-500 italic">
        Engine layout not available for this configuration.
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-4">
        Engine Sections — {engine_type === 'turbofan' ? 'Turbofan' : 'Turbojet'}, {num_spools} Spool{num_spools > 1 ? 's' : ''}
      </h3>

      <div className="flex flex-wrap items-center gap-1">
        {sections.map((section, i) => {
          const style = SECTION_STYLE[section] ?? DEFAULT_STYLE;
          return (
            <React.Fragment key={section}>
              <div
                className={`${style.bg} ${style.border} ${style.text} border rounded-md px-3 py-2 text-xs font-medium text-center min-w-[80px]`}
              >
                {section}
              </div>
              {i < sections.length - 1 && (
                <span className="text-slate-600 text-sm select-none">→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
        {sections.map(section => {
          const style = SECTION_STYLE[section] ?? DEFAULT_STYLE;
          return (
            <div key={section} className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className={`w-3 h-3 rounded-sm inline-block border ${style.bg} ${style.border}`} />
              {section}
            </div>
          );
        })}
      </div>
    </div>
  );
}
