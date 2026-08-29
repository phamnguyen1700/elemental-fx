import { describe, expect, it } from "vitest";

import { AnchorConstraint, DistanceConstraint } from "../../constraints";
import { Vec3 } from "../../core/math/vec3";
import { GravityForce } from "../../forces";
import { DeformableEngine } from "./engine";
import { Node } from "./node";

describe("DeformableEngine", () => {
  it("keeps pinned nodes fixed while free nodes integrate", () => {
    const engine = new DeformableEngine({ fixedTimeStep: 1 / 60, iterations: 2, substeps: 2 });
    const pinned = engine.addNode(new Node(new Vec3(0, 0, 0), 1, true));
    const free = engine.addNode(new Node(new Vec3(0, 10, 0)));
    engine.addConstraint(new DistanceConstraint(pinned, free, 10));
    engine.addForce(new GravityForce(new Vec3(0, 60, 0)));

    engine.update(1 / 60);

    expect(pinned.position.y).toBe(0);
    expect(free.position.y).toBeGreaterThan(10);
    expect(free.position.distanceTo(pinned.position)).toBeCloseTo(10, 0);
  });

  it("uses a fixed-step accumulator deterministically", () => {
    const a = new DeformableEngine({ fixedTimeStep: 1 / 60, iterations: 1, substeps: 1 });
    const b = new DeformableEngine({ fixedTimeStep: 1 / 60, iterations: 1, substeps: 1 });
    const nodeA = a.addNode(new Node(new Vec3(0, 0, 0)));
    const nodeB = b.addNode(new Node(new Vec3(0, 0, 0)));
    a.addForce(new GravityForce(new Vec3(0, 60, 0)));
    b.addForce(new GravityForce(new Vec3(0, 60, 0)));

    a.update(1 / 30);
    b.update(1 / 60);
    b.update(1 / 60);

    expect(nodeA.position.y).toBeCloseTo(nodeB.position.y, 6);
  });

  it("can be cleared and disposed", () => {
    const engine = new DeformableEngine();
    const node = engine.addNode(new Node(new Vec3(0, 0, 0)));
    engine.addConstraint(new AnchorConstraint(node, new Vec3(1, 0, 0)));
    engine.clear();
    engine.dispose();
    engine.update(1);

    expect(engine.nodes).toHaveLength(0);
    expect(engine.disposed).toBe(true);
  });
});
