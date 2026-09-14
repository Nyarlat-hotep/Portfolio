import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { blackHoleVertexShader, buildBlackHoleFragment } from '../../shaders/blackHole.glsl';
import { getBlackbodyLUT } from '../../utils/blackbodyLUT';
import { useQualityTier } from '../../utils/qualityTier';
import {
  R_S_WORLD,
  INFLUENCE_RS,
  GRAVITY_DURATION,
  SPAWN_EASE,
  TIER_CONFIG,
} from './blackHoleConstants';

// Scratch — never allocate inside useFrame.
const _q      = new THREE.Quaternion();
const _hole   = new THREE.Vector3();
const _m3     = new THREE.Matrix3();

/**
 * Raymarched-lens black hole, drawn on a camera-facing billboard.
 *
 * Replaces the old WellMesh (a black sphere + an additive canvas-gradient disk
 * plane + a glow sprite). The shadow, disk, photon ring and halo now all come
 * out of one shader pass.
 *
 * The mesh stays mounted for the life of the scene and toggles `visible`
 * rather than mounting per well: this shader takes 50-300ms to compile on a
 * phone, and mounting on click would land that stall precisely on the user's
 * interaction. Staying mounted pre-warms it during the intro camera animation.
 */
export default function BlackHoleLens({ wellsRef, worldOffset }) {
  const meshRef = useRef();
  const tier    = useQualityTier();
  const cfg     = TIER_CONFIG[tier];

  const uniforms = useRef({
    uHolePos:      { value: new THREE.Vector3() },
    uWorldToLocal: { value: new THREE.Matrix3() },
    uRs:           { value: R_S_WORLD },
    uTime:         { value: 0 },
    uAmount:       { value: 0 },
    uDormant:      { value: 0 },
    uFlash:        { value: 0 },
    // 6800K peak puts the inner disk at hot cream and the rim in deep amber —
    // the Gargantua gradient. 9200K read blue-white and clinical.
    uTempScale:    { value: 6800 },
    uDiskOpacity:  { value: 1.1 },
    uEmission:     { value: 3.2 },   // HDR — values above 1 are what bloom keys on
    uDoppler:      { value: 1 },
    uSpinSign:     { value: 1 },
    uGlow:         { value: 0.55 },
    uHalfThick:    { value: 0.42 },  // disk half-thickness in r_s
    uNoiseSpeed:   { value: 2.6 },
    uWindowR:      { value: INFLUENCE_RS },  // recomputed per frame from the clamped quad
    uBB:           { value: getBlackbodyLUT() },
  }).current;

  // Rebuilt only when the tier changes. Uniforms are reused across rebuilds so
  // a tier step-down never resets the animation mid-flight.
  const material = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      uniforms,
      vertexShader:   blackHoleVertexShader,
      fragmentShader: buildBlackHoleFragment(cfg),
      transparent:  true,
      depthWrite:   false,
      depthTest:    true,
      side:         THREE.DoubleSide,
      toneMapped:   true,
      // Premultiplied alpha: result = src.rgb + dst * (1 - src.a). Lets one
      // pass both darken (shadow occludes the nebula) and add (disk emission
      // blooms over it) — additive alone can only ever brighten.
      blending:          THREE.CustomBlending,
      blendEquation:     THREE.AddEquation,
      blendEquationAlpha:THREE.AddEquation,
      blendSrc:          THREE.OneFactor,
      blendDst:          THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha:     THREE.OneFactor,
      blendDstAlpha:     THREE.OneMinusSrcAlphaFactor,
    });
    m.extensions = { derivatives: true };   // fwidth, for the shadow edge AA
    return m;
  }, [cfg, uniforms]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const well = wellsRef.current[0];
    if (!well) { mesh.visible = false; return; }

    // ── Lifecycle envelope, mirroring the old WellMesh beat for beat ────────
    const t        = Math.min(1, well.age / SPAWN_EASE);
    const e        = t * t * (3 - 2 * t);
    const active   = well.age < GRAVITY_DURATION;
    const dormantT = Math.min(1, Math.max(0, (well.age - GRAVITY_DURATION) / 1.5));
    const flashAge = well.age - GRAVITY_DURATION;
    const flashT   = flashAge >= 0 ? Math.exp(-flashAge * 4) : 0;

    mesh.visible = e > 0.001;
    if (!mesh.visible) return;

    // Never scale the transform — that would desync the quad from the ray math.
    // Growing uRs instead keeps the shader scale-invariant, and the billboard
    // size is recomputed from uRs below so it follows automatically.
    const rs = R_S_WORLD * (0.35 + 0.65 * e);
    uniforms.uRs.value = rs;

    const pulse = active ? 0.07 * Math.sin(well.age * Math.PI * 3) : 0;
    uniforms.uAmount.value  = e * (1 + pulse);
    uniforms.uDormant.value = dormantT;
    uniforms.uFlash.value   = flashT;

    // Hotter reads as whiter *through the blackbody LUT* — a far better flash
    // than lerping toward a fixed colour, and physically motivated.
    uniforms.uTempScale.value = 6800 * (1 + flashT * 1.6) * (1 - dormantT * 0.35);
    uniforms.uGlow.value      = 0.55 * (1 + flashT * 2.5);

    // Wrapped so float precision in the shader's time term stays bounded.
    uniforms.uTime.value = (state.clock.elapsedTime % 1000);

    // ── Place the billboard ────────────────────────────────────────────────
    _hole.set(well.x + worldOffset[0], well.y + worldOffset[1], well.z + worldOffset[2]);
    uniforms.uHolePos.value.copy(_hole);

    mesh.position.set(well.x, well.y, well.z);

    // Screen-aligned, not point-facing: we want a window over a screen region.
    mesh.quaternion.copy(state.camera.quaternion);
    if (mesh.parent) {
      mesh.parent.getWorldQuaternion(_q).invert();
      mesh.quaternion.premultiply(_q);
    }

    // Disk normal is +Y in hole-local space. Identity for now; passed as a
    // matrix so the disk can be tilted later without touching the ray math.
    _m3.identity();
    uniforms.uWorldToLocal.value.copy(_m3);

    // ── Size it to the influence sphere ────────────────────────────────────
    const d = state.camera.position.distanceTo(_hole);
    const R = INFLUENCE_RS * rs;
    let s   = R * d / Math.sqrt(Math.max(d * d - R * R, 1e-3));

    // Screen-coverage clamp. TrackballControls allows flying in to minDistance
    // 10, which would otherwise let the quad fill the viewport and multiply the
    // fragment cost. Cropping only removes the outer halo, where the lensing
    // window is already ~0.005.
    const halfH = d * Math.tan(THREE.MathUtils.degToRad(state.camera.fov * 0.5));
    s = Math.min(s, halfH * cfg.maxScreenFrac * Math.max(1, state.camera.aspect));

    mesh.scale.setScalar(s);

    // Impact parameter of the ray through the quad's edge, in r_s. For a camera
    // at distance d and an edge offset s, the ray's closest approach to the hole
    // is d*s/sqrt(s^2+d^2). The shader fades the effect out over this distance,
    // so a cropped quad fades faster rather than showing a cut edge.
    uniforms.uWindowR.value = (d * s / Math.sqrt(s * s + d * d)) / rs;
  });

  return (
    <mesh ref={meshRef} material={material} renderOrder={1} visible={false} raycast={null}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}
