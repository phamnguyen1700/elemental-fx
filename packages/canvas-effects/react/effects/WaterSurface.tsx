import { forwardRef, useMemo, type CanvasHTMLAttributes, type ReactElement } from "react";

import { createWaterSurfaceEffect, type WaterSurfaceConfig } from "../../effects/water-surface";
import { CanvasEffect } from "../primitives/CanvasEffect";

export interface WaterSurfaceProps
  extends WaterSurfaceConfig, Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "children" | "color"> {
  paused?: boolean | undefined;
}

export const WaterSurface = forwardRef<HTMLCanvasElement, WaterSurfaceProps>(function WaterSurface(
  {
    paused,
    color,
    highlightColor,
    shadowColor,
    opacity,
    resolution,
    tension,
    damping,
    spread,
    maxHeight,
    hoverStrength,
    hoverRadius,
    clickStrength,
    clickRadius,
    maxDpr,
    autoStart,
    ...canvasProps
  },
  ref
): ReactElement {
  const config = useMemo<WaterSurfaceConfig>(
    () => ({
      ...(color === undefined ? {} : { color }),
      ...(highlightColor === undefined ? {} : { highlightColor }),
      ...(shadowColor === undefined ? {} : { shadowColor }),
      ...(opacity === undefined ? {} : { opacity }),
      ...(resolution === undefined ? {} : { resolution }),
      ...(tension === undefined ? {} : { tension }),
      ...(damping === undefined ? {} : { damping }),
      ...(spread === undefined ? {} : { spread }),
      ...(maxHeight === undefined ? {} : { maxHeight }),
      ...(hoverStrength === undefined ? {} : { hoverStrength }),
      ...(hoverRadius === undefined ? {} : { hoverRadius }),
      ...(clickStrength === undefined ? {} : { clickStrength }),
      ...(clickRadius === undefined ? {} : { clickRadius }),
      ...(maxDpr === undefined ? {} : { maxDpr }),
      ...(autoStart === undefined ? {} : { autoStart })
    }),
    [
      autoStart,
      clickRadius,
      clickStrength,
      color,
      damping,
      highlightColor,
      hoverRadius,
      hoverStrength,
      maxDpr,
      maxHeight,
      opacity,
      resolution,
      shadowColor,
      spread,
      tension
    ]
  );

  return (
    <CanvasEffect
      {...canvasProps}
      canvasRef={ref}
      config={config}
      effect={createWaterSurfaceEffect}
      paused={paused}
    />
  );
});
