import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceDot,
} from 'recharts';
import type { EnvelopeResults, PlotData, PlotSeries } from '../types/engine';

interface Props {
  results: EnvelopeResults;
  designSpeed: number;
  designAltitude: number;
  designThrottle: number;
  engineType: 'turbofan' | 'turbojet';
}

const SERIES_COLORS = [
  '#38bdf8', '#34d399', '#f59e0b', '#f87171', '#a78bfa', '#fb923c',
];
const LIMIT_COLOR = '#ef4444';
const DESIGN_DOT_COLOR = '#ffffff';

// ── Plot explanations ─────────────────────────────────────────────────────────

type EngineType = 'turbofan' | 'turbojet';

function Explanation({ engineType, plotKey }: { engineType: EngineType; plotKey: string }) {
  const isFan = engineType === 'turbofan';

  const content: Record<string, React.ReactNode> = {
    thrust_vs_speed: (
      <>
        <p className="mb-1.5">
          Net thrust = ṁ · (V<sub>j</sub> − V<sub>0</sub>). As flight speed V<sub>0</sub> rises,
          the momentum difference between the jet and the incoming air shrinks — even though jet
          velocity V<sub>j</sub> stays nearly constant.
        </p>
        {isFan ? (
          <p>
            A turbofan has <em>two</em> streams. The bypass jet is slow (~300–400 m/s), so its
            thrust contribution collapses first as speed rises toward it. The faster core jet
            holds on longer but also declines. The steeper drop compared to a turbojet is the
            price of the bypass efficiency advantage at low speed.
          </p>
        ) : (
          <p>
            A turbojet has a single high-velocity jet (~550–700 m/s). Because V<sub>0</sub> at
            subsonic cruise is a smaller fraction of V<sub>j</sub>, the curve falls more
            gradually than a turbofan. This is why turbojets suit high-speed flight where the
            turbofan bypass advantage disappears.
          </p>
        )}
      </>
    ),

    tsfc_vs_speed: (
      <>
        <p className="mb-1.5">
          TSFC = ṁ<sub>f</sub> / F<sub>net</sub>. Fuel flow is set by TIT and mass flow and
          stays roughly constant; thrust falls with speed (see Thrust vs Speed). So TSFC rises
          as speed increases — each newton of thrust costs more fuel.
        </p>
        {isFan ? (
          <p>
            For a turbofan the rise is steep because the large bypass stream amplifies the thrust
            loss at speed. At low speeds the opposite holds: the high-mass-flow bypass moves air
            efficiently (propulsive efficiency η<sub>p</sub> = 2V<sub>0</sub>/(V<sub>j</sub>+V<sub>0</sub>)
            is high when V<sub>j</sub> is only slightly above V<sub>0</sub>).
          </p>
        ) : (
          <p>
            For a turbojet the rise is shallower — the high V<sub>j</sub> keeps thrust higher
            at speed. At low speeds, however, turbojet TSFC is poor: the large gap between
            V<sub>j</sub> and V<sub>0</sub> means most jet kinetic energy is wasted as heat in
            the atmosphere rather than doing useful work.
          </p>
        )}
      </>
    ),

    thrust_vs_altitude: (
      <>
        <p className="mb-1.5">
          Thrust falls with altitude because air density decreases, reducing the mass flow
          through the intake. The model scales core mass flow by the stagnation density ratio,
          so ram compression at cruise speed partially offsets the thinning air.
        </p>
        <p className="mb-1.5">
          The rate of decline is faster in the troposphere (0–11 000 m, temperature drops
          6.5 K/km) and slower in the stratosphere above (temperature holds at 216.65 K,
          pressure decays exponentially).
        </p>
        {isFan ? (
          <p>
            Bypass and core flows both scale with density, so the proportional drop is the
            same as a turbojet — a turbofan is not penalised more by altitude.
          </p>
        ) : (
          <p>
            A turbojet's single stream scales with density at the same rate. No bypass flow
            means no additional altitude sensitivity beyond the core mass flow effect.
          </p>
        )}
      </>
    ),

    tsfc_vs_altitude: (
      <>
        <p className="mb-1.5">
          At altitude, lower ambient temperature T<sub>amb</sub> improves Brayton cycle thermal
          efficiency — the same OPR extracts proportionally more work from cooler inlet air.
          This slightly outweighs the thrust loss, so TSFC typically <em>improves</em> (falls)
          with altitude up to the tropopause, then levels off as temperature plateaus.
        </p>
        {isFan ? (
          <p>
            High-BPR turbofans show the clearest benefit: better cycle efficiency combines
            with the bypass stream's inherently high propulsive efficiency, making altitude
            cruise the optimal operating point for fuel economy.
          </p>
        ) : (
          <p>
            Turbojets show the same trend but benefit less — there is no bypass stream to
            amplify the thermal efficiency gain. The improvement is shallower and TSFC
            remains higher overall at all altitudes.
          </p>
        )}
      </>
    ),

    thrust_vs_throttle: (
      <>
        <p className="mb-1.5">
          More throttle raises TIT (linearly) and OPR (as √throttle). Both effects increase
          jet velocity and therefore thrust. The curve bends upward near full throttle as TIT
          and OPR compound each other.
        </p>
        {isFan ? (
          <p>
            Fan pressure rises with OPR, accelerating the large bypass stream. The thrust
            increase with throttle is amplified by the bypass multiplier (1 + BPR), so full
            throttle represents a large step up from idle compared to a turbojet of the same
            core size.
          </p>
        ) : (
          <p>
            Single-stream thrust scales more directly with TIT and OPR. Without a bypass
            multiplier the curve is slightly more linear, and absolute idle thrust is a
            larger fraction of full-throttle thrust than in a turbofan.
          </p>
        )}
      </>
    ),

    tsfc_vs_throttle: (
      <>
        <p className="mb-1.5">
          TSFC worsens (rises) as throttle falls. At part throttle, TIT drops linearly but
          OPR only drops as √throttle. The combustion temperature rise
          ΔT = TIT − T<sub>t3</sub> shrinks — less heat is released per unit mass flow,
          reducing specific work and wasting more fuel per newton.
        </p>
        {isFan ? (
          <p>
            The fan still moves the full bypass stream at reduced pressure at low throttle,
            delivering less bypass thrust per unit of core fuel burned. This worsens the TSFC
            penalty compared to a turbojet — the "overhead" of moving bypass air without
            sufficient TIT is expensive.
          </p>
        ) : (
          <p>
            No bypass overhead means the TSFC rise at low throttle is driven purely by
            reduced thermal efficiency. The penalty is real but slightly shallower than a
            high-BPR turbofan at the same throttle reduction.
          </p>
        )}
      </>
    ),
  };

  return <>{content[plotKey] ?? null}</>;
}

// ── Info hover button ─────────────────────────────────────────────────────────

function InfoButton({ engineType, plotKey }: { engineType: EngineType; plotKey: string }) {
  return (
    <div className="relative group">
      <button
        className="flex items-center justify-center w-5 h-5 rounded-full border border-app-border text-app-secondary hover:border-app-accent hover:text-app-accent transition-colors text-xs font-bold leading-none"
        aria-label="Why does this plot look like this?"
      >
        ?
      </button>
      {/* Tooltip — opens on hover, stays open while cursor is inside */}
      <div className="absolute right-0 bottom-full mb-1.5 w-80 z-30 hidden group-hover:block
                      bg-app-surface border border-app-border rounded-lg p-3 shadow-2xl
                      text-xs text-app-secondary leading-relaxed pointer-events-none">
        <p className="text-app-accent font-semibold mb-2 text-xs uppercase tracking-wide">
          Why does this look like this?
        </p>
        <Explanation engineType={engineType} plotKey={plotKey} />
      </div>
    </div>
  );
}

// ── Single plot ───────────────────────────────────────────────────────────────

interface SinglePlotProps {
  plot: PlotData;
  title: string;
  plotKey: string;
  designX?: number;
  engineType: EngineType;
}

function SinglePlot({ plot, title, plotKey, designX, engineType }: SinglePlotProps) {
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

  // Design point dots: one per non-limit series
  const designDots: { series: PlotSeries; color: string; y: number }[] = [];
  if (designX !== undefined) {
    plot.series.forEach((s, i) => {
      if (s.is_limit_line) return;
      const y = interpolateY(plot.x_values, s.y_values, designX);
      if (y !== null) {
        designDots.push({ series: s, color: SERIES_COLORS[i % SERIES_COLORS.length], y });
      }
    });
  }

  function formatY(v: number) {
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
    if (Math.abs(v) < 0.01 && v !== 0) return v.toExponential(2);
    return v.toFixed(1);
  }

  function formatX(v: number) {
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}k`;
    return v.toFixed(0);
  }

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
        <InfoButton engineType={engineType} plotKey={plotKey} />
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

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function PlotsPanel({ results, designSpeed, designAltitude, designThrottle, engineType }: Props) {
  return (
    <div className="space-y-4">
      <div className="text-xs text-app-secondary bg-app-muted/30 rounded-md p-2 mb-2">
        Hover over plots for exact values. White dots mark the design point. Tap <strong className="text-app-text">?</strong> on any plot for a physics explanation.
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SinglePlot plot={results.thrust_vs_speed}    title="Thrust vs Speed"    plotKey="thrust_vs_speed"    designX={designSpeed}    engineType={engineType} />
        <SinglePlot plot={results.tsfc_vs_speed}      title="TSFC vs Speed"      plotKey="tsfc_vs_speed"      designX={designSpeed}    engineType={engineType} />
        <SinglePlot plot={results.thrust_vs_altitude} title="Thrust vs Altitude" plotKey="thrust_vs_altitude" designX={designAltitude} engineType={engineType} />
        <SinglePlot plot={results.tsfc_vs_altitude}   title="TSFC vs Altitude"   plotKey="tsfc_vs_altitude"   designX={designAltitude} engineType={engineType} />
        <SinglePlot plot={results.thrust_vs_throttle} title="Thrust vs Throttle" plotKey="thrust_vs_throttle" designX={designThrottle} engineType={engineType} />
        <SinglePlot plot={results.tsfc_vs_throttle}   title="TSFC vs Throttle"   plotKey="tsfc_vs_throttle"   designX={designThrottle} engineType={engineType} />
      </div>
    </div>
  );
}
