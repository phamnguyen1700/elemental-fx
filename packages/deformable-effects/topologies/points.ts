import { createSeededRandom } from "../core/math/random";
import { Vec3 } from "../core/math/vec3";
import { Node } from "../engines/constraint-graph";
import type { NodePhysicalConfig, TopologyResult } from "./types";
import { resolveNumericProfile } from "./types";

export interface PointsBounds {
  min: Vec3;
  max: Vec3;
}

export interface PointNodeContext {
  index: number;
  u: number;
  v: number;
  depth: number;
}

export type PointPinConfig =
  boolean | ReadonlyArray<number> | ((index: number, total: number, position: Vec3) => boolean);

export interface PointsConfig extends NodePhysicalConfig<PointNodeContext> {
  count: number;
  bounds: PointsBounds;
  distribution: "random" | "grid";
  depth: readonly [number, number];
  variation: number;
  seed: number;
  pinned: PointPinConfig;
}

export function buildPoints(config: Partial<PointsConfig> = {}): TopologyResult {
  const count = Math.max(0, Math.floor(config.count ?? 64));
  const bounds = config.bounds ?? {
    min: new Vec3(-100, -70, -24),
    max: new Vec3(100, 70, 24)
  };
  const depth = config.depth ?? [bounds.min.z, bounds.max.z];
  const distribution = config.distribution ?? "random";
  const variation = clamp01(config.variation ?? 1);
  const random = createSeededRandom(config.seed ?? 12345);
  const width = Math.max(0.0001, bounds.max.x - bounds.min.x);
  const height = Math.max(0.0001, bounds.max.y - bounds.min.y);
  const aspect = width / height;
  const columns = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, count) * aspect)));
  const rows = Math.max(1, Math.ceil(Math.max(1, count) / columns));
  const nodes: Node[] = [];

  for (let index = 0; index < count; index++) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const gridU = (column + 0.5) / columns;
    const gridV = (row + 0.5) / rows;
    const randomU = random();
    const randomV = random();
    const randomDepth = random();
    const jitterU = (randomU - 0.5) / columns;
    const jitterV = (randomV - 0.5) / rows;
    const u =
      distribution === "grid"
        ? clamp01(gridU + jitterU * variation)
        : lerp(gridU, randomU, variation);
    const v =
      distribution === "grid"
        ? clamp01(gridV + jitterV * variation)
        : lerp(gridV, randomV, variation);
    const depthT = lerp(0.5, randomDepth, variation);
    const position = new Vec3(
      lerp(bounds.min.x, bounds.max.x, u),
      lerp(bounds.min.y, bounds.max.y, v),
      lerp(depth[0], depth[1], depthT)
    );
    const context = { depth: depthT, index, u, v };
    const pinned = resolvePinned(config.pinned ?? false, index, count, position);
    nodes.push(
      new Node(
        position,
        resolveNumericProfile(config.mass, 1, index, count, context),
        pinned,
        resolveNumericProfile(config.damping, 0.99, index, count, context),
        {
          topology: "point",
          pointIndex: index,
          u,
          v,
          depth: depthT,
          flexibility: resolveNumericProfile(config.flexibility, 1, index, count, context)
        }
      )
    );
  }

  return {
    nodes,
    constraints: [],
    edges: [],
    groups: { points: [nodes] },
    metadata: {
      topology: "points",
      distribution,
      variation,
      seed: config.seed ?? 12345
    }
  };
}

function resolvePinned(
  config: PointPinConfig,
  index: number,
  total: number,
  position: Vec3
): boolean {
  if (typeof config === "boolean") return config;
  if (typeof config === "function") return config(index, total, position);
  return config.includes(index);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}
