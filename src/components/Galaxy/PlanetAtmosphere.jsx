import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { atmosphereVertexShader, atmosphereFragmentShader } from '../../shaders/atmosphere.glsl';

// One shared sphere for every atmosphere in the scene. The shell is always a
// unit sphere scaled by the mesh transform, so there is nothing per-body about
// the geometry and no reason to allocate one each time.
// Matches the key light at Galaxy.jsx:683 (directionalLight position 10,10,10
// aimed at the origin). Kept as a constant rather than read from the scene: a
// directional light has one direction everywhere, and threading it through the
// graph for a value that has not changed would be ceremony.
const KEY_LIGHT_DIR = new THREE.Vector3(10, 10, 10).normalize();

let _shellGeo = null;
function getShellGeo() {
  if (!_shellGeo) _shellGeo = new THREE.SphereGeometry(1, 48, 32);
  return _shellGeo;
}

/**
 * Scattering rim around a planet. Mount as a CHILD of the planet mesh: it then
 * inherits that mesh's transform, including the hover scale-up, and `scale`
 * here is purely the shell's size relative to the body.
 */
export default function PlanetAtmosphere({
  color    = '#6fb8ff',
  scale    = 1.08,
  power    = 3.0,
  strength = 0.9,
  nightFloor = 0.14,
  // The bodies here are tinted to brand colours rather than their real ones,
  // so a physically-accurate atmosphere fights its own planet — a correct warm
  // Venus haze around a purple Venus reads as a dirty khaki outline. Pulling
  // the scatter colour most of the way toward the body keeps the palette
  // coherent while the profile and light weighting carry the realism.
  tint = null,
  tintAmount = 0.6,
}) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    uniforms: {
      uColor: {
        value: tint
          ? new THREE.Color(color).lerp(new THREE.Color(tint), tintAmount)
          : new THREE.Color(color),
      },
      uPower:    { value: power },
      uStrength: { value: strength },
      uShellScale: { value: scale },
      uLightDir: { value: KEY_LIGHT_DIR },
      uNightFloor: { value: nightFloor },
    },
    transparent: true,
    // Additive, but spelled out so it cannot write the alpha channel. The
    // AdditiveBlending preset applies its factors to alpha as well as RGB, and
    // an emissive shell writing alpha changes how the frame composites for
    // reasons that have nothing to do with the glow.
    blending:           THREE.CustomBlending,
    blendEquation:      THREE.AddEquation,
    blendSrc:           THREE.OneFactor,
    blendDst:           THREE.OneFactor,
    blendEquationAlpha: THREE.AddEquation,
    blendSrcAlpha:      THREE.ZeroFactor,
    blendDstAlpha:      THREE.OneFactor,
    // Back faces only. The planet is opaque and writes depth, so everything
    // inside its silhouette fails the depth test and only the ring outside
    // survives — which is the entire trick, and why this needs no masking.
    side: THREE.BackSide,
    depthWrite: false,
  }), [color, power, strength, nightFloor, scale, tint, tintAmount]);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh
      geometry={getShellGeo()}
      material={material}
      scale={scale}
      // Invisible to the cursor. The shell is larger than the planet, and
      // letting it take hits would move the hover target off the body and
      // throw off the tooltip's projected radius.
      raycast={() => null}
    />
  );
}
