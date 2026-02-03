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
    let intensity = 0;
    if (distanceFromOrigin > threshold) {
      // Gradually increase from 0 to 1 as distance goes from threshold to threshold + 60
      intensity = Math.min((distanceFromOrigin - threshold) / 60, 1);
    }

    // Only update if intensity changed significantly
    if (Math.abs(intensity - lastIntensity.current) > 0.01) {
      lastIntensity.current = intensity;
      onDistanceChange?.(intensity, distanceToVoid);
    }
  });

  return null; // This component only tracks, doesn't render
}
