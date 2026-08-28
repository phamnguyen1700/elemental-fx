import { forwardRef, useMemo, type CanvasHTMLAttributes, type ReactElement } from "react";

import { createSandSurfaceEffect, type SandSurfaceConfig } from "../../../effects/sand-surface";
import { CanvasEffect } from "../../primitives/CanvasEffect";

export interface SandSurfaceProps
  extends SandSurfaceConfig, Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "children" | "color"> {
  paused?: boolean | undefined;
}

export const SandSurface = forwardRef<HTMLCanvasElement, SandSurfaceProps>(function SandSurface(
  {
    paused,
    color,
    highlightColor,
    shadowColor,
    opacity,
    resolution,
    grain,
    shadowStrength,
    highlightStrength,
    castShadowStrength,
    heightScale,
    lightX,
    lightY,
    lightZ,
    dragStrength,
    dragRadius,
    pressStrength,
    pressRadius,
    recovery,
    settle,
    spread,
    angleOfRepose,
    maxDepth,
    maxHeight,
    duneHeight,
    duneScale,
    duneAngle,
    seed,
    maxDpr,
    autoStart,
    ...canvasProps
  },
  ref
): ReactElement {
  const config = useMemo<SandSurfaceConfig>(
    () => ({
      ...(color === undefined ? {} : { color }),
      ...(highlightColor === undefined ? {} : { highlightColor }),
      ...(shadowColor === undefined ? {} : { shadowColor }),
      ...(opacity === undefined ? {} : { opacity }),
      ...(resolution === undefined ? {} : { resolution }),
      ...(grain === undefined ? {} : { grain }),
      ...(shadowStrength === undefined ? {} : { shadowStrength }),
      ...(highlightStrength === undefined ? {} : { highlightStrength }),
      ...(castShadowStrength === undefined ? {} : { castShadowStrength }),
      ...(heightScale === undefined ? {} : { heightScale }),
      ...(lightX === undefined ? {} : { lightX }),
      ...(lightY === undefined ? {} : { lightY }),
      ...(lightZ === undefined ? {} : { lightZ }),
      ...(dragStrength === undefined ? {} : { dragStrength }),
      ...(dragRadius === undefined ? {} : { dragRadius }),
      ...(pressStrength === undefined ? {} : { pressStrength }),
      ...(pressRadius === undefined ? {} : { pressRadius }),
      ...(recovery === undefined ? {} : { recovery }),
      ...(settle === undefined ? {} : { settle }),
      ...(spread === undefined ? {} : { spread }),
      ...(angleOfRepose === undefined ? {} : { angleOfRepose }),
      ...(maxDepth === undefined ? {} : { maxDepth }),
      ...(maxHeight === undefined ? {} : { maxHeight }),
      ...(duneHeight === undefined ? {} : { duneHeight }),
      ...(duneScale === undefined ? {} : { duneScale }),
      ...(duneAngle === undefined ? {} : { duneAngle }),
      ...(seed === undefined ? {} : { seed }),
      ...(maxDpr === undefined ? {} : { maxDpr }),
      ...(autoStart === undefined ? {} : { autoStart })
    }),
    [
      angleOfRepose,
      autoStart,
      castShadowStrength,
      color,
      dragRadius,
      dragStrength,
      duneAngle,
      duneHeight,
      duneScale,
      grain,
      heightScale,
      highlightColor,
      highlightStrength,
      lightX,
      lightY,
      lightZ,
      maxDepth,
      maxDpr,
      maxHeight,
      opacity,
      pressRadius,
      pressStrength,
      recovery,
      resolution,
      seed,
      settle,
      shadowColor,
      shadowStrength,
      spread
    ]
  );

  return (
    <CanvasEffect
      {...canvasProps}
      canvasRef={ref}
      config={config}
      effect={createSandSurfaceEffect}
      paused={paused}
    />
  );
});
