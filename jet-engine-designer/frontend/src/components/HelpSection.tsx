import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// ─── Simple qualitative BPR demo (no API call) ────────────────────────────────
function qualitativePerformance(bpr: number) {
  // Simplified, physically-motivated relationships for demonstration only
  const v0 = 140;   // typical cruise velocity m/s
  const m_core = 50;
  const vj_core = 500 - bpr * 15;                          // core jet velocity decreases with BPR
  const vj_bypass = bpr > 0 ? v0 * 1.5 + 50 / (bpr + 1) : 0;  // bypass jet velocity
  const m_total = m_core * (1 + bpr);

  const thrust = m_core * (vj_core - v0) + m_core * bpr * (vj_bypass - v0);
  const fuelFlow = m_core * 1.005 * (1400 - 700) / 43200;   // rough, constant
  const tsfc = fuelFlow / Math.max(1, thrust) * 3.6e6;       // mg/(N·s)
  const noise = 100 - bpr * 4;                               // dB (qualitative)

  return {
    Thrust: Math.max(0, thrust / 1000),  // kN
    TSFC: Math.min(25, Math.max(2, tsfc)),
    Noise: Math.max(50, noise),
  };
}

function BprSlider() {
  const [bpr, setBpr] = useState(5);
  const perf = qualitativePerformance(bpr);

  const data = [
    { name: `Thrust (kN)`, value: parseFloat(perf.Thrust.toFixed(2)), color: '#38bdf8' },
    { name: `TSFC (mg/N·s)`, value: parseFloat(perf.TSFC.toFixed(2)), color: '#f59e0b' },
    { name: `Noise (dB, qual.)`, value: parseFloat(perf.Noise.toFixed(1)), color: '#f87171' },
  ];

  return (
    <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-200">Interactive: Effect of Bypass Ratio</h4>
        <div className="text-lg font-bold text-blue-400">BPR = {bpr.toFixed(1)}</div>
      </div>
      <input
        type="range"
        min={0}
        max={12}
        step={0.5}
        value={bpr}
        onChange={e => setBpr(parseFloat(e.target.value))}
        className="w-full accent-blue-500 mb-4"
      />
      <div className="flex justify-between text-xs text-slate-500 mb-3">
        <span>Turbojet (0)</span>
        <span>Ultra-high bypass (12)</span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
          <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: 11 }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Bar dataKey="value" fill="#38bdf8" isAnimationActive={false}>
            {data.map((entry, index) => (
              <rect key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="text-xs text-slate-500 mt-2 text-center">
        Note: These are qualitative demonstrations only — use the Calculate tab for accurate physics.
      </div>
    </div>
  );
}

// ─── Content Sections ─────────────────────────────────────────────────────────

function Card({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className={`border rounded-lg p-4 ${color}`}>
      <h4 className="font-semibold text-sm mb-2">{title}</h4>
      {children}
    </div>
  );
}

export default function HelpSection() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Overview */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">How Does a Jet Engine Work?</h2>
        <p className="text-slate-300 text-sm leading-relaxed">
          A jet engine produces thrust by the reaction principle — Newton's Third Law. Air is
          ingested at the front, energy is added by burning fuel, and the hot gas is accelerated
          out of a nozzle at the back. The momentum increase of the air produces a forward force
          on the engine. In simplified form: <strong className="text-blue-300">T ≈ ṁ · (Vⱼ − V₀)</strong>,
          where ṁ is the air mass flow rate, Vⱼ is the jet exit velocity, and V₀ is the flight speed.
          Higher jet velocity or more mass flow means more thrust.
        </p>
      </section>

      {/* Brayton Cycle */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">The Brayton Cycle</h2>
        <p className="text-slate-400 text-xs mb-4">
          Every gas turbine engine runs on the Brayton thermodynamic cycle: intake → compression → combustion → expansion.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card title="1. Intake" color="border-slate-600 bg-slate-700/30">
            <p className="text-xs text-slate-400 leading-relaxed">
              Incoming air is slowed and its kinetic energy is converted to pressure (ram
              compression). Even at subsonic speeds this raises total temperature and pressure
              slightly: <em>Tt₂ = T∞ · (1 + (γ−1)/2 · M²)</em>.
            </p>
          </Card>
          <Card title="2. Compressor" color="border-blue-800 bg-blue-900/20">
            <p className="text-xs text-slate-400 leading-relaxed">
              Rotating compressor stages squeeze air to high pressure. More stages → higher
              OPR → better thermal efficiency. Each stage adds about 30% pressure (PR≈1.3
              per stage in axial compressors). The compressor requires shaft power from the
              turbine.
            </p>
          </Card>
          <Card title="3. Combustor" color="border-amber-700 bg-amber-900/20">
            <p className="text-xs text-slate-400 leading-relaxed">
              Fuel burns in the combustor, raising gas temperature to the turbine inlet
              temperature (TIT). More fuel → higher TIT → more energy available for thrust.
              TIT is strictly limited by turbine blade material strength (typically 1100–1600 K).
            </p>
          </Card>
          <Card title="4. Turbine + Nozzle" color="border-red-800 bg-red-900/20">
            <p className="text-xs text-slate-400 leading-relaxed">
              The turbine extracts just enough work from the hot gas to drive the compressor
              (and fan in turbofans). The remaining pressure and temperature drives gas through
              the nozzle, accelerating it to produce thrust. Efficient turbines leave low
              exit temperature, reducing waste heat.
            </p>
          </Card>
        </div>
      </section>

      {/* Turbofan vs Turbojet */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">Turbofan vs Turbojet</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-600">
                <th className="text-left py-2 px-3 text-slate-400 font-semibold">Aspect</th>
                <th className="text-left py-2 px-3 text-blue-400 font-semibold">Turbofan</th>
                <th className="text-left py-2 px-3 text-orange-400 font-semibold">Turbojet</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {[
                ['Thrust generation', 'Fan + core nozzle', 'Core nozzle only'],
                ['Subsonic fuel efficiency', 'Excellent (low TSFC)', 'Poor (high TSFC)'],
                ['Specific thrust (thrust/airflow)', 'Lower', 'Higher'],
                ['Noise level', 'Quiet (low Vⱼ)', 'Loud (high Vⱼ)'],
                ['Bypass ratio', '3–12+ (commercial)', '0'],
                ['Best application', 'Subsonic airliners, business jets', 'Supersonic fighters, some missiles'],
                ['Examples', 'CFM56, Trent 1000, GE90', 'J57, Olympus, J85'],
              ].map(([aspect, fan, jet], i) => (
                <tr key={i} className={`border-b border-slate-700/50 ${i % 2 === 0 ? 'bg-slate-800/30' : ''}`}>
                  <td className="py-2 px-3 font-medium text-slate-400">{aspect}</td>
                  <td className="py-2 px-3">{fan}</td>
                  <td className="py-2 px-3">{jet}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Key Parameters */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">Key Parameters Explained</h2>
        <div className="space-y-3">
          {[
            {
              term: 'Overall Pressure Ratio (OPR)',
              def: 'The ratio of pressure at the combustor inlet to the pressure at the compressor face. Higher OPR extracts more work from each kg of fuel burned. Modern engines achieve OPR of 35–50, compared to ~7 on early jet engines.',
            },
            {
              term: 'Bypass Ratio (BPR)',
              def: 'The ratio of air that bypasses the core to air that enters the core. A BPR of 8 means 8 kg of air flows through the bypass duct for every 1 kg entering the core. High BPR = large fan + small core = very quiet and fuel-efficient at subsonic cruise.',
            },
            {
              term: 'Turbine Inlet Temperature (TIT)',
              def: 'The maximum gas temperature entering the turbine. Higher TIT allows more energy to be extracted per unit of air mass, enabling higher thrust or better efficiency. It is the single biggest limitation in engine design — pushed higher only through exotic nickel superalloys, thermal barrier coatings, and active blade cooling.',
            },
            {
              term: 'TSFC (Thrust-Specific Fuel Consumption)',
              def: 'Fuel mass burned per unit of thrust per unit time [mg/(N·s) or kg/(N·h)]. Lower TSFC means better fuel efficiency. Modern high-BPR turbofans achieve TSFC around 15 mg/(N·s); turbojets of the 1950s were above 30 mg/(N·s).',
            },
            {
              term: 'Propulsive Efficiency (ηₚ)',
              def: 'The fraction of jet kinetic energy that is actually converted to useful thrust power. Maximum propulsive efficiency occurs when the jet velocity equals the flight speed (no kinetic energy wasted in the exhaust), but then thrust would be zero. High-BPR fans operating at low jet-to-flight-speed ratios achieve ηₚ above 70%.',
            },
          ].map(({ term, def }) => (
            <div key={term} className="bg-slate-700/30 border border-slate-700 rounded-lg p-3">
              <div className="text-sm font-semibold text-blue-300 mb-1">{term}</div>
              <p className="text-xs text-slate-400 leading-relaxed">{def}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Demo */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">Interactive Demo</h2>
        <BprSlider />
      </section>

      {/* Resources */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">Further Reading</h2>
        <div className="space-y-2">
          <div className="bg-slate-700/30 border border-slate-700 rounded-lg p-3">
            <div className="text-sm font-semibold text-slate-200 mb-1">NASA Glenn Research Center</div>
            <div className="text-xs text-slate-400 font-mono">
              https://www.grc.nasa.gov/www/k-12/airplane/turbine.html
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Excellent free resource explaining gas turbine propulsion with interactive animations.
            </p>
          </div>
          <div className="bg-slate-700/30 border border-slate-700 rounded-lg p-3">
            <div className="text-sm font-semibold text-slate-200 mb-1">Rolls-Royce: The Jet Engine</div>
            <div className="text-xs text-slate-400 font-mono">
              https://www.rolls-royce.com/media/our-stories/discover/2019/the-jet-engine-book.aspx
            </div>
            <p className="text-xs text-slate-500 mt-1">
              The classic reference book on gas turbine engines by Rolls-Royce. Highly recommended.
            </p>
          </div>
          <div className="bg-slate-700/30 border border-slate-700 rounded-lg p-3">
            <div className="text-sm font-semibold text-slate-200 mb-1">YouTube Channels</div>
            <p className="text-xs text-slate-400">
              Search <em>"how jet engine works"</em> on YouTube for excellent animated explanations
              by channels like <strong>Real Engineering</strong>, <strong>Lesics</strong>, and
              <strong> Mustard</strong>. These complement the equations in this tool with intuitive
              visualisations.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
