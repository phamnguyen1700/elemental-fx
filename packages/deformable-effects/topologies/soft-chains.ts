import { Node } from "../engines/constraint-graph";
import type { Constraint } from "../engines/constraint-graph";
import { DistanceConstraint } from "../constraints/distance";
import { BendConstraint } from "../constraints/bend";
import { Vec3 } from "../core/math/vec3";
import type { NodePhysicalConfig, TopologyEdge, TopologyResult } from "./types";
import { resolveNumericProfile } from "./types";

export interface SoftChainNodeContext {
  nodeIndex: number;
  t: number;
}

export interface SoftChainsConfig extends NodePhysicalConfig<SoftChainNodeContext> {
  nodeCount: number;
  startPos: Vec3;
  endPos: Vec3; // If null, hanging
  anchorStart: boolean;
  anchorEnd: boolean;
  stiffness: number;
  bendStiffness: number;
}

export function buildSoftChains(config: Partial<SoftChainsConfig> = {}): TopologyResult {
  const nodeCount = config.nodeCount ?? 20;
  const startPos = config.startPos ?? new Vec3(-50, 0, 0);
  const endPos = config.endPos ?? new Vec3(50, 0, 0);
  const anchorStart = config.anchorStart ?? true;
  const anchorEnd = config.anchorEnd ?? true;
  const stiffness = config.stiffness ?? 1.0;
  const bendStiffness = config.bendStiffness ?? stiffness * 0.35;

  const nodes: Node[] = [];
  const constraints: Constraint[] = [];
  const edges: TopologyEdge[] = [];

  const delta = new Vec3().subVectors(endPos, startPos);
  const totalLength = delta.length();
  const segmentLength = totalLength / Math.max(1, nodeCount - 1);

  for (let i = 0; i < nodeCount; i++) {
    const t = nodeCount === 1 ? 0 : i / (nodeCount - 1);
    const pos = startPos.clone().addScaled(delta, t);

    // Usually want middle nodes to hang, so they drop down, but start pos is lerped here.
    // Gravity will pull them down.

    const isStart = i === 0;
    const isEnd = i === nodeCount - 1;
    const isPinned = (isStart && anchorStart) || (isEnd && anchorEnd);

    const context = { nodeIndex: i, t };
    const node = new Node(
      pos,
      resolveNumericProfile(config.mass, 1, i, nodeCount, context),
      isPinned,
      resolveNumericProfile(config.damping, 0.99, i, nodeCount, context),
      {
        topology: "chain",
        nodeIndex: i,
        flexibility: resolveNumericProfile(config.flexibility, 1, i, nodeCount, context)
      }
    );
    nodes.push(node);

    if (i > 0) {
      constraints.push(new DistanceConstraint(nodes[i - 1]!, node, segmentLength, stiffness));
      edges.push({ from: nodes[i - 1]!, to: node, kind: "chain" });
    }
    if (i > 1) {
      constraints.push(new BendConstraint(nodes[i - 2]!, node, segmentLength * 2, bendStiffness));
    }
  }

  return {
    nodes,
    constraints,
    edges,
    groups: { chains: [nodes] },
    metadata: { topology: "soft-chains" }
  };
}
