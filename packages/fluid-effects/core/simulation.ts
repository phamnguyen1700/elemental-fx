import { FULLSCREEN_VERTEX_SHADER } from "./shaders/base";
import {
  ADVECTION_SHADER,
  CLEAR_SHADER,
  CURL_SHADER,
  DISPLAY_SHADER,
  DIVERGENCE_SHADER,
  GRADIENT_SUBTRACT_SHADER,
  PRESSURE_SHADER,
  SPLAT_SHADER,
  VORTICITY_SHADER
} from "./shaders/simulation";
import {
  blit,
  createDoubleRenderTarget,
  createGlProgram,
  createRenderTarget,
  type DoubleRenderTarget,
  type GlProgram,
  type RenderTarget
} from "./webgl";
import type { FluidColor } from "./color";

export interface FluidSimulationConfig {
  simulationResolution: number;
  dyeResolution: number;
  velocityDissipation: number;
  densityDissipation: number;
  pressureDissipation: number;
  pressureIterations: number;
  curl: number;
  splatRadius: number;
}

export interface FluidResolution {
  width: number;
  height: number;
}

export interface FluidSimulation {
  resize(width: number, height: number): void;
  updateConfig(config: Partial<FluidSimulationConfig>): void;
  splat(
    x: number,
    y: number,
    velocityX: number,
    velocityY: number,
    color: FluidColor,
    density: number
  ): void;
  step(deltaTime: number): void;
  render(): void;
  restore(): void;
  destroy(): void;
}

interface ProgramBundle {
  clear: GlProgram;
  splat: GlProgram;
  advection: GlProgram;
  curl: GlProgram;
  vorticity: GlProgram;
  divergence: GlProgram;
  pressure: GlProgram;
  gradientSubtract: GlProgram;
  display: GlProgram;
}

interface TargetBundle {
  velocity: DoubleRenderTarget;
  dye: DoubleRenderTarget;
  pressure: DoubleRenderTarget;
  divergence: RenderTarget;
  curl: RenderTarget;
}

const DEFAULT_CONFIG: FluidSimulationConfig = {
  simulationResolution: 128,
  dyeResolution: 512,
  velocityDissipation: 0.35,
  densityDissipation: 1.15,
  pressureDissipation: 0.8,
  pressureIterations: 20,
  curl: 24,
  splatRadius: 0.022
};

export function getFluidResolution(
  resolution: number,
  width: number,
  height: number
): FluidResolution {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const aspectRatio = safeWidth / safeHeight;

  return aspectRatio >= 1
    ? { width: Math.round(resolution * aspectRatio), height: Math.round(resolution) }
    : { width: Math.round(resolution), height: Math.round(resolution / aspectRatio) };
}

function createPrograms(gl: WebGL2RenderingContext): ProgramBundle {
  return {
    clear: createGlProgram(gl, FULLSCREEN_VERTEX_SHADER, CLEAR_SHADER),
    splat: createGlProgram(gl, FULLSCREEN_VERTEX_SHADER, SPLAT_SHADER),
    advection: createGlProgram(gl, FULLSCREEN_VERTEX_SHADER, ADVECTION_SHADER),
    curl: createGlProgram(gl, FULLSCREEN_VERTEX_SHADER, CURL_SHADER),
    vorticity: createGlProgram(gl, FULLSCREEN_VERTEX_SHADER, VORTICITY_SHADER),
    divergence: createGlProgram(gl, FULLSCREEN_VERTEX_SHADER, DIVERGENCE_SHADER),
    pressure: createGlProgram(gl, FULLSCREEN_VERTEX_SHADER, PRESSURE_SHADER),
    gradientSubtract: createGlProgram(gl, FULLSCREEN_VERTEX_SHADER, GRADIENT_SUBTRACT_SHADER),
    display: createGlProgram(gl, FULLSCREEN_VERTEX_SHADER, DISPLAY_SHADER)
  };
}

function destroyPrograms(programs: ProgramBundle | null): void {
  if (!programs) return;
  [
    programs.clear,
    programs.splat,
    programs.advection,
    programs.curl,
    programs.vorticity,
    programs.divergence,
    programs.pressure,
    programs.gradientSubtract,
    programs.display
  ].forEach((program) => program.destroy());
}

function destroyTargets(targets: TargetBundle | null): void {
  if (!targets) return;
  targets.velocity.destroy();
  targets.dye.destroy();
  targets.pressure.destroy();
  targets.divergence.destroy();
  targets.curl.destroy();
}

function applySimulationConfig(
  target: FluidSimulationConfig,
  source: Partial<FluidSimulationConfig>
): void {
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

export function createFluidSimulation(
  gl: WebGL2RenderingContext,
  initialConfig: Partial<FluidSimulationConfig> = {}
): FluidSimulation {
  if (!gl.getExtension("EXT_color_buffer_float")) {
    throw new Error("EXT_color_buffer_float is required for fluid effects.");
  }

  const config = { ...DEFAULT_CONFIG };
  applySimulationConfig(config, initialConfig);
  let programs: ProgramBundle | null = createPrograms(gl);
  let targets: TargetBundle | null = null;
  let viewportWidth = 1;
  let viewportHeight = 1;
  let destroyed = false;

  gl.disable(gl.BLEND);
  gl.disable(gl.CULL_FACE);
  gl.disable(gl.DEPTH_TEST);

  const requirePrograms = (): ProgramBundle => {
    if (!programs) throw new Error("Fluid shader programs are not initialized.");
    return programs;
  };

  const requireTargets = (): TargetBundle => {
    if (!targets) throw new Error("Fluid render targets are not initialized.");
    return targets;
  };

  const resizeTargets = (): void => {
    destroyTargets(targets);
    const simulationSize = getFluidResolution(
      Math.max(16, config.simulationResolution),
      viewportWidth,
      viewportHeight
    );
    const dyeSize = getFluidResolution(
      Math.max(16, config.dyeResolution),
      viewportWidth,
      viewportHeight
    );

    targets = {
      velocity: createDoubleRenderTarget(gl, simulationSize.width, simulationSize.height),
      dye: createDoubleRenderTarget(gl, dyeSize.width, dyeSize.height),
      pressure: createDoubleRenderTarget(gl, simulationSize.width, simulationSize.height),
      divergence: createRenderTarget(gl, simulationSize.width, simulationSize.height),
      curl: createRenderTarget(gl, simulationSize.width, simulationSize.height)
    };
  };

  const resize = (width: number, height: number): void => {
    if (destroyed) return;
    const nextWidth = Math.max(1, Math.round(width));
    const nextHeight = Math.max(1, Math.round(height));
    if (targets && nextWidth === viewportWidth && nextHeight === viewportHeight) return;
    viewportWidth = nextWidth;
    viewportHeight = nextHeight;
    resizeTargets();
  };

  const runAdvection = (
    velocity: RenderTarget,
    source: RenderTarget,
    destination: RenderTarget,
    deltaTime: number,
    dissipation: number
  ): void => {
    const program = requirePrograms().advection;
    program.use();
    gl.uniform2f(program.uniform("uVelocityTexelSize"), velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform2f(program.uniform("uSourceTexelSize"), source.texelSizeX, source.texelSizeY);
    gl.uniform1i(program.uniform("uVelocity"), velocity.attach(0));
    gl.uniform1i(program.uniform("uSource"), source.attach(1));
    gl.uniform1f(program.uniform("uDeltaTime"), deltaTime);
    gl.uniform1f(program.uniform("uDissipation"), dissipation);
    blit(gl, destination);
  };

  resize(viewportWidth, viewportHeight);

  return {
    resize,
    updateConfig: (nextConfig) => {
      if (destroyed) return;
      const previousSimulationResolution = config.simulationResolution;
      const previousDyeResolution = config.dyeResolution;
      applySimulationConfig(config, nextConfig);
      if (
        previousSimulationResolution !== config.simulationResolution ||
        previousDyeResolution !== config.dyeResolution
      ) {
        resizeTargets();
      }
    },
    splat: (x, y, velocityX, velocityY, color, density) => {
      if (destroyed) return;
      const currentTargets = requireTargets();
      const program = requirePrograms().splat;
      const aspectRatio = viewportWidth / viewportHeight;
      program.use();
      gl.uniform1f(program.uniform("uAspectRatio"), aspectRatio);
      gl.uniform2f(program.uniform("uPoint"), x, y);
      gl.uniform1f(program.uniform("uRadius"), Math.max(0.001, config.splatRadius));

      gl.uniform1i(program.uniform("uTarget"), currentTargets.velocity.read.attach(0));
      gl.uniform4f(program.uniform("uValue"), velocityX, velocityY, 0, 0);
      blit(gl, currentTargets.velocity.write);
      currentTargets.velocity.swap();

      gl.uniform1i(program.uniform("uTarget"), currentTargets.dye.read.attach(0));
      gl.uniform4f(
        program.uniform("uValue"),
        color.r * density,
        color.g * density,
        color.b * density,
        density
      );
      blit(gl, currentTargets.dye.write);
      currentTargets.dye.swap();
    },
    step: (deltaTime) => {
      if (destroyed || deltaTime <= 0) return;
      const currentPrograms = requirePrograms();
      const currentTargets = requireTargets();
      const texelX = currentTargets.velocity.read.texelSizeX;
      const texelY = currentTargets.velocity.read.texelSizeY;

      currentPrograms.curl.use();
      gl.uniform2f(currentPrograms.curl.uniform("uTexelSize"), texelX, texelY);
      gl.uniform1i(
        currentPrograms.curl.uniform("uVelocity"),
        currentTargets.velocity.read.attach(0)
      );
      blit(gl, currentTargets.curl);

      currentPrograms.vorticity.use();
      gl.uniform2f(currentPrograms.vorticity.uniform("uTexelSize"), texelX, texelY);
      gl.uniform1i(
        currentPrograms.vorticity.uniform("uVelocity"),
        currentTargets.velocity.read.attach(0)
      );
      gl.uniform1i(currentPrograms.vorticity.uniform("uCurl"), currentTargets.curl.attach(1));
      gl.uniform1f(currentPrograms.vorticity.uniform("uCurlStrength"), config.curl);
      gl.uniform1f(currentPrograms.vorticity.uniform("uDeltaTime"), deltaTime);
      blit(gl, currentTargets.velocity.write);
      currentTargets.velocity.swap();

      currentPrograms.divergence.use();
      gl.uniform2f(currentPrograms.divergence.uniform("uTexelSize"), texelX, texelY);
      gl.uniform1i(
        currentPrograms.divergence.uniform("uVelocity"),
        currentTargets.velocity.read.attach(0)
      );
      blit(gl, currentTargets.divergence);

      currentPrograms.clear.use();
      gl.uniform1i(
        currentPrograms.clear.uniform("uTexture"),
        currentTargets.pressure.read.attach(0)
      );
      gl.uniform1f(currentPrograms.clear.uniform("uValue"), config.pressureDissipation);
      blit(gl, currentTargets.pressure.write);
      currentTargets.pressure.swap();

      currentPrograms.pressure.use();
      gl.uniform2f(currentPrograms.pressure.uniform("uTexelSize"), texelX, texelY);
      gl.uniform1i(
        currentPrograms.pressure.uniform("uDivergence"),
        currentTargets.divergence.attach(1)
      );
      const pressureIterations = Math.max(1, Math.floor(config.pressureIterations));
      for (let iteration = 0; iteration < pressureIterations; iteration += 1) {
        gl.uniform1i(
          currentPrograms.pressure.uniform("uPressure"),
          currentTargets.pressure.read.attach(0)
        );
        blit(gl, currentTargets.pressure.write);
        currentTargets.pressure.swap();
      }

      currentPrograms.gradientSubtract.use();
      gl.uniform2f(currentPrograms.gradientSubtract.uniform("uTexelSize"), texelX, texelY);
      gl.uniform1i(
        currentPrograms.gradientSubtract.uniform("uPressure"),
        currentTargets.pressure.read.attach(0)
      );
      gl.uniform1i(
        currentPrograms.gradientSubtract.uniform("uVelocity"),
        currentTargets.velocity.read.attach(1)
      );
      blit(gl, currentTargets.velocity.write);
      currentTargets.velocity.swap();

      runAdvection(
        currentTargets.velocity.read,
        currentTargets.velocity.read,
        currentTargets.velocity.write,
        deltaTime,
        config.velocityDissipation
      );
      currentTargets.velocity.swap();

      runAdvection(
        currentTargets.velocity.read,
        currentTargets.dye.read,
        currentTargets.dye.write,
        deltaTime,
        config.densityDissipation
      );
      currentTargets.dye.swap();
    },
    render: () => {
      if (destroyed) return;
      const program = requirePrograms().display;
      const currentTargets = requireTargets();
      program.use();
      gl.uniform1i(program.uniform("uTexture"), currentTargets.dye.read.attach(0));
      blit(gl, null);
    },
    restore: () => {
      if (destroyed) return;
      destroyPrograms(programs);
      destroyTargets(targets);
      programs = createPrograms(gl);
      targets = null;
      resizeTargets();
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      destroyPrograms(programs);
      destroyTargets(targets);
      programs = null;
      targets = null;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.useProgram(null);
    }
  };
}
