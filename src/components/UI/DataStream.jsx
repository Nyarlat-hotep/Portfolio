import { useMemo } from 'react';
import './DataStream.css';

export default function DataStream() {
  const streams = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      id: i,
      left: `${15 + i * 20}%`,
      delay: `${i * 0.5}s`,
      duration: `${3 + Math.random() * 2}s`
    }));
  }, []);

  return (
    <div className="data-stream-container">
      {streams.map((stream) => (
        <div
          key={stream.id}
          className="data-stream"
          style={{
            left: stream.left,
            animationDelay: stream.delay,
            animationDuration: stream.duration
          }}
        >
          <div className="stream-line"></div>
        </div>
      ))}
    </div>
  );
}
