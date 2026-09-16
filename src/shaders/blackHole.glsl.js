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
 * Rendered on a sphere of the influence radius, drawn back-face, with rays
 * entering at its surface. Not a fullscreen post-process: cost still scales
 * with the hole's screen footprint rather than the whole viewport, which is
 * what keeps it affordable on phones.
 *
 * The containment is a sphere rather than a billboard deliberately. A sphere's
 * silhouette is a circle from every angle and never needs resizing, so there is
 * no geometric edge for the effect to be cut against. The earlier billboard had
 * to be re-derived each frame from camera distance and FOV, and that formula
 * diverged near the influence radius — producing straight cuts that worsened as
 * the camera approached.
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
    // modelMatrix, not modelViewMatrix — we need the world-space point on the
    // containment sphere under this fragment to build the ray. Varyings are
    // perspective-correct, so this is exact per-pixel.
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

// Star helpers, interpolated only when the tier enables them — the same
// treatment as the simplex noise, so the low tier never carries the source.
const starHelpers = /* glsl */ `
    float hash13(vec3 p3) {
      p3 = fract(p3 * 0.1031);
      p3 += dot(p3, p3.zyx + 31.32);
      return fract((p3.x + p3.y) * p3.z);
    }

    // Sparse procedural stars on the celestial sphere. Sampled with the ray's
    // escape direction, so the geodesic decides which part of the sky each
    // pixel sees — that is what produces the Einstein ring rather than any
    // explicit ring-drawing code.
    vec3 starField(vec3 dir) {
      vec3 p = dir * 260.0;
      vec3 c = floor(p);
      vec3 f = fract(p) - 0.5;
      float present = step(0.985, hash13(c));          // ~1.5% of cells hold a star
      vec3  jit = vec3(hash13(c + 11.3), hash13(c + 27.7), hash13(c + 41.1)) - 0.5;
      float d   = length(f - jit * 0.6);
      float s   = present * exp(-d * d * 160.0) * (0.45 + 0.55 * hash13(c + 63.1));
      vec3  tint = mix(vec3(0.72, 0.82, 1.0), vec3(1.0, 0.90, 0.74), hash13(c + 5.5));
      return tint * s;
    }
`;

export function buildBlackHoleFragment({ steps = 0, stars = 0 } = {}) {
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
    uniform float uStarBright;
    uniform float uLensStrength;
    uniform vec2  uResolution;
    // The scene rendered without the lens, plus the matrix that maps a world
    // direction back to where it appears in that render. Together these let an
    // escaping ray look up what the sky actually holds in the direction it ends
    // up pointing — which is real lensing of the real scene, not a stand-in.
    uniform sampler2D uScene;
    uniform mat4  uProjView;
    uniform float uHasScene;
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
    ${RAY && stars ? '#define STARS 1' : ''}

    ${RAY ? glslSimplex3D : ''}
    ${RAY && stars ? starHelpers : ''}

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    // ACES filmic curve (Narkowicz approximation).
    //
    // Implemented here rather than calling three's injected toneMapping():
    // that function is only emitted when the RENDERER is tone mapping, and the
    // EffectComposer takes that over, so it does not exist in this program.
    // Depending on it compiled to "no matching overloaded function found".
    vec3 acesToneMap(vec3 x) {
      return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
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
      // Backstop only. Every fragment sits on the containment sphere, so its
      // ray necessarily passes within RMAX of the centre and this cannot fire
      // in normal use — the sphere's silhouette already is the b = RMAX circle.
      // Kept because it costs ~2 ops and guards against a bad uniform.
      if (d2 > RMAX2) discard;

      vec3  col   = vec3(0.0);
      float alpha = 0.0;

      // Declared for both tiers so the compositing tail below is shared. On the
      // analytic tier the ray never bends, so it stays equal to the entry
      // direction and samples its own screen position — an exact copy.
      vec3 dir     = rd;
      bool escaped = false;

#ifdef RAYMARCH
      // ── Geodesic integration ───────────────────────────────────────────────
      // Advance analytically to the influence sphere first; marching from the
      // camera ~140 r_s away would waste every step.
      float tEnter = max(0.0, tca - sqrt(max(RMAX2 - d2, 0.0)));
      vec3  pos = ro + rd * tEnter;
      vec3  dir = rd;

      // Angular momentum is conserved along a geodesic — hoist it out of the
      // loop, never recompute it inside.
      bool  escaped = false;
      vec3  hv = cross(pos, dir);
      float h2 = dot(hv, hv);

      // Jitter the first step to break up banding from a fixed step lattice.
      float jitter = hash12(gl_FragCoord.xy + uTime) * 0.5;
      bool  jittered = false;

      for (int i = 0; i < STEPS; i++) {
        float r2 = dot(pos, pos);
        if (r2 < 1.0) break;   // crossed the horizon; the analytic shadow below covers it
        if (r2 > RMAX2 && dot(pos, dir) > 0.0) { escaped = true; break; }
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

      float env = uAmount * (1.0 + uFlash * 3.0);
      col   *= env;
      alpha *= uAmount;

      // ── Photon ring ───────────────────────────────────────────────────────
      float ringW = 0.028 * BCRIT;
      float ring  = exp(-pow((b - BCRIT * 1.015) / ringW, 2.0));
      col   += blackbody(uTempScale * 1.25) * ring * uEmission * 1.7 * mix(1.0, 0.4, uDormant) * env;
      alpha += ring * 0.45;

      // ── Halo ──────────────────────────────────────────────────────────────
      float halo = exp(-pow(b / (BCRIT * 1.9 * (1.0 + uFlash * 1.5)), 2.0));
      col += blackbody(uTempScale * 0.75) * halo * uGlow * mix(1.0, 0.5, uDormant) * env;

      alpha = clamp(alpha, 0.0, 1.0);

      // ── Composite in DISPLAY space ────────────────────────────────────────
      // The captured scene is already tone-mapped and encoded — it is literally
      // what those pixels look like on screen. So the emissive parts are brought
      // into that space and the background is added untouched, rather than the
      // background being dragged through a second tone map. That second pass was
      // the source of every brightness problem here: it made the inside of the
      // sphere systematically differ from the identical scene just outside it.
      vec3 emissive = sRGBTransferOETF(vec4(acesToneMap(col), 1.0)).rgb;

      vec3 bg = vec3(0.0);
      if (uHasScene > 0.5) {
        // Deflection fades the sample POSITION, never the opacity. Undeflected
        // rays sample their own screen position and reproduce exactly what was
        // already there, so the sphere's rim is seamless by construction.
        float turn    = 1.0 - dot(normalize(dir), rd);
        float lensAmt = smoothstep(0.004, 0.055, turn) * uLensStrength * uAmount;

        vec2 ownUV = gl_FragCoord.xy / uResolution;
        vec2 suv   = ownUV;

        vec4 clip = uProjView * vec4(normalize(dir), 0.0);
        if (escaped && clip.w > 0.0) {
          vec2  lensUV = clip.xy / clip.w * 0.5 + 0.5;
          vec2  m      = min(lensUV, 1.0 - lensUV);
          float edge   = smoothstep(0.0, 0.03, min(m.x, m.y));
          suv = mix(ownUV, lensUV, lensAmt * edge);
        }
        // three applies output colour-space encoding only when drawing to the
        // canvas, never to a render target — so the capture holds tone-mapped
        // LINEAR values, not display-space ones. Encoding here is what puts it
        // in the same space as the emissive term above. Without it the nebula
        // behind the hole came back up to 5x too dark and the sphere read as an
        // empty black disc.
        bg = sRGBTransferOETF(vec4(texture2D(uScene, clamp(suv, 0.0, 1.0)).rgb, 1.0)).rgb;
      }

      vec3 outCol = emissive + bg * (1.0 - alpha);

      // ── Shadow ────────────────────────────────────────────────────────────
      // Applied last, so it removes the background too — nothing escapes from
      // inside the horizon, including light that was behind it.
      float wpx    = max(fwidth(b), 1e-4);
      float shadow = smoothstep(BCRIT + wpx, BCRIT - wpx, b);
      outCol *= (1.0 - shadow);

      outCol += (hash12(gl_FragCoord.xy * 1.7 + uTime) - 0.5) / 255.0;

      // Opaque: this surface paints the finished image inside its silhouette.
      gl_FragColor = vec4(outCol, 1.0);
    }
  `;
}
