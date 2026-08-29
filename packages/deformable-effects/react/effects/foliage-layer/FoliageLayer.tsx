import {
  forwardRef,
  useMemo,
  type CanvasHTMLAttributes,
  type ReactElement,
} from "react";

import {
  createVineLayerEffect,
  type VineLayerConfig,
} from "../../../effects/foliage-layer";
import { DeformableEffect } from "../../primitives/DeformableEffect";

export interface VineLayerProps
  extends
    VineLayerConfig,
    Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "children" | "onError"> {
  paused?: boolean | undefined;
}

export const VineLayer = forwardRef<HTMLCanvasElement, VineLayerProps>(
  function VineLayer(
    {
      assets,
      preset,
      quality,
      area,
      seed,
      density,
      size,
      variation,
      debug,
      autoStart,
      interactionTarget,
      network,
      growth,

      // Hanging strands
      hanging,

      interaction,
      wind,
      gravity,
      depth,
      distribution,
      render,
      paused,
      onError,
      ...canvasProps
    },
    ref,
  ): ReactElement {
    const config = useMemo<VineLayerConfig>(
      () => ({
        assets,

        ...(preset === undefined ? {} : { preset }),
        ...(quality === undefined ? {} : { quality }),
        ...(area === undefined ? {} : { area }),
        ...(seed === undefined ? {} : { seed }),
        ...(density === undefined ? {} : { density }),
        ...(size === undefined ? {} : { size }),
        ...(variation === undefined ? {} : { variation }),
        ...(debug === undefined ? {} : { debug }),
        ...(autoStart === undefined ? {} : { autoStart }),

        ...(interactionTarget === undefined ? {} : { interactionTarget }),

        ...(network === undefined ? {} : { network }),
        ...(growth === undefined ? {} : { growth }),

        // Forward hanging config into the core effect.
        ...(hanging === undefined ? {} : { hanging }),

        ...(interaction === undefined ? {} : { interaction }),
        ...(wind === undefined ? {} : { wind }),
        ...(gravity === undefined ? {} : { gravity }),
        ...(depth === undefined ? {} : { depth }),
        ...(distribution === undefined ? {} : { distribution }),
        ...(render === undefined ? {} : { render }),
        ...(onError === undefined ? {} : { onError }),
      }),
      [
        assets,
        area,
        autoStart,
        debug,
        density,
        depth,
        distribution,
        gravity,
        growth,

        hanging,

        interaction,
        interactionTarget,
        network,
        onError,
        preset,
        quality,
        render,
        seed,
        size,
        variation,
        wind,
      ],
    );

    return (
      <DeformableEffect
        {...canvasProps}
        canvasRef={ref}
        config={config}
        effect={createVineLayerEffect}
        onError={onError}
        paused={paused}
      />
    );
  },
);

/** @deprecated Use `VineLayerProps`. */
export type FoliageLayerProps = VineLayerProps;

/** @deprecated Use `VineLayer`. */
export const FoliageLayer = VineLayer;
