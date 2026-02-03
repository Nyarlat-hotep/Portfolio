import { useRef, useState, useCallback } from 'react';
import './ImageCompare.css';

export default function ImageCompare({
  beforeSrc,
  afterSrc,
  beforeLabel = 'Before',
  afterLabel = 'After',
  planetColor = '#a855f7'
}) {
  const containerRef = useRef(null);
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);

  const updatePosition = useCallback((clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
    updatePosition(e.clientX);
    containerRef.current?.setPointerCapture(e.pointerId);
  }, [updatePosition]);

  const handlePointerMove = useCallback((e) => {
    if (!dragging) return;
    updatePosition(e.clientX);
  }, [dragging, updatePosition]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const rgb = planetColor.replace('#', '').match(/.{2}/g).map(x => parseInt(x, 16)).join(', ');

  return (
    <div
      ref={containerRef}
      className={`image-compare ${dragging ? 'is-dragging' : ''}`}
      style={{ '--compare-color': planetColor, '--compare-color-rgb': rgb }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* After layer (full width, sits behind) */}
      <div className="compare-layer compare-after">
        {afterSrc ? (
          <img src={afterSrc} alt={afterLabel} draggable={false} />
        ) : (
          <div className="compare-placeholder">
            <span className="compare-placeholder-text">IMG</span>
          </div>
        )}
        <span className="compare-label compare-label-after">{afterLabel}</span>
      </div>

      {/* Before layer (clipped) */}
      <div
        className="compare-layer compare-before"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        {beforeSrc ? (
          <img src={beforeSrc} alt={beforeLabel} draggable={false} />
        ) : (
          <div className="compare-placeholder">
            <span className="compare-placeholder-text">IMG</span>
          </div>
        )}
        <span className="compare-label compare-label-before">{beforeLabel}</span>
      </div>

      {/* Divider line + handle */}
      <div className="compare-divider" style={{ left: `${position}%` }}>
        <div className="compare-line" />
        <div className="compare-handle">
          <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
            <path d="M3 1L1 7l2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 1l2 6-2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}
