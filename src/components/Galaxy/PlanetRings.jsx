import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ringVertexShader, ringFragmentShader,
  ringParticleVertexShader, ringParticleFragmentShader,
} from '../../shaders/planetRing.glsl';
import { KEY_LIGHT_DIR } from '../../utils/threeUtils';
import { useQualityTier, TIER } from '../../utils/qualityTier';

/**
 * Deterministic PRNG (mulberry32). Seeded rather than Math.random so a ring
 * system lays out identically on every load — and because generating the layout
 * during render with a genuinely impure source is exactly what the compiler's
 * purity rule is there to catch.
 */
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Orbiting specks per ring system. They are grain on top of the shader surface,
// not the rings themselves — real rings are near-continuous, and enough
// particles to stand alone would be pure overdraw.
const TIER_PARTICLES = {
  [TIER.LOW]:  0,
  [TIER.MED]:  5000,
  [TIER.HIGH]: 12000,
};

/**
 * A ring system: a procedural surface plus a layer of genuinely orbiting
 * particles. Sits in the parent's local space and is oriented by `rotation`.
 */
export default function PlanetRings({
  bodyRadius,
  band1,
  band2,
  color = '#ccddff',
  rotation = [0, 0, 0],
  spin = 0.9,
  density = 0.7,
  opacity = 1.0,
}) {
  const meshRef = useRef();
  const ptsRef  = useRef();
  const tier = useQualityTier();
  const { gl } = useThree();

  // Scratch. Allocated once and only ever touched inside useFrame.
  const _m3   = useRef(new THREE.Matrix3());
  const _lite = useRef(new THREE.Vector3());
  const _cam  = useRef(new THREE.Vector3());

  const b1i = bodyRadius * band1[0];
  const b1o = bodyRadius * band1[1];
  const b2i = bodyRadius * band2[0];
  const b2o = bodyRadius * band2[1];

  // Geometry deliberately overshoots the band range, and the shader's discard
  // defines the real edge. That way the ring's outline is a true circle no
  // matter how coarse the geometry is — the polygonal boundary is always
  // outside the visible one, so it can never show.
  const ringGeo = useMemo(
    () => new THREE.RingGeometry(b1i * 0.96, b2o * 1.04, 160, 1),
    [b1i, b2o],
  );

  const ringMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   ringVertexShader,
    fragmentShader: ringFragmentShader,
    uniforms: {
      uColor:       { value: new THREE.Color(color) },
      uTime:        { value: 0 },
      uB1i:         { value: b1i },
      uB1o:         { value: b1o },
      uB2i:         { value: b2i },
      uB2o:         { value: b2o },
      uPlanetR:     { value: bodyRadius },
      uSpin:        { value: spin },
      uDensity:     { value: density },
      uBrightness:  { value: 0.8 },
      uAmbient:     { value: 0.22 },
      uOpacity:     { value: opacity },
      uLightLocal:  { value: new THREE.Vector3(0, 0, 1) },
      uCamLocal:    { value: new THREE.Vector3(0, 0, 1) },
      uGrooveScale: { value: 2.6 / Math.max(bodyRadius, 0.001) },
      uAzScale:     { value: 2.2 },
    },
    transparent: true,
    // Ordinary alpha, not additive: rings genuinely occlude what is behind
    // them, and the planet has to be hidden where they cross in front of it.
    depthWrite: false,
    side: THREE.DoubleSide,
  }), [color, b1i, b1o, b2i, b2o, bodyRadius, spin, density, opacity]);

  const count = TIER_PARTICLES[tier] ?? 0;

  const ptsGeo = useMemo(() => {
    if (!count) return null;
    const radius = new Float32Array(count);
    const phase  = new Float32Array(count);
    const off    = new Float32Array(count);
    const size   = new Float32Array(count);
    // Positions are computed in the vertex shader from radius and phase, but
    // three still needs a position attribute to know the draw count.
    const pos    = new Float32Array(count * 3);

    // Seeded from the ring's own dimensions, so each body gets its own layout
    // but the same one every time.
    const rnd = makeRng(Math.round((b1i * 7919 + b2o * 104729 + count) * 1000));

    const w1 = (b1o - b1i), w2 = (b2o - b2i);
    const split = w1 / (w1 + w2);
    for (let i = 0; i < count; i++) {
      const inBand1 = rnd() < split;
      const lo = inBand1 ? b1i : b2i;
      const hi = inBand1 ? b1o : b2o;
      // sqrt keeps the areal density even instead of crowding the inner edge
      radius[i] = Math.sqrt(lo * lo + rnd() * (hi * hi - lo * lo));
      phase[i]  = rnd() * Math.PI * 2;
      off[i]    = (rnd() - 0.5) * bodyRadius * 0.025;
      size[i]   = 0.5 + rnd() * 1.4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aRadius',  new THREE.BufferAttribute(radius, 1));
    g.setAttribute('aPhase',   new THREE.BufferAttribute(phase, 1));
    g.setAttribute('aOff',     new THREE.BufferAttribute(off, 1));
    g.setAttribute('aSize',    new THREE.BufferAttribute(size, 1));
    // The vertex shader places every point, so three's own bounds are wrong.
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), b2o * 1.1);
    return g;
  }, [count, b1i, b1o, b2i, b2o, bodyRadius]);

  const ptsMat = useMemo(() => {
    if (!count) return null;
    return new THREE.ShaderMaterial({
      vertexShader:   ringParticleVertexShader,
      fragmentShader: ringParticleFragmentShader,
      uniforms: {
        uColor:      { value: new THREE.Color(color) },
        uTime:       { value: 0 },
        uSpin:       { value: spin },
        uOpacity:    { value: 0.10 },
        uPixelRatio: { value: Math.min(gl.getPixelRatio?.() ?? 1, 2) },
        uSizeScale:  { value: bodyRadius },
      },
      transparent: true,
      // Additive here, unlike the surface. These are unsorted points, and
      // additive is order-independent — alpha blending thousands of unsorted
      // specks would blend differently depending on buffer order. Spelled out
      // so it cannot write the alpha channel.
      blending:           THREE.CustomBlending,
      blendEquation:      THREE.AddEquation,
      blendSrc:           THREE.SrcAlphaFactor,
      blendDst:           THREE.OneFactor,
      blendEquationAlpha: THREE.AddEquation,
      blendSrcAlpha:      THREE.ZeroFactor,
      blendDstAlpha:      THREE.OneFactor,
      depthWrite: false,
    });
  }, [count, color, spin, bodyRadius, gl]);

  useEffect(() => () => {
    ringGeo.dispose(); ringMat.dispose();
    ptsGeo?.dispose(); ptsMat?.dispose();
  }, [ringGeo, ringMat, ptsGeo, ptsMat]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    const u = mesh?.material?.uniforms;
    if (!u) return;

    u.uTime.value += delta;

    // Light and camera into ring-local space, where the plane normal is +Z and
    // the planet sits at the origin. Doing it here keeps the shader's shadow
    // and view-angle maths to a couple of lines each.
    mesh.updateWorldMatrix(true, false);
    _m3.current.setFromMatrix4(mesh.matrixWorld).invert();
    u.uLightLocal.value.copy(KEY_LIGHT_DIR).applyMatrix3(_m3.current).normalize();
    u.uCamLocal.value.copy(state.camera.position);
    mesh.worldToLocal(u.uCamLocal.value);

    const pu = ptsRef.current?.material?.uniforms;
    if (pu) pu.uTime.value = u.uTime.value;
  });

  return (
    <group rotation={rotation}>
      <mesh ref={meshRef} geometry={ringGeo} material={ringMat} raycast={nullRaycast} />
      {ptsGeo && ptsMat && (
        <points ref={ptsRef} geometry={ptsGeo} material={ptsMat} raycast={nullRaycast} frustumCulled={false} />
      )}
    </group>
  );
}

const nullRaycast = () => null;
