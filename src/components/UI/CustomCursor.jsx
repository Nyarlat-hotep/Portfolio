import { useEffect, useState } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { isTouchDevice } from '../../utils/isTouchDevice';
import './CustomCursor.css';

const isTouch = isTouchDevice();
const centerTransform = ({ x, y }) => `translate(${x}, ${y}) translate(-50%, -50%)`;

export default function CustomCursor() {
  const [isHovering, setIsHovering] = useState(false);
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  useEffect(() => {
    if (isTouch) return;
    const onMove = (e) => { cursorX.set(e.clientX); cursorY.set(e.clientY); };
    const onOver = (e) => {
      setIsHovering(!!e.target.closest('button, a, [role="button"], input, select, textarea'));
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseover', onOver);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
    };
  }, [cursorX, cursorY]);

  if (isTouch) return null;

  return (
    <motion.div
      className="cursor-reticle"
      style={{ x: cursorX, y: cursorY }}
      transformTemplate={centerTransform}
      animate={{ scale: isHovering ? 1.35 : 1, opacity: isHovering ? 1 : 0.82 }}
      transition={{ duration: 0.2 }}
    >
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        {/* Rotating outer ring + cardinal tick marks */}
        <g className="reticle-ring">
          <circle cx="22" cy="22" r="17" stroke="#ff7700" strokeWidth="0.8" strokeOpacity="0.5" strokeDasharray="2 5" />
          <line x1="22" y1="3"  x2="22" y2="8"  stroke="#ff7700" strokeWidth="1.5" strokeOpacity="0.9" strokeLinecap="round" />
          <line x1="22" y1="36" x2="22" y2="41" stroke="#ff7700" strokeWidth="1.5" strokeOpacity="0.9" strokeLinecap="round" />
          <line x1="3"  y1="22" x2="8"  y2="22" stroke="#ff7700" strokeWidth="1.5" strokeOpacity="0.9" strokeLinecap="round" />
          <line x1="36" y1="22" x2="41" y2="22" stroke="#ff7700" strokeWidth="1.5" strokeOpacity="0.9" strokeLinecap="round" />
        </g>
        {/* Fixed inner crosshair (gapped at center) */}
        <line x1="22" y1="12" x2="22" y2="19" stroke="#ff7700" strokeWidth="0.9" strokeOpacity="0.65" strokeLinecap="round" />
        <line x1="22" y1="25" x2="22" y2="32" stroke="#ff7700" strokeWidth="0.9" strokeOpacity="0.65" strokeLinecap="round" />
        <line x1="12" y1="22" x2="19" y2="22" stroke="#ff7700" strokeWidth="0.9" strokeOpacity="0.65" strokeLinecap="round" />
        <line x1="25" y1="22" x2="32" y2="22" stroke="#ff7700" strokeWidth="0.9" strokeOpacity="0.65" strokeLinecap="round" />
        {/* Center dot */}
        <circle cx="22" cy="22" r="1.8" fill="#ff7700" fillOpacity="0.95" />
      </svg>
    </motion.div>
  );
}
