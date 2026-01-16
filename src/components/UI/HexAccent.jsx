import './HexAccent.css';

export default function HexAccent({ size = 40, color = '#00d4ff', opacity = 0.3, className = '' }) {
  return (
    <div className={`hex-accent ${className}`} style={{
      width: `${size}px`,
      height: `${size * 1.15}px`,
      '--hex-color': color,
      '--hex-opacity': opacity
    }}>
      <svg viewBox="0 0 100 115" xmlns="http://www.w3.org/2000/svg">
        <polygon
          points="50,0 93.3,28.75 93.3,86.25 50,115 6.7,86.25 6.7,28.75"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            color: `rgba(var(--hex-color-rgb), var(--hex-opacity))`,
            filter: 'drop-shadow(0 0 4px currentColor)'
          }}
        />
      </svg>
    </div>
  );
}
