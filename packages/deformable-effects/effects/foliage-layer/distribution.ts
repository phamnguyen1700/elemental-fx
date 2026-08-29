import type { ResourceSet } from "../../core/resources";
import type { Node } from "../../engines/constraint-graph";
import type { VineBranch, VineGrowthNode, VineGrowthResult } from "../../topologies";
import type { ResolvedVineAssets } from "./assets";
import type {
  VineAsset,
  VineDistributionConfig,
  VineRenderInstance,
  VineVisualKind,
} from "./types";

export interface VineDistribution {
  instances: VineRenderInstance[];
  structuralCount: number;
}

/** @deprecated Use `VineDistribution`. */
export type FoliageDistribution = VineDistribution;

export function buildVineDistribution(
  vine: VineGrowthResult,
  assets: ResolvedVineAssets,
  config: VineDistributionConfig,
  density = 1,
): VineDistribution {
  const structural = buildStructuralSkin(vine, assets, config);
  const instances = [...structural];

  // Structural skin is never truncated; the configured budget limits optional attachments.
  const maxInstances = Math.max(structural.length, Math.floor(config.maxInstances));
  for (const growthNode of vine.growthNodes) {
    appendMainNodeAttachments(instances, maxInstances, growthNode, assets, config);
    if (instances.length >= maxInstances) break;
  }

  if (instances.length < maxInstances) {
    appendSecondaryNodeAttachments(
      instances,
      maxInstances,
      vine.branches,
      assets,
      config,
      density,
    );
  }

  instances.sort((left, right) => resolveDepth(left) - resolveDepth(right));
  return { instances, structuralCount: structural.length };
}

/** @deprecated Use `buildVineDistribution`. */
export const buildFoliageDistribution = buildVineDistribution;

function buildStructuralSkin(
  vine: VineGrowthResult,
  assets: ResolvedVineAssets,
  config: VineDistributionConfig,
): VineRenderInstance[] {
  const instances: VineRenderInstance[] = [];

  vine.mainPaths.forEach((path, pathIndex) => {
    for (let segmentIndex = 0; segmentIndex < path.length - 1; segmentIndex++) {
      instances.push(
        createStructuralInstance(
          instances.length,
          "main",
          pathIndex,
          null,
          -1,
          segmentIndex,
          path[segmentIndex]!,
          path[segmentIndex + 1]!,
          assets,
          config,
        ),
      );
    }
  });

  for (const branch of vine.branches) {
    for (let segmentIndex = 0; segmentIndex < branch.nodes.length - 1; segmentIndex++) {
      instances.push(
        createStructuralInstance(
          instances.length,
          "secondary",
          branch.pathIndex,
          branch.id,
          branch.growthNodeId,
          segmentIndex,
          branch.nodes[segmentIndex]!,
          branch.nodes[segmentIndex + 1]!,
          assets,
          config,
        ),
      );
    }
  }

  return instances;
}

function createStructuralInstance(
  id: number,
  role: "main" | "secondary",
  pathIndex: number,
  branchId: number | null,
  growthNodeId: number,
  segmentIndex: number,
  from: Node,
  to: Node,
  assets: ResolvedVineAssets,
  config: VineDistributionConfig,
): VineRenderInstance {
  const sampleIndex = role === "main" ? pathIndex * 4096 + segmentIndex : 1_000_000 + id;
  const sample = (channel: number) =>
    organicSample(config.seed + 101, sampleIndex, channel, config.variation);
  const resource = assets.branches.pick(sample(1));
  if (!resource) throw new Error("No branch resource is available.");
  const crossScale = lerp(config.branchScale[0], config.branchScale[1], sample(2));
  const segmentLength = from.restPosition.distanceTo(to.restPosition);

  return {
    axialOffset: 0,
    branchId,
    crossScale,
    depthBias: 0,
    flexibility: lerp(
      config.branchFlexibility[0],
      config.branchFlexibility[1],
      sample(3),
    ),
    flip: sample(4) < 0.5 ? -1 : 1,
    flutter: lerp(config.branchFlutter[0], config.branchFlutter[1], sample(5)),
    from,
    greenMask: resource.metadata?.greenMask === true,
    growthNodeId,
    id,
    kind: "branch",
    lateralOffset: 0,
    orientationOffset: 0,
    pathIndex,
    phase: sample(6) * Math.PI * 2,
    resource,
    scale: segmentLength * Math.max(1.01, config.structuralOverlap),
    structuralRole: role,
    t: 0.5,
    tint: createTint("branch", sample(7), sample(8), sample(9)),
    to,
  };
}

function appendMainNodeAttachments(
  instances: VineRenderInstance[],
  maxInstances: number,
  growthNode: VineGrowthNode,
  assets: ResolvedVineAssets,
  config: VineDistributionConfig,
): void {
  const site: AttachmentSite = {
    anchor: growthNode.carrier,
    branchId: null,
    from: growthNode.from,
    growthNodeId: growthNode.id,
    pathIndex: growthNode.pathIndex,
    phase: growthNode.phase,
    sampleIndex: growthNode.id,
    side: growthNode.side,
    t: growthNode.t,
    to: growthNode.to,
  };

  if (growthNode.hasFlower && assets.flowers.size > 0 && instances.length < maxInstances) {
    instances.push(createAttachmentInstance(instances.length, "flower", site, assets.flowers, config));
  }
  if (growthNode.hasLeaf && assets.leaves.size > 0 && instances.length < maxInstances) {
    instances.push(createAttachmentInstance(instances.length, "leaf", site, assets.leaves, config));
  }
}

function appendSecondaryNodeAttachments(
  instances: VineRenderInstance[],
  maxInstances: number,
  branches: ReadonlyArray<VineBranch>,
  assets: ResolvedVineAssets,
  config: VineDistributionConfig,
  density: number,
): void {
  const probabilityScale = densityProbabilityFactor(density);

  for (const branch of branches) {
    for (let nodeIndex = 1; nodeIndex < branch.nodes.length; nodeIndex++) {
      if (instances.length >= maxInstances) return;
      const node = branch.nodes[nodeIndex]!;
      const previous = branch.nodes[nodeIndex - 1]!;
      const next = branch.nodes[Math.min(branch.nodes.length - 1, nodeIndex + 1)]!;
      const sampleIndex = branch.id * 8 + nodeIndex;
      const sample = (channel: number) =>
        organicSample(config.seed + 1301, sampleIndex, channel, config.variation);
      const isTip = nodeIndex === branch.nodes.length - 1;
      const tipScale = isTip ? 1.35 : 0.72;
      const site: AttachmentSite = {
        anchor: node,
        branchId: branch.id,
        from: previous,
        growthNodeId: branch.growthNodeId,
        pathIndex: branch.pathIndex,
        phase: sample(1) * Math.PI * 2,
        sampleIndex: 100_000 + sampleIndex,
        side:
          sample(2) < 0.5
            ? branch.side === 1
              ? -1
              : 1
            : branch.side,
        t: 0.5,
        to: next,
      };

      if (
        assets.flowers.size > 0 &&
        sample(3) < clamp01(config.secondaryFlowerProbability * probabilityScale * tipScale)
      ) {
        instances.push(
          createAttachmentInstance(instances.length, "flower", site, assets.flowers, config),
        );
      }
      if (
        instances.length < maxInstances &&
        assets.leaves.size > 0 &&
        sample(4) < clamp01(config.secondaryLeafProbability * probabilityScale)
      ) {
        instances.push(
          createAttachmentInstance(instances.length, "leaf", site, assets.leaves, config),
        );
      }
    }
  }
}

interface AttachmentSite {
  anchor: Node;
  branchId: number | null;
  from: Node;
  growthNodeId: number;
  pathIndex: number;
  phase: number;
  sampleIndex: number;
  side: -1 | 1;
  t: number;
  to: Node;
}

function createAttachmentInstance(
  id: number,
  kind: Exclude<VineVisualKind, "branch">,
  site: AttachmentSite,
  pool: ResourceSet<VineAsset>,
  config: VineDistributionConfig,
): VineRenderInstance {
  const kindOffset = kind === "flower" ? 409 : 811;
  const sample = (channel: number) =>
    organicSample(config.seed + kindOffset, site.sampleIndex, channel, config.variation);
  const resource = pool.pick(sample(1));
  if (!resource) throw new Error(`No ${kind} resource is available.`);
  const scaleRange = kind === "flower" ? config.flowerScale : config.leafScale;
  const flexibilityRange =
    kind === "flower" ? config.flowerFlexibility : config.leafFlexibility;
  const flutterRange = kind === "flower" ? config.flowerFlutter : config.leafFlutter;

  return {
    anchor: site.anchor,
    axialOffset: signed(sample(2)) * 1.2,
    branchId: site.branchId,
    crossScale: 1,
    depthBias: signed(sample(3)) * config.depthJitter + (kind === "flower" ? 1.5 : 0),
    flexibility: lerp(flexibilityRange[0], flexibilityRange[1], sample(4)),
    flip: sample(5) < 0.5 ? -1 : 1,
    flutter: lerp(flutterRange[0], flutterRange[1], sample(6)),
    from: site.from,
    greenMask: false,
    growthNodeId: site.growthNodeId,
    id,
    kind,
    lateralOffset:
      site.side *
      (kind === "flower"
        ? 1.2 + sample(7) * config.lateralSpread
        : 0.6 + sample(7) * 1.8),
    orientationOffset:
      site.side *
      (kind === "flower" ? 0.3 + sample(8) * 0.5 : 0.46 + sample(8) * 0.66),
    pathIndex: site.pathIndex,
    phase: site.phase + sample(9) * 0.7,
    resource,
    scale: lerp(scaleRange[0], scaleRange[1], sample(10)),
    structuralRole: null,
    t: site.t,
    tint: createTint(kind, sample(11), sample(12), sample(13)),
    to: site.to,
  };
}

function createTint(
  kind: VineVisualKind,
  redSample: number,
  greenSample: number,
  blueSample: number,
): readonly [number, number, number, number] {
  if (kind === "flower") {
    return [
      0.96 + redSample * 0.08,
      0.92 + greenSample * 0.08,
      0.97 + blueSample * 0.06,
      1,
    ];
  }
  if (kind === "leaf") {
    return [
      0.88 + redSample * 0.1,
      0.92 + greenSample * 0.1,
      0.86 + blueSample * 0.08,
      1,
    ];
  }
  return [
    0.9 + redSample * 0.08,
    0.94 + greenSample * 0.08,
    0.88 + blueSample * 0.06,
    1,
  ];
}

function resolveDepth(instance: VineRenderInstance): number {
  const anchor = instance.anchor?.restPosition;
  return (
    (anchor?.z ?? lerp(instance.from.restPosition.z, instance.to.restPosition.z, instance.t)) +
    instance.depthBias
  );
}

function organicSample(
  seed: number,
  index: number,
  channel: number,
  variation: number,
): number {
  const uniform = fract((index + 1) * 0.618033988749895 + (channel + 1) * 0.414213562373095);
  return lerp(uniform, seededSample(seed, index, channel), clamp01(variation));
}

function seededSample(seed: number, index: number, channel: number): number {
  const value =
    Math.sin(seed * 12.9898 + (index + 1) * 78.233 + (channel + 1) * 37.719) *
    43758.5453;
  return fract(value);
}

function densityProbabilityFactor(density: number): number {
  return clamp(0.72 + Math.sqrt(Math.max(0.15, density)) * 0.28, 0.55, 1.32);
}

function signed(value: number): number {
  return value * 2 - 1;
}

function fract(value: number): number {
  return value - Math.floor(value);
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
