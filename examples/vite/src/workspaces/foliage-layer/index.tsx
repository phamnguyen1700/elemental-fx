import { useCallback, useMemo, useState } from "react";

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
  "quality",
];

const VINE_AREA = {
  alignX: "center",
  alignY: "center",
  height: 1,
  width: 1,
} as const;

const VINE_SIZE = {
  branch: 0.92,
  flower: 0.78,
  leaf: 0.72,
} as const;

type CompositionMode = "foreground" | "background";

export function FoliageLayerWorkspace() {
  const [mode, setMode] = useState<CompositionMode>("foreground");
  const [seed, setSeed] = useState(5000);
  const [density, setDensity] = useState(1.4);
  const [variation, setVariation] = useState(0.85);
  const [interactionStrength, setInteractionStrength] = useState(16);
  const [debug, setDebug] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("Explore collection");
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
  const handleError = useCallback(
    (nextError: Error) => setError(nextError.message),
    [],
  );

  const controls = (
    <>
      <div className="segmented-control" aria-label="Vine composition mode">
        <button
          aria-pressed={mode === "foreground"}
          onClick={() => setMode("foreground")}
          type="button"
        >
          Foreground
        </button>
        <button
          aria-pressed={mode === "background"}
          onClick={() => setMode("background")}
          type="button"
        >
          Background
        </button>
      </div>
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
          max="2.4"
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
      summary="Independent main vines carry arc-spaced growth nodes, lightweight branches, flowers and leaves."
      title="Vine Foliage Layer"
    >
      <SinglePathPreview
        interactionStrength={interactionStrength}
        seed={seed}
        variation={variation}
      />

      <div className="foliage-composition" data-mode={mode}>
        <div className="foliage-background" aria-hidden="true" />
        <div className="foliage-backdrop" aria-hidden="true">
          <span>BOTANICAL / 07</span>
          <span>SAIGON · 2026</span>
        </div>

        <div className="foliage-copy">
          <p>Climbing color, shaped by motion.</p>
          <h3>Bougainvillea</h3>
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
        <VineLayer
          aria-label="Interactive Bougainvillea vine wall"
          assets={bougainvilleaVineAssets}
          area={VINE_AREA}
          className="foliage-canvas"
          debug={debug}
          density={density}
          interaction={interaction}
          onError={handleError}
          quality="high"
          seed={seed}
          size={VINE_SIZE}
          variation={variation}
        />
      </div>
    </WorkspaceScaffold>
  );
}
