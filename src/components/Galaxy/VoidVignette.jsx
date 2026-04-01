import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

// This component tracks camera distance and updates a CSS vignette overlay
export default function VoidVignette({ onDistanceChange, voidPosition = [0, 0, -80], threshold = 50 }) {
  const { camera } = useThree();
  const lastIntensity = useRef(0);

  useFrame(() => {
    // Calculate distance from camera to void center
    const dx = camera.position.x - voidPosition[0];
    const dy = camera.position.y - voidPosition[1];
    const dz = camera.position.z - voidPosition[2];
    const distanceToVoid = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Calculate distance from origin (for zoom-based intensity)
    const distanceFromOrigin = Math.sqrt(
      camera.position.x * camera.position.x +
      camera.position.y * camera.position.y +
      camera.position.z * camera.position.z
    );

    // Start vignette when zoomed out past threshold
    // Intensity increases as user zooms out more
    let intensity = 0
    if (distanceFromOrigin > threshold) {
      if (distanceFromOrigin <= 120) {
        // Phase 1: threshold → 120u  maps to  0.0 → 0.35
        const t = (distanceFromOrigin - threshold) / (120 - threshold)
        const s = t * t * (3 - 2 * t)
        intensity = s * 0.35
      } else {
        // Phase 2: 120u → 400u  maps to  0.35 → 1.0
        const t = Math.min(1, (distanceFromOrigin - 120) / 280)
        const s = t * t * (3 - 2 * t)
        intensity = 0.35 + s * 0.65
      }
    }

    // Only update if intensity changed significantly
    if (Math.abs(intensity - lastIntensity.current) > 0.01) {
      lastIntensity.current = intensity;
      onDistanceChange?.(intensity, distanceToVoid);
    }
  });

  return null; // This component only tracks, doesn't render
}
