export {
  createCanvasEngine,
  type CanvasEngine,
  type CanvasEngineHooks,
  type CanvasEngineOptions,
  type CanvasFrame,
  type CanvasViewport
} from "./core/canvas-engine";
export { parseCssColor, resolveCssColor, resolveRgbaColor, type RgbaColor } from "./core/color";
export {
  createPointerTracker,
  type PointerHandler,
  type PointerState,
  type PointerTracker,
  type PointerTrackerOptions
} from "./core/pointer";
export { createWaveGrid, type WaveGrid, type WaveGridConfig } from "./engines/wave-grid";
export { createWaterSurfaceEffect, type WaterSurfaceConfig } from "./effects/water-surface";
export type { EffectFactory, EffectHandle } from "./effects/types";
