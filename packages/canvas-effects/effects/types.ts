export interface EffectHandle<TConfig extends object> {
  start(): void;
  stop(): void;
  resize(): void;
  update(config: Partial<TConfig>): void;
  destroy(): void;
}

export type EffectFactory<TConfig extends object> = (
  canvas: HTMLCanvasElement,
  config?: TConfig
) => EffectHandle<TConfig>;
