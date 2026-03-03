import './HorizontalScrollStrip.css';

export default function HorizontalScrollStrip({ images, alt = 'Gallery image' }) {
  if (!images || images.length === 0) return null;

  return (
    <div className="hss-outer">
      <div className="hss-track">
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`${alt} ${i + 1}`}
            className="hss-image"
            draggable={false}
          />
        ))}
      </div>
    </div>
  );
}
