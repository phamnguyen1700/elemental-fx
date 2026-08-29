import { describe, expect, it } from "vitest";

import { Vec3 } from "../../core/math/vec3";
import { buildNetworks, buildVineGrowth } from "../../topologies";
import { resolveVineAssets } from "./assets";
import { buildVineDistribution } from "./distribution";
import type { VineDistributionConfig } from "./types";

const CONFIG: VineDistributionConfig = {
  branchFlexibility: [0.8, 1.1],
  branchFlutter: [0.4, 0.8],
  branchScale: [0.9, 1.1],
  depthJitter: 5,
  flowerFlexibility: [1.1, 1.5],
  flowerFlutter: [1, 1.4],
  flowerScale: [7, 11],
  lateralSpread: 4,
  leafFlexibility: [0.8, 1.2],
  leafFlutter: [0.7, 1.1],
  leafScale: [5, 8],
  maxInstances: 500,
  secondaryFlowerProbability: 0.2,
  secondaryLeafProbability: 0.3,
  seed: 77,
  structuralOverlap: 1.12,
  variation: 1
};

function vine(seed = 21, variation = 0.8) {
  const network = buildNetworks({
    anchorStrategy: "none",
    bounds: { min: new Vec3(-100, -30, -20), max: new Vec3(100, 30, 20) },
    curvature: 0.3,
    endPosition: () => new Vec3(100, 0, 0),
    mode: "paths",
    nodesPerPath: 16,
    pathCount: 1,
    seed,
    startPosition: () => new Vec3(-100, 0, 0),
    variation
  });
  return buildVineGrowth(network, {
    branchProbability: 1,
    flowerProbability: 1,
    leafProbability: 1,
    maxBranches: 20,
    seed,
    spacing: 28,
    variation
  });
}

describe("vine distribution", () => {
  it("is deterministic for the same growth hierarchy and seed", () => {
    const growth = vine();
    const assets = resolveVineAssets({
      branches: [{ handle: "branch-a" }, { handle: "branch-b" }],
      flowers: [{ handle: "flower-a" }],
      leaves: [{ handle: "leaf-a" }]
    });
    const first = buildVineDistribution(growth, assets, CONFIG);
    const second = buildVineDistribution(growth, assets, CONFIG);
    const summarize = (distribution: typeof first) =>
      distribution.instances.map((instance) => ({
        branchId: instance.branchId,
        growthNodeId: instance.growthNodeId,
        handle: instance.resource.handle,
        kind: instance.kind,
        orientationOffset: instance.orientationOffset,
        scale: instance.scale
      }));

    expect(summarize(first)).toEqual(summarize(second));
  });

  it("places branch billboards on secondary chains, never directly on the main vine", () => {
    const growth = vine();
    const distribution = buildVineDistribution(
      growth,
      resolveVineAssets({ branches: [{ handle: "branch-a" }] }),
      CONFIG
    );
    const branchInstances = distribution.instances.filter(
      (instance) => instance.kind === "branch"
    );

    expect(branchInstances).toHaveLength(growth.branches.length);
    for (const instance of branchInstances) {
      const branch = growth.branches[instance.branchId!]!;
      expect(instance.from).toBe(branch.nodes[0]);
      expect(instance.to).toBe(branch.nodes[branch.nodes.length - 1]);
      expect(instance.anchor).toBeUndefined();
    }
  });

  it("keeps flowers and leaves as independent growth-node attachments", () => {
    const growth = vine();
    const distribution = buildVineDistribution(
      growth,
      resolveVineAssets({
        branches: [{ handle: "branch-a" }],
        flowers: [{ handle: "flower-a" }],
        leaves: [{ handle: "leaf-a" }]
      }),
      CONFIG
    );
    const accents = distribution.instances.filter(
      (instance) => instance.kind !== "branch"
    );

    expect(accents.some((instance) => instance.kind === "flower")).toBe(true);
    expect(accents.some((instance) => instance.kind === "leaf")).toBe(true);
    for (const instance of accents) {
      expect(instance.anchor).toBe(growth.growthNodes[instance.growthNodeId]?.carrier);
    }
  });

  it("does not couple physics or visual count to resource-pool richness", () => {
    const growth = vine();
    const minimal = buildVineDistribution(
      growth,
      resolveVineAssets({ branches: [{ handle: "branch-a" }] }),
      CONFIG
    );
    const rich = buildVineDistribution(
      growth,
      resolveVineAssets({
        branches: Array.from({ length: 8 }, (_, index) => ({
          handle: `branch-${index}`
        })),
        flowers: [{ handle: "flower-a" }],
        leaves: [{ handle: "leaf-a" }]
      }),
      CONFIG
    );

    expect(minimal.instances.filter((instance) => instance.kind === "branch")).toHaveLength(
      growth.branches.length
    );
    expect(rich.instances.filter((instance) => instance.kind === "branch")).toHaveLength(
      growth.branches.length
    );
    expect(growth.topology.nodes.length).toBeGreaterThan(0);
  });

  it("honors instance budgets and optional green branch masking metadata", () => {
    const growth = vine();
    const distribution = buildVineDistribution(
      growth,
      resolveVineAssets({
        branches: [{ handle: "branch-a", metadata: { greenMask: true } }],
        flowers: [{ handle: "flower-a" }],
        leaves: [{ handle: "leaf-a" }]
      }),
      { ...CONFIG, maxInstances: 4 }
    );

    expect(distribution.instances).toHaveLength(4);
    expect(distribution.instances.every((instance) => instance.kind === "branch")).toBe(true);
    expect(distribution.instances.every((instance) => instance.greenMask)).toBe(true);
  });
});
