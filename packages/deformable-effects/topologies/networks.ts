import { AnchorConstraint } from "../constraints/anchor";
import { BendConstraint } from "../constraints/bend";
import { DistanceConstraint } from "../constraints/distance";
import { createSeededRandom } from "../core/math/random";
import { Vec3 } from "../core/math/vec3";
import { Node } from "../engines/constraint-graph";
import type { Constraint } from "../engines/constraint-graph";
import type { NodePhysicalConfig, TopologyEdge, TopologyResult } from "./types";
import { resolveNumericProfile } from "./types";

export type NetworkMode = "mesh" | "paths";
export type NetworkMeshLayout = "radial" | "grid";
export type NetworkAnchorStrategy = "none" | "start" | "ends" | "distributed";

export interface NetworkBounds {
  min: Vec3;
  max: Vec3;
}

export interface NetworkPathEndpointContext {
  bounds: NetworkBounds;
  pathCount: number;
  pathIndex: number;
}

export type NetworkPathEndpointResolver = (context: NetworkPathEndpointContext) => Vec3;

export interface NetworkMeshNodeContext {
  mode: "mesh";
  layout: NetworkMeshLayout;
  ring?: number;
  spoke?: number;
  column?: number;
  row?: number;
  isEdge: boolean;
}

export interface NetworkPathNodeContext {
  mode: "paths";
  pathIndex: number;
  nodeIndex: number;
  t: number;
  depth: number;
  isEdge: boolean;
  isAnchor: boolean;
}

export type NetworkNodeContext = NetworkMeshNodeContext | NetworkPathNodeContext;

export interface NetworksConfig extends NodePhysicalConfig<NetworkNodeContext> {
  /** `radial` and `grid` remain accepted as legacy mesh-mode shorthands. */
  mode: NetworkMode | NetworkMeshLayout;
  layout: NetworkMeshLayout;
  radius: number;
  rings: number;
  spokes: number;
  centerPos: Vec3;
  anchorEdge: boolean;
  gridColumns: number;
  gridRows: number;
  spacing: number;
  jitter: number;
  diagonalStiffness: number;
  diagonalConstraints: boolean;
  stiffness: number;
  seed: number;
  variation: number;

  bounds: NetworkBounds;
  density: number;
  pathCount: number;
  nodesPerPath: number;
  pathLength: number;
  pathLengthVariation: number;
  preferredDirection: Vec3;
  orientationVariation: number;
  curvature: number;
  overlap: number;
  edgeBias: number;
  depth: readonly [number, number];
  startPosition: NetworkPathEndpointResolver;
  endPosition: NetworkPathEndpointResolver;
  anchorStrategy: NetworkAnchorStrategy;
  anchorEvery: number;
  anchorStiffness: number;
  bendStiffness: number;
}

export function buildNetworks(config: Partial<NetworksConfig> = {}): TopologyResult {
  const mode = resolveNetworkMode(config.mode);
  if (mode === "paths") return buildPathNetwork(config);
  return buildMeshNetwork(config);
}

function buildMeshNetwork(config: Partial<NetworksConfig>): TopologyResult {
  const layout = resolveMeshLayout(config);
  return layout === "grid" ? buildGridMesh(config) : buildRadialMesh(config);
}

function buildRadialMesh(config: Partial<NetworksConfig>): TopologyResult {
  const radius = Math.max(0.001, config.radius ?? 100);
  const rings = Math.max(1, Math.floor(config.rings ?? 5));
  const spokes = Math.max(3, Math.floor(config.spokes ?? 8));
  const centerPos = config.centerPos ?? new Vec3();
  const anchorEdge = config.anchorEdge ?? true;
  const stiffness = clamp01(config.stiffness ?? 0.8);
  const diagonalConstraints = config.diagonalConstraints ?? false;
  const diagonalStiffness = clamp01(config.diagonalStiffness ?? stiffness * 0.65);
  const nodes: Node[] = [];
  const constraints: Constraint[] = [];
  const edges: TopologyEdge[] = [];
  const centerContext: NetworkMeshNodeContext = {
    isEdge: false,
    layout: "radial",
    mode: "mesh",
    ring: 0,
    spoke: 0
  };
  const centerNode = createNetworkNode(centerPos, false, 0, rings + 1, centerContext, config, {
    topology: "network-mesh-center"
  });
  nodes.push(centerNode);
  const ringNodes: Node[][] = [];

  for (let ring = 1; ring <= rings; ring++) {
    const ringRadius = (ring / rings) * radius;
    const isEdge = ring === rings;
    const currentRing: Node[] = [];

    for (let spoke = 0; spoke < spokes; spoke++) {
      const angle = (spoke / spokes) * Math.PI * 2;
      const context: NetworkMeshNodeContext = {
        isEdge,
        layout: "radial",
        mode: "mesh",
        ring,
        spoke
      };
      const position = centerPos
        .clone()
        .add(new Vec3(Math.cos(angle) * ringRadius, Math.sin(angle) * ringRadius, 0));
      const node = createNetworkNode(
        position,
        isEdge && anchorEdge,
        ring,
        rings + 1,
        context,
        config,
        { topology: "network-mesh-radial", ring, spoke }
      );
      nodes.push(node);
      currentRing.push(node);
    }
    ringNodes.push(currentRing);
  }

  for (let ring = 0; ring < rings; ring++) {
    const currentRing = ringNodes[ring]!;
    const previousRing = ring === 0 ? [centerNode] : ringNodes[ring - 1]!;

    for (let spoke = 0; spoke < spokes; spoke++) {
      const node = currentRing[spoke]!;
      const nextNode = currentRing[(spoke + 1) % spokes]!;
      connect(constraints, edges, node, nextNode, stiffness, "ring");

      const previousNode = ring === 0 ? previousRing[0]! : previousRing[spoke]!;
      connect(constraints, edges, previousNode, node, stiffness, "spoke");

      if (diagonalConstraints && ring > 0) {
        const diagonal = previousRing[(spoke + 1) % spokes]!;
        connect(constraints, edges, diagonal, node, diagonalStiffness, "diagonal");
      }
    }
  }

  return {
    nodes,
    constraints,
    edges,
    groups: { mesh: ringNodes },
    metadata: { layout: "radial", mode: "mesh", topology: "networks" }
  };
}

function buildGridMesh(config: Partial<NetworksConfig>): TopologyResult {
  const columns = Math.max(2, Math.floor(config.gridColumns ?? 6));
  const rows = Math.max(2, Math.floor(config.gridRows ?? 5));
  const spacing = Math.max(0.001, config.spacing ?? 24);
  const variation = clamp01(config.variation ?? 1);
  const jitter = Math.max(0, config.jitter ?? 0) * variation;
  const anchorEdge = config.anchorEdge ?? true;
  const centerPos = config.centerPos ?? new Vec3();
  const stiffness = clamp01(config.stiffness ?? 0.8);
  const diagonalConstraints = config.diagonalConstraints ?? false;
  const diagonalStiffness = clamp01(config.diagonalStiffness ?? stiffness * 0.65);
  const random = createSeededRandom(config.seed ?? 12345);
  const nodes: Node[] = [];
  const constraints: Constraint[] = [];
  const edges: TopologyEdge[] = [];
  const grid: Node[][] = [];

  for (let row = 0; row < rows; row++) {
    const currentRow: Node[] = [];
    for (let column = 0; column < columns; column++) {
      const isEdge = column === 0 || row === 0 || column === columns - 1 || row === rows - 1;
      const position = centerPos
        .clone()
        .add(
          new Vec3(
            (column - (columns - 1) / 2) * spacing + (random() - 0.5) * jitter,
            (row - (rows - 1) / 2) * spacing + (random() - 0.5) * jitter,
            (random() - 0.5) * jitter
          )
        );
      const context: NetworkMeshNodeContext = {
        column,
        isEdge,
        layout: "grid",
        mode: "mesh",
        row
      };
      const index = row * columns + column;
      const node = createNetworkNode(
        position,
        isEdge && anchorEdge,
        index,
        rows * columns,
        context,
        config,
        { column, row, topology: "network-mesh-grid" }
      );
      nodes.push(node);
      currentRow.push(node);
    }
    grid.push(currentRow);
  }

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const node = grid[row]![column]!;
      const right = grid[row]?.[column + 1];
      const below = grid[row + 1]?.[column];
      if (right) connect(constraints, edges, node, right, stiffness, "grid-x");
      if (below) connect(constraints, edges, node, below, stiffness, "grid-y");

      if (diagonalConstraints) {
        const downRight = grid[row + 1]?.[column + 1];
        const downLeft = grid[row + 1]?.[column - 1];
        if (downRight) {
          connect(constraints, edges, node, downRight, diagonalStiffness, "grid-diagonal");
        }
        if (downLeft) {
          connect(constraints, edges, node, downLeft, diagonalStiffness, "grid-diagonal");
        }
      }
    }
  }

  return {
    nodes,
    constraints,
    edges,
    groups: { mesh: grid },
    metadata: { layout: "grid", mode: "mesh", topology: "networks", variation }
  };
}

function buildPathNetwork(config: Partial<NetworksConfig>): TopologyResult {
  const bounds = normalizeBounds(config.bounds);
  const density = clamp(config.density ?? 1, 0.1, 4);
  const basePathCount = Math.max(1, Math.floor(config.pathCount ?? 10));
  const pathCount = Math.max(1, Math.round(basePathCount * density));
  const nodesPerPath = Math.max(2, Math.floor(config.nodesPerPath ?? 14));
  const variation = clamp01(config.variation ?? 1);
  const pathLength = clamp(config.pathLength ?? 1, 0.05, 1);
  const pathLengthVariation = clamp01(config.pathLengthVariation ?? 0.2) * variation;
  const orientationVariation = clamp01(config.orientationVariation ?? 0.55) * variation;
  const curvature = clamp01(config.curvature ?? 0.5);
  const overlap = clamp01(config.overlap ?? 0.65);
  const edgeBias = clamp01(config.edgeBias ?? 1);
  const direction = resolveDirection(config.preferredDirection);
  const depth = normalizeDepth(config.depth, bounds);
  const anchorStrategy = config.anchorStrategy ?? "distributed";
  const anchorEvery = Math.max(2, Math.floor(config.anchorEvery ?? 4));
  const anchorStiffness = clamp01(config.anchorStiffness ?? 0.11);
  const segmentStiffness = clamp01(config.stiffness ?? 0.72);
  const bendStiffness = clamp01(config.bendStiffness ?? 0.1);
  const random = createSeededRandom(config.seed ?? 12345);
  const nodes: Node[] = [];
  const constraints: Constraint[] = [];
  const edges: TopologyEdge[] = [];
  const paths: Node[][] = [];
  let softAnchorCount = 0;

  for (let pathIndex = 0; pathIndex < pathCount; pathIndex++) {
    const endpointContext = { bounds, pathCount, pathIndex };
    const generated = createPathEndpoints({
      bounds,
      direction,
      edgeBias,
      orientationVariation,
      overlap,
      pathCount,
      pathIndex,
      pathLength: pathLength * (1 + signed(random()) * pathLengthVariation),
      random,
      variation
    });
    const start = clampToBounds(
      config.startPosition?.(endpointContext).clone() ?? generated.start,
      bounds
    );
    const end = clampToBounds(
      config.endPosition?.(endpointContext).clone() ?? generated.end,
      bounds
    );
    const pathDirection = end.clone().sub(start);
    const planarLength = Math.hypot(pathDirection.x, pathDirection.y);
    const normal =
      planarLength > 0.0001
        ? new Vec3(-pathDirection.y / planarLength, pathDirection.x / planarLength, 0)
        : new Vec3(-direction.y, direction.x, 0).normalize();
    const crossSpan = Math.max(
      0.001,
      Math.abs(normal.x) * (bounds.max.x - bounds.min.x) +
        Math.abs(normal.y) * (bounds.max.y - bounds.min.y)
    );
    const pathDepth = lerp(
      depth[0],
      depth[1],
      coverageSample(pathIndex, pathCount, random, variation)
    );
    const phase = lerp(0, random() * Math.PI * 2, variation);
    const secondaryPhase = lerp(0, random() * Math.PI * 2, variation);
    const curveAmplitude = curvature * crossSpan * 0.12;
    const currentPath: Node[] = [];

    for (let nodeIndex = 0; nodeIndex < nodesPerPath; nodeIndex++) {
      const t = nodeIndex / (nodesPerPath - 1);
      const envelope = Math.sin(Math.PI * t);
      const curveWave =
        Math.sin(t * Math.PI * 2 + phase) * 0.68 +
        Math.sin(t * Math.PI * 5 + secondaryPhase) * 0.32 * variation;
      const depthWave =
        envelope * Math.sin(t * Math.PI * 3 + phase) * (depth[1] - depth[0]) * 0.06 * variation;
      const position = start
        .clone()
        .lerp(end, t)
        .addScaled(normal, envelope * curveWave * curveAmplitude);
      position.z = clamp(pathDepth + depthWave, depth[0], depth[1]);
      clampToBounds(position, bounds);

      const isPinned = isPinnedPathNode(anchorStrategy, nodeIndex, nodesPerPath);
      const isSoftAnchor =
        anchorStrategy === "distributed" &&
        !isPinned &&
        (nodeIndex % anchorEvery === 0 || nodeIndex === nodesPerPath - 1);
      const depthRatio = inverseLerp(depth[0], depth[1], position.z);
      const context: NetworkPathNodeContext = {
        depth: depthRatio,
        isAnchor: isPinned || isSoftAnchor,
        isEdge: nodeIndex === 0 || nodeIndex === nodesPerPath - 1,
        mode: "paths",
        nodeIndex,
        pathIndex,
        t
      };
      const node = createNetworkNode(position, isPinned, nodeIndex, nodesPerPath, context, config, {
        anchor: isPinned ? "pinned" : isSoftAnchor ? "soft" : null,
        depth: depthRatio,
        nodeIndex,
        pathIndex,
        t,
        topology: "network-path"
      });
      nodes.push(node);
      currentPath.push(node);

      if (isSoftAnchor) {
        constraints.push(new AnchorConstraint(node, node.restPosition, anchorStiffness));
        softAnchorCount++;
      }
      if (nodeIndex > 0) {
        const previous = currentPath[nodeIndex - 1]!;
        constraints.push(new DistanceConstraint(previous, node, undefined, segmentStiffness));
        edges.push({ from: previous, kind: "path", to: node });
      }
      if (nodeIndex > 1 && bendStiffness > 0) {
        const previousPrevious = currentPath[nodeIndex - 2]!;
        constraints.push(new BendConstraint(previousPrevious, node, undefined, bendStiffness));
      }
    }
    paths.push(currentPath);
  }

  return {
    nodes,
    constraints,
    edges,
    groups: { paths },
    metadata: {
      anchorStrategy,
      bounds,
      density,
      mode: "paths",
      nodesPerPath,
      pathCount,
      seed: config.seed ?? 12345,
      softAnchorCount,
      topology: "networks",
      variation
    }
  };
}

interface PathEndpointOptions {
  bounds: NetworkBounds;
  direction: Vec3;
  edgeBias: number;
  orientationVariation: number;
  overlap: number;
  pathCount: number;
  pathIndex: number;
  pathLength: number;
  random: () => number;
  variation: number;
}

function createPathEndpoints(options: PathEndpointOptions): { start: Vec3; end: Vec3 } {
  const { bounds, direction, random, variation } = options;
  const lane = coverageSample(
    options.pathIndex,
    options.pathCount,
    random,
    variation * options.overlap
  );
  const lateralShift = signed(random()) * options.orientationVariation;
  const depth = lerp(
    bounds.min.z,
    bounds.max.z,
    coverageSample(options.pathIndex, options.pathCount, random, variation)
  );
  const vertical = Math.abs(direction.y) >= Math.abs(direction.x);

  if (vertical) {
    const sourceY = direction.y >= 0 ? bounds.min.y : bounds.max.y;
    const targetY = direction.y >= 0 ? bounds.max.y : bounds.min.y;
    const start = new Vec3(
      lerp(bounds.min.x, bounds.max.x, lane),
      lerp((bounds.min.y + bounds.max.y) * 0.5, sourceY, options.edgeBias),
      depth
    );
    const endLane = clamp01(lane + lateralShift * 0.48);
    return {
      start,
      end: new Vec3(
        lerp(bounds.min.x, bounds.max.x, endLane),
        lerp(start.y, targetY, clamp(options.pathLength, 0.05, 1)),
        depth
      )
    };
  }

  const sourceX = direction.x >= 0 ? bounds.min.x : bounds.max.x;
  const targetX = direction.x >= 0 ? bounds.max.x : bounds.min.x;
  const start = new Vec3(
    lerp((bounds.min.x + bounds.max.x) * 0.5, sourceX, options.edgeBias),
    lerp(bounds.min.y, bounds.max.y, lane),
    depth
  );
  const endLane = clamp01(lane + lateralShift * 0.48);
  return {
    start,
    end: new Vec3(
      lerp(start.x, targetX, clamp(options.pathLength, 0.05, 1)),
      lerp(bounds.min.y, bounds.max.y, endLane),
      depth
    )
  };
}

function createNetworkNode(
  position: Vec3,
  isPinned: boolean,
  index: number,
  total: number,
  context: NetworkNodeContext,
  config: Partial<NetworksConfig>,
  metadata: Record<string, unknown>
): Node {
  return new Node(
    position,
    resolveNumericProfile(config.mass, 1, index, total, context),
    isPinned,
    resolveNumericProfile(config.damping, 0.99, index, total, context),
    {
      ...metadata,
      flexibility: resolveNumericProfile(config.flexibility, 1, index, total, context),
      networkMode: context.mode
    }
  );
}

function connect(
  constraints: Constraint[],
  edges: TopologyEdge[],
  from: Node,
  to: Node,
  stiffness: number,
  kind: string
): void {
  constraints.push(new DistanceConstraint(from, to, undefined, stiffness));
  edges.push({ from, kind, to });
}

function resolveNetworkMode(mode: NetworksConfig["mode"] | undefined): NetworkMode {
  return mode === "paths" ? "paths" : "mesh";
}

function resolveMeshLayout(config: Partial<NetworksConfig>): NetworkMeshLayout {
  if (config.mode === "grid" || config.mode === "radial") return config.mode;
  return config.layout ?? "radial";
}

function resolveDirection(direction: Vec3 | undefined): Vec3 {
  const resolved = (direction ?? new Vec3(1, 0, 0)).clone();
  resolved.z = 0;
  if (resolved.lengthSq() < 0.0001) resolved.set(1, 0, 0);
  return resolved.normalize();
}

function normalizeBounds(bounds: NetworkBounds | undefined): NetworkBounds {
  const fallback = { min: new Vec3(-100, -70, -32), max: new Vec3(100, 70, 32) };
  const source = bounds ?? fallback;
  return {
    min: new Vec3(
      Math.min(source.min.x, source.max.x),
      Math.min(source.min.y, source.max.y),
      Math.min(source.min.z, source.max.z)
    ),
    max: new Vec3(
      Math.max(source.min.x, source.max.x),
      Math.max(source.min.y, source.max.y),
      Math.max(source.min.z, source.max.z)
    )
  };
}

function normalizeDepth(
  depth: readonly [number, number] | undefined,
  bounds: NetworkBounds
): readonly [number, number] {
  const source = depth ?? [bounds.min.z, bounds.max.z];
  return [
    clamp(Math.min(source[0], source[1]), bounds.min.z, bounds.max.z),
    clamp(Math.max(source[0], source[1]), bounds.min.z, bounds.max.z)
  ];
}

function clampToBounds(position: Vec3, bounds: NetworkBounds): Vec3 {
  position.x = clamp(position.x, bounds.min.x, bounds.max.x);
  position.y = clamp(position.y, bounds.min.y, bounds.max.y);
  position.z = clamp(position.z, bounds.min.z, bounds.max.z);
  return position;
}

function isPinnedPathNode(strategy: NetworkAnchorStrategy, index: number, total: number): boolean {
  if (strategy === "none") return false;
  if (strategy === "ends") return index === 0 || index === total - 1;
  return index === 0;
}

function coverageSample(
  index: number,
  total: number,
  random: () => number,
  variation: number
): number {
  const uniform = total <= 1 ? 0.5 : (index + 0.5) / total;
  return clamp01(lerp(uniform, random(), clamp01(variation)));
}

function inverseLerp(from: number, to: number, value: number): number {
  return Math.abs(to - from) < 0.0001 ? 0.5 : clamp01((value - from) / (to - from));
}

function signed(value: number): number {
  return value * 2 - 1;
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
