import { useEffect, useRef, type CanvasHTMLAttributes, type ReactElement, type Ref } from "react";

import type { EffectFactory, EffectHandle } from "../../effects/types";

export interface CanvasEffectProps<TConfig extends object> extends Omit<
  CanvasHTMLAttributes<HTMLCanvasElement>,
  "children"
> {
  effect: EffectFactory<TConfig>;
  config?: TConfig | undefined;
  paused?: boolean | undefined;
  canvasRef?: Ref<HTMLCanvasElement> | undefined;
}

function setRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}

export function CanvasEffect<TConfig extends object>({
  effect,
  config,
  paused = false,
  canvasRef,
  style,
  ...canvasProps
}: CanvasEffectProps<TConfig>): ReactElement {
  const elementRef = useRef<HTMLCanvasElement | null>(null);
  const effectRef = useRef<EffectHandle<TConfig> | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const canvas = elementRef.current;
    if (!canvas) return;

    const handle = effect(canvas, configRef.current);
    effectRef.current = handle;

    return () => {
      handle.destroy();
      effectRef.current = null;
    };
  }, [effect]);

  useEffect(() => {
    if (config) effectRef.current?.update(config);
  }, [config]);

  useEffect(() => {
    if (paused) effectRef.current?.stop();
    else effectRef.current?.start();
  }, [paused]);

  return (
    <canvas
      {...canvasProps}
      ref={(element) => {
        elementRef.current = element;
        setRef(canvasRef, element);
      }}
      style={{ display: "block", width: "100%", height: "100%", touchAction: "none", ...style }}
    />
  );
}
