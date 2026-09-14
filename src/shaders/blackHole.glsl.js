import { glslSimplex3D } from './glslNoise';
import {
  BCRIT_RS,
  DISK_IN_RS,
  DISK_OUT_RS,
  DISK_FADE_RS,
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
 * shader is scale-invariant and the hole can animate its size through the uRs
 * uniform alone.
 *
 * QUALITY 0 is analytic (no loop) and ships as the permanent low tier.
 * QUALITY >= 1 integrates null geodesics and accumulates the disk
 * volumetrically, which is what produces the arc over the top, the photon
 * ring, and the soft filamentary structure.
 */

export const blackHoleVertexShader = /* glsl */ `
  varying vec3 vWorldPos;

  void main() {
    // modelMatrix, not modelViewMatrix — we need the world-space point under
    // this fragment to build the ray. Varyings are perspective-correct, so
    // this is exact per-pixel.
    vec4 wp   = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

/**
 * Novikov-Thorne temperature normalisation.
 * T(r) ~ r^(-3/4) * (1 - sqrt(r_isco/r))^(1/4) peaks at r = (7/6)^2 * r_isco.
 * Derived rather than hard-coded so it stays correct if DISK_IN_RS changes.
 */
function novikovThorneNorm() {
  const rPeak = Math.pow(7 / 6, 2) * DISK_IN_RS;
  const peak  = Math.pow(rPeak, -0.75) * Math.pow(1 - Math.sqrt(DISK_IN_RS / rPeak), 0.25);
  return 1 / peak;
}

export function buildBlackHoleFragment({ steps = 0, crossings = 1, stars = 0 } = {}) {
  const TNORM = novikovThorneNorm();
  const RAY   = steps > 0;

  return /* glsl */ `
    precision highp float;

    uniform vec3  uHolePos;
    uniform mat3  uWorldToLocal;
    uniform float uRs;
    uniform float uTime;
    uniform float uAmount;
    uniform float uDormant;
    uniform float uFlash;
    uniform float uTempScale;
    uniform float uDiskOpacity;
    uniform float uEmission;     // HDR multiplier — values > 1 are what bloom picks up
    uniform float uDoppler;
    uniform float uSpinSign;
    uniform float uGlow;
    uniform float uHalfThick;    // disk half-thickness, r_s
    uniform float uNoiseSpeed;
    uniform sampler2D uBB;

    varying vec3 vWorldPos;

    #define BCRIT    ${BCRIT_RS.toFixed(6)}
    #define DISK_IN  ${DISK_IN_RS.toFixed(6)}
    #define DISK_OUT ${DISK_OUT_RS.toFixed(6)}
    #define DISK_FADE ${DISK_FADE_RS.toFixed(6)}
    #define RMAX     ${INFLUENCE_RS.toFixed(6)}
    #define RMAX2    ${(INFLUENCE_RS * INFLUENCE_RS).toFixed(6)}
    #define TNORM    ${TNORM.toFixed(6)}
    ${RAY ? `#define RAYMARCH 1\n    #define STEPS ${steps}` : '#define STEPS 0'}

    ${RAY ? glslSimplex3D : ''}

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    vec3 blackbody(float kelvin) {
      float u = clamp((kelvin - 1000.0) / 19000.0, 0.0, 1.0);
      return texture2D(uBB, vec2(u, 0.5)).rgb;
    }

#ifdef RAYMARCH
    // 3-octave FBM. Coordinates are anisotropic — the radial axis is scaled
    // separately from the azimuthal one — so features stretch into arcs rather
    // than sitting as round blobs.
    float fbm(vec3 p) {
      float f = 0.0, a = 0.5;
      for (int i = 0; i < 3; i++) {
        f += a * snoise(p);
        p *= 2.02;
        a *= 0.5;
      }
      return f;
    }

    /**
     * Volumetric disk density at a point.
     *
     * A hard plane intersection gives a flat, cut-out ellipse. Accumulating a
     * soft band through the march instead is what reads as gas: the vertical
     * gaussian gives thickness, and Keplerian shear (phase ~ 1/r^1.5) drags
     * inner radii past outer ones so the filaments wind.
     */
    float diskDensity(vec3 p, float r) {
      float ang   = atan(p.z, p.x);
      float shear = uTime * uNoiseSpeed / pow(max(r, 0.6), 1.5);
      float a2    = ang + shear;

      // cos/sin of the angle rather than the angle itself keeps the noise
      // domain on a circle, so it is seamless at +-pi and cannot wind without
      // bound as time grows.
      vec3 np = vec3(r * 0.55, cos(a2) * 1.7, sin(a2) * 1.7);
      float n = fbm(np) * 0.5 + 0.5;

      // Vertical profile — gaussian falloff from the disk plane.
      float vert = exp(-pow(p.y / max(uHalfThick, 1e-3), 2.0));

      // Radial profile. The inner edge steps up off the ISCO; the outer edge
      // must NOT be a cutoff of any kind.
      //
      // The Novikov-Thorne temperature is still at ~72% of peak out at
      // DISK_OUT, so any smoothstep or clamp there chops the disk while it is
      // still bright and leaves a hard rim — which is exactly what read as a
      // straight edge on the effect. An exponential tail has no knee: the disk
      // simply thins out and is already negligible well inside the billboard,
      // so the geometry never becomes the thing that ends it.
      float tOut   = max(0.0, (r - DISK_IN) / (DISK_OUT - DISK_IN));
      float radial = smoothstep(DISK_IN, DISK_IN * 1.45, r)
                   * exp(-pow(tOut * 1.15, 2.4));

      // Contrast the noise so it reads as filaments rather than haze.
      float fil = pow(clamp(n, 0.0, 1.0), 2.2);

      return vert * radial * (0.25 + 0.75 * fil);
    }
#endif

    /** Emission colour and intensity for a disk point seen along viewDir. */
    vec3 diskEmission(vec3 p, float r, vec3 viewDir, out float inten) {
      float f  = max(0.0, 1.0 - sqrt(DISK_IN / r));
      float Tn = TNORM * pow(r, -0.75) * pow(f, 0.25);

      // Keplerian v/c = sqrt(M/r), M = 0.5
      float beta = uSpinSign * inversesqrt(2.0 * r);
      vec3  vdir = normalize(cross(vec3(0.0, 1.0, 0.0), p));
      float cosT = dot(vdir, -normalize(viewDir));   // -viewDir points at the observer
      float D    = 1.0 / max(0.05, 1.0 - beta * cosT);
      float grav = sqrt(max(0.0, 1.0 - 1.0 / r));
      float g    = mix(1.0, D, uDoppler) * grav;

      vec3 chroma = blackbody(uTempScale * Tn * g);
      chroma = mix(chroma, vec3(0.48, 0.50, 0.58), uDormant * 0.75);

      // g^3 from I_nu/nu^3 invariance — the relativistic beaming.
      inten = Tn * g * g * g * mix(1.0, 0.5, uDormant);
      return chroma;
    }

    void main() {
      vec3 ro = uWorldToLocal * (cameraPosition - uHolePos) / uRs;
      vec3 rd = normalize(uWorldToLocal * (vWorldPos - cameraPosition));

      float b   = length(cross(ro, rd));
      float tca = -dot(ro, rd);
      float d2  = dot(ro, ro) - tca * tca;
      // The quad is square, the influence region a disc — this culls ~21% of
      // the quad's fragments for free (depthWrite is off, so no early-Z lost).
      if (d2 > RMAX2) discard;

      vec3  col   = vec3(0.0);
      float alpha = 0.0;

#ifdef RAYMARCH
      // ── Geodesic integration ───────────────────────────────────────────────
      // Advance analytically to the influence sphere first; marching from the
      // camera ~140 r_s away would waste every step.
      float tEnter = max(0.0, tca - sqrt(max(RMAX2 - d2, 0.0)));
      vec3  pos = ro + rd * tEnter;
      vec3  dir = rd;

      // Angular momentum is conserved along a geodesic — hoist it out of the
      // loop, never recompute it inside.
      vec3  hv = cross(pos, dir);
      float h2 = dot(hv, hv);

      // Jitter the first step to break up banding from a fixed step lattice.
      float jitter = hash12(gl_FragCoord.xy + uTime) * 0.5;
      bool  jittered = false;

      for (int i = 0; i < STEPS; i++) {
        float r2 = dot(pos, pos);
        if (r2 < 1.0) break;   // crossed the horizon; the analytic shadow below covers it
        if (r2 > RMAX2 && dot(pos, dir) > 0.0) break;
        if (alpha > 0.99) break;

        float r  = sqrt(r2);
        float dt = clamp(0.16 * r, 0.035, 1.2);

        // Refine the step near the disk slab, otherwise the volume is
        // undersampled and the gas strobes as the camera moves.
        float rxz = length(pos.xz);
        // Refine only within the slab itself, not a wide margin around it.
        // A grazing ray travels ~25 r_s through the disk region; refining over
        // |y| < 6*thickness at dt = 1.1*thickness cost ~75 steps and exhausted
        // the budget on the 48-step tier, truncating those rays mid-disk.
        if (abs(pos.y) < uHalfThick * 3.0 && rxz < DISK_FADE) {
          dt = min(dt, uHalfThick * 1.8);
        }
        if (!jittered) { dt *= (0.5 + jitter); jittered = true; }

        vec3 prev = pos;

        // Leapfrog on the exact Schwarzschild null geodesic:
        //   d2x/dl2 = -(3/2) * h^2 * x / r^5
        // Do NOT renormalise dir — that breaks the geodesic.
        dir += (-1.5 * h2 * pos / (r2 * r2 * r)) * dt;
        pos += dir * dt;

        // ── Volumetric disk sample at the segment midpoint ────────────────
        vec3  mid = 0.5 * (prev + pos);
        float mr  = length(mid.xz);
        if (mr > DISK_IN * 0.92 && mr < DISK_FADE && abs(mid.y) < uHalfThick * 6.0) {
          float dens = diskDensity(mid, mr);
          if (dens > 0.001) {
            float inten;
            vec3  chroma = diskEmission(mid, mr, dir, inten);

            // Beer-Lambert over this segment's length.
            float da = 1.0 - exp(-dens * dt * uDiskOpacity * 6.0);

            // Front-to-back compositing. Emission is deliberately unbounded:
            // HDR values above 1 are what the bloom pass keys on.
            col   += (1.0 - alpha) * chroma * inten * da * uEmission;
            alpha += (1.0 - alpha) * da;
          }
        }
      }
#else
      // ── Analytic tier: straight-line disk plane intersection ──────────────
      if (abs(rd.y) > 1e-5) {
        float t = -ro.y / rd.y;
        if (t > 0.0) {
          vec3  hit = ro + rd * t;
          float hr  = length(hit.xz);
          if (hr > DISK_IN && hr < DISK_FADE) {
            float inten;
            vec3  chroma = diskEmission(hit, hr, rd, inten);
            float tOut   = max(0.0, (hr - DISK_IN) / (DISK_OUT - DISK_IN));
            float shape  = smoothstep(DISK_IN, DISK_IN * 1.35, hr)
                         * exp(-pow(tOut * 1.15, 2.4));
            float pathLen = 1.0 / max(0.06, abs(rd.y));
            float da = (1.0 - exp(-shape * pathLen * uDiskOpacity)) * ((t > tca && b < BCRIT) ? 0.0 : 1.0);
            col   += chroma * inten * da * uEmission;
            alpha += da;
          }
        }
      }
#endif

      // ── Photon ring ────────────────────────────────────────────────────────
      // Rays near b_crit orbit before escaping. The raymarch produces most of
      // this naturally through repeated disk crossings; this adds the thin
      // coherent rim that a finite step count under-resolves.
      // Thin and bright rather than broad — it should read as a hard bright
      // rim tracing the shadow, which is what separates the silhouette from
      // the disk behind it.
      float ringW = 0.028 * BCRIT;
      float ring  = exp(-pow((b - BCRIT * 1.015) / ringW, 2.0));
      col   += blackbody(uTempScale * 1.25) * ring * uEmission * 1.5 * mix(1.0, 0.4, uDormant);
      alpha += ring * 0.45;

      // ── Halo ───────────────────────────────────────────────────────────────
      // Pure emission at alpha 0 — with premultiplied output this is a true
      // additive glow. Kept tight: a wide halo fogs the shadow to grey and
      // buries the photon ring, which is most of what went wrong before.
      float halo = exp(-pow(b / (BCRIT * 1.9 * (1.0 + uFlash * 1.5)), 2.0));
      col += blackbody(uTempScale * 0.75) * halo * uGlow * mix(1.0, 0.5, uDormant);

      // ── Shadow ─────────────────────────────────────────────────────────────
      // The black disc subtends b_crit = 3*sqrt(3)*M = 2.598 r_s, not 1 r_s.
      // fwidth gives exact one-pixel AA and avoids the sparkle that a boolean
      // horizon test produces on chaotic near-critical rays.
      float w      = max(fwidth(b), 1e-4);
      float shadow = smoothstep(BCRIT + w, BCRIT - w, b);

      col   *= (1.0 - shadow);
      alpha  = max(alpha, shadow);

      // No edge window. The quad is sized to contain the whole effect and is
      // never cropped, and the disk's own density tail reaches zero at ~14.5
      // r_s — inside the RMAX discard at 15. Nothing nonzero can reach the
      // boundary, so there is nothing to fade out. Every previous version of
      // this shader had a window here, and every one of them ended up cutting
      // the disk instead of hiding an edge.

      col   *= uAmount * (1.0 + uFlash * 3.0);
      alpha *= uAmount;

      alpha = clamp(alpha, 0.0, 1.0);
      if (alpha < 0.0005 && dot(col, col) < 1e-8) discard;

      col += (hash12(gl_FragCoord.xy * 1.7 + uTime) - 0.5) / 255.0;

      gl_FragColor = vec4(col, alpha);

      // Premultiplied: .rgb is raw emission, .a is occlusion, blended as
      // src.rgb + dst*(1 - src.a). Do NOT multiply rgb by alpha afterwards.
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `;
}
