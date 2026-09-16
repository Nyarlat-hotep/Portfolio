import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
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

  // Off-screen copy of the scene, captured each frame with the lens itself
  // hidden, so escaping rays can look up what is really behind the hole.
  // Only the raymarching tiers use it; the analytic tier has no escape
  // direction to look anything up with.
  const sceneFBO   = useFBO();
  const lensScene  = cfg.steps > 0;

  const uniforms = useRef({
    uHolePos:      { value: new THREE.Vector3() },
    uWorldToLocal: { value: new THREE.Matrix3() },
    uRs:           { value: R_S_WORLD },
    uTime:         { value: 0 },
    uAmount:       { value: 0 },
    uDormant:      { value: 0 },
    uFlash:        { value: 0 },
    // 5200K puts the inner edge at warm cream and the rim in deep orange.
    // 6800K still read too pale next to the Interstellar reference.
    uTempScale:    { value: 5200 },
    uDiskOpacity:  { value: 0.9 },
    // The Doppler term already contributes g^3 (~2.6x at the inner edge), so
    // this multiplier stays near 1. At 3.2 the peak hit 8.4 linear and clipped
    // to flat white, taking all the filament structure with it.
    uEmission:     { value: 1.0 },
    uDoppler:      { value: 1 },
    uSpinSign:     { value: 1 },
    // Deliberately small. The reference's glow comes from bloom on a bright
    // thin disk, not from a wide additive halo — a strong halo just fogs the
    // shadow grey and swallows the photon ring.
    uGlow:         { value: 0.14 },
    uHalfThick:    { value: 0.3 },   // r_s — a band with some substance, not a needle
    uNoiseSpeed:   { value: 2.6 },
    // Kept modest: these are procedural stars local to the lens, not the
    // scene's Starfield, so they have to read as the same sky rather than
    // announcing themselves.
    uStarBright:   { value: 0.85 },
    uScene:        { value: null },
    uProjView:     { value: new THREE.Matrix4() },
    uHasScene:     { value: 0 },
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
      // depthTest off by design. The lens used to be a flat plane with depth
      // testing on, which meant any scene geometry nearer than that plane
      // rejected its fragments — and since the plane grew to thousands of units
      // as the camera approached, it sliced through the nebula, the planets and
      // the hit plane, producing straight cuts that got worse the closer you
      // flew. The hole draws over the nebula regardless (it always did, via
      // renderOrder), so depth testing only ever cost correctness here.
      depthTest:    false,
      // BackSide: render the sphere's inner/far surface. This is what makes the
      // containment work from inside as well as outside — with FrontSide the
      // near hemisphere is culled once the camera enters the sphere and the
      // effect would vanish. The silhouette is the same circle either way.
      side:         THREE.BackSide,
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

  useFrame((state) => {
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
    uniforms.uTempScale.value = 5200 * (1 + flashT * 1.6) * (1 - dormantT * 0.35);
    uniforms.uGlow.value      = 0.14 * (1 + flashT * 2.5);

    // Wrapped so float precision in the shader's time term stays bounded.
    uniforms.uTime.value = (state.clock.elapsedTime % 1000);

    // ── Place it ───────────────────────────────────────────────────────────
    _hole.set(well.x + worldOffset[0], well.y + worldOffset[1], well.z + worldOffset[2]);
    uniforms.uHolePos.value.copy(_hole);

    mesh.position.set(well.x, well.y, well.z);

    // No orientation term. A sphere looks the same from every direction, so the
    // camera-facing quaternion the billboard needed every frame is simply gone.

    // Disk normal is +Y in hole-local space. Identity for now; passed as a
    // matrix so the disk can be tilted later without touching the ray math.
    _m3.identity();
    uniforms.uWorldToLocal.value.copy(_m3);

    // ── Containment: a sphere of the influence radius ──────────────────────
    //
    // One line, no camera term. The sphere's surface IS r = INFLUENCE_RS in the
    // shader's units, so its silhouette is exactly the b = RMAX circle the
    // shader already discards outside of. There is nothing to align, nothing to
    // clamp, and nothing to fade against a boundary.
    //
    // This replaces a screen-aligned billboard whose size was re-derived every
    // frame from camera distance, FOV and aspect. That formula diverged as the
    // camera approached the influence radius — the quad grew from 15 world
    // units across to over 3,500 — and a flat plane that large, with depth
    // testing on, gets sliced by every piece of scene geometry it passes
    // through. That was the clipping, and it is why it worsened on zoom.
    //
    // A sphere cannot produce a straight edge from any angle, never needs
    // resizing, and encloses the effect as a volume rather than intersecting
    // the scene as a plane.
    mesh.scale.setScalar(INFLUENCE_RS * rs);

    // ── Capture the scene behind the hole ──────────────────────────────────
    // Runs at priority 0, which R3F sorts ahead of the composer's own render
    // (events-*.esm.js:1085 sorts subscribers by priority ascending), so the
    // capture is ready before anything is drawn to the screen this frame.
    //
    // The lens is hidden for the capture — otherwise it would sample itself,
    // compounding its own distortion every frame.
    if (lensScene) {
      mesh.visible = false;
      const prevTarget = state.gl.getRenderTarget();
      state.gl.setRenderTarget(sceneFBO);
      state.gl.render(state.scene, state.camera);
      state.gl.setRenderTarget(prevTarget);
      mesh.visible = true;

      uniforms.uScene.value = sceneFBO.texture;
      uniforms.uProjView.value.multiplyMatrices(
        state.camera.projectionMatrix,
        state.camera.matrixWorldInverse,
      );
      uniforms.uHasScene.value = 1;
    } else {
      uniforms.uHasScene.value = 0;
    }
  });

  return (
    // Unit sphere, scaled to the influence radius. 32 segments is plenty: the
    // silhouette is where the effect has already fallen to zero, so faceting
    // there is invisible.
    <mesh ref={meshRef} material={material} renderOrder={1} visible={false} raycast={null}>
      <sphereGeometry args={[1, 32, 32]} />
    </mesh>
  );
}
