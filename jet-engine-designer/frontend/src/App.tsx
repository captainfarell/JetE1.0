import React, { useState, useCallback } from 'react';
import { Cpu, BookOpen, AlertTriangle, XCircle, Loader, Play, HelpCircle, GitBranch, Clock } from 'lucide-react';

import EngineConfig from './components/EngineConfig';
import AircraftConfig from './components/AircraftConfig';
import EnvelopeConfig from './components/EnvelopeConfig';
import type { EnvelopeConfig as EnvelopeConfigData } from './components/EnvelopeConfig';
import ResultsPanel from './components/ResultsPanel';
import EngineLayout from './components/EngineLayout';
import PlotsPanel from './components/PlotsPanel';
import HelpSection from './components/HelpSection';
import WorkflowSection from './components/WorkflowSection';

import { calculateEngine, calculateEnvelope } from './services/api';
import { useEngineForm } from './hooks/useEngineForm';
import type {
  EngineResults,
  EnvelopeRequest,
  EnvelopeResults,
} from './types/engine';

// ─── Tab definition ───────────────────────────────────────────────────────────
type TabId = 'design' | 'results' | 'envelope' | 'learn' | 'workflow';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'learn',    label: 'How does a jet engine work?', icon: <HelpCircle size={15} /> },
  { id: 'design',   label: 'Engine Design',               icon: <Cpu size={15} /> },
  { id: 'results',  label: 'Results & Diagram',           icon: <Play size={15} /> },
  { id: 'envelope', label: 'Envelope Analysis',           icon: <BookOpen size={15} /> },
  { id: 'workflow', label: 'Workflow',                    icon: <GitBranch size={15} /> },
];

// ─── Validation panel ─────────────────────────────────────────────────────────
function ValidationPanel({ errors, warnings }: { errors: string[]; warnings: string[] }) {
  if (errors.length === 0 && warnings.length === 0) return null;
  return (
    <div className="space-y-2 mb-4">
      {errors.map((e, i) => (
        <div key={`e${i}`} className="flex items-start gap-2 bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-300">
          <XCircle size={15} className="mt-0.5 shrink-0" />
          <span>{e}</span>
        </div>
      ))}
      {warnings.map((w, i) => (
        <div key={`w${i}`} className="flex items-start gap-2 bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 text-sm text-yellow-300">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>{w}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [wakeUpMsg, setWakeUpMsg] = useState<string | null>(null);
  const { formData, defaults, updateForm } = useEngineForm(setWakeUpMsg);
  const [results, setResults] = useState<EngineResults | null>(null);
  const [envelopeResults, setEnvelopeResults] = useState<EnvelopeResults | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('learn');
  const [loadingCalc, setLoadingCalc] = useState(false);
  const [loadingEnvelope, setLoadingEnvelope] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [calcErrors, setCalcErrors] = useState<string[]>([]);
  const [calcWarnings, setCalcWarnings] = useState<string[]>([]);

  // Wrapper that threads the architecture-change side-effect into the hook's updateForm.
  // Clear results when the engine topology changes — the old diagram would show
  // components (e.g. LP Turbine) that belong to a different architecture.
  const handleFormChange = useCallback(
    (updates: Parameters<typeof updateForm>[0]) => {
      updateForm(updates, () => {
        setResults(null);
        setEnvelopeResults(null);
      });
    },
    [updateForm],
  );

  async function handleCalculate() {
    setLoadingCalc(true);
    setApiError(null);
    setWakeUpMsg(null);
    setCalcErrors([]);
    setCalcWarnings([]);
    try {
      const res = await calculateEngine(formData, setWakeUpMsg);
      setCalcErrors(res.errors);
      setCalcWarnings(res.warnings);
      if (res.errors.length === 0) {
        setResults(res);
        setActiveTab('results');
      } else {
        // Clear stale results so the results tab can't show zeroed-out data without context
        setResults(null);
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingCalc(false);
    }
  }

  async function handleEnvelope(config: EnvelopeConfigData) {
    setLoadingEnvelope(true);
    setApiError(null);
    setWakeUpMsg(null);
    try {
      const req: EnvelopeRequest = {
        design: formData,
        speed_min_kmh:   config.speedMinKmh,
        speed_max_kmh:   config.speedMaxKmh,
        speed_steps:     config.speedSteps,
        altitude_m:      config.altitudeM,
        altitude_min_m:  config.altitudeMinM,
        altitude_max_m:  config.altitudeMaxM,
        altitude_steps:  config.altitudeSteps,
        speed_kmh:       config.speedKmh,
        throttle_min:        config.throttleMin / 100,
        throttle_max:        config.throttleMax / 100,
        throttle_steps:      config.throttleSteps,
        throttle_altitude_m: config.throttleAltitudeM,
        throttle_speed_kmh:  config.throttleSpeedKmh,
      };
      const res = await calculateEnvelope(req, setWakeUpMsg);
      setEnvelopeResults(res);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingEnvelope(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-app-bg text-app-text flex flex-col">

      {/* ── Tab bar ── */}
      <nav className="bg-app-surface/80 border-b border-app-border px-4 flex gap-1 pt-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'bg-app-bg border-app-accent text-app-accent'
                : 'border-transparent text-app-secondary hover:text-app-text hover:bg-app-muted/50'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'results' && results && (
              <span className="ml-1 w-2 h-2 rounded-full bg-green-500 inline-block" title="Results available" />
            )}
            {tab.id === 'envelope' && envelopeResults && (
              <span className="ml-1 w-2 h-2 rounded-full bg-purple-500 inline-block" title="Envelope computed" />
            )}
          </button>
        ))}
      </nav>

      {/* ── Wake-up banner ── */}
      {wakeUpMsg && (
        <div className="bg-amber-900/40 border-b border-amber-700 px-4 py-2 flex items-center gap-3">
          <Clock size={15} className="text-amber-400 shrink-0 animate-pulse" />
          <span className="text-sm text-amber-300">{wakeUpMsg}</span>
        </div>
      )}

      {/* ── Global API error banner ── */}
      {apiError && (
        <div className="bg-red-900/40 border-b border-red-700 px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-red-300">
            <XCircle size={15} />
            <span><strong>Error:</strong> {apiError}</span>
          </div>
          <button onClick={() => setApiError(null)} className="text-xs text-red-400 hover:text-red-200">Dismiss</button>
        </div>
      )}

      {/* ── Global calc errors/warnings banner (visible on all tabs) ── */}
      {(calcErrors.length > 0 || calcWarnings.length > 0) && (
        <div className="px-4 pt-3 max-w-5xl mx-auto">
          <ValidationPanel errors={calcErrors} warnings={calcWarnings} />
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 p-4 overflow-auto">

        {/* ════ ENGINE DESIGN TAB ════ */}
        {activeTab === 'design' && (
          <div className="max-w-5xl mx-auto">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left column: engine architecture */}
              <div className="bg-app-surface border border-app-border rounded-xl p-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-app-accent mb-4 pb-2 border-b border-app-border">
                  Engine Architecture
                </h2>
                <EngineConfig
                  formData={formData}
                  onChange={handleFormChange}
                  defaults={defaults}
                />
              </div>

              {/* Right column: aircraft & flight */}
              <div className="bg-app-surface border border-app-border rounded-xl p-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-app-accent mb-4 pb-2 border-b border-app-border">
                  Aircraft &amp; Flight Condition
                </h2>
                <AircraftConfig
                  formData={formData}
                  onChange={handleFormChange}
                  defaults={defaults}
                />
              </div>
            </div>

            {/* Calculate button */}
            <div className="mt-5 flex justify-center">
              <button
                onClick={handleCalculate}
                disabled={loadingCalc}
                className="flex items-center gap-2 bg-app-accent hover:bg-blue-300 disabled:bg-app-muted disabled:cursor-not-allowed text-app-bg font-semibold px-10 py-3 rounded-xl text-sm transition-colors shadow-lg"
              >
                {loadingCalc ? (
                  <><Loader size={16} className="animate-spin" /> Calculating…</>
                ) : (
                  <><Play size={16} /> Calculate Performance</>
                )}
              </button>
            </div>

            {results && calcErrors.length === 0 && (
              <div className="mt-3 text-center">
                <button
                  onClick={() => setActiveTab('results')}
                  className="text-sm text-blue-400 hover:text-blue-300 underline"
                >
                  View results →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ════ RESULTS & DIAGRAM TAB ════ */}
        {activeTab === 'results' && (
          <div className="max-w-5xl mx-auto">
            {!results ? (
              <div className="text-center py-20">
                <Cpu size={48} className="mx-auto text-app-muted mb-4" />
                <p className="text-app-secondary text-lg mb-2">No results yet</p>
                <p className="text-app-secondary text-sm mb-5">Configure the engine and click Calculate on the Engine Design tab.</p>
                <button
                  onClick={() => setActiveTab('design')}
                  className="bg-btn-primary hover:bg-btn-primary-hover text-btn-primary-text px-6 py-2 rounded-lg text-sm"
                >
                  Go to Engine Design
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Engine Layout */}
                <div className="bg-app-surface border border-app-border rounded-xl p-5">
                  <EngineLayout
                    engine_type={formData.engine_type}
                    num_spools={formData.num_spools}
                  />
                </div>

                {/* Performance Results */}
                <div className="bg-app-surface border border-app-border rounded-xl p-5">
                  <ResultsPanel results={results} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ ENVELOPE ANALYSIS TAB ════ */}
        {activeTab === 'envelope' && (
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {/* Config panel */}
              <div className="lg:col-span-2 bg-app-surface border border-app-border rounded-xl p-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-app-accent mb-4 pb-2 border-b border-app-border">
                  Envelope Settings
                </h2>
                <EnvelopeConfig
                  formData={formData}
                  loading={loadingEnvelope}
                  onGenerate={handleEnvelope}
                />
              </div>

              {/* Plots panel */}
              <div className="lg:col-span-3">
                {!envelopeResults ? (
                  <div className="bg-app-surface border border-app-border rounded-xl p-5 h-full flex flex-col items-center justify-center min-h-64">
                    <BookOpen size={40} className="text-app-muted mb-3" />
                    <p className="text-app-secondary text-sm">
                      Configure the sweep and click <strong>Generate Envelope</strong>.
                    </p>
                    <p className="text-xs text-app-secondary mt-1">
                      Uses current engine design parameters.
                    </p>
                  </div>
                ) : (
                  <div className="bg-app-surface border border-app-border rounded-xl p-5">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-app-accent mb-4 pb-2 border-b border-app-border">
                      Performance Plots
                    </h2>
                    <PlotsPanel results={envelopeResults} designSpeed={formData.cruise_speed_kmh} designAltitude={formData.cruise_altitude_m} designThrottle={formData.throttle_fraction * 100} engineType={formData.engine_type} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════ LEARN TAB ════ */}
        {activeTab === 'learn' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-app-surface border border-app-border rounded-xl p-6">
              <HelpSection />
            </div>
          </div>
        )}

        {/* ════ WORKFLOW TAB ════ */}
        {activeTab === 'workflow' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-app-surface border border-app-border rounded-xl p-6">
              <WorkflowSection />
            </div>
          </div>
        )}

      </main>

      {/* ── Footer ── */}
      <footer className="bg-app-surface border-t border-app-border px-4 py-2 text-center text-xs text-app-secondary">
        Created by{' '}
        <a
          href="https://www.linkedin.com/in/andrzej-jugowicz-47395396/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline"
        >
          Andrzej Jugowicz
        </a>
        {' '}and Claude
      </footer>
    </div>
  );
}
