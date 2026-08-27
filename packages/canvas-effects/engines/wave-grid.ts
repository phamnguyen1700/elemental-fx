export interface WaveGridConfig {
  columns: number;
  rows: number;
  tension?: number;
  damping?: number;
  spread?: number;
  maxHeight?: number;
}

export interface WaveGridState {
  readonly columns: number;
  readonly rows: number;
  readonly heights: Float32Array;
  readonly velocities: Float32Array;
}

export interface WaveGrid {
  getState(): WaveGridState;
  setConfig(config: Partial<Omit<WaveGridConfig, "columns" | "rows">>): void;
  resize(columns: number, rows: number): void;
  applyImpulse(x: number, y: number, radius: number, strength: number): void;
  step(deltaTime: number): void;
  reset(): void;
}

interface ResolvedWaveGridConfig {
  tension: number;
  damping: number;
  spread: number;
  maxHeight: number;
}

const DEFAULT_CONFIG: ResolvedWaveGridConfig = {
  tension: 0.028,
  damping: 0.965,
  spread: 0.16,
  maxHeight: 32
};

function clampInteger(value: number, minimum: number): number {
  return Math.max(minimum, Math.floor(value));
}

export function createWaveGrid(initialConfig: WaveGridConfig): WaveGrid {
  const config: ResolvedWaveGridConfig = {
    tension: initialConfig.tension ?? DEFAULT_CONFIG.tension,
    damping: initialConfig.damping ?? DEFAULT_CONFIG.damping,
    spread: initialConfig.spread ?? DEFAULT_CONFIG.spread,
    maxHeight: initialConfig.maxHeight ?? DEFAULT_CONFIG.maxHeight
  };

  let columns = clampInteger(initialConfig.columns, 2);
  let rows = clampInteger(initialConfig.rows, 2);
  let heights = new Float32Array(columns * rows);
  let velocities = new Float32Array(columns * rows);
  let accelerations = new Float32Array(columns * rows);

  const resize = (nextColumns: number, nextRows: number): void => {
    const resolvedColumns = clampInteger(nextColumns, 2);
    const resolvedRows = clampInteger(nextRows, 2);
    if (resolvedColumns === columns && resolvedRows === rows) return;

    columns = resolvedColumns;
    rows = resolvedRows;
    heights = new Float32Array(columns * rows);
    velocities = new Float32Array(columns * rows);
    accelerations = new Float32Array(columns * rows);
  };

  const simulateStep = (deltaTime: number): void => {
    const frameScale = deltaTime * 60;

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        const index = y * columns + x;
        const height = heights[index] ?? 0;
        let neighbourTotal = 0;
        let neighbourCount = 0;

        if (x > 0) {
          neighbourTotal += heights[index - 1] ?? 0;
          neighbourCount += 1;
        }
        if (x < columns - 1) {
          neighbourTotal += heights[index + 1] ?? 0;
          neighbourCount += 1;
        }
        if (y > 0) {
          neighbourTotal += heights[index - columns] ?? 0;
          neighbourCount += 1;
        }
        if (y < rows - 1) {
          neighbourTotal += heights[index + columns] ?? 0;
          neighbourCount += 1;
        }

        const neighbourHeight = neighbourCount > 0 ? neighbourTotal / neighbourCount : 0;
        accelerations[index] =
          -config.tension * height + config.spread * (neighbourHeight - height);
      }
    }

    const damping = Math.pow(config.damping, frameScale);
    for (let index = 0; index < heights.length; index += 1) {
      const velocity =
        ((velocities[index] ?? 0) + (accelerations[index] ?? 0) * frameScale) * damping;
      velocities[index] = velocity;
      heights[index] = Math.max(
        -config.maxHeight,
        Math.min(config.maxHeight, (heights[index] ?? 0) + velocity * frameScale)
      );
    }
  };

  return {
    getState: () => ({ columns, rows, heights, velocities }),
    setConfig: (nextConfig) => {
      if (nextConfig.tension !== undefined) config.tension = nextConfig.tension;
      if (nextConfig.damping !== undefined) config.damping = nextConfig.damping;
      if (nextConfig.spread !== undefined) config.spread = nextConfig.spread;
      if (nextConfig.maxHeight !== undefined) config.maxHeight = nextConfig.maxHeight;
    },
    resize,
    applyImpulse: (x, y, radius, strength) => {
      const safeRadius = Math.max(0.5, radius);
      const minX = Math.max(0, Math.floor(x - safeRadius * 2));
      const maxX = Math.min(columns - 1, Math.ceil(x + safeRadius * 2));
      const minY = Math.max(0, Math.floor(y - safeRadius * 2));
      const maxY = Math.min(rows - 1, Math.ceil(y + safeRadius * 2));
      const denominator = 2 * safeRadius * safeRadius;

      for (let gridY = minY; gridY <= maxY; gridY += 1) {
        for (let gridX = minX; gridX <= maxX; gridX += 1) {
          const deltaX = gridX - x;
          const deltaY = gridY - y;
          const influence = Math.exp(-(deltaX * deltaX + deltaY * deltaY) / denominator);
          const index = gridY * columns + gridX;
          velocities[index] = (velocities[index] ?? 0) + strength * influence;
        }
      }
    },
    step: (deltaTime) => {
      let remaining = Math.min(Math.max(deltaTime, 0), 0.05);
      while (remaining > 0) {
        const currentStep = Math.min(remaining, 1 / 60);
        simulateStep(currentStep);
        remaining -= currentStep;
      }
    },
    reset: () => {
      heights.fill(0);
      velocities.fill(0);
      accelerations.fill(0);
    }
  };
}
