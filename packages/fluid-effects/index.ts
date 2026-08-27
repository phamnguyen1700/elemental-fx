export { resolveFluidColor, type FluidColor } from "./core/color";
export {
  createFluidPointerTracker,
  type FluidPointerOptions,
  type FluidPointerState,
  type FluidPointerTracker
} from "./core/pointer";
export {
  createFluidSimulation,
  getFluidResolution,
  type FluidResolution,
  type FluidSimulation,
  type FluidSimulationConfig
} from "./core/simulation";
export {
  createWebGLEngine,
  type WebGLEngine,
  type WebGLEngineHooks,
  type WebGLEngineOptions,
  type WebGLFrame,
  type WebGLViewport
} from "./core/webgl-engine";
export { createInkCursorEffect, type InkCursorConfig } from "./presets/ink";
export type { FluidEffectFactory, FluidEffectHandle } from "./effects";
