import { Node } from "../engines/constraint-graph";
import type { Constraint } from "../engines/constraint-graph";
import { DistanceConstraint } from "../constraints/distance";
import { AngularConstraint } from "../constraints/angular";
import { BendConstraint } from "../constraints/bend";
import { Vec3 } from "../core/math/vec3";
import { createSeededRandom } from "../core/math/random";
import type { NodePhysicalConfig, TopologyEdge, TopologyResult } from "./types";
import { resolveNumericProfile } from "./types";

export interface StalkNodeContext {
  stalkIndex: number;
  nodeIndex: number;
  t: number;
}

export interface StalksConfig extends NodePhysicalConfig<StalkNodeContext> {
  stalkCount: number;
  nodesPerStalk: number;
  height: number;
  heightVariation: number;
  variation: number;
  bendingProfile: (t: number) => number;
  rootDistribution: (index: number, total: number) => Vec3;
  growthDir: Vec3;
  stiffness: number;
  distanceStiffness: number;
  angularStiffnessScale: number;
  bendStiffness: number;
  seed: number;
}

export function buildStalks(config: Partial<StalksConfig> = {}): TopologyResult {
  const stalkCount = config.stalkCount ?? 10;
  const nodesPerStalk = config.nodesPerStalk ?? 5;
  const height = config.height ?? 50;
  const variation = clamp01(config.variation ?? 1);
  const heightVariation = (config.heightVariation ?? 0.2) * variation;
  const random = createSeededRandom(config.seed ?? 12345);
  const getRoot =
    config.rootDistribution ?? ((i, t) => new Vec3((i - t / 2) * 10, 0, (random() - 0.5) * 20));
  const growthDir = (config.growthDir ?? new Vec3(0, -1, 0)).clone().normalize();
  const stiffness = config.stiffness ?? 0.8;
  const distanceStiffness = config.distanceStiffness ?? stiffness;
  const angularStiffnessScale = config.angularStiffnessScale ?? 1;
  const bendStiffness = config.bendStiffness ?? stiffness * 0.35;
  const bendProfile = config.bendingProfile ?? ((t) => 1 - t * 0.5);

  const nodes: Node[] = [];
  const constraints: Constraint[] = [];
  const edges: TopologyEdge[] = [];
  const stalks: Node[][] = [];

  for (let s = 0; s < stalkCount; s++) {
    const stalkHeight = height * (1 + (random() - 0.5) * 2 * heightVariation);
    const segmentLength = stalkHeight / Math.max(1, nodesPerStalk - 1);
    const rootPos = getRoot(s, stalkCount);
    const rootContext = { nodeIndex: 0, stalkIndex: s, t: 0 };
    const root = new Node(
      rootPos,
      resolveNumericProfile(config.mass, 1, 0, nodesPerStalk, rootContext),
      true,
      resolveNumericProfile(config.damping, 0.99, 0, nodesPerStalk, rootContext),
      {
        topology: "stalk-root",
        stalkIndex: s,
        nodeIndex: 0,
        flexibility: resolveNumericProfile(config.flexibility, 1, 0, nodesPerStalk, rootContext)
      }
    );
    nodes.push(root);
    const stalk = [root];

    let parent = root;
    for (let i = 1; i < nodesPerStalk; i++) {
      const t = i / Math.max(1, nodesPerStalk - 1);
      const lateral = new Vec3(
        (random() - 0.5) * bendProfile(t) * variation,
        0,
        (random() - 0.5) * bendProfile(t) * variation
      );
      const dir = growthDir.clone().addScaled(lateral, 0.2).normalize();
      const pos = parent.position.clone().addScaled(dir, segmentLength);
      const context = { nodeIndex: i, stalkIndex: s, t };
      const fallbackMass = 1.0 - (i / nodesPerStalk) * 0.5;
      const child = new Node(
        pos,
        resolveNumericProfile(config.mass, fallbackMass, i, nodesPerStalk, context),
        false,
        resolveNumericProfile(config.damping, 0.99, i, nodesPerStalk, context),
        {
          topology: "stalk",
          stalkIndex: s,
          nodeIndex: i,
          flexibility: resolveNumericProfile(config.flexibility, 1, i, nodesPerStalk, context)
        }
      );
      nodes.push(child);
      stalk.push(child);

      constraints.push(new DistanceConstraint(parent, child, segmentLength, distanceStiffness));
      constraints.push(
        new AngularConstraint(
          parent,
          child,
          dir,
          segmentLength,
          stiffness * angularStiffnessScale * bendProfile(t)
        )
      );
      if (i > 1)
        constraints.push(
          new BendConstraint(stalk[i - 2]!, child, segmentLength * 2, bendStiffness)
        );
      edges.push({ from: parent, to: child, kind: "stalk" });

      parent = child;
    }
    stalks.push(stalk);
  }

  return {
    nodes,
    constraints,
    edges,
    groups: { stalks },
    metadata: { topology: "stalks", variation }
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
