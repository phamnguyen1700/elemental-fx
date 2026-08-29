import { useCallback, useMemo, useState } from "react";

import {
  Vec3,
  type NetworksConfig,
  type VineGrowthConfig,
} from "@elemental-fx/deformable-effects";
import { VineLayer } from "@elemental-fx/deformable-effects/react";

import { bougainvilleaVineAssets } from "../../../assets/foliage/bougainvillea";

const SINGLE_VINE_AREA = {
  alignX: "center",
  alignY: "center",
  height: 0.72,
  width: 0.92,
} as const;

const SINGLE_VINE_SIZE = {
  branch: 1.05,
  flower: 2,
  leaf: 1.5,
} as const;

const SINGLE_VINE_NETWORK = {
  anchorEvery: 3,
  curvature: 0.5,
  endPosition: ({ bounds }) =>
    new Vec3(bounds.max.x, (bounds.min.y + bounds.max.y) * 0.5, 0),
  nodesPerPath: 4,
  orientationVariation: 0,
  pathCount: 1,
  pathLengthVariation: 0,
  startPosition: ({ bounds }) =>
    new Vec3(bounds.min.x, (bounds.min.y + bounds.max.y) * 0.5, 0),
} satisfies Partial<NetworksConfig>;

const SINGLE_VINE_GROWTH = {
  branchProbability: 1,
  flowerProbability: 3,
  leafProbability: 1.5,
  maxBranches: 8,
  maxGrowthNodes: 10,
  spacing: 10,
} satisfies Partial<VineGrowthConfig>;

interface SinglePathPreviewProps {
  seed: number;
  variation: number;
  interactionStrength: number;
}

export function SinglePathPreview({
  seed,
  variation,
  interactionStrength,
}: SinglePathPreviewProps) {
  const [debug, setDebug] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const interaction = useMemo(
    () => ({
      depthFalloff: 0.018,
      lift: 14,
      radius: 38,
      strength: interactionStrength,
      velocityScale: 2.15,
    }),
    [interactionStrength],
  );
  const handleError = useCallback((nextError: Error) => {
    setError(nextError.message);
  }, []);

  return (
    <section className="single-vine-probe">
      <header className="single-vine-probe__header">
        <div>
          <strong>Single Vine / Asset Probe</strong>
        </div>
        <label className="toggle-control">
          <input
            checked={debug}
            onChange={(event) => setDebug(event.target.checked)}
            type="checkbox"
          />
          <span>Debug</span>
        </label>
      </header>

      <div className="single-vine-probe__stage">
        {error ? (
          <p className="effect-error single-vine-probe__error">{error}</p>
        ) : null}
        <VineLayer
          aria-label="Single vine growth preview"
          assets={bougainvilleaVineAssets}
          area={SINGLE_VINE_AREA}
          debug={debug}
          density={1}
          growth={SINGLE_VINE_GROWTH}
          interaction={interaction}
          network={SINGLE_VINE_NETWORK}
          onError={handleError}
          quality="high"
          seed={seed}
          size={SINGLE_VINE_SIZE}
          variation={variation}
        />
      </div>
    </section>
  );
}
