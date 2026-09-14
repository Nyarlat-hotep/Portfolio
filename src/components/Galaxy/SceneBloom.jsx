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
      <Bloom
        mipmapBlur
        intensity={high ? 0.95 : 0.7}
        luminanceThreshold={0.62}
        luminanceSmoothing={0.28}
        radius={high ? 0.72 : 0.6}
      />
    </EffectComposer>
  );
}
