export function inkCursorTemplate(): string {
  return `import { useEffect, useMemo, useRef, type CanvasHTMLAttributes } from "react";
import {
  createInkCursorEffect,
  type FluidEffectHandle,
  type InkCursorConfig,
} from "@elemental-fx/fluid-effects";

export interface InkCursorProps
  extends InkCursorConfig,
    Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "children" | "color" | "onError"> {
  paused?: boolean | undefined;
  onError?: ((error: Error) => void) | undefined;
}

export function InkCursor({
  paused = false,
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
  style,
  ...canvasProps
}: InkCursorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const effectRef = useRef<FluidEffectHandle<InkCursorConfig> | null>(null);

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
      ...(splatRadius === undefined ? {} : { splatRadius }),
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
      velocityDissipation,
    ]
  );
  const configRef = useRef(config);
  const onErrorRef = useRef(onError);
  configRef.current = config;
  onErrorRef.current = onError;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const effect = createInkCursorEffect(canvas, configRef.current);
      effectRef.current = effect;

      return () => {
        effect.destroy();
        effectRef.current = null;
      };
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      onErrorRef.current?.(normalizedError);
      return undefined;
    }
  }, []);

  useEffect(() => {
    effectRef.current?.update(config);
  }, [config]);

  useEffect(() => {
    if (paused) effectRef.current?.stop();
    else effectRef.current?.start();
  }, [paused]);

  return (
    <canvas
      {...canvasProps}
      ref={canvasRef}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        touchAction: "none",
        ...style,
      }}
    />
  );
}
`;
}
