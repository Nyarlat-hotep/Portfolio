import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Easing function for smooth animation
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export default function CameraController({
  isIntroActive,
  onIntroComplete,
  introDuration = 2.5
}) {
  const { camera } = useThree();
  const startPosition = useRef(new THREE.Vector3(0, 8, 55));
  const endPosition = useRef(new THREE.Vector3(0, 5, 20));
  const startTime = useRef(null);
  const hasCompleted = useRef(false);

  // Reset on mount
  useEffect(() => {
    if (isIntroActive) {
      camera.position.copy(startPosition.current);
      startTime.current = null;
      hasCompleted.current = false;
    }
  }, [isIntroActive, camera]);

  useFrame((state) => {
    if (!isIntroActive || hasCompleted.current) return;

    // Initialize start time on first frame
    if (startTime.current === null) {
      startTime.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - startTime.current;
    const progress = Math.min(elapsed / introDuration, 1);
    const easedProgress = easeOutCubic(progress);

    // Lerp camera position
    camera.position.lerpVectors(
      startPosition.current,
      endPosition.current,
      easedProgress
    );

    // Check if animation is complete
    if (progress >= 1 && !hasCompleted.current) {
      hasCompleted.current = true;
      onIntroComplete?.();
    }
  });

  return null;
}
