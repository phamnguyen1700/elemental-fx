import { createCanvasEngine, type CanvasViewport } from "../../core/canvas-engine";
import { parseCssColor, resolveCssColor, type RgbaColor } from "../../core/color";
import { createPointerTracker, type PointerState } from "../../core/pointer";
import { createGranularField, type GranularField } from "../../engines/granular-field";
import type { EffectHandle } from "../types";

export interface SandSurfaceConfig {
  color?: string;
  highlightColor?: string;
  shadowColor?: string;
  opacity?: number;
  resolution?: number;
  grain?: number;
  shadowStrength?: number;
  highlightStrength?: number;
  castShadowStrength?: number;
  heightScale?: number;
  lightX?: number;
  lightY?: number;
  lightZ?: number;
  dragStrength?: number;
  dragRadius?: number;
  pressStrength?: number;
  pressRadius?: number;
  recovery?: number;
  settle?: number;
  spread?: number;
  angleOfRepose?: number;
  maxDepth?: number;
  maxHeight?: number;
  duneHeight?: number;
  duneScale?: number;
  duneAngle?: number;
  seed?: number;
  maxDpr?: number;
  autoStart?: boolean;
}

interface ResolvedSandSurfaceConfig {
  color: string;
  highlightColor: string;
  shadowColor: string;
  opacity: number;
  resolution: number;
  grain: number;
  shadowStrength: number;
  highlightStrength: number;
  castShadowStrength: number;
  heightScale: number;
  lightX: number;
  lightY: number;
  lightZ: number;
  dragStrength: number;
  dragRadius: number;
  pressStrength: number;
  pressRadius: number;
  recovery: number;
  settle: number;
  spread: number;
  angleOfRepose: number;
  maxDepth: number;
  maxHeight: number;
  duneHeight: number;
  duneScale: number;
  duneAngle: number;
  seed: number;
  maxDpr: number;
  autoStart: boolean;
}

const DEFAULT_CONFIG: ResolvedSandSurfaceConfig = {
  color: "hsl(var(--efx-color-sand, 42 42% 57%))",
  highlightColor: "hsl(var(--efx-color-sand-highlight, 45 92% 88%))",
  shadowColor: "hsl(var(--efx-color-sand-shadow, 31 44% 25%))",
  opacity: 1,
  resolution: 5,
  grain: 0.2,
  shadowStrength: 0.66,
  highlightStrength: 0.56,
  castShadowStrength: 0.38,
  heightScale: 0.76,
  lightX: -0.55,
  lightY: -0.85,
  lightZ: 0.8,
  dragStrength: 1,
  dragRadius: 8,
  pressStrength: 7.5,
  pressRadius: 9,
  recovery: 0.0015,
  settle: 0.18,
  spread: 0.16,
  angleOfRepose: 1.1,
  maxDepth: 24,
  maxHeight: 20,
  duneHeight: 7.5,
  duneScale: 0.13,
  duneAngle: -0.42,
  seed: 1700,
  maxDpr: 2,
  autoStart: true
};

const SAND: RgbaColor = { r: 183, g: 151, b: 86, a: 1 };
const HIGHLIGHT: RgbaColor = { r: 255, g: 236, b: 186, a: 1 };
const SHADOW: RgbaColor = { r: 92, g: 59, b: 36, a: 1 };

function applyConfig(target: ResolvedSandSurfaceConfig, source: SandSurfaceConfig): void {
  if (source.color !== undefined) target.color = source.color;
  if (source.highlightColor !== undefined) target.highlightColor = source.highlightColor;
  if (source.shadowColor !== undefined) target.shadowColor = source.shadowColor;
  if (source.opacity !== undefined) target.opacity = source.opacity;
  if (source.resolution !== undefined) target.resolution = source.resolution;
  if (source.grain !== undefined) target.grain = source.grain;
  if (source.shadowStrength !== undefined) target.shadowStrength = source.shadowStrength;
  if (source.highlightStrength !== undefined) target.highlightStrength = source.highlightStrength;
  if (source.castShadowStrength !== undefined)
    target.castShadowStrength = source.castShadowStrength;
  if (source.heightScale !== undefined) target.heightScale = source.heightScale;
  if (source.lightX !== undefined) target.lightX = source.lightX;
  if (source.lightY !== undefined) target.lightY = source.lightY;
  if (source.lightZ !== undefined) target.lightZ = source.lightZ;
  if (source.dragStrength !== undefined) target.dragStrength = source.dragStrength;
  if (source.dragRadius !== undefined) target.dragRadius = source.dragRadius;
  if (source.pressStrength !== undefined) target.pressStrength = source.pressStrength;
  if (source.pressRadius !== undefined) target.pressRadius = source.pressRadius;
  if (source.recovery !== undefined) target.recovery = source.recovery;
  if (source.settle !== undefined) target.settle = source.settle;
  if (source.spread !== undefined) target.spread = source.spread;
  if (source.angleOfRepose !== undefined) target.angleOfRepose = source.angleOfRepose;
  if (source.maxDepth !== undefined) target.maxDepth = source.maxDepth;
  if (source.maxHeight !== undefined) target.maxHeight = source.maxHeight;
  if (source.duneHeight !== undefined) target.duneHeight = source.duneHeight;
  if (source.duneScale !== undefined) target.duneScale = source.duneScale;
  if (source.duneAngle !== undefined) target.duneAngle = source.duneAngle;
  if (source.seed !== undefined) target.seed = source.seed;
  if (source.maxDpr !== undefined) target.maxDpr = source.maxDpr;
  if (source.autoStart !== undefined) target.autoStart = source.autoStart;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mixChannel(base: number, target: number, amount: number): number {
  return base + (target - base) * clamp(amount, 0, 1);
}

function seededRandom(index: number, seed: number): number {
  let value = Math.imul(index + 1, 747796405) + Math.imul(seed, 2891336453);
  value = Math.imul(value ^ (value >>> 16), 2246822519);
  value ^= value >>> 13;
  return (value >>> 0) / 4294967295;
}

function getFieldPoint(
  state: Readonly<PointerState>,
  field: GranularField
): { x: number; y: number } {
  const { columns, rows } = field.getState();
  return {
    x: state.normalizedX * (columns - 1),
    y: state.normalizedY * (rows - 1)
  };
}

export function createSandSurfaceEffect(
  canvas: HTMLCanvasElement,
  initialConfig: SandSurfaceConfig = {}
): EffectHandle<SandSurfaceConfig> {
  const config = { ...DEFAULT_CONFIG };
  applyConfig(config, initialConfig);

  const field = createGranularField({
    columns: 2,
    rows: 2,
    recovery: config.recovery,
    settle: config.settle,
    spread: config.spread,
    angleOfRepose: config.angleOfRepose,
    maxDepth: config.maxDepth,
    maxHeight: config.maxHeight,
    duneHeight: config.duneHeight,
    duneScale: config.duneScale,
    duneAngle: config.duneAngle,
    seed: config.seed
  });
  const renderCanvas = document.createElement("canvas");
  const renderContext = renderCanvas.getContext("2d", { alpha: true });
  const grainCanvas = document.createElement("canvas");
  const grainContext = grainCanvas.getContext("2d", { alpha: true });

  if (!renderContext || !grainContext) {
    throw new Error("Canvas 2D is not supported in this environment.");
  }

  let imageData = renderContext.createImageData(2, 2);
  let baseColor = SAND;
  let highlightColor = HIGHLIGHT;
  let shadowColor = SHADOW;
  let colorsDirty = true;
  let grainTextureDirty = true;
  let destroyed = false;

  const resolveColors = (): void => {
    if (!colorsDirty) return;

    const baseCss = resolveCssColor(canvas, config.color, "hsl(42 42% 57%)");
    const highlightCss = resolveCssColor(canvas, config.highlightColor, "hsl(45 92% 88%)");
    const shadowCss = resolveCssColor(canvas, config.shadowColor, "hsl(31 44% 25%)");
    baseColor = parseCssColor(baseCss, SAND);
    highlightColor = parseCssColor(highlightCss, HIGHLIGHT);
    shadowColor = parseCssColor(shadowCss, SHADOW);
    colorsDirty = false;
    grainTextureDirty = true;
  };

  const rebuildGrainTexture = (viewport: CanvasViewport): void => {
    if (!grainTextureDirty) return;

    grainCanvas.width = Math.max(1, Math.round(viewport.width));
    grainCanvas.height = Math.max(1, Math.round(viewport.height));
    grainContext.clearRect(0, 0, grainCanvas.width, grainCanvas.height);
    const strength = clamp(config.grain, 0, 1);
    const count = Math.min(
      1800,
      Math.floor((grainCanvas.width * grainCanvas.height * strength) / 180)
    );

    for (let pass = 0; pass < 2; pass += 1) {
      grainContext.beginPath();
      for (let index = pass; index < count; index += 2) {
        const x = seededRandom(index * 3, config.seed) * grainCanvas.width;
        const y = seededRandom(index * 3 + 1, config.seed) * grainCanvas.height;
        const radius = 0.35 + seededRandom(index * 3 + 2, config.seed) * 0.65;
        grainContext.moveTo(x + radius, y);
        grainContext.arc(x, y, radius, 0, Math.PI * 2);
      }

      const color = pass === 0 ? highlightColor : shadowColor;
      const alpha = pass === 0 ? 0.2 : 0.13;
      grainContext.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
      grainContext.fill();
    }

    grainTextureDirty = false;
  };

  const resizeSurface = (viewport: CanvasViewport): void => {
    const cellSize = Math.max(3, config.resolution);
    const columns = Math.min(360, Math.max(16, Math.ceil(viewport.width / cellSize) + 2));
    const rows = Math.min(280, Math.max(16, Math.ceil(viewport.height / cellSize) + 2));
    field.resize(columns, rows);
    renderCanvas.width = columns;
    renderCanvas.height = rows;
    imageData = renderContext.createImageData(columns, rows);
    grainTextureDirty = true;
  };

  const renderSurface = (context: CanvasRenderingContext2D, viewport: CanvasViewport): void => {
    resolveColors();
    rebuildGrainTexture(viewport);
    const { columns, rows, heights, compaction, grain } = field.getState();
    const pixels = imageData.data;
    const lightLength =
      Math.hypot(config.lightX, config.lightY, Math.max(0.05, config.lightZ)) || 1;
    const lightX = config.lightX / lightLength;
    const lightY = config.lightY / lightLength;
    const lightZ = Math.max(0.05, config.lightZ) / lightLength;
    const planarLightLength = Math.hypot(lightX, lightY) || 1;
    const rayX = lightX / planarLightLength;
    const rayY = lightY / planarLightLength;
    const grainStrength = clamp(config.grain, 0, 1);
    const heightRange = Math.max(1, config.maxDepth, config.maxHeight);

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        const index = y * columns + x;
        const left = heights[y * columns + Math.max(0, x - 1)] ?? 0;
        const right = heights[y * columns + Math.min(columns - 1, x + 1)] ?? 0;
        const top = heights[Math.max(0, y - 1) * columns + x] ?? 0;
        const bottom = heights[Math.min(rows - 1, y + 1) * columns + x] ?? 0;
        const height = heights[index] ?? 0;
        const packed = compaction[index] ?? 0;
        const slopeX = (right - left) * 0.5 * config.heightScale;
        const slopeY = (bottom - top) * 0.5 * config.heightScale;
        const normalLength = Math.hypot(slopeX, slopeY, 1) || 1;
        const normalX = -slopeX / normalLength;
        const normalY = -slopeY / normalLength;
        const normalZ = 1 / normalLength;
        const diffuse = normalX * lightX + normalY * lightY + normalZ * lightZ;
        const neighborAverage = (left + right + top + bottom) * 0.25;
        const cavity = Math.max(0, neighborAverage - height) / heightRange;
        let castShadow = 0;

        for (let distance = 2; distance <= 8; distance += 2) {
          const sampleX = clamp(Math.round(x + rayX * distance), 0, columns - 1);
          const sampleY = clamp(Math.round(y + rayY * distance), 0, rows - 1);
          const sampleHeight = heights[sampleY * columns + sampleX] ?? height;
          const horizon = sampleHeight - height - distance * lightZ * 0.38;
          castShadow = Math.max(castShadow, horizon / heightRange);
        }

        const highlightAmount =
          Math.max(0, diffuse - 0.38) * 1.05 * config.highlightStrength * highlightColor.a;
        const shadowAmount = Math.min(
          0.78,
          (Math.max(0, 0.46 - diffuse) * 0.78 * config.shadowStrength +
            cavity * 1.55 * config.shadowStrength +
            Math.max(0, castShadow) * 2 * config.castShadowStrength +
            packed * 0.05) *
            shadowColor.a
        );
        const grainValue = ((grain[index] ?? 0.5) - 0.5) * grainStrength;
        const elevation = clamp(height / heightRange, -1, 1);
        const pixelIndex = index * 4;

        let red = baseColor.r + grainValue * 16 + elevation * 4;
        let green = baseColor.g + grainValue * 13 + elevation * 3;
        let blue = baseColor.b + grainValue * 8 + elevation * 2;

        red = mixChannel(red, highlightColor.r, highlightAmount);
        green = mixChannel(green, highlightColor.g, highlightAmount);
        blue = mixChannel(blue, highlightColor.b, highlightAmount);
        red = mixChannel(red, shadowColor.r, shadowAmount);
        green = mixChannel(green, shadowColor.g, shadowAmount);
        blue = mixChannel(blue, shadowColor.b, shadowAmount);

        pixels[pixelIndex] = Math.round(clamp(red, 0, 255));
        pixels[pixelIndex + 1] = Math.round(clamp(green, 0, 255));
        pixels[pixelIndex + 2] = Math.round(clamp(blue, 0, 255));
        pixels[pixelIndex + 3] = Math.round(255 * clamp(baseColor.a * config.opacity, 0, 1));
      }
    }

    renderContext.putImageData(imageData, 0, 0);
    context.clearRect(0, 0, viewport.width, viewport.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(renderCanvas, 0, 0, viewport.width, viewport.height);
    context.imageSmoothingEnabled = false;
    context.drawImage(grainCanvas, 0, 0, viewport.width, viewport.height);
  };

  const applyPointerDepression = (
    state: Readonly<PointerState>,
    radius: number,
    strength: number
  ): void => {
    const point = getFieldPoint(state, field);
    field.applyDepression(point.x, point.y, radius, strength);
  };

  const pointer = createPointerTracker(canvas, {
    preventDefault: true,
    onMove: (state) => {
      const speed = Math.hypot(state.deltaX, state.deltaY);
      if (speed < 0.1) return;

      const { columns, rows } = field.getState();
      const bounds = canvas.getBoundingClientRect();
      const point = getFieldPoint(state, field);
      const gridDeltaX = (state.deltaX / Math.max(1, bounds.width)) * (columns - 1);
      const gridDeltaY = (state.deltaY / Math.max(1, bounds.height)) * (rows - 1);
      const strength = config.dragStrength * clamp(0.6 + speed / 40, 0.6, 1.55);

      field.applyStroke(
        point.x - gridDeltaX,
        point.y - gridDeltaY,
        point.x,
        point.y,
        config.dragRadius,
        strength
      );
    },
    onDown: (state) => applyPointerDepression(state, config.pressRadius, config.pressStrength)
  });

  const engine = createCanvasEngine(
    canvas,
    {
      onResize: resizeSurface,
      onFrame: ({ context, viewport, deltaTime }) => {
        field.step(deltaTime);
        renderSurface(context, viewport);
      }
    },
    { autoStart: false, maxDpr: config.maxDpr }
  );

  resizeSurface(engine.getViewport());
  if (config.autoStart) engine.start();

  return {
    start: () => engine.start(),
    stop: () => engine.stop(),
    resize: () => engine.resize(),
    update: (nextConfig) => {
      if (destroyed) return;
      const previousResolution = config.resolution;
      const previousMaxDpr = config.maxDpr;
      applyConfig(config, nextConfig);
      field.setConfig({
        recovery: config.recovery,
        settle: config.settle,
        spread: config.spread,
        angleOfRepose: config.angleOfRepose,
        maxDepth: config.maxDepth,
        maxHeight: config.maxHeight,
        duneHeight: config.duneHeight,
        duneScale: config.duneScale,
        duneAngle: config.duneAngle,
        seed: config.seed
      });
      colorsDirty = true;
      grainTextureDirty = true;
      if (previousResolution !== config.resolution) resizeSurface(engine.getViewport());
      if (previousMaxDpr !== config.maxDpr) engine.setMaxDpr(config.maxDpr);
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      pointer.destroy();
      engine.destroy();
    }
  };
}
