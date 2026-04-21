import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceDot,
} from 'recharts';
import type { EnvelopeResults, PlotData, PlotSeries } from '../types/engine';

interface Props {
  results: EnvelopeResults;
  designSpeed: number;
  designAltitude: number;
}

const SERIES_COLORS = [
  '#38bdf8', '#34d399', '#f59e0b', '#f87171', '#a78bfa', '#fb923c',
];
const LIMIT_COLOR = '#ef4444';
const DESIGN_DOT_COLOR = '#ffffff';

/** Linear interpolation of y at xTarget from parallel x/y arrays. Returns null if out of range. */
function interpolateY(xs: number[], ys: (number | null)[], xTarget: number): number | null {
  for (let i = 0; i < xs.length - 1; i++) {
    if (xs[i] <= xTarget && xTarget <= xs[i + 1]) {
      const y0 = ys[i], y1 = ys[i + 1];
      if (y0 === null || y1 === null) return null;
      const t = (xTarget - xs[i]) / (xs[i + 1] - xs[i]);
      return y0 + t * (y1 - y0);
    }
  }
  return null;
}

interface SinglePlotProps {
  plot: PlotData;
  title: string;
  designX?: number;
}

function SinglePlot({ plot, title, designX }: SinglePlotProps) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  function toggleSeries(name: string) {
    setHiddenSeries(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        // Don't hide the last visible series — Y-axis would lose its domain
        const visibleCount = plot.series.length - prev.size;
        if (visibleCount <= 1) return prev;
        next.add(name);
      }
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

  // Design point dots: one per visible non-limit series
  const designDots: { series: PlotSeries; color: string; y: number }[] = [];
  if (designX !== undefined) {
    plot.series.forEach((s, i) => {
      if (s.is_limit_line || hiddenSeries.has(s.name)) return;
      const y = interpolateY(plot.x_values, s.y_values, designX);
      if (y !== null) {
        designDots.push({ series: s, color: SERIES_COLORS[i % SERIES_COLORS.length], y });
      }
    });
  }

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
            type="number"
            domain={['dataMin', 'dataMax']}
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
          {designDots.map(({ series, color, y }) => (
            <ReferenceDot
              key={`dp-${series.name}`}
              x={parseFloat(designX!.toFixed(2))}
              y={parseFloat(y.toFixed(3))}
              r={5}
              fill={DESIGN_DOT_COLOR}
              stroke={color}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function PlotsPanel({ results, designSpeed, designAltitude }: Props) {
  return (
    <div className="space-y-4">
      <div className="text-xs text-app-secondary bg-app-muted/30 rounded-md p-2 mb-2">
        Click series buttons to toggle visibility. Hover over plots for exact values.
        White dots mark the design point conditions.
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SinglePlot plot={results.thrust_vs_speed}        title="Thrust vs Speed"              designX={designSpeed} />
        <SinglePlot plot={results.tsfc_vs_speed}          title="TSFC vs Speed"                designX={designSpeed} />
        <SinglePlot plot={results.tit_fraction_vs_speed}  title="TIT Utilisation vs Speed (%)" designX={designSpeed} />
        <SinglePlot plot={results.thrust_vs_altitude}     title="Thrust vs Altitude"           designX={designAltitude} />
        <SinglePlot plot={results.tsfc_vs_altitude}       title="TSFC vs Altitude"             designX={designAltitude} />
        <SinglePlot plot={results.thrust_vs_throttle}     title="Thrust vs Throttle" />
        <SinglePlot plot={results.tsfc_vs_throttle}       title="TSFC vs Throttle" />
      </div>
    </div>
  );
}
