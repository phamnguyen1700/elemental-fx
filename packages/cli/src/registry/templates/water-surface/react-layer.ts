export function waterSurfaceTemplate(): string {
  return `import { useEffect, useMemo, useRef, type CanvasHTMLAttributes } from "react";
import {
  createWaterSurfaceEffect,
  type EffectHandle,
  type WaterSurfaceConfig,
} from "@elemental-fx/canvas-effects";

export interface WaterSurfaceProps
  extends WaterSurfaceConfig,
    Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "children" | "color"> {
  paused?: boolean | undefined;
}

export function WaterSurface({
  paused = false,
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
  style,
  ...canvasProps
}: WaterSurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const effectRef = useRef<EffectHandle<WaterSurfaceConfig> | null>(null);

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
      ...(autoStart === undefined ? {} : { autoStart }),
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
      tension,
    ]
  );
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const effect = createWaterSurfaceEffect(canvas, configRef.current);
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
