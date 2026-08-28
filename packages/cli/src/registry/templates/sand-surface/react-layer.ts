export function sandSurfaceTemplate(): string {
  return `import { useEffect, useMemo, useRef, type CanvasHTMLAttributes } from "react";
import {
  createSandSurfaceEffect,
  type EffectHandle,
  type SandSurfaceConfig,
} from "@elemental-fx/canvas-effects";

export interface SandSurfaceProps
  extends SandSurfaceConfig,
    Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "children" | "color"> {
  paused?: boolean | undefined;
}

export function SandSurface({
  paused = false,
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
  style,
  ...canvasProps
}: SandSurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const effectRef = useRef<EffectHandle<SandSurfaceConfig> | null>(null);

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
      ...(autoStart === undefined ? {} : { autoStart }),
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
      spread,
    ]
  );
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const effect = createSandSurfaceEffect(canvas, configRef.current);
    effectRef.current = effect;

    return () => {
      effect.destroy();
      effectRef.current = null;
    };
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
