import './FragmentedOrbits.css';

const SYSTEMS = [
  { id: 'phone', label: 'PHONE', cx: 128, cy: 105, rx: 82, ry: 28, dur: '9s',  begin: '0s'    },
  { id: 'text',  label: 'TEXT',  cx: 300, cy:  88, rx: 68, ry: 20, dur: '13s', begin: '-4s'   },
  { id: 'chat',  label: 'CHAT',  cx: 472, cy: 112, rx: 86, ry: 32, dur: '11s', begin: '-2.5s' },
];

function ellipsePath(cx, cy, rx, ry) {
  return `M ${cx + rx},${cy} A ${rx},${ry} 0 0 1 ${cx - rx},${cy} A ${rx},${ry} 0 0 1 ${cx + rx},${cy}`;
}

export default function FragmentedOrbits({ color = '#f5c842' }) {
  return (
    <div className="fragmented-orbits">
      <svg
        viewBox="0 0 600 230"
        xmlns="http://www.w3.org/2000/svg"
        className="fragmented-orbits-svg"
        aria-hidden="true"
        overflow="visible"
      >
        <defs>
          <filter id="fo-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {SYSTEMS.map(s => (
            <path key={s.id} id={`fo-path-${s.id}`} d={ellipsePath(s.cx, s.cy, s.rx, s.ry)} fill="none" />
          ))}
        </defs>

        {/* Broken connection indicators — barely visible dashed lines suggesting these should connect */}
        <line x1="213" y1="105" x2="232" y2="88" stroke={color} strokeWidth="0.5" strokeDasharray="2 9" opacity="0.1" />
        <line x1="370" y1="88"  x2="386" y2="112" stroke={color} strokeWidth="0.5" strokeDasharray="2 9" opacity="0.1" />

        {SYSTEMS.map(s => (
          <g key={s.id}>
            {/* Outer orbit ring */}
            <ellipse
              cx={s.cx} cy={s.cy}
              rx={s.rx} ry={s.ry}
              fill="none"
              stroke={color}
              strokeWidth="1"
              opacity="0.18"
            />

            {/* Inner dashed ring */}
            

            {/* Center marker — pulsing crosshair */}
            <circle cx={s.cx} cy={s.cy} r="2.5" fill={color} opacity="0.5" />
            

            {/* Orbiting dot */}
            <circle r="4.5" fill={color} filter="url(#fo-glow)">
              <animateMotion dur={s.dur} repeatCount="indefinite" begin={s.begin}>
                <mpath href={`#fo-path-${s.id}`} />
              </animateMotion>
            </circle>

            {/* Label */}
            <text
              x={s.cx}
              y={s.cy + s.ry + 18}
              textAnchor="middle"
              fontFamily="monospace"
              fontSize="10"
              letterSpacing="2"
              fill={color}
              opacity="0.7"
            >
              {s.label}
            </text>
          </g>
        ))}

        {/* Footer label */}
        <text
          x="300" y="215"
          textAnchor="middle"
          fontFamily="monospace"
          fontSize="8"
          letterSpacing="3"
          fill={color}
          opacity="0.7"
        >
          FRAGMENTED CHANNELS — NO SHARED CENTER
        </text>
      </svg>
    </div>
  );
}
