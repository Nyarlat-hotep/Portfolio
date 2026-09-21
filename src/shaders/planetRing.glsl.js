import { glslSimplex3D } from './glslNoise';

/**
 * Planetary rings.
 *
 * Replaces a 256x256 canvas texture stretched across the whole ring by way of
 * RingGeometry's square UVs. At any real zoom a texel covered several screen
 * pixels, and its "detail" was Math.random() per texel — uncorrelated white
 * noise, which reads as dithered static rather than ring material, and was
 * baked so it never moved.
 *
 * Everything here is computed from the actual radius instead, so it is sharp at
 * any distance, and everything is done in the ring's LOCAL space, where the
 * geometry sits in the XY plane. That makes the plane normal exactly +Z and the
 * planet's centre exactly the origin, which turns both the shadow test and the
 * view-angle term into a couple of lines. The light direction and camera
 * position are transformed into that space once per frame on the CPU.
 */

export const ringVertexShader = /* glsl */ `
  varying vec3 vLocal;
  void main() {
    vLocal = position;              // ring plane is local XY, normal is +Z
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const ringFragmentShader = /* glsl */ `
  precision highp float;

  uniform vec3  uColor;
  uniform float uTime;
  uniform float uB1i, uB1o, uB2i, uB2o;  // band edges, local units
  uniform float uPlanetR;                // planet radius, local units
  uniform float uSpin;
  uniform float uDensity;
  uniform float uAmbient;                // lit fraction inside the planet's shadow
  uniform float uOpacity;
  uniform float uBrightness;
  uniform vec3  uLightLocal;             // toward the key light, ring-local
  uniform vec3  uCamLocal;               // camera position, ring-local
  uniform float uGrooveScale;
  uniform float uAzScale;

  varying vec3 vLocal;

  ${glslSimplex3D}

  void main() {
    float r = length(vLocal.xy);
    if (r < uB1i || r > uB2o) discard;

    // How much radius one pixel spans. Everything below is scaled against this
    // so the rings carry detail down to the pixel and no further — the same
    // job mipmapping does for a texture, which a procedural surface has to do
    // for itself.
    float pw = max(fwidth(r), 1e-6);

    // ── Band structure ────────────────────────────────────────────────────
    // Shoulder width is a pixel count, not a fraction of the ring. A fixed
    // fraction is a fixed world-space distance, which reads as a crisp edge
    // from far away and as a broad gradient up close — the edges went soft
    // exactly when you got near enough to want them sharp.
    float e = max(pw * 1.5, (uB2o - uB1i) * 0.004);
    float band =
        0.95 * smoothstep(uB1i, uB1i + e, r) * (1.0 - smoothstep(uB1o - e, uB1o, r))
      + 0.75 * smoothstep(uB2i, uB2i + e, r) * (1.0 - smoothstep(uB2o - e, uB2o, r));

    // ── Concentric grooves ────────────────────────────────────────────────
    // Radial and time-independent: ring divisions are fixed features, they do
    // not orbit. Built from octaves that each drop out once their wavelength
    // approaches a pixel, so close up the fine structure is there and far away
    // it is gone rather than aliasing into static. A single octave cannot do
    // both — tuned coarse enough not to sparkle at distance, it left nothing to
    // look at up close.
    float detail = 0.0;
    float amp = 0.55;
    float freq = uGrooveScale;
    for (int i = 0; i < 6; i++) {
      // Resolvable while its wavelength (1/freq) stays a few pixels wide.
      float fade = smoothstep(2.0, 4.5, 1.0 / (freq * pw));
      // Skip the noise entirely once an octave cannot be seen. Six octaves let
      // the structure keep getting finer as you approach, and this is what
      // stops the far view paying for detail it will never resolve. Pixels
      // across one ring sit at similar depths, so the branch stays coherent.
      if (fade > 0.01) detail += amp * fade * snoise(vec3(r * freq, 0.0, 0.0));
      freq *= 2.3;
      amp  *= 0.55;
    }
    band *= clamp(1.0 + detail, 0.12, 1.65);

    // ── Orbital motion ────────────────────────────────────────────────────
    // Keplerian shear: inner material orbits faster, as r^-3/2. This is what
    // actually makes the rings read as orbiting rather than as a picture.
    float ang   = atan(vLocal.y, vLocal.x);
    float a     = ang + uTime * uSpin * pow(max(r, 0.001), -1.5);
    // Sampled through cos/sin so the noise is seamless across the +-pi wrap of
    // atan; feeding the angle in directly would leave a visible seam.
    float clump = snoise(vec3(cos(a) * uAzScale, sin(a) * uAzScale, r * 0.7)) * 0.5 + 0.5;
    band *= mix(0.72, 1.18, clump);

    // A finer, faster-varying streak layer on the same sheared angle, so there
    // is azimuthal structure to see close up too. Gated on pixel size like the
    // grooves, and stretched far more around the ring than across it, which is
    // the direction ring material actually smears.
    float fFine = uAzScale * 9.0;
    float fineFade = smoothstep(2.0, 4.5, 1.0 / (uGrooveScale * 6.0 * pw));
    if (fineFade > 0.01) {
      float streak = snoise(vec3(cos(a) * fFine, sin(a) * fFine, r * uGrooveScale * 3.0));
      band *= 1.0 + streak * 0.30 * fineFade;
    }

    if (band <= 0.001) discard;

    // ── The planet's shadow falling across the rings ──────────────────────
    // The planet's centre is the origin in this space, so this is just the
    // perpendicular distance from the planet's centre to the ray that leaves
    // this point toward the light.
    vec3  toC = -vLocal;
    float tca = dot(toC, uLightLocal);
    float d   = sqrt(max(dot(toC, toC) - tca * tca, 0.0));
    float shadow = (tca > 0.0)
      ? smoothstep(uPlanetR * 0.88, uPlanetR * 1.12, d)   // 0 inside, 1 outside
      : 1.0;                                              // light side: never shadowed

    // ── Optical depth ─────────────────────────────────────────────────────
    // Beer-Lambert through the slab. Seen edge-on the ray crosses far more
    // material, so the rings thicken and brighten toward grazing angles on
    // their own rather than needing a fudge.
    vec3  V   = normalize(uCamLocal - vLocal);
    float ndv = abs(V.z);                       // plane normal is exactly +Z here
    // Floor at 0.35, not near zero. Real rings do go opaque edge-on, but an
    // unclamped 1/ndv reaches 10x near the plane, which saturated alpha to 1
    // across the whole ring — erasing every band and blowing straight through
    // the bloom threshold. Capping the path length near 3x keeps the
    // edge-on thickening while leaving the structure readable.
    float alpha = 1.0 - exp(-band * uDensity / max(ndv, 0.35));

    // Scaled below 1: this is sunlit ice at distance, not a light source, and
    // at full colour it read as a white blaze.
    vec3 col = uColor * uBrightness * mix(uAmbient, 1.0, shadow);

    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0) * uOpacity);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * Particle layer. Each speck's angle is derived from its radius and the clock
 * in the vertex shader, so they genuinely orbit — with the same Keplerian shear
 * as the surface above — at zero CPU cost per frame and in one draw call.
 */
export const ringParticleVertexShader = /* glsl */ `
  attribute float aRadius;
  attribute float aPhase;
  attribute float aOff;      // out-of-plane scatter, so the ring has thickness
  attribute float aSize;

  uniform float uTime;
  uniform float uSpin;
  uniform float uPixelRatio;
  uniform float uSizeScale;
  uniform float uMaxPx;

  varying float vFade;

  void main() {
    float ang = aPhase + uTime * uSpin * pow(max(aRadius, 0.001), -1.5);
    vec3  p   = vec3(cos(ang) * aRadius, sin(ang) * aRadius, aOff);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    // Attenuate with distance so specks shrink as the body recedes — but cap
    // it hard. Unbounded attenuation meant flying close scaled every speck into
    // a soft blob tens of pixels wide, which buried the surface under what
    // looked like clumped cotton. Real ring particles are metres across and are
    // never individually resolvable; they are grain, not spheres, so a few
    // pixels is the honest ceiling however near the camera gets.
    float sz = min(aSize * uSizeScale * uPixelRatio * (60.0 / max(-mv.z, 0.001)), uMaxPx);
    gl_PointSize = sz;

    // Fade out as the rings close toward edge-on. Seen that way every particle
    // projects onto the same thin line, so hundreds overlap per pixel and an
    // additive layer saturates to white — which is exactly what it did. It is
    // also the physically sensible answer: you cannot pick out individual
    // specks through a dense ring seen edge-on, which is where the surface
    // shader's own path-length term takes over instead.
    vec3 nv = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));
    vFade = smoothstep(0.04, 0.40, abs(dot(nv, normalize(-mv.xyz))));

    // And fade them out once they would be sub-pixel. From any distance the
    // whole ring is only a few dozen pixels across, so thousands of discrete
    // dots land more than one per pixel and read as static rather than as
    // grain. Below a couple of pixels the surface shader alone is the honest
    // representation, and these only earn their place close up.
    vFade *= smoothstep(0.9, 2.6, sz);
  }
`;

export const ringParticleFragmentShader = /* glsl */ `
  precision highp float;

  uniform vec3  uColor;
  uniform float uOpacity;

  varying float vFade;

  void main() {
    vec2  d = gl_PointCoord - 0.5;
    float m = 1.0 - smoothstep(0.30, 0.5, length(d));
    float a = m * uOpacity * vFade;
    if (a <= 0.002) discard;
    gl_FragColor = vec4(uColor, a);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
