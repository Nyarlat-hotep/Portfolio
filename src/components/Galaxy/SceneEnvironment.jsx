import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Procedural image-based lighting.
 *
 * Every meshStandardMaterial in the scene had an albedo map and nothing else —
 * no env map, no IBL — so the bodies read as flat-lit spheres regardless of how
 * good the colour map was. Four point lights cannot stand in for a surrounding
 * sky: without an environment there is no specular response at grazing angles,
 * which is most of what makes a sphere look like a physical object.
 *
 * Generated rather than loaded: an HDR file would be several hundred KB for
 * something that is, in a starfield, mostly very dark. A 256x128 equirect
 * costs nothing and can be tuned to the scene's own palette.
 *
 * Deliberately dim. This is ambient sky for a body in deep space, not a studio
 * — it should lift the terminator and put a highlight on the limb, not relight
 * the planet. The existing point lights stay the key.
 */

const W = 256, H = 128;

function buildEnvTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Base: near-black, very slightly blue, brighter toward the top of the sphere
  // so there is a directional sense to the ambient rather than flat fill.
  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0.0, '#0b1020');
  base.addColorStop(0.5, '#05070e');
  base.addColorStop(1.0, '#020308');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // Soft coloured regions echoing the scene's own cyan / magenta nebulae, so
  // reflections pick up the same palette rather than neutral grey.
  const blobs = [
    { x: 0.18, y: 0.42, r: 0.30, c: 'rgba(38,205,212,0.16)' },
    { x: 0.62, y: 0.55, r: 0.34, c: 'rgba(176,51,221,0.14)' },
    { x: 0.86, y: 0.32, r: 0.22, c: 'rgba(120,80,200,0.10)' },
    { x: 0.40, y: 0.24, r: 0.26, c: 'rgba(80,140,220,0.10)' },
  ];
  ctx.globalCompositeOperation = 'lighter';
  for (const b of blobs) {
    const g = ctx.createRadialGradient(b.x * W, b.y * H, 0, b.x * W, b.y * H, b.r * W);
    g.addColorStop(0, b.c);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping    = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export default function SceneEnvironment({ intensity = 0.35 }) {
  const gl    = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const src  = buildEnvTexture();
    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();
    const rt = pmrem.fromEquirectangular(src);

    scene.environment = rt.texture;
    scene.environmentIntensity = intensity;

    // The source canvas texture and the generator are only needed to produce
    // the prefiltered cubemap; release them immediately and keep the result.
    src.dispose();
    pmrem.dispose();

    return () => {
      if (scene.environment === rt.texture) {
        scene.environment = null;
        scene.environmentIntensity = 1;
      }
      rt.dispose();
    };
  }, [gl, scene, intensity]);

  return null;
}
