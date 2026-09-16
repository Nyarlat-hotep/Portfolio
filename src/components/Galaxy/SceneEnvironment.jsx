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

// Built once per page and never released. three's own PMREMGenerator docs warn
// that "calling dispose() on one of them will cause any others to also become
// unusable" — and three creates its own internally for environment maps. So the
// generator is created once, reused, and deliberately not disposed; a handful of
// small materials held for the session is far cheaper than corrupting three's
// env-map pipeline. The result is cached so remounting the scene is free.
let _pmrem = null;
let _envRT = null;

function buildEnvSource() {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Base: near-black, very slightly blue, brighter toward the top of the sphere
  // so the ambient has a direction rather than being flat fill.
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

function getEnvTexture(gl) {
  if (_envRT) return _envRT.texture;
  if (!_pmrem) _pmrem = new THREE.PMREMGenerator(gl);
  const src = buildEnvSource();
  _envRT = _pmrem.fromEquirectangular(src);
  src.dispose();          // the source canvas is only needed to produce the cubemap
  return _envRT.texture;
}

export default function SceneEnvironment({ intensity = 0.35 }) {
  const gl    = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    let tex;
    try {
      tex = getEnvTexture(gl);
    } catch (err) {
      // IBL is an enhancement, never a requirement — a failure here must not
      // take the scene down with it.
      console.error('[SceneEnvironment] could not build environment map', err);
      return undefined;
    }

    const prevEnv = scene.environment;
    const prevInt = scene.environmentIntensity;

    /* eslint-disable react-hooks/immutability --
       `scene` is a mutable three.js Object3D, not React state. Assigning
       scene.environment is the documented three API for image-based lighting,
       and drei's own <Environment> does exactly this; the React Compiler rule
       cannot tell an imperative graphics object from a hook-owned value.
       Previous values are captured and restored on unmount so this stays
       reversible. */
    scene.environment = tex;
    scene.environmentIntensity = intensity;

    return () => {
      scene.environment = prevEnv;
      scene.environmentIntensity = prevInt;
    };
    /* eslint-enable react-hooks/immutability */
  }, [gl, scene, intensity]);

  return null;
}
