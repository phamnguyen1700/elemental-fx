import { useCallback, useMemo, useState } from "react";

import {
  type NetworksConfig,
  type VineCornerShape,
  type VineGrowthConfig,
  type VineLayout,
  type VineLayoutMode,
} from "@elemental-fx/deformable-effects";
import { VineLayer } from "@elemental-fx/deformable-effects/react";

import { bougainvilleaVineAssets } from "../../assets/foliage/bougainvillea";
import { WorkspaceScaffold } from "../shared/WorkspaceScaffold";
import { SinglePathPreview } from "./components/SinglePathPreview";

const PARAMETERS = [
  "assets",
  "area",
  "density",
  "size",
  "variation",
  "seed",
  "interaction",
  "growth",
  "network",
  "quality",
];

const VINE_AREA = {
  alignX: "center",
  alignY: "center",
  height: 1,
  width: 1,
} as const;

const VINE_SIZE = {
  /**
   * Common structural scale.
   */
  branch: 1.1,

  /**
   * Primary runners remain visible without dominating the composition.
   */
  mainBranch: 0.9,

  /**
   * Secondary growth stays readable beneath flowers and leaves.
   */
  secondaryBranch: 1.08,

  flower: 0.88,
  leaf: 0.92,
} as const;

const VINE_NETWORK = {
  anchorEvery: 3,
  curvature: 0.72,
  nodesPerPath: 8,
  orientationVariation: 0.72,
  pathCount: 20,
  pathLengthVariation: 1,
} satisfies Partial<NetworksConfig>;

const VINE_GROWTH = {
  branchProbability: 0.8,

  flowerProbability: 0.24,
  leafProbability: 0.48,

  maxBranches: 180,
  maxGrowthNodes: 240,

  spacing: 22,
} satisfies Partial<VineGrowthConfig>;

export function FoliageLayerWorkspace() {
  const [seed, setSeed] = useState(5000);
  const [density, setDensity] = useState(1.35);
  const [variation, setVariation] = useState(0.85);
  const [interactionStrength, setInteractionStrength] = useState(16);
  const [debug, setDebug] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("Explore collection");

  const [layoutMode, setLayoutMode] = useState<VineLayoutMode>("cover");

  const [cornerShape, setCornerShape] = useState<VineCornerShape>("round");

  const [layoutThickness, setLayoutThickness] = useState(0.3);

  const [layoutCoverage, setLayoutCoverage] = useState(1);

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

  const vineLayout = useMemo<VineLayout>(() => {
    if (layoutMode === "corners") {
      return {
        mode: "corners",
        shape: cornerShape,
        coverage: layoutCoverage,
        thickness: layoutThickness,
        variation,
      };
    }

    if (layoutMode === "top") {
      return {
        mode: "top",
        coverage: layoutCoverage,
        thickness: layoutThickness,
        variation,
      };
    }

    return {
      mode: "cover",
      coverage: layoutCoverage,
      variation,
    };
  }, [cornerShape, layoutCoverage, layoutMode, layoutThickness, variation]);

  const handleError = useCallback((nextError: Error) => {
    setError(nextError.message);
  }, []);

  const controls = (
    <>
      <label className="compact-field">
        <span>Layout</span>

        <select
          onChange={(event) =>
            setLayoutMode(event.target.value as VineLayoutMode)
          }
          value={layoutMode}
        >
          <option value="cover">Cover</option>

          <option value="corners">Corners</option>

          <option value="top">Top</option>
        </select>
      </label>

      {layoutMode === "corners" ? (
        <label className="compact-field">
          <span>Corner Shape</span>

          <select
            onChange={(event) =>
              setCornerShape(event.target.value as VineCornerShape)
            }
            value={cornerShape}
          >
            <option value="rect">Rect</option>

            <option value="round">Round</option>
          </select>
        </label>
      ) : null}

      <label className="range-field">
        <span>Thickness</span>

        <input
          disabled={layoutMode === "cover"}
          max="3"
          min="0.08"
          onChange={(event) => setLayoutThickness(event.target.valueAsNumber)}
          step="0.01"
          type="range"
          value={layoutThickness}
        />

        <output>{layoutThickness.toFixed(2)}</output>
      </label>

      <label className="range-field">
        <span>Coverage</span>

        <input
          max="1.75"
          min="0.5"
          onChange={(event) => setLayoutCoverage(event.target.valueAsNumber)}
          step="0.05"
          type="range"
          value={layoutCoverage}
        />

        <output>{layoutCoverage.toFixed(2)}</output>
      </label>

      <label className="compact-field">
        <span>Seed</span>

        <input
          min="1"
          onChange={(event) => setSeed(event.target.valueAsNumber || 1)}
          step="1"
          type="number"
          value={seed}
        />
      </label>

      <label className="range-field">
        <span>Density</span>

        <input
          aria-label="Vine density"
          max="3"
          min="0.35"
          onChange={(event) => setDensity(event.target.valueAsNumber)}
          step="0.05"
          type="range"
          value={density}
        />

        <output>{density.toFixed(2)}</output>
      </label>

      <label className="range-field">
        <span>Variation</span>

        <input
          aria-label="Vine variation"
          max="1"
          min="0"
          onChange={(event) => setVariation(event.target.valueAsNumber)}
          step="0.05"
          type="range"
          value={variation}
        />

        <output>{variation.toFixed(2)}</output>
      </label>

      <label className="range-field">
        <span>Sweep</span>

        <input
          aria-label="Pointer sweep strength"
          max="24"
          min="4"
          onChange={(event) =>
            setInteractionStrength(event.target.valueAsNumber)
          }
          step="1"
          type="range"
          value={interactionStrength}
        />

        <output>{interactionStrength}</output>
      </label>

      <label className="toggle-control">
        <input
          checked={debug}
          onChange={(event) => setDebug(event.target.checked)}
          type="checkbox"
        />

        <span>Debug</span>
      </label>
    </>
  );

  return (
    <WorkspaceScaffold
      controls={controls}
      family="WebGL 2 · path-driven vine growth"
      parameters={PARAMETERS}
      stageClassName="foliage-stage"
      summary="Wall-clinging vine runners grow secondary branches with layered flowers and leaves."
      title="Vine Foliage Layer"
    >
      <SinglePathPreview
        interactionStrength={interactionStrength}
        seed={seed}
        variation={variation}
      />

      <div className="foliage-composition">
        <div aria-hidden="true" className="foliage-background" />

        {/*
         * Effect layer.
         *
         * This must remain below actual DOM content.
         * CSS should also set pointer-events: none.
         */}
        <VineLayer
          aria-label="Interactive Bougainvillea vine wall"
          assets={bougainvilleaVineAssets}
          area={VINE_AREA}
          className="foliage-canvas"
          debug={debug}
          density={density}
          growth={VINE_GROWTH}
          interaction={interaction}
          layout={vineLayout}
          network={VINE_NETWORK}
          onError={handleError}
          quality="high"
          seed={seed}
          size={VINE_SIZE}
          variation={variation}
        />

        <div aria-hidden="true" className="foliage-backdrop">
          <span>BOTANICAL / 07</span>

          <span>SAIGON · 2026</span>
        </div>

        {/*
         * Actual content always stays above the effect layer.
         */}
        <div className="foliage-copy">
          <p className="foliage-copy__eyebrow">
            Climbing color, shaped by motion.
          </p>

          <h3 className="foliage-copy__title">Bougainvillea</h3>

          <button
            className="foliage-action"
            onClick={() =>
              setMessage((current) =>
                current === "Explore collection"
                  ? "Control remains clickable"
                  : "Explore collection",
              )
            }
            type="button"
          >
            {message}
          </button>
        </div>

        {error ? <p className="effect-error foliage-error">{error}</p> : null}
      </div>
    </WorkspaceScaffold>
  );
}
