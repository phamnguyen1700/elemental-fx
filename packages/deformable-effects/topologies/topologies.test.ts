import { describe, expect, it } from "vitest";

import { BendConstraint, DistanceConstraint } from "../constraints";
import { Vec3 } from "../core/math/vec3";
import {
  buildHangingStrands,
  buildNetworks,
  buildRootedBranches,
  buildSoftChains,
  buildStalks,
  collectEdgeChains
} from ".";

describe("topologies", () => {
  it("builds rooted branches deterministically", () => {
    const a = buildRootedBranches({ branchDepth: 3, rootCount: 2, seed: 42 });
    const b = buildRootedBranches({ branchDepth: 3, rootCount: 2, seed: 42 });
    expect(a.nodes.map((node) => node.position)).toEqual(b.nodes.map((node) => node.position));
    expect(a.nodes.some((node) => node.isPinned)).toBe(true);
    expect(a.edges?.length).toBeGreaterThan(0);
  });

  it("builds hanging strands with grouped chains", () => {
    const result = buildHangingStrands({ nodesPerStrand: 4, seed: 2, strandCount: 3 });
    expect(result.nodes).toHaveLength(12);
    expect(result.groups?.strands).toHaveLength(3);
    expect(result.nodes.filter((node) => node.isPinned)).toHaveLength(3);
  });

  it("applies configurable hanging strand physics", () => {
    const result = buildHangingStrands({
      bendStiffness: 0.08,
      damping: 0.96,
      mass: (index) => 1 + index * 0.25,
      nodesPerStrand: 5,
      segmentStiffness: 0.45,
      strandCount: 1
    });

    expect(result.nodes[1]?.mass).toBe(1.25);
    expect(result.nodes[1]?.damping).toBe(0.96);
    expect(result.nodes[2]?.metadata.flexibility).toBe(1);
    expect(
      result.constraints.some(
        (constraint) => constraint instanceof DistanceConstraint && constraint.stiffness === 0.45
      )
    ).toBe(true);
    expect(result.constraints.some((constraint) => constraint instanceof BendConstraint)).toBe(
      true
    );
  });

  it("lets hanging strands be intentionally uniform or organically varied", () => {
    const uniformA = buildHangingStrands({
      length: 100,
      lengthVariation: 0.4,
      nodesPerStrand: 5,
      seed: 1,
      strandCount: 5,
      variation: 0
    });
    const uniformB = buildHangingStrands({
      length: 100,
      lengthVariation: 0.4,
      nodesPerStrand: 5,
      seed: 999,
      strandCount: 5,
      variation: 0
    });
    const organic = buildHangingStrands({
      length: 100,
      lengthVariation: 0.4,
      nodesPerStrand: 5,
      seed: 1,
      strandCount: 5,
      variation: 1
    });
    const strandLengths = (result: typeof uniformA) =>
      (result.groups?.strands ?? []).map((strand) =>
        strand[0]!.restPosition.distanceTo(strand[strand.length - 1]!.restPosition)
      );

    expect(strandLengths(uniformA)).toEqual(strandLengths(uniformB));
    expect(new Set(strandLengths(uniformA))).toHaveLength(1);
    expect(new Set(strandLengths(organic)).size).toBeGreaterThan(1);
  });

  it("builds seeded stalks without Math.random drift", () => {
    const a = buildStalks({ seed: 5, stalkCount: 2 });
    const b = buildStalks({ seed: 5, stalkCount: 2 });
    expect(a.nodes.map((node) => node.restPosition)).toEqual(
      b.nodes.map((node) => node.restPosition)
    );
    expect(a.constraints.length).toBeGreaterThan(a.edges?.length ?? 0);
  });

  it("builds radial and grid networks", () => {
    const radial = buildNetworks({ rings: 2, spokes: 4 });
    const grid = buildNetworks({ mode: "grid", gridColumns: 3, gridRows: 2, seed: 9 });
    expect(radial.nodes.length).toBe(1 + 2 * 4);
    expect(grid.nodes.length).toBe(6);
    expect(grid.edges?.length).toBe(7);
  });

  it("lets network configs tune stiffness, damping, mass, and diagonal constraints", () => {
    const result = buildNetworks({
      diagonalConstraints: true,
      gridColumns: 3,
      gridRows: 3,
      mode: "grid",
      stiffness: 0.42,
      damping: 0.94,
      mass: 2
    });

    expect(result.nodes[4]?.mass).toBe(2);
    expect(result.nodes[4]?.damping).toBe(0.94);
    expect(result.edges?.some((edge) => edge.kind === "grid-diagonal")).toBe(true);
    expect(
      result.constraints.some(
        (constraint) => constraint instanceof DistanceConstraint && constraint.stiffness === 0.42
      )
    ).toBe(true);
  });

  it("builds soft chains with optional endpoint pins and bend constraints", () => {
    const result = buildSoftChains({
      nodeCount: 5,
      startPos: new Vec3(0, 0, 0),
      endPos: new Vec3(40, 0, 0)
    });
    expect(result.nodes.filter((node) => node.isPinned)).toHaveLength(2);
    expect(result.constraints.length).toBe(7);
  });

  it("groups rooted edges into renderable chains without losing segments", () => {
    const topology = buildRootedBranches({
      branchDepth: 5,
      branchingFactor: 0.8,
      rootCount: 2,
      seed: 91
    });
    const chains = collectEdgeChains(topology.edges ?? []);

    expect(chains.length).toBeGreaterThan(0);
    expect(chains.every((chain) => chain.length >= 2)).toBe(true);
    expect(chains.reduce((sum, chain) => sum + chain.length - 1, 0)).toBe(topology.edges?.length);
    expect(topology.groups?.branches).toHaveLength(chains.length);
  });
});
