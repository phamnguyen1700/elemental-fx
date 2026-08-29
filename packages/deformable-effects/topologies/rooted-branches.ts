import { Node } from "../engines/constraint-graph";
import type { Constraint } from "../engines/constraint-graph";
import { DistanceConstraint } from "../constraints/distance";
import { AngularConstraint } from "../constraints/angular";
import { Vec3 } from "../core/math/vec3";
import { createSeededRandom } from "../core/math/random";
import type { NodePhysicalConfig, TopologyEdge, TopologyResult } from "./types";
import { collectEdgeChains, resolveNumericProfile } from "./types";

export interface RootedBranchNodeContext {
  rootIndex: number;
  depth: number;
  branchIndex: number;
}

export interface RootedBranchesConfig extends NodePhysicalConfig<RootedBranchNodeContext> {
  rootCount: number;
  branchDepth: number;
  branchingFactor: number; // probability 0-1 or multiplier
  segmentLength: number;
  segmentLengthVariation: number;
  spread: number;
  variation: number;
  preferredGrowthDir: Vec3;
  rootPosition: (rootIndex: number, rootCount: number) => Vec3;
  stiffnessDistribution: (depth: number) => number;
  angularStiffnessScale: number;
  seed: number;
}

export function buildRootedBranches(config: Partial<RootedBranchesConfig> = {}): TopologyResult {
  const rootCount = config.rootCount ?? 1;
  const branchDepth = config.branchDepth ?? 5;
  const branchingFactor = config.branchingFactor ?? 0.5;
  const segmentLength = config.segmentLength ?? 20;
  const variation = clamp01(config.variation ?? 1);
  const spread = (config.spread ?? 0.5) * variation;
  const growthDir = (config.preferredGrowthDir ?? new Vec3(0, -1, 0)).clone().normalize();
  const getStiffness = config.stiffnessDistribution ?? ((d) => 1.0 - (d / branchDepth) * 0.5);
  const angularStiffnessScale = config.angularStiffnessScale ?? 0.5;

  const segmentLengthVariation = (config.segmentLengthVariation ?? 0.25) * variation;
  const random = createSeededRandom(config.seed ?? 12345);

  const nodes: Node[] = [];
  const constraints: Constraint[] = [];
  const edges: TopologyEdge[] = [];
  let branchSerial = 0;

  for (let r = 0; r < rootCount; r++) {
    // Root node
    const uniformRootX = rootCount <= 1 ? 0 : -50 + (r / (rootCount - 1)) * 100;
    const rootPos =
      config.rootPosition?.(r, rootCount) ??
      new Vec3(
        lerp(uniformRootX, (random() - 0.5) * 100, variation),
        0,
        (random() - 0.5) * 100 * variation
      );
    const rootContext = { branchIndex: 0, depth: 0, rootIndex: r };
    const root = new Node(
      rootPos,
      resolveNumericProfile(config.mass, 1, 0, branchDepth + 1, rootContext),
      true,
      resolveNumericProfile(config.damping, 0.99, 0, branchDepth + 1, rootContext),
      {
        topology: "root",
        rootIndex: r,
        depth: 0,
        flexibility: resolveNumericProfile(config.flexibility, 1, 0, branchDepth + 1, rootContext)
      }
    );
    nodes.push(root);

    // Recursive branching
    const grow = (parent: Node, parentDir: Vec3, depth: number) => {
      if (depth >= branchDepth) return;

      const structuredSample = fract((branchSerial + 1) * 0.618033988749895);
      const branchSample = lerp(structuredSample, random(), variation);
      branchSerial++;
      const numBranches = depth === 0 ? 1 : branchSample < branchingFactor ? 2 : 1;

      for (let i = 0; i < numBranches; i++) {
        // Compute direction
        const rx = (random() - 0.5) * spread;
        const ry = (random() - 0.5) * spread;
        const rz = (random() - 0.5) * spread;

        const dir = parentDir
          .clone()
          .add(new Vec3(rx, ry, rz))
          .normalize();
        dir.lerp(growthDir, 0.2).normalize();

        const lengthScale = 1 + (random() - 0.5) * 2 * segmentLengthVariation;
        const childLength = segmentLength * Math.max(0.1, lengthScale);
        const childPos = parent.position.clone().addScaled(dir, childLength);
        const childContext = { branchIndex: i, depth: depth + 1, rootIndex: r };
        const fallbackMass = 1.0 - (depth / branchDepth) * 0.8; // lighter at tips
        const child = new Node(
          childPos,
          resolveNumericProfile(
            config.mass,
            fallbackMass,
            depth + 1,
            branchDepth + 1,
            childContext
          ),
          false,
          resolveNumericProfile(config.damping, 0.99, depth + 1, branchDepth + 1, childContext),
          {
            topology: "branch",
            rootIndex: r,
            depth: depth + 1,
            flexibility: resolveNumericProfile(
              config.flexibility,
              1,
              depth + 1,
              branchDepth + 1,
              childContext
            )
          }
        );
        nodes.push(child);

        const stiffness = getStiffness(depth);
        constraints.push(new DistanceConstraint(parent, child, childLength, stiffness));
        edges.push({ from: parent, to: child, kind: "branch" });

        // Angular constraint to maintain shape
        constraints.push(
          new AngularConstraint(parent, child, dir, childLength, stiffness * angularStiffnessScale)
        );

        grow(child, dir, depth + 1);
      }
    };

    grow(root, growthDir, 0);
  }

  return {
    nodes,
    constraints,
    edges,
    groups: { branches: collectEdgeChains(edges) },
    metadata: { topology: "rooted-branches", variation }
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function fract(value: number): number {
  return value - Math.floor(value);
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}
