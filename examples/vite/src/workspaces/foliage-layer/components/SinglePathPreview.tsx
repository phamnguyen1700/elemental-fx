import { useCallback, useMemo, useState } from "react";

import {
  type NetworksConfig,
  type VineGrowthConfig,
} from "@elemental-fx/deformable-effects";
import { VineLayer } from "@elemental-fx/deformable-effects/react";

import { bougainvilleaVineAssets } from "../../../assets/foliage/bougainvillea";

const SINGLE_VINE_AREA = {
  alignX: "center",
  alignY: "center",
  height: 0.68,
  width: 0.72,
} as const;

const SINGLE_VINE_SIZE = {
  branch: 1,

  mainBranch: 0.92,

  secondaryBranch: 1.08,

  flower: 1.1,

  leaf: 1,
} as const;

const SINGLE_VINE_NETWORK = {
  anchorEvery: 3,

  curvature: 0.58,

  nodesPerPath: 8,

  orientationVariation: 0.45,

  pathCount: 1,

  pathLengthVariation: 0.12,
} satisfies Partial<NetworksConfig>;

const SINGLE_VINE_GROWTH = {
  branchProbability: 0.9,

  flowerProbability: 0.55,

  leafProbability: 0.75,

  maxBranches: 8,

  maxGrowthNodes: 10,

  spacing: 14,
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
        <strong className="single-vine-probe__title">
          Single Vine / Asset Probe
        </strong>

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
        <VineLayer
          aria-label="Single vine growth preview"
          assets={bougainvilleaVineAssets}
          area={SINGLE_VINE_AREA}
          className="single-vine-probe__canvas"
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

        {error ? (
          <p className="effect-error single-vine-probe__error">{error}</p>
        ) : null}
      </div>
    </section>
  );
}
