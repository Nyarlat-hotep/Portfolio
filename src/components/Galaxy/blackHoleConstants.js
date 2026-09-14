/**
 * Single source of truth for the gravity-well black hole.
 *
 * Geometry is expressed in Schwarzschild radii (r_s) wherever the shader will
 * consume it, and converted to world units through R_S_WORLD. Keeping the two
 * spaces separate is what lets the lens shader stay scale-invariant while the
 * hole animates its size on spawn.
 *
 * Previously GRAVITY_DURATION was duplicated in PlanetField.jsx with a comment
 * asking the reader to keep it in sync by hand.
 */

// ── Relativistic landmarks, in units of r_s (r_s = 1, M = 0.5) ───────────────
// These are fixed by the Schwarzschild metric, not art direction. Do not tune.
export const PHOTON_SPHERE_RS = 1.5;              // circular photon orbit
export const ISCO_RS          = 3.0;              // innermost stable circular orbit
export const BCRIT_RS         = 3 * Math.sqrt(3) * 0.5;  // 2.598 — apparent shadow radius

// ── Scale in world units ─────────────────────────────────────────────────────
// R_S_WORLD is chosen so the shadow (BCRIT_RS * R_S_WORLD = 1.30) lands close to
// the 1.2-radius black sphere it replaces, so the hole's apparent size does not
// jump when the renderer changes.
export const R_S_WORLD      = 0.5;
export const SHADOW_R_WORLD = BCRIT_RS * R_S_WORLD;   // 1.299

// Accretion disk extent, in r_s. Inner edge sits at the ISCO so the disk fades
// out physically rather than being clipped by an arbitrary radius.
export const DISK_IN_RS  = ISCO_RS;   // 3
export const DISK_OUT_RS = 14;

// How far the lens billboard reaches. Past ~7 r_s the lensing window
// exp(-(b/7)^2) is already ~0.005, so 16 is comfortably beyond visible effect.
export const INFLUENCE_RS = 16;

// ── Interaction / simulation ─────────────────────────────────────────────────
export const WELL_RAMP        = 1.5;  // seconds for gravity to reach full strength
export const GRAVITY_DURATION = 10;   // seconds gravity stays active after planting
export const SPAWN_EASE       = 0.7;  // seconds for the hole to scale in

// Radius at which particles stop being pulled and start their inspiral. Sits
// just outside DISK_OUT in world units (14 * 0.5 = 7) so matter visibly enters
// from outside the disk and falls into it.
export const SPIRAL_ENTER_R = 9;

// Radius at which infalling matter crosses the horizon and is removed. Slightly
// inside the apparent shadow so nothing is seen winking out in open space.
export const HORIZON_R = SHADOW_R_WORLD;

// Inspiral shaping
export const INSPIRAL_RATE = 2.2;   // base inward speed (world units/s)
export const ORBIT_RATE    = 9.0;   // angular rate scale; divided by r^1.5 (Keplerian)
export const FLATTEN_RATE  = 1.8;   // rate at which matter collapses into the disk plane

// ── Quality tiers ────────────────────────────────────────────────────────────
// STEPS must be a compile-time constant: GLSL requires constant loop bounds, so
// these are injected as #defines rather than passed as uniforms.
export const TIER = { LOW: 0, MED: 1, HIGH: 2 };

export const TIER_CONFIG = {
  [TIER.LOW]:  { steps: 0,  crossings: 1, stars: 0, maxScreenFrac: 0.45, dpr: 1.0  },
  [TIER.MED]:  { steps: 48, crossings: 2, stars: 1, maxScreenFrac: 0.65, dpr: 1.5  },
  [TIER.HIGH]: { steps: 96, crossings: 3, stars: 1, maxScreenFrac: 0.90, dpr: null }, // null = inherit
};
