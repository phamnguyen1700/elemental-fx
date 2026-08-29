import { Node } from "../engines/constraint-graph";
import type { Constraint } from "../engines/constraint-graph";
import { BendConstraint } from "../constraints/bend";
import { DistanceConstraint } from "../constraints/distance";
import { Vec3 } from "../core/math/vec3";
import { createSeededRandom } from "../core/math/random";
import type { NodePhysicalConfig, TopologyEdge, TopologyResult } from "./types";
import { resolveNumericProfile } from "./types";

export interface HangingStrandNodeContext {
  strandIndex: number;
  nodeIndex: number;
  t: number;
}

export interface HangingStrandsConfig extends NodePhysicalConfig<HangingStrandNodeContext> {
  strandCount: number;
  nodesPerStrand: number;
  length: number;
  lengthVariation: number;
  variation: number;
  rootJitter: Vec3;
  seed: number;
  rootDistribution: (index: number, total: number) => Vec3;
  segmentStiffness: number;
  bendStiffness: number;
}

export function buildHangingStrands(config: Partial<HangingStrandsConfig> = {}): TopologyResult {
  const strandCount = config.strandCount ?? 10;
  const nodesPerStrand = config.nodesPerStrand ?? 10;
  const length = config.length ?? 100;
  const variation = clamp01(config.variation ?? 1);
  const lengthVariation = (config.lengthVariation ?? 0.2) * variation;
  const rootJitter = config.rootJitter ?? new Vec3(0, 0, 0);
  const segmentStiffness = config.segmentStiffness ?? 1;
  const bendStiffness = config.bendStiffness ?? 0;
  const random = createSeededRandom(config.seed ?? 12345);
  const getRoot = config.rootDistribution ?? ((i, t) => new Vec3((i - t / 2) * 20, 0, 0));

  const nodes: Node[] = [];
  const constraints: Constraint[] = [];
  const edges: TopologyEdge[] = [];
  const strands: Node[][] = [];

  for (let s = 0; s < strandCount; s++) {
    const strandLength = length * (1 + (random() - 0.5) * 2 * lengthVariation);
    const segmentLength = strandLength / Math.max(1, nodesPerStrand - 1);
    const rootPos = getRoot(s, strandCount).add(
      new Vec3(
        (random() - 0.5) * rootJitter.x * variation,
        (random() - 0.5) * rootJitter.y * variation,
        (random() - 0.5) * rootJitter.z * variation
      )
    );
    const rootContext = { nodeIndex: 0, strandIndex: s, t: 0 };
    const root = new Node(
      rootPos,
      resolveNumericProfile(config.mass, 1, 0, nodesPerStrand, rootContext),
      true,
      resolveNumericProfile(config.damping, 0.99, 0, nodesPerStrand, rootContext),
      {
        topology: "strand-root",
        strandIndex: s,
        nodeIndex: 0,
        flexibility: resolveNumericProfile(config.flexibility, 1, 0, nodesPerStrand, rootContext)
      }
    );
    nodes.push(root);
    const strand = [root];

    let parent = root;
    for (let i = 1; i < nodesPerStrand; i++) {
      const pos = parent.position.clone().add(new Vec3(0, segmentLength, 0)); // hanging down (+y is down or up depends on space, let's assume y down is gravity)
      const t = i / Math.max(1, nodesPerStrand - 1);
      const context = { nodeIndex: i, strandIndex: s, t };
      const child = new Node(
        pos,
        resolveNumericProfile(config.mass, 1, i, nodesPerStrand, context),
        false,
        resolveNumericProfile(config.damping, 0.99, i, nodesPerStrand, context),
        {
          topology: "strand",
          strandIndex: s,
          nodeIndex: i,
          flexibility: resolveNumericProfile(config.flexibility, 1, i, nodesPerStrand, context)
        }
      );
      nodes.push(child);
      strand.push(child);

      constraints.push(new DistanceConstraint(parent, child, segmentLength, segmentStiffness));
      if (i > 1 && bendStiffness > 0) {
        constraints.push(
          new BendConstraint(strand[i - 2]!, child, segmentLength * 2, bendStiffness)
        );
      }
      edges.push({ from: parent, to: child, kind: "strand" });
      parent = child;
    }
    strands.push(strand);
  }

  return {
    nodes,
    constraints,
    edges,
    groups: { strands },
    metadata: { topology: "hanging-strands", variation }
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
