import { Vec3 } from "../../core/math/vec3";
import { GravityForce, PointerSweepForce, WindForce } from "../../forces";
import { bougainvilleaPreset } from "../../presets/bougainvillea";
import {
  buildHangingStrands,
  buildNetworks,
  buildVineGrowth,
} from "../../topologies";
import type {
  NetworkBounds,
  TopologyResult,
  VineGrowthResult,
} from "../../topologies";
import { resolveEffectArea } from "../area";
import type { ResolvedEffectArea } from "../area";
import { resolveQualityBudget } from "../quality";
import { createDeformableScene } from "../scene";
import { resolveVineAssets } from "./assets";
import type { ResolvedVineAssets } from "./assets";
import { resolveFoliageLayerPreset } from "./config";
import { buildVineDistribution } from "./distribution";
import type { VineDistribution } from "./distribution";
import { createFoliagePathEndpointResolvers } from "./path-layout";
import type { FoliageLayerConfig, FoliagePreset, VineSizeValue } from "./types";

export interface FoliageProjectionBounds {
  halfWidth: number;
  halfHeight: number;
  depthRange: number;
}

export interface FoliageComposition {
  scene: ReturnType<typeof createDeformableScene>;
  topology: TopologyResult;
  hangingTopology: TopologyResult | null;
  vine: VineGrowthResult;
  pointerSweep: PointerSweepForce;
  wind: WindForce | null;
  gravity: GravityForce | null;
  assets: ResolvedVineAssets;
  distribution: VineDistribution;
  preset: FoliagePreset;
  bounds: FoliageProjectionBounds;
  networkBounds: NetworkBounds;
  area: ResolvedEffectArea;
  density: number;
  variation: number;
  destroy(): void;
}

export type VineComposition = FoliageComposition;

export function createFoliageComposition(
  config: FoliageLayerConfig,
  aspect = 1,
  devicePixelRatio = globalThis.devicePixelRatio ?? 1,
): FoliageComposition {
  const assets = resolveVineAssets(config.assets);
  const preset = resolveFoliageLayerPreset(
    config.preset ?? bougainvilleaPreset,
    config,
  );
  const variation = clamp01(config.variation ?? preset.growth.variation);
  const density = clamp(config.density ?? 1, 0.15, 3);
  applyVineSize(preset, config.size);
  preset.network.variation = variation;
  preset.growth.variation = variation;
  preset.distribution.variation = variation;

  const quality = config.quality ?? "auto";
  const budget = resolveQualityBudget(quality, devicePixelRatio);
  const halfHeight = 96;
  const halfWidth = halfHeight * Math.max(0.45, aspect);
  const depthRange = Math.max(80, preset.depth.spread * 1.8);
  const area = resolveEffectArea(config.area);
  const networkBounds = resolveNetworkBounds(
    area,
    halfWidth,
    halfHeight,
    preset.depth.spread,
  );
  const baseNodesPerPath = Math.max(
    4,
    Math.floor(preset.network.nodesPerPath ?? 16),
  );
  const nodesPerPath = Math.max(
    4,
    Math.round(baseNodesPerPath * (0.68 + budget.nodeScale * 0.32)),
  );
  const mainNodeCap =
    budget.quality === "high" ? 820 : budget.quality === "medium" ? 500 : 260;
  const qualityPathCount = Math.max(
    1,
    Math.round((preset.network.pathCount ?? 18) * budget.nodeScale),
  );
  const pathCount = Math.max(
    1,
    Math.min(
      qualityPathCount,
      Math.floor(mainNodeCap / Math.max(1, nodesPerPath * density)),
    ),
  );
  const seed = preset.network.seed ?? preset.distribution.seed;
  const pathEndpoints = createFoliagePathEndpointResolvers({ seed, variation });
  const mainTopology = buildNetworks({
    ...preset.network,
    bounds: networkBounds,
    density,
    depth: [-preset.depth.spread, preset.depth.spread],
    endPosition: preset.network.endPosition ?? pathEndpoints.endPosition,
    mode: "paths",
    nodesPerPath,
    pathCount,
    seed,
    startPosition: preset.network.startPosition ?? pathEndpoints.startPosition,
    variation,
  });
  const vine = buildVineGrowth(mainTopology, {
    ...preset.growth,
    density,
    maxBranches: Math.max(
      1,
      Math.round(preset.growth.maxBranches * budget.nodeScale),
    ),
    maxGrowthNodes: Math.max(
      1,
      Math.round(preset.growth.maxGrowthNodes * budget.nodeScale),
    ),
    variation,
  });
  const hangingTopology =
    config.hanging?.enabled === true
      ? buildHangingStrands({
          strandCount: config.hanging.strandCount ?? 8,
          nodesPerStrand: config.hanging.nodesPerStrand ?? 8,

          length: config.hanging.length ?? 72,
          lengthVariation: config.hanging.lengthVariation ?? 0.38,

          variation,

          rootJitter:
            config.hanging.rootJitter ??
            new Vec3(3, 2, preset.depth.spread * 0.18),

          seed: seed + 7919,

          segmentStiffness: config.hanging.segmentStiffness ?? 0.94,

          bendStiffness: config.hanging.bendStiffness ?? 0.14,

          rootDistribution: (index, total) =>
            resolveHangingRoot(vine, index, total, networkBounds),
        })
      : null;

  const topology = hangingTopology
    ? combineTopologies(vine.topology, hangingTopology)
    : vine.topology;
  annotateVineDepth(topology);
  const distribution = buildVineDistribution(
    vine,
    assets,
    {
      ...preset.distribution,
      maxInstances: Math.max(
        1,
        Math.round(preset.distribution.maxInstances * budget.rendererScale),
      ),
      variation,
    },
    density,
    hangingTopology?.groups?.strands ?? [],
  );
  const scene = createDeformableScene({
    quality,
    topology,
  });
  const pointerSweep = new PointerSweepForce(preset.interaction);
  const wind = preset.wind ? new WindForce(preset.wind) : null;
  const gravity = preset.gravity ? new GravityForce(preset.gravity) : null;
  scene.addForce(pointerSweep);
  if (wind) scene.addForce(wind);
  if (gravity) scene.addForce(gravity);

  topology.metadata = {
    ...topology.metadata,
    area,
    density,
    depthSpread: preset.depth.spread,
    effect: "vine-layer",
    publicEffect: "foliage-layer",
    hanging: hangingTopology !== null,
    variation,
  };

  return {
    area,
    assets,
    bounds: { depthRange, halfHeight, halfWidth },
    density,
    destroy: () => scene.destroy(),
    distribution,
    gravity,
    hangingTopology,
    networkBounds,
    pointerSweep,
    preset,
    scene,
    topology,
    variation,
    vine,
    wind,
  };
}

export const createVineComposition = createFoliageComposition;

function resolveNetworkBounds(
  area: ResolvedEffectArea,
  halfWidth: number,
  halfHeight: number,
  depthSpread: number,
): NetworkBounds {
  const canvasWidth = halfWidth * 2;
  const canvasHeight = halfHeight * 2;
  const minX = -halfWidth + area.x * canvasWidth;
  const minY = -halfHeight + area.y * canvasHeight;
  return {
    min: new Vec3(minX, minY, -depthSpread),
    max: new Vec3(
      minX + area.width * canvasWidth,
      minY + area.height * canvasHeight,
      depthSpread,
    ),
  };
}

function applyVineSize(
  preset: FoliagePreset,
  size: FoliageLayerConfig["size"],
): void {
  if (!size) return;
  preset.distribution.branchScale = scaleRange(
    preset.distribution.branchScale,
    size.branch ?? size.base,
  );
  preset.distribution.flowerScale = scaleRange(
    preset.distribution.flowerScale,
    size.flower,
  );
  preset.distribution.leafScale = scaleRange(
    preset.distribution.leafScale,
    size.leaf,
  );
}

function scaleRange(
  range: readonly [number, number],
  size: VineSizeValue | undefined,
): readonly [number, number] {
  if (size === undefined) return range;
  if (typeof size === "number") {
    const scale = Math.max(0.05, size);
    return [range[0] * scale, range[1] * scale];
  }
  return [
    range[0] * Math.max(0.05, size[0]),
    range[1] * Math.max(0.05, size[1]),
  ];
}

function annotateVineDepth(topology: TopologyResult): void {
  const mainNodes = topology.groups?.paths?.flat() ?? [];
  const mainNodeSet = new Set(mainNodes);
  for (const node of topology.nodes) {
    const inheritedDepth = readNumber(
      node.metadata.depth,
      resolveDepthFromPosition(node),
    );
    const baseFlexibility = readNumber(node.metadata.flexibility, 1);
    const role = node.metadata.vineRole;
    const roleFlexibility =
      role === "branch" ? 1.12 : role === "growth-node" ? 1.04 : 1;
    node.metadata.flexibility =
      baseFlexibility * roleFlexibility * (0.68 + inheritedDepth * 0.64);
    node.metadata.foliageDepth = inheritedDepth;
    node.metadata.foliageRegion =
      inheritedDepth > 0.72
        ? "foreground"
        : inheritedDepth > 0.32
          ? "middle"
          : "background";
    if (mainNodeSet.has(node)) node.metadata.vineRole = "main-vine";
  }
}

function resolveDepthFromPosition(
  node: TopologyResult["nodes"][number],
): number {
  return clamp01((node.position.z + 100) / 200);
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function resolveHangingRoot(
  vine: VineGrowthResult,
  index: number,
  total: number,
  bounds: NetworkBounds,
): Vec3 {
  const paths = vine.mainPaths;

  if (paths.length === 0) {
    const t = total <= 1 ? 0.5 : index / Math.max(1, total - 1);

    return new Vec3(lerp(bounds.min.x, bounds.max.x, t), bounds.min.y, 0);
  }

  const path = paths[index % paths.length];

  if (!path || path.length === 0) {
    return new Vec3((bounds.min.x + bounds.max.x) * 0.5, bounds.min.y, 0);
  }

  const t = total <= 1 ? 0.5 : index / Math.max(1, total - 1);

  const nodeIndex = Math.min(
    path.length - 1,
    Math.max(0, Math.round(t * (path.length - 1))),
  );

  return path[nodeIndex]!.restPosition.clone();
}

function combineTopologies(
  primary: TopologyResult,
  secondary: TopologyResult,
): TopologyResult {
  return {
    nodes: [...primary.nodes, ...secondary.nodes],

    constraints: [...primary.constraints, ...secondary.constraints],

    edges: [...(primary.edges ?? []), ...(secondary.edges ?? [])],

    groups: {
      ...(primary.groups ?? {}),
      ...(secondary.groups ?? {}),
    },

    metadata: {
      ...(primary.metadata ?? {}),
      hanging: true,
    },
  };
}
