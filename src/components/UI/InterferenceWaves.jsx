import './InterferenceWaves.css';

// Frequencies chosen so both have periods dividing 600px — guarantees a seamless scroll loop
const F1 = (2 * Math.PI) / 150; // period 150px  (600 / 150 = 4 cycles)
const F2 = (2 * Math.PI) / 200; // period 200px  (600 / 200 = 3 cycles)
const F3 = (2 * Math.PI) / 75;  // period 75px   (600 / 75  = 8 cycles) — adds texture

function buildPath(cy, frequency, amplitude, totalWidth = 1200, pts = 400) {
  const d = [];
  for (let i = 0; i <= pts; i++) {
    const x = (i / pts) * totalWidth;
    const y = cy + Math.sin(x * frequency) * amplitude;
    d.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return d.join(' ');
}

function buildNoisePath(cy, totalWidth = 1200, pts = 400) {
  const d = [];
  for (let i = 0; i <= pts; i++) {
    const x = (i / pts) * totalWidth;
    const y = cy
      + Math.sin(x * F1) * 10
      + Math.sin(x * F2) * 8
      + Math.sin(x * F3) * 3;
    d.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return d.join(' ');
}

// Pre-computed at module level — pure constants, no need to recompute per render
const PATH_RM  = buildPath(45,  F1, 15);
const PATH_CMP = buildNoisePath(118);
const PATH_RKM = buildPath(192, F2, 12);

export default function InterferenceWaves({ color = '#22d3ee' }) {
  return (
    <div className="interference-waves">
      <svg
        viewBox="0 0 600 230"
        className="interference-waves-svg"
        aria-hidden="true"
        overflow="visible"
      >
        <defs>
          <filter id="iw-glow" x="-20%" y="-150%" width="140%" height="400%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="iw-clip">
            <rect x="0" y="0" width="600" height="230" />
          </clipPath>
        </defs>

        {/* Channel labels */}
        <text x="8" y="14" fontFamily="monospace" fontSize="8" letterSpacing="1.5" fill="#ee90ff" opacity="1">CH 1 — ROCKET MORTGAGE</text>
        <text x="8" y="92" fontFamily="monospace" fontSize="8" letterSpacing="1.5" fill={color} opacity="1">CH 2 — USER EXPERIENCE · COMBINED SIGNAL</text>
        <text x="8" y="170" fontFamily="monospace" fontSize="8" letterSpacing="1.5" fill="rgba(255,255,255,1)">CH 3 — ROCKET MONEY</text>

        {/* Band dividers */}
        <line x1="0" y1="78"  x2="600" y2="78"  stroke={color} strokeWidth="0.5" strokeDasharray="3 8" opacity="0.1" />
        <line x1="0" y1="158" x2="600" y2="158" stroke={color} strokeWidth="0.5" strokeDasharray="3 8" opacity="0.1" />

        {/* Wave 1 — Rocket Mortgage, scrolls forward */}
        <g clipPath="url(#iw-clip)">
          <g className="iw-scroll-fwd">
            <path d={PATH_RM} fill="none" stroke="#ee90ff" strokeWidth="1.5" opacity="0.7" />
          </g>
        </g>

        {/* Combined interference — middle, glowing, slightly slower */}
        <g clipPath="url(#iw-clip)">
          <g className="iw-scroll-mid">
            <path d={PATH_CMP} fill="none" stroke={color} strokeWidth="1.5" filter="url(#iw-glow)" />
          </g>
        </g>

        {/* Wave 3 — Rocket Money, scrolls in reverse to show opposition */}
        <g clipPath="url(#iw-clip)">
          <g className="iw-scroll-rev">
            <path d={PATH_RKM} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          </g>
        </g>

        {/* Footer caption */}
        <text x="300" y="224" textAnchor="middle" fontFamily="monospace" fontSize="7.5" letterSpacing="3" fill="rgba(255,255,255,0.7)" opacity="1">
          COMPETING SIGNALS — INCOHERENT OUTPUT
        </text>
      </svg>
    </div>
  );
}
