import { describe, expect, it } from "vitest";

import {
  AngularConstraint,
  AnchorConstraint,
  BendConstraint,
  DistanceConstraint,
  PathDirectionConstraint,
  SegmentAttachmentConstraint,
  PlaneConstraint
} from ".";
import { Vec3 } from "../core/math/vec3";
import { Node } from "../engines/constraint-graph";

describe("constraints", () => {
  it("anchors a node toward a target", () => {
    const node = new Node(new Vec3(0, 0, 0));
    new AnchorConstraint(node, new Vec3(10, 0, 0), 1).solve(1 / 60, 1);
    expect(node.position.x).toBe(10);
  });

  it("preserves distance between two free nodes", () => {
    const a = new Node(new Vec3(0, 0, 0));
    const b = new Node(new Vec3(20, 0, 0));
    new DistanceConstraint(a, b, 10, 1).solve(1 / 60, 1);
    expect(a.position.distanceTo(b.position)).toBeCloseTo(10);
  });

  it("preserves bend chord distance", () => {
    const a = new Node(new Vec3(0, 0, 0), 1, true);
    const c = new Node(new Vec3(20, 0, 0));
    new BendConstraint(a, c, 10, 1).solve(1 / 60, 1);
    expect(c.position.x).toBeCloseTo(10);
  });

  it("pulls a child toward its rest direction", () => {
    const a = new Node(new Vec3(0, 0, 0), 1, true);
    const b = new Node(new Vec3(0, 10, 0));
    b.position.set(10, 10, 0);
    new AngularConstraint(a, b, new Vec3(0, 1, 0), 10, 1).solve(1 / 60, 1);
    expect(b.position.x).toBeCloseTo(0);
    expect(b.position.y).toBeCloseTo(10);
  });

  it("projects nodes out of a plane", () => {
    const node = new Node(new Vec3(0, -5, 0));
    new PlaneConstraint(node, new Vec3(0, 1, 0), 0).solve();
    expect(node.position.y).toBe(0);
  });

  it("keeps a carrier attached to a moving segment", () => {
    const start = new Node(new Vec3(0, 0, 0));
    const end = new Node(new Vec3(10, 0, 0));
    const carrier = new Node(new Vec3(5, 0, 0));
    const constraint = new SegmentAttachmentConstraint(carrier, start, end, 0.5, 1);

    start.position.y = 4;
    end.position.y = 8;
    constraint.solve(1 / 60, 1);

    expect(carrier.position).toEqual(new Vec3(5, 6, 0));
  });

  it("rotates a child with the live path tangent", () => {
    const start = new Node(new Vec3(0, 0, 0));
    const end = new Node(new Vec3(10, 0, 0));
    const root = new Node(new Vec3(5, 0, 0));
    const child = new Node(new Vec3(5, 5, 0));
    const constraint = new PathDirectionConstraint(
      root,
      child,
      start,
      end,
      Math.PI / 2,
      5,
      1
    );

    end.position.set(0, 10, 0);
    constraint.solve(1 / 60, 1);

    expect(child.position.x).toBeCloseTo(0);
    expect(child.position.y).toBeCloseTo(0);
  });
});
