import { BendConstraint } from "../constraints/bend";
import { DistanceConstraint } from "../constraints/distance";
import { PathDirectionConstraint } from "../constraints/path-direction";
import { SegmentAttachmentConstraint } from "../constraints/segment-attachment";
import { Vec3 } from "../core/math/vec3";
import { Node } from "../engines/constraint-graph";
import type { TopologyEdge, TopologyResult } from "./types";

export interface VineGrowthConfig {
  density: number;
  spacing: number;
  spacingJitter: number;
  densityModulation: number;
  branchProbability: number;
  flowerProbability: number;
  leafProbability: number;
  branchLength: readonly [number, number];
  branchNodeCount: readonly [number, number];
  branchAngle: readonly [number, number];
  branchCurvature: number;
  branchStiffness: number;
  branchBendStiffness: number;
  branchRootStiffness: number;
  attachmentStiffness: number;
  carrierMass: number;
  carrierDamping: number;
  branchMass: number;
  branchDamping: number;
  flexibility: number;
  depthOffset: number;
  maxGrowthNodes: number;
  maxBranches: number;
  seed: number;
  variation: number;
}

export interface VineGrowthNode {
  id: number;
  pathIndex: number;
  growthIndex: number;
  segmentIndex: number;
  distance: number;
  pathT: number;
  t: number;
  from: Node;
  to: Node;
  carrier: Node;
  side: -1 | 1;
  hasFlower: boolean;
  hasLeaf: boolean;
  branchId: number | null;
  phase: number;
}

export interface VineBranch {
  id: number;
  growthNodeId: number;
  pathIndex: number;
  side: -1 | 1;
  angle: number;
  restLength: number;
  nodes: Node[];
}

export interface VineGrowthResult {
  topology: TopologyResult;
  mainPaths: Node[][];
  growthNodes: VineGrowthNode[];
  branches: VineBranch[];
}

const DEFAULT_CONFIG: VineGrowthConfig = {
  attachmentStiffness: 0.92,
  branchAngle: [0.62, 1.04],
  branchBendStiffness: 0.08,
  branchCurvature: 0.32,
  branchDamping: 0.958,
  branchLength: [24, 42],
  branchMass: 0.72,
  branchNodeCount: [3, 5],
  branchProbability: 0.72,
  branchRootStiffness: 0.14,
  branchStiffness: 0.64,
  carrierDamping: 0.965,
  carrierMass: 0.8,
  density: 1,
  densityModulation: 0.2,
  depthOffset: 5,
  flexibility: 1.12,
  flowerProbability: 0.34,
  leafProbability: 0.56,
  maxBranches: 240,
  maxGrowthNodes: 420,
  seed: 1,
  spacing: 29,
  spacingJitter: 0.2,
  variation: 0.8
};

export function buildVineGrowth(
  baseTopology: TopologyResult,
  config: Partial<VineGrowthConfig> = {}
): VineGrowthResult {
  const mainPaths = baseTopology.groups?.paths ?? [];
  if (mainPaths.length === 0 || mainPaths.every((path) => path.length < 2)) {
    throw new Error("Vine growth requires a network paths topology.");
  }

  const resolved = resolveConfig(config);
  const nodes = [...baseTopology.nodes];
  const constraints = [...baseTopology.constraints];
  const edges: TopologyEdge[] = [...(baseTopology.edges ?? [])];
  const growthNodes: VineGrowthNode[] = [];
  const maxPerPath = Math.max(
    1,
    Math.floor(resolved.maxGrowthNodes / Math.max(1, mainPaths.length))
  );

  for (let pathIndex = 0; pathIndex < mainPaths.length; pathIndex++) {
    const path = mainPaths[pathIndex]!;
    if (path.length < 2) continue;
    const arc = createPathArc(path);
    const distances = createGrowthDistances(
      arc.totalLength,
      pathIndex,
      maxPerPath,
      resolved
    );

    distances.forEach((distance, growthIndex) => {
      const location = locateOnArc(arc, distance);
      const variation = resolved.variation;
      const sample = (channel: number) =>
        growthSample(
          resolved.seed,
          pathIndex,
          growthIndex,
          channel,
          variation
        );
      const regularSide: -1 | 1 =
        (growthIndex + pathIndex) % 2 === 0 ? 1 : -1;
      const side: -1 | 1 =
        sample(1) < 0.3 * variation ? (regularSide === 1 ? -1 : 1) : regularSide;
      const carrierPosition = location.from.restPosition
        .clone()
        .lerp(location.to.restPosition, location.t);
      const carrier = new Node(
        carrierPosition,
        resolved.carrierMass,
        false,
        resolved.carrierDamping,
        {
          flexibility: resolved.flexibility,
          growthIndex,
          pathIndex,
          pathT: distance / arc.totalLength,
          vineRole: "growth-node"
        }
      );
      const id = growthNodes.length;
      const densityFactor = densityProbabilityFactor(resolved.density);
      const growthNode: VineGrowthNode = {
        branchId: null,
        carrier,
        distance,
        from: location.from,
        growthIndex,
        hasFlower:
          sample(2) < clamp01(resolved.flowerProbability * densityFactor),
        hasLeaf: sample(3) < clamp01(resolved.leafProbability * densityFactor),
        id,
        pathIndex,
        pathT: distance / arc.totalLength,
        phase: sample(4) * Math.PI * 2,
        segmentIndex: location.segmentIndex,
        side,
        t: location.t,
        to: location.to
      };

      nodes.push(carrier);
      constraints.push(
        new SegmentAttachmentConstraint(
          carrier,
          location.from,
          location.to,
          location.t,
          resolved.attachmentStiffness
        )
      );
      growthNodes.push(growthNode);
    });
  }

  const selectedForBranch = selectBranchGrowthNodes(growthNodes, resolved);
  const branches: VineBranch[] = [];
  for (const growthNode of growthNodes) {
    if (!selectedForBranch.has(growthNode.id)) continue;
    const branch = createBranch(
      growthNode,
      branches.length,
      resolved,
      nodes,
      constraints,
      edges
    );
    growthNode.branchId = branch.id;
    branches.push(branch);
  }

  const topology: TopologyResult = {
    ...baseTopology,
    constraints,
    edges,
    groups: {
      ...baseTopology.groups,
      paths: mainPaths,
      vineBranches: branches.map((branch) => branch.nodes)
    },
    metadata: {
      ...baseTopology.metadata,
      branchCount: branches.length,
      growthNodeCount: growthNodes.length,
      vineGrowth: true
    },
    nodes
  };

  return { branches, growthNodes, mainPaths, topology };
}

interface PathArcSegment {
  from: Node;
  to: Node;
  segmentIndex: number;
  startDistance: number;
  endDistance: number;
}

interface PathArc {
  segments: PathArcSegment[];
  totalLength: number;
}

function createPathArc(path: ReadonlyArray<Node>): PathArc {
  const segments: PathArcSegment[] = [];
  let totalLength = 0;
  for (let segmentIndex = 0; segmentIndex < path.length - 1; segmentIndex++) {
    const from = path[segmentIndex]!;
    const to = path[segmentIndex + 1]!;
    const length = Math.max(
      0.0001,
      from.restPosition.distanceTo(to.restPosition)
    );
    segments.push({
      endDistance: totalLength + length,
      from,
      segmentIndex,
      startDistance: totalLength,
      to
    });
    totalLength += length;
  }
  return { segments, totalLength };
}

function createGrowthDistances(
  totalLength: number,
  pathIndex: number,
  maxCount: number,
  config: VineGrowthConfig
): number[] {
  if (totalLength <= 0.0001) return [];
  const nominalSpacing = clamp(
    config.spacing / Math.pow(config.density, 0.32),
    5,
    Math.max(5, totalLength)
  );
  const margin = Math.min(totalLength * 0.18, nominalSpacing * 0.52);
  const phase = seededSample(config.seed, pathIndex, 0, 31) * Math.PI * 2;
  const frequency = 0.85 + seededSample(config.seed, pathIndex, 0, 32) * 0.8;
  const candidates: number[] = [];
  let distance = margin;
  let index = 0;

  while (distance <= totalLength - margin && index < 2048) {
    candidates.push(distance);
    const pathT = distance / totalLength;
    const wave = Math.sin(pathT * Math.PI * 2 * frequency + phase);
    const modulation = 1 + wave * config.densityModulation * config.variation;
    const jitter =
      1 +
      signed(seededSample(config.seed, pathIndex, index, 33)) *
        config.spacingJitter *
        config.variation;
    const step = clamp(
      nominalSpacing * modulation * jitter,
      nominalSpacing * 0.56,
      nominalSpacing * 1.48
    );
    distance += step;
    index++;
  }

  if (candidates.length === 0) candidates.push(totalLength * 0.5);
  if (candidates.length <= maxCount) return candidates;
  return Array.from({ length: maxCount }, (_, index) => {
    const sourceIndex = Math.min(
      candidates.length - 1,
      Math.floor(((index + 0.5) / maxCount) * candidates.length)
    );
    return candidates[sourceIndex]!;
  });
}

function locateOnArc(
  arc: PathArc,
  distance: number
): PathArcSegment & { t: number } {
  const segment =
    arc.segments.find((candidate) => distance <= candidate.endDistance) ??
    arc.segments[arc.segments.length - 1]!;
  const length = segment.endDistance - segment.startDistance;
  return {
    ...segment,
    t: clamp01((distance - segment.startDistance) / Math.max(0.0001, length))
  };
}

function selectBranchGrowthNodes(
  growthNodes: ReadonlyArray<VineGrowthNode>,
  config: VineGrowthConfig
): Set<number> {
  const probability = clamp01(
    config.branchProbability * densityProbabilityFactor(config.density)
  );
  const eligible = growthNodes.filter((growthNode) => {
    const sample = growthSample(
      config.seed,
      growthNode.pathIndex,
      growthNode.growthIndex,
      10,
      config.variation
    );
    return sample < probability;
  });
  if (eligible.length <= config.maxBranches) {
    return new Set(eligible.map((growthNode) => growthNode.id));
  }

  return new Set(
    [...eligible]
      .sort(
        (left, right) =>
          seededSample(config.seed, left.id, 0, 41) -
          seededSample(config.seed, right.id, 0, 41)
      )
      .slice(0, config.maxBranches)
      .map((growthNode) => growthNode.id)
  );
}

function createBranch(
  growthNode: VineGrowthNode,
  branchId: number,
  config: VineGrowthConfig,
  topologyNodes: Node[],
  constraints: TopologyResult["constraints"],
  edges: TopologyEdge[]
): VineBranch {
  const sample = (channel: number) =>
    growthSample(
      config.seed + 719,
      growthNode.pathIndex,
      growthNode.growthIndex,
      channel,
      config.variation
    );
  const angleMagnitude = lerp(
    config.branchAngle[0],
    config.branchAngle[1],
    sample(1)
  );
  const angle = angleMagnitude * growthNode.side;
  const length = lerp(
    config.branchLength[0],
    config.branchLength[1],
    sample(2)
  );
  const totalNodes = clampInteger(
    Math.round(
      lerp(config.branchNodeCount[0], config.branchNodeCount[1], sample(3))
    ),
    2,
    5
  );
  const mainTangent = growthNode.to.restPosition
    .clone()
    .sub(growthNode.from.restPosition)
    .normalize();
  const direction = rotatePlanar(mainTangent, angle);
  const normal = new Vec3(-direction.y, direction.x, 0).normalize();
  const curveDirection = signed(sample(4));
  const depthDirection = signed(sample(5));
  const branchNodes = [growthNode.carrier];
  let restLength = 0;

  for (let nodeIndex = 1; nodeIndex < totalNodes; nodeIndex++) {
    const t = nodeIndex / (totalNodes - 1);
    const curve =
      Math.sin(Math.PI * t) *
      config.branchCurvature *
      length *
      0.18 *
      curveDirection *
      config.variation;
    const position = growthNode.carrier.restPosition
      .clone()
      .addScaled(direction, length * t)
      .addScaled(normal, curve);
    position.z += depthDirection * config.depthOffset * t * config.variation;
    const node = new Node(
      position,
      config.branchMass * (0.9 + t * 0.2),
      false,
      config.branchDamping,
      {
        branchId,
        flexibility: config.flexibility * (1 + t * 0.18),
        growthNodeId: growthNode.id,
        pathIndex: growthNode.pathIndex,
        t,
        vineRole: "branch"
      }
    );
    const previous = branchNodes[branchNodes.length - 1]!;
    restLength += previous.restPosition.distanceTo(node.restPosition);
    topologyNodes.push(node);
    branchNodes.push(node);
    constraints.push(
      new DistanceConstraint(previous, node, undefined, config.branchStiffness)
    );
    edges.push({ from: previous, kind: "vine-branch", to: node });

    if (nodeIndex === 1) {
      constraints.push(
        new PathDirectionConstraint(
          growthNode.carrier,
          node,
          growthNode.from,
          growthNode.to,
          angle,
          undefined,
          config.branchRootStiffness
        )
      );
    }
    if (nodeIndex > 1) {
      constraints.push(
        new BendConstraint(
          branchNodes[nodeIndex - 2]!,
          node,
          undefined,
          config.branchBendStiffness
        )
      );
    }
  }

  return {
    angle,
    growthNodeId: growthNode.id,
    id: branchId,
    nodes: branchNodes,
    pathIndex: growthNode.pathIndex,
    restLength,
    side: growthNode.side
  };
}

function resolveConfig(config: Partial<VineGrowthConfig>): VineGrowthConfig {
  const resolved = { ...DEFAULT_CONFIG, ...config };
  return {
    ...resolved,
    attachmentStiffness: clamp01(resolved.attachmentStiffness),
    branchAngle: normalizeRange(resolved.branchAngle, 0.05, Math.PI * 0.9),
    branchBendStiffness: clamp01(resolved.branchBendStiffness),
    branchCurvature: clamp01(resolved.branchCurvature),
    branchLength: normalizeRange(resolved.branchLength, 1, 1000),
    branchNodeCount: normalizeRange(resolved.branchNodeCount, 2, 5),
    branchProbability: clamp01(resolved.branchProbability),
    branchRootStiffness: clamp01(resolved.branchRootStiffness),
    branchStiffness: clamp01(resolved.branchStiffness),
    carrierDamping: clamp01(resolved.carrierDamping),
    density: clamp(resolved.density, 0.15, 3),
    densityModulation: clamp01(resolved.densityModulation),
    flowerProbability: clamp01(resolved.flowerProbability),
    leafProbability: clamp01(resolved.leafProbability),
    maxBranches: Math.max(0, Math.floor(resolved.maxBranches)),
    maxGrowthNodes: Math.max(1, Math.floor(resolved.maxGrowthNodes)),
    spacing: Math.max(1, resolved.spacing),
    spacingJitter: clamp01(resolved.spacingJitter),
    variation: clamp01(resolved.variation)
  };
}

function normalizeRange(
  range: readonly [number, number],
  min: number,
  max: number
): readonly [number, number] {
  const first = clamp(Math.min(range[0], range[1]), min, max);
  const second = clamp(Math.max(range[0], range[1]), min, max);
  return [first, second];
}

function growthSample(
  seed: number,
  pathIndex: number,
  growthIndex: number,
  channel: number,
  variation: number
): number {
  const uniform = fract(
    (growthIndex + 1) * 0.618033988749895 +
      (pathIndex + 1) * 0.414213562373095 +
      (channel + 1) * 0.2718281828459045
  );
  return lerp(
    uniform,
    seededSample(seed, pathIndex, growthIndex, channel),
    variation
  );
}

function seededSample(
  seed: number,
  first: number,
  second: number,
  channel: number
): number {
  const value =
    Math.sin(
      seed * 12.9898 +
        (first + 1) * 78.233 +
        (second + 1) * 37.719 +
        (channel + 1) * 19.913
    ) * 43758.5453;
  return fract(value);
}

function densityProbabilityFactor(density: number): number {
  return clamp(0.72 + Math.sqrt(density) * 0.28, 0.55, 1.32);
}

function rotatePlanar(direction: Vec3, angle: number): Vec3 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return new Vec3(
    direction.x * cosine - direction.y * sine,
    direction.x * sine + direction.y * cosine,
    direction.z
  ).normalize();
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.round(clamp(value, min, max));
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
