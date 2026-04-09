import React, { useRef, useCallback } from 'react';
import { Download } from 'lucide-react';
import type { EngineResults, GeometryComponent } from '../types/engine';

interface Props {
  results: EngineResults | null;
}

// Component colour map
const COMPONENT_COLORS: Record<string, string> = {
  'Intake':          '#475569',
  'Fan':             '#4fc3f7',
  'LP Compressor':   '#29b6f6',
  'IP Compressor':   '#0288d1',
  'HP Compressor':   '#01579b',
  'Combustor':       '#f59e0b',
  'HP Turbine':      '#ef4444',
  'IP Turbine':      '#f97316',
  'LP Turbine':      '#fb923c',
  'Core Nozzle':     '#64748b',
  'Bypass Duct':     '#4fc3f7',
};

const COMPONENT_STROKES: Record<string, string> = {
  'Bypass Duct': '#4fc3f7',
};

function getColor(name: string): string {
  return COMPONENT_COLORS[name] ?? '#4b5563';
}

function getStroke(name: string): string {
  return COMPONENT_STROKES[name] ?? 'rgba(255,255,255,0.15)';
}

function getDashArray(name: string): string {
  return name === 'Bypass Duct' ? '6 3' : 'none';
}

// Station numbers and their approximate x-fraction labels
const STATIONS: { label: string; fraction: number }[] = [
  { label: '2',  fraction: 0.08 },
  { label: '21', fraction: 0.20 },
  { label: '25', fraction: 0.31 },
  { label: '3',  fraction: 0.42 },
  { label: '4',  fraction: 0.52 },
  { label: '45', fraction: 0.60 },
  { label: '5',  fraction: 0.72 },
  { label: '55', fraction: 0.82 },
  { label: '9',  fraction: 0.95 },
];

interface SVGDiagramProps {
  components: GeometryComponent[];
  inletDiameter: number;
  engineLength: number;
  svgRef: React.RefObject<SVGSVGElement | null>;
  title: string;
}

function SVGDiagram({ components, inletDiameter, engineLength, svgRef, title }: SVGDiagramProps) {
  const SVG_W = 760;
  const SVG_H = 260;
  const PAD_L = 30;
  const PAD_R = 20;
  const PAD_T = 30;
  const PAD_B = 36;

  const drawW = SVG_W - PAD_L - PAD_R;
  const drawH = SVG_H - PAD_T - PAD_B;

  // Fan radius in px (full height of drawing area / 2)
  const fanRadiusPx = drawH / 2;
  // Centre line Y
  const centerY = PAD_T + drawH;  // bottom of drawing area = centreline (top half only)

  function xPx(frac: number) { return PAD_L + frac * drawW; }
  function yPx(rFrac: number) { return centerY - rFrac * fanRadiusPx; }

  return (
    <svg
      ref={svgRef}
      width={SVG_W}
      height={SVG_H}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full"
      style={{ background: '#0f172a' }}
    >
      {/* Background grid */}
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width={SVG_W} height={SVG_H} fill="url(#grid)" />

      {/* Title */}
      <text x={SVG_W / 2} y={16} textAnchor="middle" fill="#94a3b8" fontSize={11} fontFamily="monospace">
        {title}
      </text>

      {/* Centreline */}
      <line
        x1={PAD_L - 5} y1={centerY}
        x2={PAD_L + drawW + 5} y2={centerY}
        stroke="#334155" strokeWidth={1} strokeDasharray="4 3"
      />

      {/* Components */}
      {components.map((comp, i) => {
        const x1 = xPx(comp.x_start);
        const x2 = xPx(comp.x_end);
        const yTop = yPx(comp.r_outer);
        const yBot = yPx(comp.r_inner);
        const w = x2 - x1;
        const h = yBot - yTop;

        if (w <= 0 || h <= 0) return null;

        const isBypass = comp.name === 'Bypass Duct';

        return (
          <g key={i}>
            <rect
              x={x1} y={yTop} width={w} height={h}
              fill={isBypass ? 'rgba(79,195,247,0.12)' : getColor(comp.name)}
              stroke={getStroke(comp.name)}
              strokeWidth={isBypass ? 1.5 : 0.8}
              strokeDasharray={getDashArray(comp.name)}
              rx={comp.name === 'Combustor' ? 4 : 1}
              opacity={isBypass ? 0.85 : 0.92}
            />
            {/* Label */}
            {!isBypass && w > 20 && (
              <text
                x={x1 + w / 2}
                y={yTop + h / 2 + 3}
                textAnchor="middle"
                fill="rgba(255,255,255,0.85)"
                fontSize={Math.min(9, w / comp.name.length * 1.5)}
                fontFamily="system-ui, sans-serif"
                fontWeight="500"
              >
                {comp.name}
              </text>
            )}
            {isBypass && w > 40 && (
              <text
                x={x1 + w / 2}
                y={yTop + h / 2 + 3}
                textAnchor="middle"
                fill="rgba(79,195,247,0.7)"
                fontSize={9}
                fontFamily="system-ui, sans-serif"
              >
                Bypass
              </text>
            )}
          </g>
        );
      })}

      {/* Station lines */}
      {STATIONS.map(st => {
        const x = xPx(st.fraction);
        return (
          <g key={st.label}>
            <line
              x1={x} y1={PAD_T + 5}
              x2={x} y2={centerY}
              stroke="rgba(148,163,184,0.3)"
              strokeWidth={0.8}
              strokeDasharray="3 3"
            />
            <text x={x} y={PAD_T + 4} textAnchor="middle" fill="#475569" fontSize={8} fontFamily="monospace">
              {st.label}
            </text>
          </g>
        );
      })}

      {/* Airflow arrow */}
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#4fc3f7" />
        </marker>
      </defs>
      <line
        x1={PAD_L - 20} y1={centerY - fanRadiusPx * 0.5}
        x2={PAD_L + 5} y2={centerY - fanRadiusPx * 0.5}
        stroke="#4fc3f7" strokeWidth={1.5} markerEnd="url(#arrow)"
      />
      <text x={PAD_L - 25} y={centerY - fanRadiusPx * 0.5 - 4} fill="#4fc3f7" fontSize={8} textAnchor="middle">
        Air in
      </text>

      {/* Dimensions: engine length arrow */}
      <g>
        <line
          x1={PAD_L} y1={SVG_H - PAD_B + 8}
          x2={PAD_L + drawW} y2={SVG_H - PAD_B + 8}
          stroke="#475569" strokeWidth={1}
        />
        <line x1={PAD_L} y1={SVG_H - PAD_B + 5} x2={PAD_L} y2={SVG_H - PAD_B + 11} stroke="#475569" strokeWidth={1} />
        <line x1={PAD_L + drawW} y1={SVG_H - PAD_B + 5} x2={PAD_L + drawW} y2={SVG_H - PAD_B + 11} stroke="#475569" strokeWidth={1} />
        <text x={PAD_L + drawW / 2} y={SVG_H - PAD_B + 20} textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="monospace">
          L = {engineLength.toFixed(2)} m
        </text>
      </g>

      {/* Inlet diameter arrow */}
      <g>
        <line
          x1={PAD_L - 8} y1={centerY}
          x2={PAD_L - 8} y2={centerY - fanRadiusPx}
          stroke="#475569" strokeWidth={1}
        />
        <line x1={PAD_L - 11} y1={centerY} x2={PAD_L - 5} y2={centerY} stroke="#475569" strokeWidth={1} />
        <line x1={PAD_L - 11} y1={centerY - fanRadiusPx} x2={PAD_L - 5} y2={centerY - fanRadiusPx} stroke="#475569" strokeWidth={1} />
        <text
          x={PAD_L - 12}
          y={centerY - fanRadiusPx / 2}
          textAnchor="middle"
          fill="#64748b"
          fontSize={8}
          fontFamily="monospace"
          transform={`rotate(-90, ${PAD_L - 12}, ${centerY - fanRadiusPx / 2})`}
        >
          D={inletDiameter.toFixed(2)}m
        </text>
      </g>

      {/* Legend — derived from actual components so it matches the engine configuration */}
      {components.map((comp, i) => (
        <g key={comp.name} transform={`translate(${PAD_L + i * 108}, ${SVG_H - 12})`}>
          <rect x={0} y={-7} width={12} height={8}
            fill={comp.name === 'Bypass Duct' ? 'rgba(79,195,247,0.2)' : getColor(comp.name)}
            stroke={comp.name === 'Bypass Duct' ? '#4fc3f7' : 'none'}
            strokeWidth={1}
          />
          <text x={15} y={0} fill="#64748b" fontSize={8} fontFamily="system-ui">{comp.name}</text>
        </g>
      ))}
    </svg>
  );
}

// Placeholder skeleton diagram
function PlaceholderDiagram({ svgRef }: { svgRef: React.RefObject<SVGSVGElement | null> }) {
  const SVG_W = 760, SVG_H = 260;
  return (
    <svg ref={svgRef} width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ background: '#0f172a' }}>
      <rect width={SVG_W} height={SVG_H} fill="#0f172a" />
      <text x={SVG_W / 2} y={90} textAnchor="middle" fill="#334155" fontSize={14} fontFamily="system-ui">
        Engine diagram will appear here after calculation
      </text>
      <text x={SVG_W / 2} y={112} textAnchor="middle" fill="#1e293b" fontSize={11} fontFamily="system-ui">
        Configure parameters and click Calculate
      </text>
      {/* Skeleton shapes */}
      {[0.05, 0.22, 0.38, 0.53, 0.65, 0.75, 0.88].map((x, i) => (
        <rect key={i} x={x * SVG_W} y={SVG_H * 0.25} width={(0.1 + i * 0.01) * SVG_W * 0.1} height={SVG_H * 0.5}
          fill="#1e293b" rx={2} />
      ))}
    </svg>
  );
}

export default function EngineDiagram({ results }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const downloadSvg = useCallback(() => {
    if (!svgRef.current) return;
    const data = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([data], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jet-engine-diagram.svg';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const engineLabel = results
    ? `${results.core_mass_flow_kg_s} kg/s core | Thrust: ${(results.net_thrust_n / 1000).toFixed(1)} kN | Length: ${results.geometry.engine_length_m.toFixed(2)} m`
    : 'Jet Engine Designer — Cross-Section Diagram';

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-app-accent">
          Engine Cross-Section Diagram
        </h3>
        <button
          onClick={downloadSvg}
          disabled={!results}
          className="flex items-center gap-1.5 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 border border-slate-600 text-slate-300 rounded-md px-3 py-1.5 transition-colors"
        >
          <Download size={12} />
          Download SVG
        </button>
      </div>

      <div className="border border-slate-700 rounded-lg overflow-hidden">
        {results ? (
          <SVGDiagram
            components={results.geometry.component_positions}
            inletDiameter={results.geometry.inlet_diameter_m}
            engineLength={results.geometry.engine_length_m}
            svgRef={svgRef}
            title={engineLabel}
          />
        ) : (
          <PlaceholderDiagram svgRef={svgRef} />
        )}
      </div>

      {results && (
        <div className="mt-2 flex flex-wrap gap-3">
          {results.geometry.component_positions.map(comp => (
            <div key={comp.name} className="flex items-center gap-1.5 text-xs text-slate-400">
              <span
                className="w-3 h-3 rounded-sm inline-block"
                style={{ background: comp.name === 'Bypass Duct' ? 'rgba(79,195,247,0.3)' : (COMPONENT_COLORS[comp.name] ?? '#4b5563') }}
              />
              {comp.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
