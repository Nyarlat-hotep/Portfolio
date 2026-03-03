import './ThroughputCollapse.css';

const LINE_COUNT = 20;
const BEFORE_X1  = 22;
const BEFORE_X2  = 282;
const DIV_X      = 300;
const AFTER_X1   = 318;
const AFTER_X2   = 578;
const TOP_Y      = 20;
const BOTTOM_Y   = 195;
const SURVIVOR   = 10; // center line index — the one that gets through

// How far each blocked line travels past the divider before stopping.
// 19 values (one per non-survivor line, index 0-8 = above survivor, 9-18 = below).
const BLOCK_REACH = [19, 29, 41, 12, 52, 43, 23, 61, 16, 35, 20, 54, 45, 9, 39, 27, 49, 13, 31];

function lineY(i) {
  return TOP_Y + (i / (LINE_COUNT - 1)) * (BOTTOM_Y - TOP_Y);
}

export default function ThroughputCollapse({ color = '#ec4899' }) {
  const blocked = Array.from({ length: LINE_COUNT }, (_, i) => i).filter(i => i !== SURVIVOR);

  return (
    <div className="throughput-collapse">
      <svg viewBox="0 0 600 222" className="throughput-collapse-svg" aria-hidden="true">
        <defs>
          <filter id="tc-glow" x="-20%" y="-150%" width="140%" height="400%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Panel labels */}
        <text x="152" y="12" textAnchor="middle" fontFamily="monospace" fontSize="8" letterSpacing="2" fill={color} opacity="0.9">BEFORE MIGRATION</text>
        <text x="448" y="12" textAnchor="middle" fontFamily="monospace" fontSize="8" letterSpacing="2" fill={color} opacity="0.9">AFTER MIGRATION</text>

        {/* Delivery status labels */}
        <text x="152" y="214" textAnchor="middle" fontFamily="monospace" fontSize="8.5" letterSpacing="1.5" fill={color} opacity="0.9">ALL DELIVERED</text>
        <text x="448" y="214" textAnchor="middle" fontFamily="monospace" fontSize="8.5" letterSpacing="1.5" fill={color} opacity="0.9">MOST BLOCKED</text>

        {/* Migration event divider */}
        <line x1={DIV_X} y1="6" x2={DIV_X} y2="205" stroke={color} strokeWidth="0.5" strokeDasharray="4 6" opacity="0.7" />

        {/* BEFORE: all 20 lines flowing to the divider — all delivered */}
        {Array.from({ length: LINE_COUNT }, (_, i) => (
          <line
            key={`before-${i}`}
            x1={BEFORE_X1} y1={lineY(i)}
            x2={BEFORE_X2} y2={lineY(i)}
            stroke={color}
            strokeWidth="1"
            strokeDasharray="3 9"
            opacity="0.7"
            className="tc-march"
            style={{ animationDelay: `${-(i * 0.07)}s` }}
          />
        ))}

        {/* AFTER: 19 blocked lines — same volume sent, stopped short by spam filters */}
        {blocked.map((lineIdx, idx) => (
          <line
            key={`blocked-${lineIdx}`}
            x1={AFTER_X1} y1={lineY(lineIdx)}
            x2={AFTER_X1 + BLOCK_REACH[idx]} y2={lineY(lineIdx)}
            stroke={color}
            strokeWidth="1"
            strokeDasharray="3 9"
            opacity="0.7"
            className="tc-march"
            style={{ animationDelay: `${-(lineIdx * 0.07)}s` }}
          />
        ))}


        {/* AFTER: survivor — glowing, delivered */}
        <line
          x1={AFTER_X1} y1={lineY(SURVIVOR)}
          x2={AFTER_X2} y2={lineY(SURVIVOR)}
          stroke={color}
          strokeWidth="2"
          strokeDasharray="8 4"
          filter="url(#tc-glow)"
          className="tc-march-fast"
        />
      </svg>
    </div>
  );
}
