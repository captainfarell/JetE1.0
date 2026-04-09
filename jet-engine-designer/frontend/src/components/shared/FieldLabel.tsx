import React from 'react';
import { Info } from 'lucide-react';
import type { DefaultsResponse } from '../../types/engine';

interface FieldLabelProps {
  label: string;
  paramKey?: string;
  tooltip?: string;
  defaults?: DefaultsResponse | null;
}

export default function FieldLabel({ label, paramKey, tooltip, defaults }: FieldLabelProps) {
  const [visible, setVisible] = React.useState(false);
  const desc = paramKey && defaults ? defaults.parameter_descriptions[paramKey] : null;
  const tip = tooltip ?? (desc
    ? `${desc.description}\n\nTypical: ${desc.typical_range}\n\nTrade-off: ${desc.trade_off}`
    : null);

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
