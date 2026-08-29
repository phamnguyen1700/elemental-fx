import { describe, expect, it } from "vitest";

import { SegmentAttachmentConstraint } from "../constraints";
import { Vec3 } from "../core/math/vec3";
import { buildNetworks } from "./networks";
import { buildVineGrowth } from "./vine-growth";

function mainVines(pathCount = 1) {
  return buildNetworks({
    anchorStrategy: "none",
    bounds: { min: new Vec3(-100, -40, -10), max: new Vec3(100, 40, 10) },
    curvature: 0.2,
    endPosition: ({ pathIndex }) => new Vec3(100, pathIndex * 20, 0),
    mode: "paths",
    nodesPerPath: 14,
    pathCount,
    seed: 17,
    startPosition: ({ pathIndex }) => new Vec3(-100, pathIndex * 20, 0),
    variation: 0.7
  });
}

describe("vine growth", () => {
  it("places growth nodes by balanced arc-length spacing", () => {
    const vine = buildVineGrowth(mainVines(), {
      branchProbability: 0,
      densityModulation: 0.2,
      seed: 22,
      spacing: 28,
      spacingJitter: 0.2,
      variation: 1
    });
    const distances = vine.growthNodes.map((node) => node.distance);
    const gaps = distances.slice(1).map((distance, index) => distance - distances[index]!);

    expect(distances.length).toBeGreaterThan(4);
    expect(Math.max(...gaps)).toBeLessThan(28 * 1.5);
    expect(Math.min(...gaps)).toBeGreaterThan(28 * 0.5);
  });

  it("is deterministic and density creates more biological growth", () => {
    const base = mainVines(2);
    const config = { seed: 91, variation: 0.85 };
    const first = buildVineGrowth(base, config);
    const second = buildVineGrowth(base, config);
    const dense = buildVineGrowth(base, { ...config, density: 1.8 });
    const summarize = (vine: typeof first) =>
      vine.growthNodes.map((node) => ({
        branchId: node.branchId,
        distance: node.distance,
        flower: node.hasFlower,
        leaf: node.hasLeaf,
        side: node.side
      }));

    expect(summarize(first)).toEqual(summarize(second));
    expect(dense.growthNodes.length).toBeGreaterThan(first.growthNodes.length);
    expect(dense.branches.length).toBeGreaterThanOrEqual(first.branches.length);
  });

  it("builds only lightweight level-one branches", () => {
    const vine = buildVineGrowth(mainVines(), {
      branchProbability: 1,
      maxBranches: 20,
      seed: 7
    });

    expect(vine.branches.length).toBeGreaterThan(0);
    expect(vine.branches.every((branch) => branch.nodes.length >= 2)).toBe(true);
    expect(vine.branches.every((branch) => branch.nodes.length <= 5)).toBe(true);
    expect(
      vine.branches.every((branch) =>
        branch.nodes.slice(1).every((node) => node.metadata.vineRole === "branch")
      )
    ).toBe(true);
    expect(vine.topology.groups?.vineBranches).toHaveLength(vine.branches.length);
  });

  it("attaches every growth carrier only to its own main path segment", () => {
    const vine = buildVineGrowth(mainVines(2), { branchProbability: 1, seed: 12 });
    const attachments = vine.topology.constraints.filter(
      (constraint): constraint is SegmentAttachmentConstraint =>
        constraint instanceof SegmentAttachmentConstraint
    );

    expect(attachments).toHaveLength(vine.growthNodes.length);
    for (const growthNode of vine.growthNodes) {
      const attachment = attachments.find(
        (candidate) => candidate.carrier === growthNode.carrier
      );
      expect(attachment?.segmentStart.metadata.pathIndex).toBe(growthNode.pathIndex);
      expect(attachment?.segmentEnd.metadata.pathIndex).toBe(growthNode.pathIndex);
    }
  });

  it("keeps the exact number of macro paths supplied by network paths", () => {
    const single = buildVineGrowth(mainVines(1), { density: 2, seed: 5 });
    const multiple = buildVineGrowth(mainVines(3), { density: 0.5, seed: 5 });

    expect(single.mainPaths).toHaveLength(1);
    expect(multiple.mainPaths).toHaveLength(3);
  });
});
