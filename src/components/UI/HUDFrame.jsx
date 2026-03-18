import { useState, useEffect, useRef } from 'react';
import './HUDFrame.css';

// Mini graph — pre-computed wave paths for the top-right corner graph view
// Path is 2× the clip width (72px) so animating translateX(-36px) loops seamlessly.
// Both wave frequencies are chosen so 36px == exact N periods → seamless loop.
function buildHudWave(totalWidth, cycles, amplitude, startX, cy, pts = 120) {
  const freq = (2 * Math.PI * cycles) / totalWidth;
  const d = [];
  for (let i = 0; i <= pts; i++) {
    const x = startX + (i / pts) * totalWidth;
    const y = cy + Math.sin(x * freq) * amplitude;
    d.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return d.join(' ');
}
// Graph sits inside inner bracket (182,10)→(250,10)→(250,78) with G=6 equal gap on all sides.
// Frame: x=188 y=16 w=56 h=48. Clip interior: x=189 y=17 w=54 h=46 → cy=40.
// Path: 2×54=108px wide for seamless −54px scroll.
// Wave 1: 4 cycles/108 → period 27, 54/27=2 full periods → seamless ✓
// Wave 2: 2 cycles/108 → period 54, 54/54=1 full period  → seamless ✓
const HUD_GR_CY = 40;
const HUD_WAVE_1 = buildHudWave(108, 4, 11, 188, HUD_GR_CY); // 4 cycles, bright
const HUD_WAVE_2 = buildHudWave(108, 2,  7, 188, HUD_GR_CY); // 2 cycles, dimmer

const COORDS_L  = ['X:0423 Y:1848', 'X:0891 Y:2103', 'X:0156 Y:0942'];
const COORDS_R  = ['X:2847 Y:0431', 'X:1203 Y:0788', 'X:3341 Y:1092'];
const READOUT_L = ['847.23', '291.64', '503.81', '174.09'];
const READOUT_R = ['F4A2:3C', '8C71:9E', 'E239:B5', 'A017:F2'];
const READOUT_GR = ['3.847', '12.09', '0.531', '7.284', '4.162', '9.003'];
const GLYPHS    = '0123456789ABCDEF:./_ ';

function useScramble(target, speed = 38, cycles = 5) {
  const [display, setDisplay] = useState(target);
  const prev = useRef(target);

  useEffect(() => {
    if (prev.current === target) return;
    prev.current = target;

    let frame = 0;
    const totalFrames = target.length * cycles;
    const id = setInterval(() => {
      frame++;
      const resolved = Math.floor(frame / cycles);
      setDisplay(
        target.split('').map((ch, i) => {
          if (i < resolved) return ch;
          if (ch === ' ') return ' ';
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }).join('')
      );
      if (frame >= totalFrames) {
        setDisplay(target);
        clearInterval(id);
      }
    }, speed);

    return () => clearInterval(id);
  }, [target, speed, cycles]);

  return display;
}

export default function HUDFrame() {
  const [coordLIdx,  setCoordLIdx]  = useState(0);
  const [coordRIdx,  setCoordRIdx]  = useState(1);
  const [signalL,    setSignalL]    = useState(94);
  const [signalR,    setSignalR]    = useState(87);
  const [readLIdx,   setReadLIdx]   = useState(0);
  const [readRIdx,   setReadRIdx]   = useState(2);
  const [readGrIdx,  setReadGrIdx]  = useState(0);

  useEffect(() => {
    const t1 = setInterval(() => setCoordLIdx(i => (i + 1) % COORDS_L.length), 6000);
    const t2 = setInterval(() => setCoordRIdx(i => (i + 1) % COORDS_R.length), 7200);
    const t3 = setInterval(() => {
      setSignalL(v => Math.min(99, Math.max(88, v + (Math.random() > 0.5 ? 1 : -1))));
      setSignalR(v => Math.min(99, Math.max(82, v + (Math.random() > 0.5 ? 1 : -1))));
    }, 2200);
    const t4 = setInterval(() => setReadLIdx(i => (i + 1) % READOUT_L.length), 3800);
    const t5 = setInterval(() => setReadRIdx(i => (i + 1) % READOUT_R.length), 4600);
    const t6 = setInterval(() => setReadGrIdx(i => (i + 1) % READOUT_GR.length), 3200);
    return () => [t1, t2, t3, t4, t5, t6].forEach(clearInterval);
  }, []);

  const coordLText  = useScramble(COORDS_L[coordLIdx],  55, 6);
  const coordRText  = useScramble(COORDS_R[coordRIdx],  55, 6);
  const sigLText    = useScramble(`SIG ${signalL}%`,    45, 4);
  const sigRText    = useScramble(`SIG ${signalR}%`,    45, 4);
  const readLText   = useScramble(READOUT_L[readLIdx],  28, 4);
  const readRText   = useScramble(READOUT_R[readRIdx],  28, 4);
  const readGrText  = useScramble(READOUT_GR[readGrIdx], 28, 4);

  return (
    <div className="hud-frame" aria-hidden="true">

      {/* Top-left corner — L bracket + diagonal hatching inside corner */}
      <svg className="hud-tl" viewBox="0 0 260 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="clip-tl">
            <rect x="20" y="20" width="28" height="58"/>
          </clipPath>
        </defs>
        <g clipPath="url(#clip-tl)">
          <line x1="-100" y1="-154" x2="200" y2="146" stroke="rgba(255,119,0,0.36)" strokeWidth="5"/>
          <line x1="-100" y1="-136" x2="200" y2="164" stroke="rgba(255,119,0,0.36)" strokeWidth="5"/>
          <line x1="-100" y1="-118" x2="200" y2="182" stroke="rgba(255,119,0,0.36)" strokeWidth="5"/>
          <line x1="-100" y1="-100" x2="200" y2="200" stroke="rgba(255,119,0,0.36)" strokeWidth="5"/>
          <line x1="-100" y1="-82"  x2="200" y2="218" stroke="rgba(255,119,0,0.36)" strokeWidth="5"/>
          <line x1="-100" y1="-64"  x2="200" y2="236" stroke="rgba(255,119,0,0.36)" strokeWidth="5"/>
          <line x1="-100" y1="-46"  x2="200" y2="254" stroke="rgba(255,119,0,0.36)" strokeWidth="5"/>
        </g>
        <polyline points="90,2 2,2 2,90" fill="none" stroke="rgba(255,119,0,0.78)" strokeWidth="2"/>
        <polyline points="78,10 10,10 10,78" fill="none" stroke="rgba(255,119,0,0.36)" strokeWidth="1"/>
        <line x1="90" y1="2" x2="220" y2="2" stroke="rgba(255,119,0,0.44)" strokeWidth="1"/>
        <line x1="150" y1="2" x2="150" y2="10" stroke="rgba(255,119,0,0.36)" strokeWidth="1"/>
        <circle cx="220" cy="2" r="3" fill="rgba(255,119,0,0.88)" className="hud-blink"/>
        <line x1="2" y1="90" x2="2" y2="170" stroke="rgba(255,119,0,0.44)" strokeWidth="1"/>
        <line x1="2" y1="130" x2="36" y2="130" stroke="rgba(255,119,0,0.32)" strokeWidth="1"/>
        <circle cx="36" cy="130" r="2.5" fill="rgba(255,119,0,0.65)" className="hud-blink-slow"/>
        <line x1="2" y1="155" x2="18" y2="155" stroke="rgba(255,119,0,0.48)" strokeWidth="1"/>
        <text x="14" y="190" fontSize="7" fontFamily="monospace" fill="rgba(255,119,0,0.65)" className="hud-text">{coordLText}</text>
      </svg>

      {/* Top-right corner — mirror of top-left, with mini graph replacing hatch */}
      <svg className="hud-tr" viewBox="0 0 260 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="clip-tr">
            <rect x="189" y="17" width="54" height="46"/>
          </clipPath>
        </defs>

        {/* Graph frame — equal 6px gap from inner bracket lines (top y=10, left x=182, right x=250) */}
        <rect x="188" y="16" width="56" height="48"
          fill="rgba(255,119,0,0.06)"
          stroke="rgba(255,119,0,0.48)"
          strokeWidth="0.75" rx="1"/>
        {/* Baseline */}
        <line x1="189" y1="40" x2="243" y2="40"
          stroke="rgba(255,119,0,0.65)" strokeWidth="0.5"/>

        {/* Wave 1 — brighter orange, faster */}
        <g clipPath="url(#clip-tr)">
          <g className="hud-wave-1">
            <path d={HUD_WAVE_1} fill="none" stroke="rgba(255,119,0,0.58)" strokeWidth="1.2"/>
          </g>
        </g>

        {/* Wave 2 — dimmer amber, slower */}
        <g clipPath="url(#clip-tr)">
          <g className="hud-wave-2">
            <path d={HUD_WAVE_2} fill="none" stroke="rgba(255,185,55,0.62)" strokeWidth="0.9"/>
          </g>
        </g>

        {/* Graph readout — tiny number below graph frame */}
        <text x="244" y="74" fontSize="9" fontFamily="monospace"
          fill="rgba(255,155,30,0.85)" textAnchor="end" className="hud-text">{readGrText}</text>

        <polyline points="170,2 258,2 258,90" fill="none" stroke="rgba(255,119,0,0.78)" strokeWidth="2"/>
        <polyline points="182,10 250,10 250,78" fill="none" stroke="rgba(255,119,0,0.36)" strokeWidth="1"/>
        <line x1="170" y1="2" x2="40" y2="2" stroke="rgba(255,119,0,0.44)" strokeWidth="1"/>
        <line x1="110" y1="2" x2="110" y2="10" stroke="rgba(255,119,0,0.36)" strokeWidth="1"/>
        <circle cx="40" cy="2" r="3" fill="rgba(255,119,0,0.88)" className="hud-blink-offset"/>
        <line x1="258" y1="90" x2="258" y2="170" stroke="rgba(255,119,0,0.44)" strokeWidth="1"/>
        <line x1="258" y1="130" x2="224" y2="130" stroke="rgba(255,119,0,0.32)" strokeWidth="1"/>
        <circle cx="224" cy="130" r="2.5" fill="rgba(255,119,0,0.65)" className="hud-blink-slow"/>
        <line x1="258" y1="155" x2="242" y2="155" stroke="rgba(255,119,0,0.48)" strokeWidth="1"/>
        <text x="246" y="190" fontSize="7" fontFamily="monospace" fill="rgba(255,119,0,0.65)" textAnchor="end" className="hud-text">{coordRText}</text>
      </svg>

      {/* Top-center — scan bar */}
      <svg className="hud-tc" viewBox="0 0 340 32" xmlns="http://www.w3.org/2000/svg">
        <line x1="28" y1="16" x2="312" y2="16" stroke="rgba(255,119,0,0.36)" strokeWidth="1"/>
        <line x1="28" y1="8"  x2="14" y2="24" stroke="rgba(255,119,0,0.58)" strokeWidth="1.5"/>
        <line x1="40" y1="8"  x2="26" y2="24" stroke="rgba(255,119,0,0.44)" strokeWidth="1.5"/>
        <line x1="52" y1="8"  x2="38" y2="24" stroke="rgba(255,119,0,0.48)" strokeWidth="1.5"/>
        <line x1="300" y1="8" x2="314" y2="24" stroke="rgba(255,119,0,0.58)" strokeWidth="1.5"/>
        <line x1="288" y1="8" x2="302" y2="24" stroke="rgba(255,119,0,0.44)" strokeWidth="1.5"/>
        <line x1="276" y1="8" x2="290" y2="24" stroke="rgba(255,119,0,0.48)" strokeWidth="1.5"/>
        <polygon points="170,8 178,16 170,24 162,16" fill="none" stroke="rgba(255,119,0,0.65)" strokeWidth="1.5"/>
        <rect className="hud-scan-rect" x="0" y="12" width="60" height="8" fill="url(#scanGrad)" rx="1"/>
        <defs>
          <linearGradient id="scanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,119,0,0)" />
            <stop offset="50%" stopColor="rgba(255,119,0,0.58)" />
            <stop offset="100%" stopColor="rgba(255,119,0,0)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Secondary center bar — stepped geometric HUD bar */}
      <svg className="hud-tc2" viewBox="0 0 500 40" xmlns="http://www.w3.org/2000/svg">

        {/* Full-width thin baseline */}
        <line x1="0" y1="20" x2="500" y2="20" stroke="rgba(255,119,0,0.28)" strokeWidth="0.75"/>

        {/* ── LEFT SIDE ──────────────────────────────── */}

        {/* Short steep diagonal opening into outer box */}
        <line x1="96" y1="20" x2="112" y2="13" stroke="rgba(255,119,0,0.55)" strokeWidth="1"/>
        <line x1="96" y1="20" x2="112" y2="27" stroke="rgba(255,119,0,0.55)" strokeWidth="1"/>

        {/* Outer box fill */}
        <polygon points="96,20 112,13 190,13 190,27 112,27 96,20" fill="rgba(255,119,0,0.08)"/>

        {/* Outer box top rail — double line for depth */}
        <line x1="112" y1="13" x2="190" y2="13" stroke="rgba(255,119,0,0.62)" strokeWidth="1"/>
        <line x1="116" y1="15" x2="186" y2="15" stroke="rgba(255,119,0,0.25)" strokeWidth="0.75"/>
        {/* Outer box bottom rail — double line */}
        <line x1="112" y1="27" x2="190" y2="27" stroke="rgba(255,119,0,0.62)" strokeWidth="1"/>
        <line x1="116" y1="25" x2="186" y2="25" stroke="rgba(255,119,0,0.25)" strokeWidth="0.75"/>

        {/* Step-in diagonal — outer box to inner box */}
        <line x1="190" y1="13" x2="207" y2="17" stroke="rgba(255,119,0,0.55)" strokeWidth="1"/>
        <line x1="190" y1="27" x2="207" y2="23" stroke="rgba(255,119,0,0.55)" strokeWidth="1"/>
        <polygon points="190,13 207,17 207,23 190,27" fill="rgba(255,119,0,0.10)"/>

        {/* Inner box rails + fill */}
        <line x1="207" y1="17" x2="233" y2="17" stroke="rgba(255,119,0,0.70)" strokeWidth="1"/>
        <line x1="207" y1="23" x2="233" y2="23" stroke="rgba(255,119,0,0.70)" strokeWidth="1"/>
        <rect x="207" y="17" width="26" height="6" fill="rgba(255,119,0,0.13)"/>

        {/* Inner box exit diagonal to diamond */}
        <line x1="233" y1="17" x2="238" y2="19" stroke="rgba(255,119,0,0.62)" strokeWidth="1"/>
        <line x1="233" y1="23" x2="238" y2="21" stroke="rgba(255,119,0,0.62)" strokeWidth="1"/>

        {/* ── RIGHT SIDE (mirror) ─────────────────────── */}

        <line x1="404" y1="20" x2="388" y2="13" stroke="rgba(255,119,0,0.55)" strokeWidth="1"/>
        <line x1="404" y1="20" x2="388" y2="27" stroke="rgba(255,119,0,0.55)" strokeWidth="1"/>

        <polygon points="404,20 388,13 310,13 310,27 388,27 404,20" fill="rgba(255,119,0,0.08)"/>

        <line x1="388" y1="13" x2="310" y2="13" stroke="rgba(255,119,0,0.62)" strokeWidth="1"/>
        <line x1="384" y1="15" x2="314" y2="15" stroke="rgba(255,119,0,0.25)" strokeWidth="0.75"/>
        <line x1="388" y1="27" x2="310" y2="27" stroke="rgba(255,119,0,0.62)" strokeWidth="1"/>
        <line x1="384" y1="25" x2="314" y2="25" stroke="rgba(255,119,0,0.25)" strokeWidth="0.75"/>

        <line x1="310" y1="13" x2="293" y2="17" stroke="rgba(255,119,0,0.55)" strokeWidth="1"/>
        <line x1="310" y1="27" x2="293" y2="23" stroke="rgba(255,119,0,0.55)" strokeWidth="1"/>
        <polygon points="310,13 293,17 293,23 310,27" fill="rgba(255,119,0,0.10)"/>

        <line x1="293" y1="17" x2="267" y2="17" stroke="rgba(255,119,0,0.70)" strokeWidth="1"/>
        <line x1="293" y1="23" x2="267" y2="23" stroke="rgba(255,119,0,0.70)" strokeWidth="1"/>
        <rect x="267" y="17" width="26" height="6" fill="rgba(255,119,0,0.13)"/>

        <line x1="267" y1="17" x2="262" y2="19" stroke="rgba(255,119,0,0.62)" strokeWidth="1"/>
        <line x1="267" y1="23" x2="262" y2="21" stroke="rgba(255,119,0,0.62)" strokeWidth="1"/>

        {/* ── CENTER DIAMOND ─────────────────────────── */}
        <polygon points="250,13 264,20 250,27 236,20" fill="rgba(255,119,0,0.14)" stroke="rgba(255,119,0,0.75)" strokeWidth="1"/>
        <polygon points="250,16 260,20 250,24 240,20" fill="rgba(255,119,0,0.28)" stroke="rgba(255,119,0,0.48)" strokeWidth="0.75"/>

        {/* Tick marks above outer rail */}
        <line x1="132" y1="13" x2="132" y2="10" stroke="rgba(255,119,0,0.42)" strokeWidth="1"/>
        <line x1="148" y1="13" x2="148" y2="10" stroke="rgba(255,119,0,0.32)" strokeWidth="1"/>
        <line x1="164" y1="13" x2="164" y2="10" stroke="rgba(255,119,0,0.32)" strokeWidth="1"/>
        <line x1="368" y1="13" x2="368" y2="10" stroke="rgba(255,119,0,0.42)" strokeWidth="1"/>
        <line x1="352" y1="13" x2="352" y2="10" stroke="rgba(255,119,0,0.32)" strokeWidth="1"/>
        <line x1="336" y1="13" x2="336" y2="10" stroke="rgba(255,119,0,0.32)" strokeWidth="1"/>
      </svg>

      {/* Side-left — segmented indicator */}
      <svg className="hud-sl" viewBox="0 0 90 50" xmlns="http://www.w3.org/2000/svg">
        <line x1="10" y1="20" x2="10" y2="28" stroke="rgba(255,119,0,0.52)"  strokeWidth="1.5"/>
        <line x1="22" y1="23" x2="22" y2="28" stroke="rgba(255,119,0,0.36)"  strokeWidth="1"/>
        <line x1="34" y1="23" x2="34" y2="28" stroke="rgba(255,119,0,0.48)" strokeWidth="1"/>
        <line x1="46" y1="23" x2="46" y2="28" stroke="rgba(255,119,0,0.36)"  strokeWidth="1"/>
        <line x1="58" y1="20" x2="58" y2="28" stroke="rgba(255,119,0,0.52)"  strokeWidth="1.5"/>
        <line x1="0" y1="28" x2="72" y2="28" stroke="rgba(255,119,0,0.36)" strokeWidth="1"/>
        <line x1="72" y1="28" x2="86" y2="14" stroke="rgba(255,119,0,0.36)" strokeWidth="1"/>
        <circle cx="86" cy="14" r="2" fill="rgba(255,119,0,0.58)" className="hud-blink-offset"/>
        <line x1="40" y1="28" x2="40" y2="42" stroke="rgba(255,119,0,0.32)" strokeWidth="1"/>
        <line x1="40" y1="42" x2="60" y2="42" stroke="rgba(255,119,0,0.32)" strokeWidth="1"/>
      </svg>

      {/* Side-right — mirror of side-left */}
      <svg className="hud-sr" viewBox="0 0 90 50" xmlns="http://www.w3.org/2000/svg">
        <line x1="80" y1="20" x2="80" y2="28" stroke="rgba(255,119,0,0.52)"  strokeWidth="1.5"/>
        <line x1="68" y1="23" x2="68" y2="28" stroke="rgba(255,119,0,0.36)"  strokeWidth="1"/>
        <line x1="56" y1="23" x2="56" y2="28" stroke="rgba(255,119,0,0.48)" strokeWidth="1"/>
        <line x1="44" y1="23" x2="44" y2="28" stroke="rgba(255,119,0,0.36)"  strokeWidth="1"/>
        <line x1="32" y1="20" x2="32" y2="28" stroke="rgba(255,119,0,0.52)"  strokeWidth="1.5"/>
        <line x1="90" y1="28" x2="18" y2="28" stroke="rgba(255,119,0,0.36)" strokeWidth="1"/>
        <line x1="18" y1="28" x2="4"  y2="14" stroke="rgba(255,119,0,0.36)" strokeWidth="1"/>
        <circle cx="4" cy="14" r="2" fill="rgba(255,119,0,0.58)" className="hud-blink-slow"/>
        <line x1="50" y1="28" x2="50" y2="42" stroke="rgba(255,119,0,0.32)" strokeWidth="1"/>
        <line x1="50" y1="42" x2="30" y2="42" stroke="rgba(255,119,0,0.32)" strokeWidth="1"/>
      </svg>

      {/* Mid-left — circuit trace panel */}
      <svg className="hud-ml" viewBox="0 0 85 80" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="40" x2="62" y2="40" stroke="rgba(255,119,0,0.65)" strokeWidth="1"/>
        <line x1="62" y1="40" x2="78" y2="24" stroke="rgba(255,119,0,0.65)" strokeWidth="1"/>
        <line x1="62" y1="40" x2="78" y2="56" stroke="rgba(255,119,0,0.65)" strokeWidth="1"/>
        <line x1="35" y1="40" x2="35" y2="18" stroke="rgba(255,119,0,0.48)" strokeWidth="1"/>
        <circle cx="35" cy="14" r="2" fill="rgba(255,119,0,0.58)" className="hud-blink-offset"/>
        <line x1="50" y1="40" x2="50" y2="32" stroke="rgba(255,119,0,0.65)" strokeWidth="1"/>
        <circle cx="78" cy="24" r="2.5" fill="rgba(255,119,0,0.52)"/>
        <text x="2" y="11" fontSize="7" fontFamily="monospace" fill="rgba(255,119,0,0.62)" className="hud-text">{sigLText}</text>
      </svg>

      {/* Mid-right — mirror of mid-left */}
      <svg className="hud-mr" viewBox="0 0 85 80" xmlns="http://www.w3.org/2000/svg">
        <line x1="85" y1="40" x2="23" y2="40" stroke="rgba(255,119,0,0.65)" strokeWidth="1"/>
        <line x1="23" y1="40" x2="7"  y2="24" stroke="rgba(255,119,0,0.65)" strokeWidth="1"/>
        <line x1="23" y1="40" x2="7"  y2="56" stroke="rgba(255,119,0,0.65)" strokeWidth="1"/>
        <line x1="50" y1="40" x2="50" y2="18" stroke="rgba(255,119,0,0.48)" strokeWidth="1"/>
        <circle cx="50" cy="14" r="2" fill="rgba(255,119,0,0.58)" className="hud-blink-slow"/>
        <line x1="35" y1="40" x2="35" y2="32" stroke="rgba(255,119,0,0.65)" strokeWidth="1"/>
        <circle cx="7"  cy="24" r="2.5" fill="rgba(255,119,0,0.52)"/>
        <text x="83" y="11" fontSize="7" fontFamily="monospace" fill="rgba(255,119,0,0.62)" textAnchor="end" className="hud-text">{sigRText}</text>
      </svg>

      {/* Lower-left — small tick bar */}
      <svg className="hud-ll" viewBox="0 0 55 18" xmlns="http://www.w3.org/2000/svg">
        <line x1="14" y1="9" x2="14" y2="16" stroke="rgba(255,119,0,0.32)"  strokeWidth="1"/>
        <line x1="26" y1="9" x2="26" y2="15" stroke="rgba(255,119,0,0.48)" strokeWidth="1"/>
      </svg>

      {/* Lower-right — mirror */}
      <svg className="hud-lr" viewBox="0 0 55 18" xmlns="http://www.w3.org/2000/svg">
        <line x1="41" y1="9" x2="41" y2="16" stroke="rgba(255,119,0,0.32)"  strokeWidth="1"/>
        <line x1="29" y1="9" x2="29" y2="15" stroke="rgba(255,119,0,0.48)" strokeWidth="1"/>
      </svg>


      {/* Vertical spine left 1 — main line with horizontal branches */}
      <svg className="hud-vs1l" viewBox="0 0 22 70" xmlns="http://www.w3.org/2000/svg">
        <circle cx="5" cy="4" r="2" fill="rgba(255,119,0,0.88)" className="hud-blink-slow"/>
        <line x1="5" y1="6"  x2="5" y2="66" stroke="rgba(255,119,0,0.65)" strokeWidth="1"/>
        <line x1="5" y1="28" x2="13" y2="28" stroke="rgba(255,119,0,0.32)" strokeWidth="1"/>
        <line x1="5" y1="56" x2="11" y2="56" stroke="rgba(255,119,0,0.26)" strokeWidth="1"/>
        <line x1="5" y1="64" x2="15" y2="64" stroke="rgba(255,119,0,0.32)" strokeWidth="1"/>
      </svg>

      {/* Vertical spine right 1 — mirror */}
      <svg className="hud-vs1r" viewBox="0 0 22 70" xmlns="http://www.w3.org/2000/svg">
        <circle cx="17" cy="4" r="2" fill="rgba(255,119,0,0.88)" className="hud-blink-offset"/>
        <line x1="17" y1="6"  x2="17" y2="66" stroke="rgba(255,119,0,0.65)" strokeWidth="1"/>
        <line x1="17" y1="28" x2="9"  y2="28" stroke="rgba(255,119,0,0.32)" strokeWidth="1"/>
        <line x1="17" y1="56" x2="11" y2="56" stroke="rgba(255,119,0,0.26)" strokeWidth="1"/>
        <line x1="17" y1="64" x2="7"  y2="64" stroke="rgba(255,119,0,0.32)" strokeWidth="1"/>
      </svg>

      {/* Vertical spine left 2 — simpler tick bar */}
      <svg className="hud-vs2l" viewBox="0 0 18 50" xmlns="http://www.w3.org/2000/svg">
        <circle cx="4" cy="3" r="1.5" fill="rgba(255,119,0,0.52)" className="hud-blink"/>
        <line x1="4" y1="5"  x2="4" y2="48" stroke="rgba(255,119,0,0.32)" strokeWidth="1"/>
        <line x1="4" y1="11" x2="14" y2="11" stroke="rgba(255,119,0,0.44)" strokeWidth="1.5"/>
        <line x1="4" y1="45" x2="9"  y2="45" stroke="rgba(255,119,0,0.65)" strokeWidth="1"/>
      </svg>

      {/* Vertical spine right 2 — mirror */}
      <svg className="hud-vs2r" viewBox="0 0 18 50" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="3" r="1.5" fill="rgba(255,119,0,0.52)" className="hud-blink-slow"/>
        <line x1="14" y1="5"  x2="14" y2="48" stroke="rgba(255,119,0,0.32)" strokeWidth="1"/>
        <line x1="14" y1="11" x2="4"  y2="11" stroke="rgba(255,119,0,0.44)" strokeWidth="1.5"/>
        <line x1="14" y1="45" x2="9"  y2="45" stroke="rgba(255,119,0,0.65)" strokeWidth="1"/>
      </svg>

      {/* Vertical spine left 3 — below lbl */}
      <svg className="hud-vs3l" viewBox="0 0 16 42" xmlns="http://www.w3.org/2000/svg">
        <line x1="4" y1="2"  x2="4" y2="40" stroke="rgba(255,119,0,0.48)" strokeWidth="1"/>
        <line x1="4" y1="8"  x2="12" y2="8"  stroke="rgba(255,119,0,0.65)" strokeWidth="1.5"/>
        <line x1="4" y1="20" x2="9"  y2="20" stroke="rgba(255,119,0,0.26)" strokeWidth="1"/>
        <circle cx="4" cy="40" r="1.5" fill="rgba(255,119,0,0.44)" className="hud-blink-offset"/>
      </svg>

      {/* Vertical spine right 3 — mirror */}
      <svg className="hud-vs3r" viewBox="0 0 16 42" xmlns="http://www.w3.org/2000/svg">
        <line x1="12" y1="2"  x2="12" y2="40" stroke="rgba(255,119,0,0.48)" strokeWidth="1"/>
        <line x1="12" y1="8"  x2="4"  y2="8"  stroke="rgba(255,119,0,0.65)" strokeWidth="1.5"/>
        <line x1="12" y1="20" x2="7"  y2="20" stroke="rgba(255,119,0,0.26)" strokeWidth="1"/>
        <circle cx="12" cy="40" r="1.5" fill="rgba(255,119,0,0.44)" className="hud-blink-slow"/>
      </svg>

      {/* Bottom-left — minimal marks */}
      <svg className="hud-lbl" viewBox="0 0 42 14" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="7" x2="30" y2="7" stroke="rgba(255,119,0,0.26)" strokeWidth="1"/>
        <line x1="10" y1="3" x2="10" y2="11" stroke="rgba(255,119,0,0.32)"  strokeWidth="1"/>
        <line x1="20" y1="4" x2="20" y2="10" stroke="rgba(255,119,0,0.13)" strokeWidth="1"/>
        <circle cx="30" cy="7" r="1.5" fill="rgba(255,119,0,0.36)" className="hud-blink"/>
      </svg>

      {/* Bottom-right — mirror */}
      <svg className="hud-lbr" viewBox="0 0 42 14" xmlns="http://www.w3.org/2000/svg">
        <line x1="42" y1="7" x2="12" y2="7" stroke="rgba(255,119,0,0.26)" strokeWidth="1"/>
        <line x1="32" y1="3" x2="32" y2="11" stroke="rgba(255,119,0,0.32)"  strokeWidth="1"/>
        <line x1="22" y1="4" x2="22" y2="10" stroke="rgba(255,119,0,0.13)" strokeWidth="1"/>
        <circle cx="12" cy="7" r="1.5" fill="rgba(255,119,0,0.36)" className="hud-blink-slow"/>
      </svg>

      {/* Readout left */}
      <svg className="hud-rl" viewBox="0 0 72 16" xmlns="http://www.w3.org/2000/svg">
        <text x="0" y="13" fontSize="11" fontFamily="monospace" fill="rgba(255,155,30,0.95)">{readLText}</text>
      </svg>

      {/* Readout right */}
      <svg className="hud-rr" viewBox="0 0 72 16" xmlns="http://www.w3.org/2000/svg">
        <text x="72" y="13" fontSize="11" fontFamily="monospace" fill="rgba(255,155,30,0.95)" textAnchor="end">{readRText}</text>
      </svg>

    </div>
  );
}
