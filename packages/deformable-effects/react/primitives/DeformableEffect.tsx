import { useEffect, useRef, type CanvasHTMLAttributes, type ReactElement, type Ref } from "react";

import type { DeformableEffectFactory, DeformableEffectHandle } from "../../effects";

export interface DeformableEffectProps<TConfig extends object> extends Omit<
  CanvasHTMLAttributes<HTMLCanvasElement>,
  "children" | "onError"
> {
  effect: DeformableEffectFactory<TConfig>;
  config: TConfig;
  paused?: boolean | undefined;
  canvasRef?: Ref<HTMLCanvasElement> | undefined;
  onError?: ((error: Error) => void) | undefined;
}

export function DeformableEffect<TConfig extends object>({
  effect,
  config,
  paused = false,
  canvasRef,
  onError,
  style,
  ...canvasProps
}: DeformableEffectProps<TConfig>): ReactElement {
  const elementRef = useRef<HTMLCanvasElement | null>(null);
  const effectRef = useRef<DeformableEffectHandle<TConfig> | null>(null);
  const configRef = useRef(config);
  const appliedConfigRef = useRef<TConfig | null>(null);
  const onErrorRef = useRef(onError);
  configRef.current = config;
  onErrorRef.current = onError;

  useEffect(() => {
    const canvas = elementRef.current;
    if (!canvas) return;

    try {
      effectRef.current = effect(canvas, configRef.current);
      appliedConfigRef.current = configRef.current;
    } catch (error) {
      onErrorRef.current?.(asError(error));
    }

    return () => {
      effectRef.current?.destroy();
      effectRef.current = null;
      appliedConfigRef.current = null;
    };
  }, [effect]);

  useEffect(() => {
    if (appliedConfigRef.current === config) return;
    effectRef.current?.update(config);
    appliedConfigRef.current = config;
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
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        ...style
      }}
    />
  );
}

function setRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
