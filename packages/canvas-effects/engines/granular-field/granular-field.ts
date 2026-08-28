export interface GranularFieldConfig {
  columns: number;
  rows: number;
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
}

export interface GranularFieldState {
  columns: number;
  rows: number;
  heights: Float32Array;
  restHeights: Float32Array;
  compaction: Float32Array;
  grain: Float32Array;
}

export interface GranularField {
  resize(columns: number, rows: number): void;
  setConfig(config: Partial<Omit<GranularFieldConfig, "columns" | "rows">>): void;
  applyDepression(x: number, y: number, radius: number, strength: number): void;
  applyStroke(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    radius: number,
    strength: number
  ): void;
  step(deltaTime: number): void;
  getState(): GranularFieldState;
}

interface ResolvedGranularFieldConfig {
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
}

const DEFAULT_CONFIG: ResolvedGranularFieldConfig = {
  recovery: 0.0015,
  settle: 0.18,
  spread: 0.16,
  angleOfRepose: 1.1,
  maxDepth: 24,
  maxHeight: 20,
  duneHeight: 7.5,
  duneScale: 0.13,
  duneAngle: -0.42,
  seed: 1700
};

const TERRAIN_KEYS = ["duneHeight", "duneScale", "duneAngle", "seed"] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function applyConfig(
  target: ResolvedGranularFieldConfig,
  source: Partial<Omit<GranularFieldConfig, "columns" | "rows">>
): boolean {
  const terrainChanged = TERRAIN_KEYS.some(
    (key) => source[key] !== undefined && source[key] !== target[key]
  );

  if (source.recovery !== undefined) target.recovery = source.recovery;
  if (source.settle !== undefined) target.settle = source.settle;
  if (source.spread !== undefined) target.spread = source.spread;
  if (source.angleOfRepose !== undefined) target.angleOfRepose = source.angleOfRepose;
  if (source.maxDepth !== undefined) target.maxDepth = source.maxDepth;
  if (source.maxHeight !== undefined) target.maxHeight = source.maxHeight;
  if (source.duneHeight !== undefined) target.duneHeight = source.duneHeight;
  if (source.duneScale !== undefined) target.duneScale = source.duneScale;
  if (source.duneAngle !== undefined) target.duneAngle = source.duneAngle;
  if (source.seed !== undefined) target.seed = Math.floor(source.seed);

  return terrainChanged;
}

function hash2d(x: number, y: number, seed: number): number {
  let value = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967295;
}

function smooth(value: number): number {
  return value * value * (3 - 2 * value);
}

function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smooth(x - x0);
  const ty = smooth(y - y0);
  const top = hash2d(x0, y0, seed) * (1 - tx) + hash2d(x0 + 1, y0, seed) * tx;
  const bottom = hash2d(x0, y0 + 1, seed) * (1 - tx) + hash2d(x0 + 1, y0 + 1, seed) * tx;
  return top * (1 - ty) + bottom * ty;
}

function gaussian(value: number): number {
  return Math.exp(-0.5 * value * value);
}

interface BrushWeights {
  removed: number;
  deposited: number;
}

function getBrushWeights(
  offsetX: number,
  offsetY: number,
  radius: number,
  directionX: number,
  directionY: number
): BrushWeights {
  const directionLength = Math.hypot(directionX, directionY);

  if (directionLength < 0.001) {
    const distance = Math.hypot(offsetX, offsetY);
    return {
      removed: gaussian(distance / (radius * 0.38)),
      deposited: gaussian((distance - radius * 0.76) / (radius * 0.17))
    };
  }

  const forwardX = directionX / directionLength;
  const forwardY = directionY / directionLength;
  const sideX = -forwardY;
  const sideY = forwardX;
  const along = offsetX * forwardX + offsetY * forwardY;
  const across = offsetX * sideX + offsetY * sideY;
  const removed = gaussian(across / (radius * 0.43)) * gaussian(along / (radius * 0.78));
  const leftRidge =
    gaussian((across - radius * 0.7) / (radius * 0.22)) * gaussian(along / (radius * 0.92));
  const rightRidge =
    gaussian((across + radius * 0.7) / (radius * 0.22)) * gaussian(along / (radius * 0.92));
  const leadingMound =
    gaussian(across / (radius * 0.5)) * gaussian((along - radius * 0.68) / (radius * 0.25)) * 0.42;

  return { removed, deposited: leftRidge + rightRidge + leadingMound };
}

export function createGranularField(initialConfig: GranularFieldConfig): GranularField {
  const config = { ...DEFAULT_CONFIG };
  applyConfig(config, initialConfig);

  let columns = Math.max(2, Math.floor(initialConfig.columns));
  let rows = Math.max(2, Math.floor(initialConfig.rows));
  let heights = new Float32Array(columns * rows);
  let restHeights = new Float32Array(columns * rows);
  let compaction = new Float32Array(columns * rows);
  let grain = new Float32Array(columns * rows);
  let flux = new Float32Array(columns * rows);

  const regenerateTerrain = (): void => {
    const cosine = Math.cos(config.duneAngle);
    const sine = Math.sin(config.duneAngle);
    let totalHeight = 0;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index = row * columns + column;
        const along = column * cosine + row * sine;
        const across = -column * sine + row * cosine;
        const broadNoise = valueNoise(column * 0.045, row * 0.045, config.seed) - 0.5;
        const detailNoise = valueNoise(column * 0.11, row * 0.11, config.seed + 17) - 0.5;
        const warp = broadNoise * 5.2 + Math.sin(along * config.duneScale * 0.24) * 0.65;
        const wave = (Math.sin(across * config.duneScale + warp) + 1) * 0.5;
        const ridge = Math.pow(wave, 1.65);
        const height = (ridge - 0.42 + broadNoise * 0.32 + detailNoise * 0.08) * config.duneHeight;

        restHeights[index] = height;
        grain[index] = hash2d(column, row, config.seed + 97);
        totalHeight += height;
      }
    }

    const meanHeight = totalHeight / Math.max(1, heights.length);
    for (let index = 0; index < heights.length; index += 1) {
      const centeredHeight = clamp(
        (restHeights[index] ?? 0) - meanHeight,
        -config.maxDepth,
        config.maxHeight
      );
      restHeights[index] = centeredHeight;
      heights[index] = centeredHeight;
      compaction[index] = 0;
    }
  };

  const applyBrush = (
    x: number,
    y: number,
    radius: number,
    strength: number,
    directionX: number,
    directionY: number
  ): void => {
    const safeRadius = Math.max(0.75, radius);
    const boundsRadius = safeRadius * 1.35;
    const minX = Math.max(0, Math.floor(x - boundsRadius));
    const maxX = Math.min(columns - 1, Math.ceil(x + boundsRadius));
    const minY = Math.max(0, Math.floor(y - boundsRadius));
    const maxY = Math.min(rows - 1, Math.ceil(y + boundsRadius));
    let removedTotal = 0;
    let depositedTotal = 0;

    for (let row = minY; row <= maxY; row += 1) {
      for (let column = minX; column <= maxX; column += 1) {
        const weights = getBrushWeights(column - x, row - y, safeRadius, directionX, directionY);
        removedTotal += weights.removed;
        depositedTotal += weights.deposited;
      }
    }

    if (removedTotal <= 0 || depositedTotal <= 0) return;
    const depositScale = removedTotal / depositedTotal;

    for (let row = minY; row <= maxY; row += 1) {
      for (let column = minX; column <= maxX; column += 1) {
        const index = row * columns + column;
        const weights = getBrushWeights(column - x, row - y, safeRadius, directionX, directionY);
        const delta = strength * (weights.deposited * depositScale - weights.removed);
        heights[index] = clamp((heights[index] ?? 0) + delta, -config.maxDepth, config.maxHeight);
        compaction[index] = Math.min(
          1,
          (compaction[index] ?? 0) + weights.removed * 0.2 + weights.deposited * 0.025
        );
      }
    }
  };

  regenerateTerrain();

  return {
    resize: (nextColumns, nextRows) => {
      columns = Math.max(2, Math.floor(nextColumns));
      rows = Math.max(2, Math.floor(nextRows));
      heights = new Float32Array(columns * rows);
      restHeights = new Float32Array(columns * rows);
      compaction = new Float32Array(columns * rows);
      grain = new Float32Array(columns * rows);
      flux = new Float32Array(columns * rows);
      regenerateTerrain();
    },
    setConfig: (nextConfig) => {
      if (applyConfig(config, nextConfig)) regenerateTerrain();
    },
    applyDepression: (x, y, radius, strength) => {
      applyBrush(x, y, radius, strength, 0, 0);
    },
    applyStroke: (fromX, fromY, toX, toY, radius, strength) => {
      const deltaX = toX - fromX;
      const deltaY = toY - fromY;
      const distance = Math.hypot(deltaX, deltaY);
      const spacing = Math.max(0.75, radius * 0.28);

      if (distance < 0.001) {
        applyBrush(toX, toY, radius, strength * 0.2, 0, 0);
        return;
      }

      const steps = Math.max(1, Math.ceil(distance / spacing));
      const stampStrength = strength * Math.max(0.12, Math.min(1, distance / steps / spacing));

      for (let step = 1; step <= steps; step += 1) {
        const progress = step / steps;
        applyBrush(
          fromX + deltaX * progress,
          fromY + deltaY * progress,
          radius,
          stampStrength,
          deltaX,
          deltaY
        );
      }
    },
    step: (deltaTime) => {
      const dt = Math.min(2.5, Math.max(0, deltaTime * 60));
      if (dt <= 0) return;

      flux.fill(0);
      const transferRate = Math.min(0.22, Math.max(0, config.spread * dt));
      const angleOfRepose = Math.max(0.01, config.angleOfRepose);

      const transferMaterial = (first: number, second: number): void => {
        const difference = (heights[first] ?? 0) - (heights[second] ?? 0);
        const excess = Math.abs(difference) - angleOfRepose;
        if (excess <= 0) return;

        const transfer = excess * 0.5 * transferRate * Math.sign(difference);
        flux[first] = (flux[first] ?? 0) - transfer;
        flux[second] = (flux[second] ?? 0) + transfer;
      };

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const index = row * columns + column;
          if (column + 1 < columns) transferMaterial(index, index + 1);
          if (row + 1 < rows) transferMaterial(index, index + columns);
        }
      }

      const recovery = Math.min(1, Math.max(0, config.recovery * dt));
      const compactionDecay = Math.min(1, Math.max(0, config.settle * 0.018 * dt));

      for (let index = 0; index < heights.length; index += 1) {
        const current = heights[index] ?? 0;
        const rest = restHeights[index] ?? 0;
        const restored = (rest - current) * recovery * (1 - (compaction[index] ?? 0) * 0.45);
        heights[index] = clamp(
          current + (flux[index] ?? 0) + restored,
          -config.maxDepth,
          config.maxHeight
        );
        compaction[index] = Math.max(0, (compaction[index] ?? 0) - compactionDecay);
      }
    },
    getState: () => ({ columns, rows, heights, restHeights, compaction, grain })
  };
}
