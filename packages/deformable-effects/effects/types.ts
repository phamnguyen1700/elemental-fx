export interface DeformableEffectHandle<TConfig extends object> {
  start(): void;
  stop(): void;
  resize(): void;
  update(config: Partial<TConfig>): void;
  destroy(): void;
}

export type DeformableEffectFactory<TConfig extends object> = (
  canvas: HTMLCanvasElement,
  config: TConfig
) => DeformableEffectHandle<TConfig>;
