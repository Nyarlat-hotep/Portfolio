import {
  BCRIT_RS,
  PHOTON_SPHERE_RS,
  DISK_IN_RS,
  DISK_OUT_RS,
  INFLUENCE_RS,
} from '../components/Galaxy/blackHoleConstants';

/**
 * Black hole lens shaders.
 *
 * Rendered on a camera-facing billboard sized to the hole's influence radius,
 * not as a fullscreen post-process. That bound is what makes the effect
 * affordable on phones: cost scales with the hole's screen footprint, which is
 * clampable, rather than with the whole viewport.
 *
 * All ray math runs in black-hole-local space with r_s = 1, M = 0.5, so the
 * shader is scale-invariant and the hole can animate its size purely through
 * the uRs uniform without disturbing the geometry.
 *
 * QUALITY 0 (this checkpoint) is analytic: no loop, no raymarching. It is the
 * permanent low tier and the fallback, not a degraded version of the high one.
 */

export const blackHoleVertexShader = /* glsl */ `
  varying vec3 vWorldPos;

  void main() {
    // modelMatrix, not modelViewMatrix — we need the world-space point under
    // this fragment to build the ray. Varyings are perspective-correct, so
    // this is exact per-pixel, not an approximation.
    vec4 wp   = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

/**
 * Novikov-Thorne temperature normalisation.
 *
 * T(r) ~ r^(-3/4) * (1 - sqrt(r_isco/r))^(1/4) peaks at r = (7/6)^2 * r_isco.
 * Computing the peak here rather than hard-coding 4.6729 keeps the constant
 * honest if DISK_IN_RS ever changes.
 */
function novikovThorneNorm() {
  const rPeak = Math.pow(7 / 6, 2) * DISK_IN_RS;
  const peak  = Math.pow(rPeak, -0.75) * Math.pow(1 - Math.sqrt(DISK_IN_RS / rPeak), 0.25);
  return 1 / peak;
}

export function buildBlackHoleFragment({ crossings = 1, stars = 0 } = {}) {
  const TNORM = novikovThorneNorm();

  return /* glsl */ `
    precision highp float;

    uniform vec3  uHolePos;      // hole centre, world space
    uniform mat3  uWorldToLocal; // world -> hole-local basis (disk normal = +Y)
    uniform float uRs;           // Schwarzschild radius in world units
    uniform float uTime;
    uniform float uAmount;       // 0..1 spawn/active envelope
    uniform float uDormant;      // 0..1 gravity expired
    uniform float uFlash;        // 0..1 collapse surge
    uniform float uTempScale;    // peak disk temperature, Kelvin
    uniform float uDiskOpacity;
    uniform float uDoppler;      // 0 = off, 1 = full relativistic beaming
    uniform float uSpinSign;     // +1 / -1, which side approaches
    uniform float uGlow;
    uniform sampler2D uBB;       // blackbody LUT

    varying vec3 vWorldPos;

    #define BCRIT      ${BCRIT_RS.toFixed(6)}
    #define PHOTON_R   ${PHOTON_SPHERE_RS.toFixed(6)}
    #define DISK_IN    ${DISK_IN_RS.toFixed(6)}
    #define DISK_OUT   ${DISK_OUT_RS.toFixed(6)}
    #define RMAX       ${INFLUENCE_RS.toFixed(6)}
    #define RMAX2      ${(INFLUENCE_RS * INFLUENCE_RS).toFixed(6)}
    #define TNORM      ${TNORM.toFixed(6)}

    // Cheap hash for dithering. Banding is very visible across a large, smooth
    // glow falloff, and a sub-LSB dither removes it for ~3 ops.
    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    // Blackbody chromaticity for a temperature in Kelvin.
    vec3 blackbody(float kelvin) {
      float u = clamp((kelvin - 1000.0) / 19000.0, 0.0, 1.0);
      return texture2D(uBB, vec2(u, 0.5)).rgb;
    }

    /**
     * Emission from the disk at local radius r (in r_s), at a point whose
     * velocity is seen along viewDir.
     *
     * Novikov-Thorne radial temperature, then Doppler beaming and
     * gravitational redshift folded into a single factor g. Intensity scales
     * as g^3 (from I_nu/nu^3 invariance) and temperature as g.
     */
    vec3 diskEmission(vec3 hit, float r, vec3 viewDir, out float alpha) {
      float f  = max(0.0, 1.0 - sqrt(DISK_IN / r));
      float Tn = TNORM * pow(r, -0.75) * pow(f, 0.25);

      // Keplerian orbital speed v/c = sqrt(M/r) with M = 0.5
      float beta = uSpinSign * inversesqrt(2.0 * r);
      vec3  vdir = normalize(cross(vec3(0.0, 1.0, 0.0), hit));
      float cosT = dot(vdir, -viewDir);          // -viewDir points at the observer
      float D    = 1.0 / max(0.05, 1.0 - beta * cosT);
      float grav = sqrt(max(0.0, 1.0 - 1.0 / r));
      float g    = mix(1.0, D, uDoppler) * grav;

      float kelvin = uTempScale * Tn * g;
      vec3  chroma = blackbody(kelvin);

      // Radial profile: fade in off the ISCO, out toward the rim.
      float shape = smoothstep(DISK_IN, DISK_IN * 1.35, r)
                  * (1.0 - smoothstep(DISK_OUT * 0.62, DISK_OUT, r));

      float inten = Tn * g * g * g * shape;

      // Dormant: cooler and dimmer, desaturating toward ash.
      chroma = mix(chroma, vec3(0.48, 0.50, 0.58), uDormant * 0.75);
      inten *= mix(1.0, 0.55, uDormant);

      alpha = clamp(inten * uDiskOpacity, 0.0, 1.0) * shape;
      return chroma * inten;
    }

    void main() {
      // Build the ray in hole-local space, in units of r_s.
      vec3 ro = uWorldToLocal * (cameraPosition - uHolePos) / uRs;
      vec3 rd = normalize(uWorldToLocal * (vWorldPos - cameraPosition));

      // Impact parameter — perpendicular distance from the hole to the ray line.
      float b = length(cross(ro, rd));

      // Cull fragments whose ray never enters the influence sphere. The quad is
      // square and the influence region is a disc, so this is ~21% of the quad
      // for free (depthWrite is off, so there is no early-Z to lose).
      float tca = -dot(ro, rd);
      float d2  = dot(ro, ro) - tca * tca;
      if (d2 > RMAX2) discard;

      vec3  col   = vec3(0.0);
      float alpha = 0.0;

      // ── Accretion disk (analytic) ──────────────────────────────────────────
      // Straight-line intersection with the disk plane y = 0. No light bending
      // at this tier, so no secondary image and no arc over the top — that is
      // what the raymarched tier adds.
      if (abs(rd.y) > 1e-5) {
        float t = -ro.y / rd.y;
        if (t > 0.0) {
          vec3  hit = ro + rd * t;
          float hr  = length(hit.xz);
          if (hr > DISK_IN && hr < DISK_OUT) {
            float da;
            vec3  dc = diskEmission(hit, hr, rd, da);

            // Slab path length — grazing views cut through more material, which
            // is what makes the near edge read as the brightest band edge-on.
            float pathLen = 1.0 / max(0.06, abs(rd.y));
            da = 1.0 - exp(-da * pathLen);

            // Occluded if the disk crossing happens behind the shadow.
            float behind = (t > tca && b < BCRIT) ? 0.0 : 1.0;
            da *= behind;

            col   += dc * da;
            alpha += da;
          }
        }
      }

      // ── Photon ring ────────────────────────────────────────────────────────
      // Thin bright annulus at the critical impact parameter, where rays orbit
      // before escaping. Analytic stand-in for the real thing here.
      float ringW = 0.055 * BCRIT;
      float ring  = exp(-pow((b - BCRIT * 1.02) / ringW, 2.0));
      vec3  ringC = blackbody(uTempScale * 0.75);
      col   += ringC * ring * 1.6 * mix(1.0, 0.45, uDormant);
      alpha += ring * 0.35;

      // ── Halo ───────────────────────────────────────────────────────────────
      // Pure emission, alpha 0 — with premultiplied output this is a true
      // additive glow and needs no separate additive pass.
      float halo = exp(-pow(b / (BCRIT * 3.4 * (1.0 + uFlash * 1.5)), 1.4));
      col += blackbody(uTempScale * 0.62) * halo * uGlow * mix(1.0, 0.5, uDormant);

      // ── Shadow ─────────────────────────────────────────────────────────────
      // The black disc subtends b_crit = 3*sqrt(3)*M = 2.598 r_s, NOT 1 r_s.
      // fwidth gives exact one-pixel antialiasing and avoids the sparkle a
      // boolean horizon test produces on near-critical rays.
      float w      = max(fwidth(b), 1e-4);
      float shadow = smoothstep(BCRIT + w, BCRIT - w, b);

      col   *= (1.0 - shadow);          // nothing escapes from inside
      alpha  = max(alpha, shadow);      // and it occludes whatever is behind

      // Soft outer window so the billboard's square edge is never visible.
      float window = exp(-pow(b / (RMAX * 0.44), 2.0));
      col   *= window;
      alpha *= window;

      // Spawn / collapse envelope
      col   *= uAmount * (1.0 + uFlash * 3.0);
      alpha *= uAmount;

      alpha = clamp(alpha, 0.0, 1.0);
      if (alpha < 0.0005 && dot(col, col) < 1e-8) discard;

      // Sub-LSB dither kills banding across the halo falloff.
      col += (hash12(gl_FragCoord.xy + uTime) - 0.5) / 255.0;

      gl_FragColor = vec4(col, alpha);

      // Premultiplied: .rgb is raw emission, .a is occlusion, blended as
      // src.rgb + dst*(1-src.a). Do NOT multiply rgb by alpha afterwards.
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `;
}
