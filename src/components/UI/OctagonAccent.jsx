import './OctagonAccent.css';

export default function OctagonAccent({ size = 40, color = '#00d4ff', opacity = 0.3, className = '' }) {
  return (
    <div className={`octagon-accent ${className}`} style={{
      width: `${size}px`,
      height: `${size}px`,
      '--octagon-color': color,
      '--octagon-opacity': opacity
    }}>
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <polygon
          points="30,0 70,0 100,30 100,70 70,100 30,100 0,70 0,30"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            color: `rgba(var(--octagon-color-rgb), var(--octagon-opacity))`,
            filter: 'drop-shadow(0 0 4px currentColor)'
          }}
        />
      </svg>
    </div>
  );
}
