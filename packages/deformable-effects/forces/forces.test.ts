import { describe, expect, it } from "vitest";

import { SpatialHash } from "../core/spatial";
import { Vec3 } from "../core/math/vec3";
import { Node } from "../engines/constraint-graph";
import { AttractorForce, FlowFieldForce, GravityForce, PointerSweepForce, WindForce } from ".";

describe("forces", () => {
  it("applies configurable gravity", () => {
    const node = new Node(new Vec3(0, 0, 0));
    new GravityForce(new Vec3(0, 10, 0)).apply([node], 0.5);
    expect(node.position.y).toBe(5);
  });

  it("samples deterministic wind", () => {
    const windA = new WindForce({ seed: 3, strength: 2 });
    const windB = new WindForce({ seed: 3, strength: 2 });
    expect(windA.sample(new Vec3(1, 2, 3), 0.25)).toEqual(windB.sample(new Vec3(1, 2, 3), 0.25));
  });

  it("applies arbitrary flow fields", () => {
    const node = new Node(new Vec3(0, 0, 0));
    new FlowFieldForce(() => new Vec3(4, 0, 0)).apply([node], 0.5, 0);
    expect(node.position.x).toBe(2);
  });

  it("supports attractors and repulsors", () => {
    const attracted = new Node(new Vec3(10, 0, 0));
    const repelled = new Node(new Vec3(10, 0, 0));
    new AttractorForce(new Vec3(0, 0, 0), 20, 10).apply([attracted], 0.1, 0);
    new AttractorForce(new Vec3(0, 0, 0), 20, -10).apply([repelled], 0.1, 0);
    expect(attracted.position.x).toBeLessThan(10);
    expect(repelled.position.x).toBeGreaterThan(10);
  });

  it("uses a swept pointer capsule and spatial broad phase", () => {
    const hit = new Node(new Vec3(5, 2, 0));
    const miss = new Node(new Vec3(100, 0, 0));
    const hash = new SpatialHash(10);
    hash.update([hit, miss]);
    const sweep = new PointerSweepForce({ radius: 8, strength: 10, velocityScale: 1 });
    sweep.updatePointer(new Vec3(0, 0, 0), true);
    sweep.updatePointer(new Vec3(10, 0, 0), true);
    sweep.apply([hit, miss], 0.1, 0, { spatial: hash });

    expect(hit.position.y).toBeGreaterThan(2);
    expect(hit.position.x).toBeGreaterThan(5);
    expect(miss.position.x).toBe(100);
  });
});
