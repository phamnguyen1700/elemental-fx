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
} from "./engines/fluid-simulation";
export {
  createWebGLEngine,
  type WebGLEngine,
  type WebGLEngineHooks,
  type WebGLEngineOptions,
  type WebGLFrame,
  type WebGLViewport
} from "./core/webgl";
export { createInkCursorEffect, type InkCursorConfig } from "./presets/ink-cursor";
export type { FluidEffectFactory, FluidEffectHandle } from "./effects";
