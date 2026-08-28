import { resolveFluidColor, type FluidColor } from "../../core/color";
import {
  createFluidSimulation,
  type FluidSimulation,
  type FluidSimulationConfig
} from "../../engines/fluid-simulation";
import { createWebGLEngine, type WebGLEngine, type WebGLViewport } from "../../core/webgl";
import { createFluidPointerTracker, type FluidPointerState } from "../../core/pointer";
import type { FluidEffectHandle } from "../../effects";

export interface InkCursorConfig extends Partial<FluidSimulationConfig> {
  color?: string;
  density?: number;
  splatForce?: number;
  maxDpr?: number;
  autoStart?: boolean;
}

interface ResolvedInkCursorConfig extends FluidSimulationConfig {
  color: string;
  density: number;
  splatForce: number;
  maxDpr: number;
  autoStart: boolean;
}

interface PendingSplat {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  density: number;
}

const DEFAULT_CONFIG: ResolvedInkCursorConfig = {
  color: "hsl(var(--efx-color-effect-primary, 0 0% 8%))",
  density: 0.72,
  splatForce: 5200,
  maxDpr: 2,
  autoStart: true,
  simulationResolution: 128,
  dyeResolution: 512,
  velocityDissipation: 0.35,
  densityDissipation: 1.15,
  pressureDissipation: 0.8,
  pressureIterations: 20,
  curl: 24,
  splatRadius: 0.022
};

function applyConfig(target: ResolvedInkCursorConfig, source: InkCursorConfig): void {
  if (source.color !== undefined) target.color = source.color;
  if (source.density !== undefined) target.density = source.density;
  if (source.splatForce !== undefined) target.splatForce = source.splatForce;
  if (source.maxDpr !== undefined) target.maxDpr = source.maxDpr;
  if (source.autoStart !== undefined) target.autoStart = source.autoStart;
  if (source.simulationResolution !== undefined) {
    target.simulationResolution = source.simulationResolution;
  }
  if (source.dyeResolution !== undefined) target.dyeResolution = source.dyeResolution;
  if (source.velocityDissipation !== undefined) {
    target.velocityDissipation = source.velocityDissipation;
  }
  if (source.densityDissipation !== undefined) {
    target.densityDissipation = source.densityDissipation;
  }
  if (source.pressureDissipation !== undefined) {
    target.pressureDissipation = source.pressureDissipation;
  }
  if (source.pressureIterations !== undefined) {
    target.pressureIterations = source.pressureIterations;
  }
  if (source.curl !== undefined) target.curl = source.curl;
  if (source.splatRadius !== undefined) target.splatRadius = source.splatRadius;
}

function simulationConfig(config: ResolvedInkCursorConfig): FluidSimulationConfig {
  return {
    simulationResolution: config.simulationResolution,
    dyeResolution: config.dyeResolution,
    velocityDissipation: config.velocityDissipation,
    densityDissipation: config.densityDissipation,
    pressureDissipation: config.pressureDissipation,
    pressureIterations: config.pressureIterations,
    curl: config.curl,
    splatRadius: config.splatRadius
  };
}

export function createInkCursorEffect(
  canvas: HTMLCanvasElement,
  initialConfig: InkCursorConfig = {}
): FluidEffectHandle<InkCursorConfig> {
  const config = { ...DEFAULT_CONFIG };
  applyConfig(config, initialConfig);
  let simulation: FluidSimulation | null = null;
  let engine: WebGLEngine | null = null;
  let color: FluidColor = { r: 0.08, g: 0.08, b: 0.08 };
  let colorDirty = true;
  let destroyed = false;
  const pendingSplats: PendingSplat[] = [];

  const resolveColor = (): FluidColor => {
    if (colorDirty) {
      color = resolveFluidColor(canvas, config.color, color);
      colorDirty = false;
    }
    return color;
  };

  const resizeSimulation = (viewport: WebGLViewport): void => {
    simulation?.resize(viewport.pixelWidth, viewport.pixelHeight);
  };

  try {
    engine = createWebGLEngine(
      canvas,
      {
        onResize: resizeSimulation,
        onContextRestored: () => {
          simulation?.restore();
          if (engine) resizeSimulation(engine.getViewport());
        },
        onFrame: ({ deltaTime }) => {
          const activeSimulation = simulation;
          if (!activeSimulation) return;

          const inkColor = resolveColor();
          while (pendingSplats.length > 0) {
            const splat = pendingSplats.shift();
            if (!splat) break;
            activeSimulation.splat(
              splat.x,
              splat.y,
              splat.velocityX,
              splat.velocityY,
              inkColor,
              splat.density
            );
          }
          activeSimulation.step(deltaTime);
          activeSimulation.render();
        }
      },
      { autoStart: false, maxDpr: config.maxDpr }
    );
    simulation = createFluidSimulation(engine.gl, simulationConfig(config));
    resizeSimulation(engine.getViewport());
  } catch (error) {
    simulation?.destroy();
    engine?.destroy();
    throw error;
  }

  const queueMoveSplats = (state: Readonly<FluidPointerState>): void => {
    const distance = Math.hypot(state.deltaX, state.deltaY);
    if (distance < 0.0001) return;
    const count = Math.min(
      8,
      Math.max(1, Math.ceil(distance / Math.max(0.008, config.splatRadius)))
    );
    const velocityX = state.deltaX * config.splatForce;
    const velocityY = -state.deltaY * config.splatForce;

    for (let index = 1; index <= count; index += 1) {
      const progress = index / count;
      pendingSplats.push({
        x: state.previousX + state.deltaX * progress,
        y: 1 - (state.previousY + state.deltaY * progress),
        velocityX,
        velocityY,
        density: config.density
      });
    }
    if (pendingSplats.length > 48) pendingSplats.splice(0, pendingSplats.length - 48);
  };

  const pointer = createFluidPointerTracker(canvas, {
    onMove: queueMoveSplats,
    onDown: (state) => {
      pendingSplats.push({
        x: state.x,
        y: 1 - state.y,
        velocityX: 0,
        velocityY: 0,
        density: config.density * 1.8
      });
    }
  });

  if (config.autoStart) engine.start();

  return {
    start: () => engine?.start(),
    stop: () => engine?.stop(),
    resize: () => engine?.resize(),
    update: (nextConfig) => {
      if (destroyed) return;
      const previousMaxDpr = config.maxDpr;
      applyConfig(config, nextConfig);
      colorDirty = true;
      simulation?.updateConfig(simulationConfig(config));
      if (previousMaxDpr !== config.maxDpr) engine?.setMaxDpr(config.maxDpr);
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      pendingSplats.length = 0;
      pointer.destroy();
      engine?.destroy();
      simulation?.destroy();
      engine = null;
      simulation = null;
    }
  };
}
