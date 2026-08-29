import { describe, expect, it } from "vitest";

import { AnchorConstraint, DistanceConstraint } from "../constraints";
import { Vec3 } from "../core/math/vec3";
import { SpatialHash } from "../core/spatial";
import { PointerSweepForce } from "../forces";
import { buildNetworks } from "./networks";

const BOUNDS = {
  min: new Vec3(-100, -70, -30),
  max: new Vec3(100, 70, 30)
};

describe("network paths", () => {
  it("maps density to independent path count without changing nodes per path", () => {
    const result = buildNetworks({
      bounds: BOUNDS,
      density: 1.5,
      mode: "paths",
      nodesPerPath: 8,
      pathCount: 4,
      seed: 3
    });

    expect(result.groups?.paths).toHaveLength(6);
    expect(result.groups?.paths?.every((path) => path.length === 8)).toBe(true);
    expect(result.nodes).toHaveLength(48);
    expect(result.metadata?.pathCount).toBe(6);
  });

  it("keeps crossing paths physically independent", () => {
    const result = buildNetworks({
      anchorStrategy: "none",
      bounds: { min: new Vec3(-10, -10, 0), max: new Vec3(10, 10, 0) },
      curvature: 0,
      endPosition: ({ pathIndex }) =>
        pathIndex === 0 ? new Vec3(10, 10, 0) : new Vec3(10, -10, 0),
      mode: "paths",
      nodesPerPath: 3,
      pathCount: 2,
      startPosition: ({ pathIndex }) =>
        pathIndex === 0 ? new Vec3(-10, -10, 0) : new Vec3(-10, 10, 0),
      variation: 0
    });
    const [first, second] = result.groups?.paths ?? [];

    expect(first?.[1]?.position).toEqual(new Vec3(0, 0, 0));
    expect(second?.[1]?.position).toEqual(new Vec3(0, 0, 0));
    expect(first?.[1]).not.toBe(second?.[1]);
    expect(
      result.constraints
        .filter(
          (constraint): constraint is DistanceConstraint => constraint instanceof DistanceConstraint
        )
        .every(
          (constraint) =>
            constraint.nodeA.metadata.pathIndex === constraint.nodeB.metadata.pathIndex
        )
    ).toBe(true);
  });

  it("is deterministic for a seed and makes high variation less uniform", () => {
    const config = {
      bounds: BOUNDS,
      mode: "paths" as const,
      nodesPerPath: 10,
      pathCount: 8,
      pathLengthVariation: 0.45,
      seed: 42
    };
    const first = buildNetworks({ ...config, variation: 1 });
    const second = buildNetworks({ ...config, variation: 1 });
    const uniform = buildNetworks({ ...config, seed: 999, variation: 0 });

    expect(first.nodes.map((node) => node.restPosition)).toEqual(
      second.nodes.map((node) => node.restPosition)
    );
    expect(first.nodes.map((node) => node.restPosition)).not.toEqual(
      uniform.nodes.map((node) => node.restPosition)
    );
    expect(pathLengthRange(uniform.groups?.paths ?? [])).toBeLessThan(0.0001);
    expect(pathLengthRange(first.groups?.paths ?? [])).toBeGreaterThan(1);
  });

  it("keeps generated nodes inside resolved bounds", () => {
    const result = buildNetworks({
      bounds: BOUNDS,
      curvature: 1,
      mode: "paths",
      nodesPerPath: 18,
      orientationVariation: 1,
      overlap: 1,
      pathCount: 20,
      seed: 91,
      variation: 1
    });

    expect(
      result.nodes.every(
        (node) =>
          node.position.x >= BOUNDS.min.x &&
          node.position.x <= BOUNDS.max.x &&
          node.position.y >= BOUNDS.min.y &&
          node.position.y <= BOUNDS.max.y &&
          node.position.z >= BOUNDS.min.z &&
          node.position.z <= BOUNDS.max.z
      )
    ).toBe(true);
  });

  it("uses pinned roots plus soft distributed anchors", () => {
    const result = buildNetworks({
      anchorEvery: 3,
      anchorStiffness: 0.2,
      anchorStrategy: "distributed",
      bounds: BOUNDS,
      mode: "paths",
      nodesPerPath: 10,
      pathCount: 2
    });
    const softNode = result.nodes.find((node) => node.metadata.anchor === "soft");
    const anchor = result.constraints.find(
      (constraint): constraint is AnchorConstraint =>
        constraint instanceof AnchorConstraint && constraint.node === softNode
    );

    expect(result.nodes.filter((node) => node.isPinned)).toHaveLength(2);
    expect(softNode).toBeDefined();
    expect(anchor).toBeDefined();
    softNode!.position.x += 40;
    const displaced = softNode!.position.distanceTo(softNode!.restPosition);
    anchor!.solve(1 / 60, 1);
    expect(softNode!.position.distanceTo(softNode!.restPosition)).toBeLessThan(displaced);
  });

  it("lets pointer sweep affect nearby paths while distant paths stay still", () => {
    const result = buildNetworks({
      anchorStrategy: "none",
      bounds: { min: new Vec3(-20, -40, 0), max: new Vec3(20, 40, 0) },
      curvature: 0,
      endPosition: ({ pathIndex }) => new Vec3(20, pathIndex === 0 ? 0 : 36, 0),
      mode: "paths",
      nodesPerPath: 5,
      pathCount: 2,
      startPosition: ({ pathIndex }) => new Vec3(-20, pathIndex === 0 ? 0 : 36, 0),
      variation: 0
    });
    const [nearPath, farPath] = result.groups?.paths ?? [];
    const near = nearPath?.[2];
    const far = farPath?.[2];
    const hash = new SpatialHash(10);
    hash.update(result.nodes);
    const sweep = new PointerSweepForce({ radius: 10, strength: 10, velocityScale: 1 });
    sweep.updatePointer(new Vec3(-8, 0, 0), true);
    sweep.updatePointer(new Vec3(8, 0, 0), true);
    sweep.apply(result.nodes, 0.1, 0, { spatial: hash });

    expect(near?.position.distanceTo(near.restPosition)).toBeGreaterThan(0);
    expect(far?.position).toEqual(far?.restPosition);
  });
});

function pathLengthRange(paths: ReadonlyArray<ReadonlyArray<{ restPosition: Vec3 }>>): number {
  const lengths = paths.map((path) =>
    path[0]!.restPosition.distanceTo(path[path.length - 1]!.restPosition)
  );
  return Math.max(...lengths) - Math.min(...lengths);
}
