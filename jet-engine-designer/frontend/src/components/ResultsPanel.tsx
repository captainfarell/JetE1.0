import React, { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle, XCircle, BookOpen } from 'lucide-react';
import type { EngineResults } from '../types/engine';

interface Props {
  results: EngineResults;
}

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: 'default' | 'green' | 'red' | 'yellow' | 'highlight';
}

function MetricCard({ label, value, sub, color = 'default' }: MetricCardProps) {
  const colorClasses = {
    default:   'border-app-border',
    green:     'border-green-600 bg-green-900/20',
    red:       'border-red-600 bg-red-900/20',
    yellow:    'border-yellow-600 bg-yellow-900/20',
    highlight: 'border-highlight-border bg-highlight/40',
  };
  const valueClasses = {
    default:   'text-app-text',
    green:     'text-green-400',
    red:       'text-red-400',
    yellow:    'text-yellow-400',
    highlight: 'text-highlight-text',
  };
  return (
    <div className={`bg-app-muted/50 border rounded-lg p-3 ${colorClasses[color]}`}>
      <div className="text-xs text-app-secondary mb-1">{label}</div>
      <div className={`text-xl font-bold ${valueClasses[color]}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-app-secondary mt-0.5">{sub}</div>}
    </div>
  );
}

function StationRow({ label, tt, pt }: { label: string; tt: number | null; pt: number | null }) {
  if (tt === null && pt === null) return null;
  return (
    <tr className="station-row border-b border-app-border/50 hover:bg-app-muted/30 transition-colors">
      <td className="py-2 px-3 text-xs font-medium text-app-accent">{label}</td>
      <td className="py-2 px-3 text-xs text-app-text text-right">
        {tt !== null ? `${tt.toFixed(1)} K` : '—'}
      </td>
      <td className="py-2 px-3 text-xs text-app-text text-right">
        {pt !== null ? `${pt.toFixed(2)} kPa` : '—'}
      </td>
    </tr>
  );
}

export default function ResultsPanel({ results }: Props) {
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const [literatureOpen, setLiteratureOpen] = useState(false);
  const s = results.stations;
  const g = results.geometry;

  const titPct = (results.tit_fraction * 100).toFixed(1);
  const titBarColor = results.tit_fraction > 0.95 ? 'bg-red-500' :
                      results.tit_fraction > 0.80 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="space-y-5">
      {/* Errors & Warnings */}
      {results.errors.length > 0 && (
        <div className="bg-red-900/30 border border-red-600 rounded-lg p-3 space-y-1">
          {results.errors.map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-red-300">
              <XCircle size={15} className="mt-0.5 shrink-0" />
              <span>{e}</span>
            </div>
          ))}
        </div>
      )}
      {results.warnings.length > 0 && (
        <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3 space-y-1">
          {results.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-yellow-300">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Throttle note */}
      <p className="text-xs text-app-secondary bg-app-muted/30 rounded-md px-3 py-2">
        All values at <strong className="text-app-text">{(results.operating_throttle * 100).toFixed(0)}% throttle</strong> — TIT&nbsp;=&nbsp;{results.stations.tt4_k.toFixed(0)}&nbsp;K. Adjust throttle in the Design tab; use the <em>Envelope</em> tab to explore the full range.
      </p>

      {/* Performance Summary */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-app-accent mb-3">Performance Summary</h3>
        <div className="grid grid-cols-2 gap-2">
          <MetricCard
            label="Net Thrust"
            value={`${(results.net_thrust_n / 1000).toFixed(2)} kN`}
            sub={`${results.net_thrust_n.toFixed(0)} N`}
          />
          <MetricCard
            label="Thrust Required"
            value={`${(results.thrust_required_n / 1000).toFixed(2)} kN`}
            sub={`${results.thrust_required_n.toFixed(0)} N`}
            color="highlight"
          />
          <MetricCard
            label="Fuel Flow"
            value={`${results.fuel_flow_kg_h.toFixed(2)} kg/h`}
            sub={`${results.fuel_flow_kg_s.toFixed(4)} kg/s`}
          />
          <MetricCard
            label="TSFC"
            value={`${(results.tsfc_kg_n_h * (1e6 / 3600)).toFixed(3)} mg/(N·s)`}
            sub={`${results.tsfc_kg_n_h.toFixed(5)} kg/(N·h)`}
          />
          <MetricCard
            label="Propulsive Efficiency"
            value={`${(results.propulsive_efficiency * 100).toFixed(1)}%`}
            sub={`η_p · η_th = ${(results.overall_efficiency * 100).toFixed(1)}%`}
          />
          <MetricCard
            label="Overall Efficiency"
            value={results.overall_efficiency > 0 ? `${(results.overall_efficiency * 100).toFixed(1)}%` : '— (static)'}
            sub={`η_th = ${(results.thermal_efficiency * 100).toFixed(1)}%`}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="bg-app-muted/50 border border-app-border rounded-lg p-3">
            <div className="text-xs text-app-secondary mb-1">Core Mass Flow</div>
            <div className="text-lg font-bold text-app-text">{results.core_mass_flow_kg_s.toFixed(2)} kg/s</div>
          </div>
          {results.bypass_mass_flow_kg_s > 0 && (
            <div className="bg-app-muted/50 border border-app-border rounded-lg p-3">
              <div className="text-xs text-app-secondary mb-1">Bypass Mass Flow</div>
              <div className="text-lg font-bold text-app-text">{results.bypass_mass_flow_kg_s.toFixed(2)} kg/s</div>
            </div>
          )}
        </div>
      </div>

      {/* Estimated Geometry */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-app-accent mb-3">Estimated Geometry</h3>
        <div className="bg-app-muted/50 border border-app-border rounded-lg overflow-hidden">
          <table className="w-full">
            <tbody>
              {[
                ['Inlet diameter', `${g.inlet_diameter_m.toFixed(3)} m`],
                g.fan_diameter_m !== null ? ['Fan diameter', `${g.fan_diameter_m.toFixed(3)} m`] : null,
                ['Core diameter', `${g.core_diameter_m.toFixed(3)} m`],
                ['Engine length', `${g.engine_length_m.toFixed(3)} m`],
              ].filter(Boolean).map((row, i) => (
                <tr key={i} className="border-b border-app-border/50">
                  <td className="py-2 px-3 text-xs text-app-secondary">{row![0]}</td>
                  <td className="py-2 px-3 text-xs font-medium text-app-text text-right">{row![1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compressor Stages */}
      {results.compressor_stages && Object.keys(results.compressor_stages).length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-app-accent mb-3">Compressor Stage Counts</h3>
          <div className="bg-app-muted/50 border border-app-border rounded-lg overflow-hidden">
            <table className="w-full">
              <tbody>
                {Object.entries(results.compressor_stages).map(([section, count]) => (
                  <tr key={section} className="border-b border-app-border/50 last:border-0">
                    <td className="py-2 px-3 text-xs text-app-secondary">{section} compressor</td>
                    <td className="py-2 px-3 text-xs font-medium text-app-text text-right">{count} stage{count !== 1 ? 's' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-app-secondary mt-2">
            Axial stages only — assumes ~1.3 pressure ratio per stage. Centrifugal stages not modelled.
          </p>
        </div>
      )}

      {/* TIT Fraction */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-app-accent mb-3">Combustion Headroom (Tt3 / TIT)</h3>
        <div className="bg-app-muted/50 border border-app-border rounded-lg p-3">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-app-text">Tt3 = {s.tt3_k.toFixed(0)} K, TIT = {s.tt4_k.toFixed(0)} K</span>
            <span className={`font-semibold ${
              results.tit_fraction > 0.95 ? 'text-red-400' :
              results.tit_fraction > 0.80 ? 'text-yellow-400' : 'text-green-400'
            }`}>{titPct}% compression of TIT</span>
          </div>
          <div className="w-full bg-app-raised rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${titBarColor}`}
              style={{ width: `${Math.min(100, results.tit_fraction * 100).toFixed(1)}%` }}
            />
          </div>
          <div className="text-xs text-app-secondary mt-1">
            Fraction of TIT already consumed by compression. Higher = less headroom for combustion.
          </div>
          {results.tit_fraction >= 0.95 && (
            <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertTriangle size={12} />
              Compressor exit near TIT — very little combustion headroom. Check OPR and TIT.
            </div>
          )}
        </div>
      </div>

      {/* Cycle States */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-app-accent mb-3">Station Thermodynamic States</h3>
        <div className="bg-app-muted/50 border border-app-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-app-raised/50">
                <th className="py-2 px-3 text-left text-xs font-semibold text-app-text">Station</th>
                <th className="py-2 px-3 text-right text-xs font-semibold text-app-text">Tt [K]</th>
                <th className="py-2 px-3 text-right text-xs font-semibold text-app-text">pt [kPa]</th>
              </tr>
            </thead>
            <tbody>
              <StationRow label="2 — Compressor inlet" tt={s.tt2_k} pt={s.pt2_kpa} />
              <StationRow label="21 — Fan / LP exit" tt={s.tt21_k} pt={s.pt21_kpa} />
              <StationRow label="25 — IP compressor exit" tt={s.tt25_k} pt={s.pt25_kpa} />
              <StationRow label="3 — HP compressor exit" tt={s.tt3_k} pt={s.pt3_kpa} />
              <StationRow label="4 — Combustor exit (TIT)" tt={s.tt4_k} pt={s.pt4_kpa} />
              <StationRow label="45 — HP turbine exit" tt={s.tt45_k} pt={s.pt45_kpa} />
              <StationRow label="5 — LP/IP turbine exit" tt={s.tt5_k} pt={s.pt5_kpa} />
              <StationRow label="55 — LP turbine exit" tt={s.tt55_k} pt={s.pt55_kpa} />
            </tbody>
          </table>
        </div>
      </div>

      {/* Nozzle Exit */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-app-accent mb-3">Nozzle Exit Conditions</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-app-muted/50 border border-app-border rounded-lg p-3">
            <div className="text-xs text-app-secondary mb-1">Core Jet Velocity</div>
            <div className="text-xl font-bold text-app-text">{s.vj_core_m_s.toFixed(1)} m/s</div>
            <div className={`text-xs mt-1 ${s.core_nozzle_choked ? 'text-amber-400' : 'text-app-secondary'}`}>
              {s.core_nozzle_choked ? (
                <><CheckCircle size={11} className="inline mr-1" />Choked (sonic throat)</>
              ) : 'Subsonic exit'}
            </div>
          </div>
          {s.vj_bypass_m_s !== null && (
            <div className="bg-app-muted/50 border border-app-border rounded-lg p-3">
              <div className="text-xs text-app-secondary mb-1">Bypass Jet Velocity</div>
              <div className="text-xl font-bold text-app-text">{s.vj_bypass_m_s.toFixed(1)} m/s</div>
              <div className={`text-xs mt-1 ${s.bypass_nozzle_choked ? 'text-amber-400' : 'text-app-secondary'}`}>
                {s.bypass_nozzle_choked ? (
                  <><CheckCircle size={11} className="inline mr-1" />Choked</>
                ) : 'Subsonic exit'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assumptions */}
      <div>
        <button
          onClick={() => setAssumptionsOpen(!assumptionsOpen)}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-app-secondary hover:text-app-text transition-colors"
        >
          {assumptionsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Model Assumptions ({results.assumptions.length})
        </button>
        {assumptionsOpen && (
          <ul className="mt-2 space-y-1 bg-app-surface/50 rounded-lg p-3 border border-app-border">
            {results.assumptions.map((a, i) => (
              <li key={i} className="text-xs text-app-secondary flex items-start gap-2">
                <span className="text-app-dim shrink-0">•</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Literature */}
      <div>
        <button
          onClick={() => setLiteratureOpen(!literatureOpen)}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-app-secondary hover:text-app-text transition-colors"
        >
          {literatureOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <BookOpen size={14} />
          Literature &amp; References
        </button>
        {literatureOpen && (
          <ul className="mt-2 space-y-2 bg-app-surface/50 rounded-lg p-3 border border-app-border">
            {[
              {
                ref: 'NOAA, NASA, USAF',
                title: 'U.S. Standard Atmosphere, 1976',
                detail: 'US Government Printing Office, 1976. Free via NASA Technical Reports Server (NTRS ID 19770009539).',
                note: 'Defines ISA temperature lapse rates (−6.5 K/km troposphere, isothermal stratosphere), tropopause at 11 000 m, and sea-level reference conditions. Implemented in atmosphere.py.',
              },
              {
                ref: 'NASA Glenn Research Center',
                title: "Beginner's Guide to Propulsion",
                detail: 'Free web resource. https://www.grc.nasa.gov/www/k-12/airplane/turbine.html',
                note: 'Covers the Brayton cycle, compressor and turbine work equations, isentropic intake relations, thrust equation, and TSFC — the foundational theory behind all calculations in this app.',
              },
              {
                ref: 'NACA',
                title: 'Report 1135 — Equations, Tables, and Charts for Compressible Flow',
                detail: 'NACA, 1953. Free via NASA Technical Reports Server.',
                note: 'Canonical reference for isentropic flow relations (γ = 1.4) used in nozzle choking conditions, critical pressure ratio, and intake stagnation quantities.',
              },
              {
                ref: 'NASA',
                title: 'SP-36 — Aerodynamic Design of Axial-Flow Compressors',
                detail: 'NASA/NACA, 1965. Free via NASA Technical Reports Server.',
                note: 'Basis for per-stage axial compressor pressure ratio assumptions (PR ≈ 1.3 per stage) and stage-count to OPR mapping used in geometry estimation.',
              },
              {
                ref: 'NIST',
                title: 'Chemistry WebBook',
                detail: 'National Institute of Standards and Technology. Free at https://webbook.nist.gov',
                note: 'Reference for aviation fuel thermodynamic properties. LHV = 43.2 MJ/kg for Jet-A used in the combustor fuel-flow energy balance.',
              },
            ].map(({ ref, title, detail, note }, i) => (
              <li key={i} className="text-xs text-app-secondary flex items-start gap-2 pb-2 border-b border-app-border/50 last:border-0 last:pb-0">
                <span className="text-app-dim shrink-0 mt-0.5">•</span>
                <span>
                  <span className="text-app-text">{ref}. </span>
                  <span className="italic text-app-text">{title}</span>
                  {'. '}
                  <span className="text-app-secondary">{detail} </span>
                  <span className="text-app-secondary">{note}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
