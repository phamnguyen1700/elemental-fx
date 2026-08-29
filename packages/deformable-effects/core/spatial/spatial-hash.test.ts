import { describe, expect, it } from "vitest";

import { Vec3 } from "../math/vec3";
import { Node } from "../../engines/constraint-graph";
import { SpatialHash } from "./spatial-hash";

describe("SpatialHash", () => {
  it("finds nearby nodes across 3D cells", () => {
    const near = new Node(new Vec3(1, 1, 1));
    const far = new Node(new Vec3(50, 50, 50));
    const hash = new SpatialHash(10);
    hash.update([near, far]);

    expect(hash.getNearby(new Vec3(0, 0, 0), 5)).toEqual([near]);
  });

  it("clears indexed nodes", () => {
    const hash = new SpatialHash(10);
    hash.update([new Node(new Vec3(0, 0, 0))]);
    hash.clear();
    expect(hash.getNearby(new Vec3(0, 0, 0), 10)).toHaveLength(0);
  });
});
