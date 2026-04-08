import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { EnvelopeResults, PlotData, PlotSeries } from '../types/engine';

interface Props {
  results: EnvelopeResults;
}

const SERIES_COLORS = [
  '#38bdf8', '#34d399', '#f59e0b', '#f87171', '#a78bfa', '#fb923c',
];
const LIMIT_COLOR = '#ef4444';

interface SinglePlotProps {
  plot: PlotData;
  title: string;
}

function SinglePlot({ plot, title }: SinglePlotProps) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  function toggleSeries(name: string) {
    setHiddenSeries(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  // Build recharts data array: [{ x, seriesName1, seriesName2, ... }]
  const data = plot.x_values.map((x, i) => {
    const row: Record<string, number | null> = { x: parseFloat(x.toFixed(2)) };
    plot.series.forEach(s => {
      row[s.name] = s.y_values[i] !== null ? parseFloat((s.y_values[i] as number).toFixed(3)) : null;
    });
    return row;
  });

  // Y-axis label from first non-limit series
  const yLabel = plot.series[0]?.y_label ?? '';
  const yUnit  = plot.series[0]?.y_unit ?? '';

  // Format tick values
  function formatY(v: number) {
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
    if (Math.abs(v) < 0.01 && v !== 0) return v.toExponential(2);
    return v.toFixed(1);
  }

  function formatX(v: number) {
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}k`;
    return v.toFixed(0);
  }

  // Custom tooltip
  const CustomTooltip = ({
    active, payload, label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number | null; color: string }>;
    label?: number;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-app-surface border border-app-border rounded-lg p-2 text-xs shadow-xl">
        <div className="text-app-secondary mb-1">{plot.x_label}: <strong className="text-app-text">{label} {plot.x_unit}</strong></div>
        {payload.map((p, i) => (
          p.value !== null && (
            <div key={i} style={{ color: p.color }}>
              {p.name}: <strong>{p.value?.toFixed(2)} {yUnit}</strong>
            </div>
          )
        ))}
      </div>
    );
  };

  return (
    <div className="bg-app-muted/50 border border-app-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-app-text">{title}</h4>
        <div className="flex gap-2 flex-wrap justify-end">
          {plot.series.map((s, i) => (
            <button
              key={s.name}
              onClick={() => toggleSeries(s.name)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                hiddenSeries.has(s.name)
                  ? 'border-app-border text-app-dim bg-transparent'
                  : `border-current`
              }`}
              style={{ color: hiddenSeries.has(s.name) ? undefined : (s.is_limit_line ? LIMIT_COLOR : SERIES_COLORS[i % SERIES_COLORS.length]) }}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1c3b4a" />
          <XAxis
            dataKey="x"
            tick={{ fill: '#7F888D', fontSize: 10 }}
            label={{ value: `${plot.x_label} (${plot.x_unit})`, position: 'insideBottom', offset: -12, fill: '#7F888D', fontSize: 10 }}
            tickFormatter={formatX}
          />
          <YAxis
            tick={{ fill: '#7F888D', fontSize: 10 }}
            label={{ value: `${yLabel} (${yUnit})`, angle: -90, position: 'insideLeft', offset: 10, fill: '#7F888D', fontSize: 10 }}
            tickFormatter={formatY}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          {plot.series.map((s, i) => {
            if (hiddenSeries.has(s.name)) return null;
            const color = s.is_limit_line ? LIMIT_COLOR : SERIES_COLORS[i % SERIES_COLORS.length];
            return (
              <Line
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={color}
                strokeWidth={s.is_limit_line ? 1.5 : 2}
                strokeDasharray={s.is_limit_line ? '6 3' : undefined}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function PlotsPanel({ results }: Props) {
  return (
    <div className="space-y-4">
      <div className="text-xs text-app-secondary bg-app-muted/30 rounded-md p-2 mb-2">
        Click series buttons to toggle visibility. Hover over plots for exact values.
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SinglePlot plot={results.thrust_vs_speed}     title="Thrust vs Speed" />
        <SinglePlot plot={results.tsfc_vs_speed}       title="TSFC vs Speed" />
        <SinglePlot plot={results.tit_fraction_vs_speed} title="TIT Utilisation vs Speed (%)" />
        <SinglePlot plot={results.thrust_vs_altitude}  title="Thrust vs Altitude" />
        <SinglePlot plot={results.tsfc_vs_altitude}    title="TSFC vs Altitude" />
      </div>
    </div>
  );
}
