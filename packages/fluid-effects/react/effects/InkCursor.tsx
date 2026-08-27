import { forwardRef, useMemo, type CanvasHTMLAttributes, type ReactElement } from "react";

import { createInkCursorEffect, type InkCursorConfig } from "../../presets/ink";
import { FluidEffect } from "../primitives/FluidEffect";

export interface InkCursorProps
  extends
    InkCursorConfig,
    Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "children" | "color" | "onError"> {
  paused?: boolean | undefined;
  onError?: ((error: Error) => void) | undefined;
}

export const InkCursor = forwardRef<HTMLCanvasElement, InkCursorProps>(function InkCursor(
  {
    paused,
    onError,
    color,
    density,
    splatForce,
    maxDpr,
    autoStart,
    simulationResolution,
    dyeResolution,
    velocityDissipation,
    densityDissipation,
    pressureDissipation,
    pressureIterations,
    curl,
    splatRadius,
    ...canvasProps
  },
  ref
): ReactElement {
  const config = useMemo<InkCursorConfig>(
    () => ({
      ...(color === undefined ? {} : { color }),
      ...(density === undefined ? {} : { density }),
      ...(splatForce === undefined ? {} : { splatForce }),
      ...(maxDpr === undefined ? {} : { maxDpr }),
      ...(autoStart === undefined ? {} : { autoStart }),
      ...(simulationResolution === undefined ? {} : { simulationResolution }),
      ...(dyeResolution === undefined ? {} : { dyeResolution }),
      ...(velocityDissipation === undefined ? {} : { velocityDissipation }),
      ...(densityDissipation === undefined ? {} : { densityDissipation }),
      ...(pressureDissipation === undefined ? {} : { pressureDissipation }),
      ...(pressureIterations === undefined ? {} : { pressureIterations }),
      ...(curl === undefined ? {} : { curl }),
      ...(splatRadius === undefined ? {} : { splatRadius })
    }),
    [
      autoStart,
      color,
      curl,
      density,
      densityDissipation,
      dyeResolution,
      maxDpr,
      pressureDissipation,
      pressureIterations,
      simulationResolution,
      splatForce,
      splatRadius,
      velocityDissipation
    ]
  );

  return (
    <FluidEffect
      {...canvasProps}
      canvasRef={ref}
      config={config}
      effect={createInkCursorEffect}
      onError={onError}
      paused={paused}
    />
  );
});
