/**
 * Atmospheric rim for a planet.
 *
 * The planets end at a hard edge against black, which is what makes them read
 * as balls with a picture on rather than spheres in space. A real body scatters
 * light through the slice of atmosphere seen edge-on at the limb, so the
 * silhouette is ringed rather than cut off.
 *
 * This shades the shell by how much atmosphere the view ray passes through,
 * NOT by a Fresnel term. A Fresnel term is the obvious first reach and it is
 * wrong here: it peaks where the shell is edge-on, which is the shell's own
 * outer silhouette, so it draws a detached halo with a visible outer boundary
 * instead of a glow hugging the planet.
 *
 * Optical depth has the right shape for free. For a view ray passing at
 * distance r from the centre, the chord through a shell of radius Rs is
 * 2*sqrt(Rs^2 - r^2) — greatest just off the planet's limb and falling to zero
 * at the shell's edge, which is exactly the profile wanted and means the shell
 * boundary can never show.
 *
 * Rendered back-face-only: the planet is opaque and writes depth, so the whole
 * interior of its silhouette fails the depth test and only the ring survives.
 */

export const atmosphereVertexShader = /* glsl */ `
  varying vec3  vWorld;
  varying vec3  vCenter;
  varying float vShellR;

  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld  = wp.xyz;
    // Centre and radius of this shell in world space. Both are constant across
    // the mesh; they come through as varyings because three only declares
    // modelMatrix to the vertex stage.
    vCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vShellR = length(mat3(modelMatrix) * vec3(1.0, 0.0, 0.0));
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const atmosphereFragmentShader = /* glsl */ `
  precision highp float;

  uniform vec3  uColor;
  uniform float uPower;       // shapes the falloff; higher hugs the limb tighter
  uniform float uStrength;
  uniform float uShellScale;  // shell radius / planet radius
  uniform vec3  uLightDir;    // toward the scene's key light, world space
  uniform float uNightFloor;  // residual scatter past the terminator

  varying vec3  vWorld;
  varying vec3  vCenter;
  varying float vShellR;

  void main() {
    vec3 rd = normalize(vWorld - cameraPosition);

    // Impact parameter: perpendicular distance from the planet centre to this
    // view ray.
    vec3  oc  = vCenter - cameraPosition;
    float tca = dot(oc, rd);
    float r   = sqrt(max(dot(oc, oc) - tca * tca, 0.0));

    float Rs = vShellR;                 // shell radius, world units
    float Rp = Rs / uShellScale;        // planet radius, world units

    // Chord through the shell, normalised so it is 1 at the planet's limb.
    float chord = sqrt(max(Rs * Rs - r * r, 0.0));
    float norm  = sqrt(max(Rs * Rs - Rp * Rp, 1e-6));
    float depth = clamp(chord / norm, 0.0, 1.0);
    float band  = pow(depth, uPower);

    // Weight by the key light. An evenly bright ring all the way round reads as
    // a sticker outline drawn on the planet — it is the falloff into the night
    // side that makes it look like light passing through air. The floor keeps a
    // little scatter beyond the terminator instead of cutting to nothing.
    vec3  nOut = normalize(vWorld - vCenter);
    float day  = smoothstep(-0.45, 0.30, dot(nOut, normalize(uLightDir)));
    float lit  = mix(uNightFloor, 1.0, day);

    gl_FragColor = vec4(uColor * band * uStrength * lit, 1.0);

    // Match whatever the rest of the scene is doing: under the EffectComposer
    // these compile to a no-op and the composer tone maps at the end.
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
