import { describe, expect, it } from "vitest";

import { Vec3 } from "../core/math/vec3";
import { buildPoints } from "./points";

describe("points topology", () => {
  it("creates independent nodes without fake edges or constraints", () => {
    const result = buildPoints({ count: 24 });
    expect(result.nodes).toHaveLength(24);
    expect(result.edges).toEqual([]);
    expect(result.constraints).toEqual([]);
    expect(result.metadata?.topology).toBe("points");
  });

  it("is deterministic and keeps every node inside its bounds", () => {
    const config = {
      bounds: { min: new Vec3(-20, -10, -4), max: new Vec3(40, 30, 8) },
      count: 30,
      seed: 42,
      variation: 0.8
    };
    const first = buildPoints(config);
    const second = buildPoints(config);
    expect(first.nodes.map((node) => node.position)).toEqual(
      second.nodes.map((node) => node.position)
    );
    for (const node of first.nodes) {
      expect(node.position.x).toBeGreaterThanOrEqual(-20);
      expect(node.position.x).toBeLessThanOrEqual(40);
      expect(node.position.y).toBeGreaterThanOrEqual(-10);
      expect(node.position.y).toBeLessThanOrEqual(30);
      expect(node.position.z).toBeGreaterThanOrEqual(-4);
      expect(node.position.z).toBeLessThanOrEqual(8);
    }
  });

  it("supports uniform layouts, seeded variation, and optional pins", () => {
    const uniform = buildPoints({
      count: 16,
      distribution: "grid",
      seed: 1,
      variation: 0,
      pinned: [0, 5]
    });
    const uniformOtherSeed = buildPoints({
      count: 16,
      distribution: "grid",
      seed: 99,
      variation: 0,
      pinned: [0, 5]
    });
    const organic = buildPoints({
      count: 16,
      distribution: "grid",
      seed: 1,
      variation: 1
    });

    expect(uniform.nodes.map((node) => node.position)).toEqual(
      uniformOtherSeed.nodes.map((node) => node.position)
    );
    expect(organic.nodes.map((node) => node.position)).not.toEqual(
      uniform.nodes.map((node) => node.position)
    );
    expect(uniform.nodes.filter((node) => node.isPinned).map((node) => node.id)).toHaveLength(2);
  });
});
