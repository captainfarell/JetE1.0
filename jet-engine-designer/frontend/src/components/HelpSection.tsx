import React from 'react';

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
        <h2 className="text-lg font-bold text-app-text mb-3">How Does a Jet Engine Work?</h2>
        <p className="text-app-text text-sm leading-relaxed">
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
        <h2 className="text-lg font-bold text-app-text mb-3">The Brayton Cycle</h2>
        <p className="text-app-secondary text-xs mb-4">
          Every gas turbine engine runs on the Brayton thermodynamic cycle: intake → compression → combustion → expansion.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card title="1. Intake" color="border-app-border bg-app-muted/30">
            <p className="text-xs text-app-secondary leading-relaxed">
              Incoming air is slowed and its kinetic energy is converted to pressure (ram
              compression). Even at subsonic speeds this raises total temperature and pressure
              slightly: <em>Tt₂ = T∞ · (1 + (γ−1)/2 · M²)</em>.
            </p>
          </Card>
          <Card title="2. Compressor" color="border-blue-800 bg-blue-900/20">
            <p className="text-xs text-app-secondary leading-relaxed">
              Rotating compressor stages squeeze air to high pressure. More stages → higher
              OPR → better thermal efficiency. Each stage adds about 30% pressure (PR≈1.3
              per stage in axial compressors). The compressor requires shaft power from the
              turbine.
            </p>
          </Card>
          <Card title="3. Combustor" color="border-amber-700 bg-amber-900/20">
            <p className="text-xs text-app-secondary leading-relaxed">
              Fuel burns in the combustor, raising gas temperature to the turbine inlet
              temperature (TIT). More fuel → higher TIT → more energy available for thrust.
              TIT is strictly limited by turbine blade material strength (typically 1100–1600 K).
            </p>
          </Card>
          <Card title="4. Turbine + Nozzle" color="border-red-800 bg-red-900/20">
            <p className="text-xs text-app-secondary leading-relaxed">
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
        <h2 className="text-lg font-bold text-app-text mb-3">Turbofan vs Turbojet</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-app-border">
                <th className="text-left py-2 px-3 text-app-secondary font-semibold">Aspect</th>
                <th className="text-left py-2 px-3 text-app-accent font-semibold">Turbofan</th>
                <th className="text-left py-2 px-3 text-orange-400 font-semibold">Turbojet</th>
              </tr>
            </thead>
            <tbody className="text-app-text">
              {[
                ['Thrust generation', 'Fan + core nozzle', 'Core nozzle only'],
                ['Subsonic fuel efficiency', 'Excellent (low TSFC)', 'Poor (high TSFC)'],
                ['Specific thrust (thrust/airflow)', 'Lower', 'Higher'],
                ['Noise level', 'Quiet (low Vⱼ)', 'Loud (high Vⱼ)'],
                ['Bypass ratio', '3–12+ (commercial)', '0'],
                ['Best application', 'Subsonic airliners, business jets', 'Supersonic fighters, some missiles'],
                ['Examples', 'CFM56, Trent 1000, GE90', 'J57, Olympus, J85'],
              ].map(([aspect, fan, jet], i) => (
                <tr key={i} className={`border-b border-app-border/50 ${i % 2 === 0 ? 'bg-app-surface/30' : ''}`}>
                  <td className="py-2 px-3 font-medium text-app-secondary">{aspect}</td>
                  <td className="py-2 px-3">{fan}</td>
                  <td className="py-2 px-3">{jet}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Unavailable architectures note */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-app-muted/30 border border-app-border rounded-lg p-3">
            <div className="text-xs font-semibold text-app-secondary uppercase tracking-wider mb-1">1-Spool Turbofan</div>
            <p className="text-xs text-app-secondary leading-relaxed">
              A single spool means the fan and core compressor share one shaft, forcing both to spin at the same speed.
              The fan needs low RPM (large diameter, high tip-speed limits) while the core compressor needs high RPM for aerodynamic efficiency.
              This conflict makes the design aerodynamically inefficient and impractical — all production turbofans use at least two spools to decouple fan and core speeds.
            </p>
          </div>
          <div className="bg-app-muted/30 border border-app-border rounded-lg p-3">
            <div className="text-xs font-semibold text-app-secondary uppercase tracking-wider mb-1">3-Spool Turbojet</div>
            <p className="text-xs text-app-secondary leading-relaxed">
              Three spools on a turbojet add mechanical complexity (three concentric shafts, three sets of bearings) without a meaningful efficiency gain,
              since turbojets already lack the bypass stream that makes multi-spool architecture worthwhile in turbofans.
              The added weight and cost outweigh any marginal benefit, so no manufacturer has produced a 3-spool turbojet for commercial or widespread military service.
            </p>
          </div>
        </div>
      </section>

      {/* Key Parameters */}
      <section>
        <h2 className="text-lg font-bold text-app-text mb-3">Key Parameters Explained</h2>
        <div className="space-y-3">
          {[
            {
              term: 'International Standard Atmosphere (ISA)',
              def: 'A standardised atmospheric model (ICAO / ISO 2533) that defines how temperature, pressure, and density vary with altitude, giving engineers a common reference for reporting and comparing engine performance. In the troposphere (0–11 km) temperature decreases at 6.5 K/km from 288.15 K (15 °C) at sea level, and pressure and density fall accordingly. In the lower stratosphere (11–20 km) temperature is constant at 216.65 K (−56.5 °C) while pressure and density continue to decay exponentially. Because thrust, TSFC, and specific power all depend on ambient conditions, quoting a result "at ISA sea-level static" lets you compare any two engines on equal terms. Deviations are written as ISA±ΔT — for example ISA+15 means the ambient temperature is 15 °C above the standard value, the condition used for hot-day performance certification.',
            },
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
            <div key={term} className="bg-app-muted/30 border border-app-border rounded-lg p-3">
              <div className="text-sm font-semibold text-blue-300 mb-1">{term}</div>
              <p className="text-xs text-app-secondary leading-relaxed">{def}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Resources */}
      <section>
        <h2 className="text-lg font-bold text-app-text mb-3">Further Reading</h2>

        <p className="text-xs text-app-secondary mb-3 uppercase tracking-wider font-semibold">Free resources</p>
        <div className="space-y-2 mb-5">
          <div className="bg-app-muted/30 border border-app-border rounded-lg p-3">
            <div className="text-sm font-semibold text-app-text mb-1">NASA Glenn — Beginner's Guide to Propulsion</div>
            <div className="text-xs text-app-secondary font-mono">
              https://www.grc.nasa.gov/www/k-12/airplane/turbine.html
            </div>
            <p className="text-xs text-app-secondary mt-1">
              Free web resource covering Brayton cycle, compressors, turbines, thrust, and TSFC with interactive animations.
            </p>
          </div>
          <div className="bg-app-muted/30 border border-app-border rounded-lg p-3">
            <div className="text-sm font-semibold text-app-text mb-1">NIST Chemistry WebBook</div>
            <div className="text-xs text-app-secondary font-mono">
              https://webbook.nist.gov
            </div>
            <p className="text-xs text-app-secondary mt-1">
              Free database of thermodynamic properties for aviation fuels and other substances.
            </p>
          </div>
          <div className="bg-app-muted/30 border border-app-border rounded-lg p-3">
            <div className="text-sm font-semibold text-app-text mb-1">YouTube Channels</div>
            <p className="text-xs text-app-secondary">
              Search <em>"how jet engine works"</em> on YouTube for excellent animated explanations
              by channels like <strong>Real Engineering</strong>, <strong>Lesics</strong>, and
              <strong> Mustard</strong>. These complement the equations in this tool with intuitive
              visualisations.
            </p>
          </div>
        </div>

        <p className="text-xs text-app-secondary mb-3 uppercase tracking-wider font-semibold">Textbooks (purchase required)</p>
        <div className="space-y-2 mb-5">
          {[
            {
              title: 'Rolls-Royce: The Jet Engine',
              detail: '5th ed., Rolls-Royce plc, 1996',
              note: 'The classic qualitative reference on gas turbine architecture, materials, and operation.',
            },
            {
              title: 'Saravanamuttoo, H.I.H. et al. — Gas Turbine Theory',
              detail: '6th ed., Pearson, 2009',
              note: 'Primary academic reference for Brayton cycle analysis and turbomachinery efficiency formulations.',
            },
            {
              title: 'Mattingly, J.D. — Elements of Gas Turbine Propulsion',
              detail: 'McGraw-Hill, 1996',
              note: 'Rigorous treatment of thrust equations, nozzle flow, and spool work-balance derivations.',
            },
            {
              title: 'Walsh, P.P. and Fletcher, P. — Gas Turbine Performance',
              detail: '2nd ed., Blackwell / ASME Press, 2004',
              note: 'Performance sweep methodology, TSFC conventions, and off-design modelling principles.',
            },
          ].map(({ title, detail, note }) => (
            <div key={title} className="bg-app-muted/30 border border-app-border rounded-lg p-3">
              <div className="text-sm font-semibold text-app-text mb-0.5">{title}</div>
              <div className="text-xs text-app-secondary font-mono mb-1">{detail}</div>
              <p className="text-xs text-app-secondary">{note}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-app-secondary mb-3 uppercase tracking-wider font-semibold">Standards (purchase required)</p>
        <div className="space-y-2">
          {[
            {
              title: 'SAE ARP755 — Gas Turbine Engine Performance Station Identification and Nomenclature',
              detail: 'SAE International, current revision',
              note: 'Defines the station numbering convention (0, 2, 21, 25, 3, 4, 45, 5, 55, 9, 19) used throughout this app.',
            },
            {
              title: 'ISO 2533:1975 — Standard Atmosphere',
              detail: 'International Organisation for Standardisation, 1975',
              note: 'International Standard Atmosphere temperature lapse rates and reference conditions implemented in the atmosphere model.',
            },
            {
              title: 'ASTM D1655 — Standard Specification for Aviation Turbine Fuels',
              detail: 'ASTM International, current revision',
              note: 'Basis for Jet-A fuel specification; LHV = 43.2 MJ/kg used in the combustor energy balance.',
            },
          ].map(({ title, detail, note }) => (
            <div key={title} className="bg-app-muted/30 border border-app-border rounded-lg p-3">
              <div className="text-sm font-semibold text-app-text mb-0.5">{title}</div>
              <div className="text-xs text-app-secondary font-mono mb-1">{detail}</div>
              <p className="text-xs text-app-secondary">{note}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
