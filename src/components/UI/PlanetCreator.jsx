import { useState, useRef, useEffect, Suspense, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { X, Circle } from 'lucide-react';
import DataStream from './DataStream';
import './PlanetCreator.css';

// Available textures
const TEXTURES = [
  { id: 'earth', url: '/textures/earth.jpg', name: 'Terra' },
  { id: 'mars', url: '/textures/mars.jpg', name: 'Crimson' },
  { id: 'jupiter', url: '/textures/jupiter.jpg', name: 'Storm' },
  { id: 'neptune', url: '/textures/neptune.jpg', name: 'Azure' },
  { id: 'venus', url: '/textures/venus.jpg', name: 'Haze' },
  { id: 'uranus', url: '/textures/uranus.jpg', name: 'Frost' },
  { id: 'sun', url: '/textures/sun.jpg', name: 'Solar' },
];

// Size options
const SIZES = [
  { id: 'small', scale: 0.7, label: 'S' },
  { id: 'medium', scale: 1.0, label: 'M' },
  { id: 'large', scale: 1.3, label: 'L' },
];

// Rotating preview planet
function PreviewPlanet({ textureUrl, color, scale }) {
  const meshRef = useRef();
  const texture = useTexture(textureUrl);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  // Parse color for tinting
  const tintColor = useMemo(() => new THREE.Color(color), [color]);

  return (
    <mesh ref={meshRef} scale={scale * 1.5}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        map={texture}
        color={tintColor}
        emissive={tintColor}
        emissiveIntensity={0.15}
        roughness={0.7}
        metalness={0.1}
      />
    </mesh>
  );
}

// Mini rotating texture preview sphere
function TextureSphere({ textureUrl, isSelected, onClick }) {
  const meshRef = useRef();
  const texture = useTexture(textureUrl);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <mesh
      ref={meshRef}
      onClick={onClick}
      onPointerOver={() => document.body.style.cursor = 'pointer'}
      onPointerOut={() => document.body.style.cursor = 'auto'}
    >
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        map={texture}
        emissive={isSelected ? '#a855f7' : '#000000'}
        emissiveIntensity={isSelected ? 0.3 : 0}
      />
    </mesh>
  );
}

// Color wheel picker
function ColorWheel({ value, onChange }) {
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleColorPick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate angle and distance from center
    const dx = x - centerX;
    const dy = y - centerY;
    const angle = Math.atan2(dy, dx);
    const distance = Math.min(Math.sqrt(dx * dx + dy * dy), centerX);
    const saturation = distance / centerX;

    // Convert to HSL then RGB
    const hue = ((angle * 180 / Math.PI) + 180) / 360;
    const rgb = hslToRgb(hue, saturation, 0.5);
    const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);

    onChange(hex);
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    handleColorPick(e);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      handleColorPick(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Draw color wheel
  const drawWheel = (ctx, width, height) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 2;

    for (let angle = 0; angle < 360; angle++) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = (angle + 1) * Math.PI / 180;

      for (let r = 0; r <= radius; r += 1) {
        const saturation = r / radius;
        const rgb = hslToRgb(angle / 360, saturation, 0.5);

        ctx.beginPath();
        ctx.arc(centerX, centerY, r, startAngle, endAngle);
        ctx.strokeStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
        ctx.stroke();
      }
    }

    // Add glow ring effect
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      drawWheel(ctx, canvas.width, canvas.height);
    }
  }, []);

  return (
    <div className="color-wheel-container">
      <canvas
        ref={canvasRef}
        width={160}
        height={160}
        className="color-wheel"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <div
        className="color-preview"
        style={{ backgroundColor: value }}
      >
        <span className="color-hex">{value.toUpperCase()}</span>
      </div>
    </div>
  );
}

// Helper functions for color conversion
function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export default function PlanetCreator({ isOpen, onClose, onSave }) {
  const [name, setName] = useState('');
  const [size, setSize] = useState('small');
  const [texture, setTexture] = useState(TEXTURES[0]);
  const [color, setColor] = useState('#ffffff');
  const closeButtonRef = useRef(null);

  const MAX_NAME_LENGTH = 20;

  const handleSave = () => {
    const selectedSize = SIZES.find(s => s.id === size);
    onSave({
      name: name.trim() || 'Unknown',
      scale: selectedSize.scale,
      textureUrl: texture.url,
      color: color,
    });
    // Reset form
    setName('');
    setSize('small');
    setTexture(TEXTURES[0]);
    setColor('#ffffff');
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    if (value.length <= MAX_NAME_LENGTH) {
      setName(value);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="creator-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />

          {/* Centering Wrapper */}
          <div className="creator-wrapper">
            <motion.div
              className="creator-container"
              role="dialog"
              aria-modal="true"
              aria-labelledby="creator-title"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            >
            <DataStream />

            {/* Header */}
            <div className="creator-header">
              <h1 id="creator-title" className="creator-title">
                Planet Forge
              </h1>
              <button
                ref={closeButtonRef}
                className="creator-close"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="creator-content">
              {/* Left: 3D Preview */}
              <div className="creator-preview">
                <div className="preview-label">Preview</div>
                <div className="preview-canvas">
                  <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
                    <ambientLight intensity={0.4} />
                    <directionalLight position={[5, 5, 5]} intensity={1} />
                    <pointLight position={[-5, -5, -5]} intensity={0.5} color="#a855f7" />
                    <Suspense fallback={null}>
                      <PreviewPlanet
                        textureUrl={texture.url}
                        color={color}
                        scale={SIZES.find(s => s.id === size).scale}
                      />
                    </Suspense>
                  </Canvas>
                </div>
                <div className="preview-name">
                  {name || 'Unknown'}
                </div>
              </div>

              {/* Right: Controls */}
              <div className="creator-controls">
                {/* Name Input */}
                <div className="control-group">
                  <label className="control-label">Designation</label>
                  <div className="name-input-wrapper">
                    <input
                      type="text"
                      className="name-input"
                      value={name}
                      onChange={handleNameChange}
                      placeholder="Enter planet name..."
                      maxLength={MAX_NAME_LENGTH}
                    />
                    <span className="char-counter">
                      {name.length}/{MAX_NAME_LENGTH}
                    </span>
                  </div>
                </div>

                {/* Size Selector */}
                <div className="control-group">
                  <label className="control-label">Mass Class</label>
                  <div className="size-selector">
                    {SIZES.map((s) => (
                      <button
                        key={s.id}
                        className={`size-button ${size === s.id ? 'active' : ''}`}
                        onClick={() => setSize(s.id)}
                        aria-label={`Size ${s.label}`}
                      >
                        <Circle
                          size={s.id === 'small' ? 14 : s.id === 'medium' ? 20 : 26}
                          strokeWidth={2}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Texture Selector */}
                <div className="control-group">
                  <label className="control-label">Surface Type</label>
                  <div className="texture-selector">
                    {TEXTURES.map((t) => (
                      <div
                        key={t.id}
                        className={`texture-option ${texture.id === t.id ? 'active' : ''}`}
                        onClick={() => setTexture(t)}
                      >
                        <div className="texture-preview">
                          <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
                            <ambientLight intensity={0.6} />
                            <directionalLight position={[2, 2, 2]} intensity={0.8} />
                            <Suspense fallback={null}>
                              <TextureSphere
                                textureUrl={t.url}
                                isSelected={texture.id === t.id}
                                onClick={() => setTexture(t)}
                              />
                            </Suspense>
                          </Canvas>
                        </div>
                        <span className="texture-name">{t.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Color Picker */}
                <div className="control-group">
                  <label className="control-label">Chromatic Tint</label>
                  <ColorWheel value={color} onChange={setColor} />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="creator-footer">
              <button className="cancel-button" onClick={onClose}>
                Cancel
              </button>
              <button className="save-button" onClick={handleSave}>
                Launch Planet
              </button>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
