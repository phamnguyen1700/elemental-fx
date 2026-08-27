import { useEffect, useRef, type CanvasHTMLAttributes, type ReactElement, type Ref } from "react";

import type { FluidEffectFactory, FluidEffectHandle } from "../../effects";

export interface FluidEffectProps<TConfig extends object> extends Omit<
  CanvasHTMLAttributes<HTMLCanvasElement>,
  "children" | "onError"
> {
  effect: FluidEffectFactory<TConfig>;
  config?: TConfig | undefined;
  paused?: boolean | undefined;
  canvasRef?: Ref<HTMLCanvasElement> | undefined;
  onError?: ((error: Error) => void) | undefined;
}

function setRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function FluidEffect<TConfig extends object>({
  effect,
  config,
  paused = false,
  canvasRef,
  onError,
  style,
  ...canvasProps
}: FluidEffectProps<TConfig>): ReactElement {
  const elementRef = useRef<HTMLCanvasElement | null>(null);
  const effectRef = useRef<FluidEffectHandle<TConfig> | null>(null);
  const configRef = useRef(config);
  const onErrorRef = useRef(onError);
  configRef.current = config;
  onErrorRef.current = onError;

  useEffect(() => {
    const canvas = elementRef.current;
    if (!canvas) return;

    try {
      const handle = effect(canvas, configRef.current);
      effectRef.current = handle;
    } catch (error) {
      onErrorRef.current?.(asError(error));
    }

    return () => {
      effectRef.current?.destroy();
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
