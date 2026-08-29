import { createCanvasEngine, type CanvasViewport } from "../../core/canvas-engine";
import { parseCssColor, resolveCssColor, type RgbaColor } from "../../core/color";
import { createPointerTracker, type PointerState } from "../../core/pointer";
import { createWaveGrid, type WaveGrid } from "../../engines/wave-grid";
import type { EffectHandle } from "../types";

export interface WaterSurfaceConfig {
  color?: string;
  highlightColor?: string;
  shadowColor?: string;
  opacity?: number;
  resolution?: number;
  tension?: number;
  damping?: number;
  spread?: number;
  maxHeight?: number;
  hoverStrength?: number;
  hoverRadius?: number;
  clickStrength?: number;
  clickRadius?: number;
  maxDpr?: number;
  autoStart?: boolean;
}

interface ResolvedWaterSurfaceConfig {
  color: string;
  highlightColor: string;
  shadowColor: string;
  opacity: number;
  resolution: number;
  tension: number;
  damping: number;
  spread: number;
  maxHeight: number;
  hoverStrength: number;
  hoverRadius: number;
  clickStrength: number;
  clickRadius: number;
  maxDpr: number;
  autoStart: boolean;
}

const DEFAULT_CONFIG: ResolvedWaterSurfaceConfig = {
  color: "hsl(var(--efx-color-effect-primary, 0 0% 18%))",
  highlightColor: "hsl(var(--efx-color-effect-secondary, 0 0% 100%))",
  shadowColor: "hsl(var(--efx-color-foreground, 0 0% 4%))",

  opacity: 0.42,

  resolution: 10,
  tension: 0.028,
  damping: 0.965,
  spread: 0.16,
  maxHeight: 32,

  hoverStrength: 0.75,
  hoverRadius: 1.8,
  clickStrength: 8,
  clickRadius: 2.8,

  maxDpr: 2,
  autoStart: true
};

const BLACK: RgbaColor = { r: 0, g: 0, b: 0, a: 1 };
const WHITE: RgbaColor = { r: 255, g: 255, b: 255, a: 1 };

function applyConfig(target: ResolvedWaterSurfaceConfig, source: WaterSurfaceConfig): void {
  if (source.color !== undefined) target.color = source.color;
  if (source.highlightColor !== undefined) target.highlightColor = source.highlightColor;
  if (source.shadowColor !== undefined) target.shadowColor = source.shadowColor;
  if (source.opacity !== undefined) target.opacity = source.opacity;
  if (source.resolution !== undefined) target.resolution = source.resolution;
  if (source.tension !== undefined) target.tension = source.tension;
  if (source.damping !== undefined) target.damping = source.damping;
  if (source.spread !== undefined) target.spread = source.spread;
  if (source.maxHeight !== undefined) target.maxHeight = source.maxHeight;
  if (source.hoverStrength !== undefined) target.hoverStrength = source.hoverStrength;
  if (source.hoverRadius !== undefined) target.hoverRadius = source.hoverRadius;
  if (source.clickStrength !== undefined) target.clickStrength = source.clickStrength;
  if (source.clickRadius !== undefined) target.clickRadius = source.clickRadius;
  if (source.maxDpr !== undefined) target.maxDpr = source.maxDpr;
  if (source.autoStart !== undefined) target.autoStart = source.autoStart;
}

function mixChannel(base: number, target: number, amount: number): number {
  return base + (target - base) * Math.min(1, Math.max(0, amount));
}

function getGridPoint(state: Readonly<PointerState>, grid: WaveGrid): { x: number; y: number } {
  const { columns, rows } = grid.getState();
  return {
    x: state.normalizedX * (columns - 1),
    y: state.normalizedY * (rows - 1)
  };
}

export function createWaterSurfaceEffect(
  canvas: HTMLCanvasElement,
  initialConfig: WaterSurfaceConfig = {}
): EffectHandle<WaterSurfaceConfig> {
  const config = { ...DEFAULT_CONFIG };
  applyConfig(config, initialConfig);

  const waveGrid = createWaveGrid({
    columns: 2,
    rows: 2,
    tension: config.tension,
    damping: config.damping,
    spread: config.spread,
    maxHeight: config.maxHeight
  });
  const renderCanvas = document.createElement("canvas");
  const renderContext = renderCanvas.getContext("2d", { alpha: true });

  if (!renderContext) {
    throw new Error("Canvas 2D is not supported in this environment.");
  }

  let imageData = renderContext.createImageData(2, 2);
  let baseColor = BLACK;
  let highlightColor = WHITE;
  let shadowColor = BLACK;
  let colorsDirty = true;
  let destroyed = false;

  const resolveColors = (): void => {
    if (!colorsDirty) return;

    const baseCss = resolveCssColor(canvas, config.color, "hsl(0 0% 8%)");
    const highlightCss = resolveCssColor(canvas, config.highlightColor, "hsl(0 0% 100%)");
    const shadowCss = resolveCssColor(canvas, config.shadowColor, "hsl(0 0% 4%)");
    baseColor = parseCssColor(baseCss, BLACK);
    highlightColor = parseCssColor(highlightCss, WHITE);
    shadowColor = parseCssColor(shadowCss, BLACK);
    colorsDirty = false;
  };

  const resizeSurface = (viewport: CanvasViewport): void => {
    const cellSize = Math.max(4, config.resolution);
    const columns = Math.min(256, Math.max(8, Math.ceil(viewport.width / cellSize) + 2));
    const rows = Math.min(192, Math.max(8, Math.ceil(viewport.height / cellSize) + 2));
    waveGrid.resize(columns, rows);
    renderCanvas.width = columns;
    renderCanvas.height = rows;
    imageData = renderContext.createImageData(columns, rows);
  };

  const renderSurface = (context: CanvasRenderingContext2D, viewport: CanvasViewport): void => {
    resolveColors();
    const { columns, rows, heights } = waveGrid.getState();
    const pixels = imageData.data;
    const maxHeight = Math.max(1, config.maxHeight);

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        const index = y * columns + x;
        const left = heights[y * columns + Math.max(0, x - 1)] ?? 0;
        const right = heights[y * columns + Math.min(columns - 1, x + 1)] ?? 0;
        const top = heights[Math.max(0, y - 1) * columns + x] ?? 0;
        const bottom = heights[Math.min(rows - 1, y + 1) * columns + x] ?? 0;
        const height = heights[index] ?? 0;
        const slopeX = (right - left) / maxHeight;
        const slopeY = (bottom - top) / maxHeight;
        const light = -slopeX * 0.72 - slopeY * 0.48 + (height / maxHeight) * 0.12;
        const target = light >= 0 ? highlightColor : shadowColor;

        const waveIntensity = Math.min(1, Math.abs(light) * 3.2);

        const colorStrength = Math.min(0.92, waveIntensity * 0.9) * target.a;

        const pixelIndex = index * 4;

        pixels[pixelIndex] = Math.round(mixChannel(baseColor.r, target.r, colorStrength));

        pixels[pixelIndex + 1] = Math.round(mixChannel(baseColor.g, target.g, colorStrength));

        pixels[pixelIndex + 2] = Math.round(mixChannel(baseColor.b, target.b, colorStrength));

        pixels[pixelIndex + 3] = Math.round(
          255 * Math.min(1, Math.max(0, waveIntensity * config.opacity * target.a))
        );
      }
    }

    renderContext.putImageData(imageData, 0, 0);
    context.clearRect(0, 0, viewport.width, viewport.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(renderCanvas, 0, 0, viewport.width, viewport.height);
  };

  const applyPointerImpulse = (
    state: Readonly<PointerState>,
    radius: number,
    strength: number
  ): void => {
    const point = getGridPoint(state, waveGrid);
    waveGrid.applyImpulse(point.x, point.y, radius, strength);
  };

  const pointer = createPointerTracker(canvas, {
    eventTarget: window,
    preventDefault: false,

    onMove: (state) => {
      const speed = Math.hypot(state.deltaX, state.deltaY);

      if (speed < 0.1) return;

      const strength = config.hoverStrength * Math.min(2, 0.3 + speed / 18);

      applyPointerImpulse(state, config.hoverRadius, strength);
    },

    onDown: (state) => {
      applyPointerImpulse(state, config.clickRadius, config.clickStrength);
    }
  });

  const engine = createCanvasEngine(
    canvas,
    {
      onResize: resizeSurface,
      onFrame: ({ context, viewport, deltaTime }) => {
        waveGrid.step(deltaTime);
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
      waveGrid.setConfig({
        tension: config.tension,
        damping: config.damping,
        spread: config.spread,
        maxHeight: config.maxHeight
      });
      colorsDirty = true;
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
