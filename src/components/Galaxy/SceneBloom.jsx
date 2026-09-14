import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useQualityTier, TIER } from '../../utils/qualityTier';

/**
 * Bloom pass.
 *
 * The scene was built without one, which is why almost every "glow" in it is
 * hand-faked with additive billboards (see the audit). The black hole lens
 * writes genuinely HDR emission, and without bloom that energy just clips —
 * the disk reads flat no matter how bright it is.
 *
 * Gated to MED and above. On LOW the in-shader halo carries the glow on its
 * own, and if bloom turns out to cost MED devices their frame budget the perf
 * probe demotes them to LOW, which switches it off automatically.
 *
 * luminanceThreshold is the important knob: it keeps the pass off the ordinary
 * scene and on the things that are actually emissive. Set it too low and the
 * whole starfield smears.
 */
export default function SceneBloom() {
  const tier = useQualityTier();
  if (tier < TIER.MED) return null;

  const high = tier >= TIER.HIGH;

  return (
    <EffectComposer disableNormalPass multisampling={0}>
      {/* Threshold high and intensity modest: a low threshold with a wide
          radius fogged the whole effect white and bled into the shadow.
          luminanceSmoothing is generous so the bloom fades in gradually
          instead of switching on at a hard luminance, which would draw its
          own visible line across a smoothly fading disk. */}
      <Bloom
        mipmapBlur
        intensity={high ? 0.55 : 0.42}
        luminanceThreshold={0.82}
        luminanceSmoothing={0.45}
        radius={high ? 0.55 : 0.45}
      />
    </EffectComposer>
  );
}
