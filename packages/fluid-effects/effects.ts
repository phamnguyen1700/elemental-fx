export interface FluidEffectHandle<TConfig extends object> {
  start(): void;
  stop(): void;
  resize(): void;
  update(config: Partial<TConfig>): void;
  destroy(): void;
}

export type FluidEffectFactory<TConfig extends object> = (
  canvas: HTMLCanvasElement,
  config?: TConfig
) => FluidEffectHandle<TConfig>;
