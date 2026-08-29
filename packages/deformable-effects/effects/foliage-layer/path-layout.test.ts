import { describe, expect, it } from "vitest";

import { Vec3 } from "../../core/math/vec3";
import { createFoliagePathEndpoints } from "./path-layout";

const BOUNDS = {
  min: new Vec3(-120, -70, -30),
  max: new Vec3(120, 70, 30)
};

describe("foliage path layout", () => {
  it("is deterministic and keeps endpoints inside the requested bounds", () => {
    const context = { bounds: BOUNDS, pathCount: 24, pathIndex: 11 };
    const options = { seed: 5000, variation: 0.85 };
    const first = createFoliagePathEndpoints(context, options);
    const second = createFoliagePathEndpoints(context, options);

    expect(first).toEqual(second);
    for (const point of [first.start, first.end]) {
      expect(point.x).toBeGreaterThanOrEqual(BOUNDS.min.x);
      expect(point.x).toBeLessThanOrEqual(BOUNDS.max.x);
      expect(point.y).toBeGreaterThanOrEqual(BOUNDS.min.y);
      expect(point.y).toBeLessThanOrEqual(BOUNDS.max.y);
      expect(point.z).toBeGreaterThanOrEqual(BOUNDS.min.z);
      expect(point.z).toBeLessThanOrEqual(BOUNDS.max.z);
    }
  });

  it("mixes vertical, diagonal, and horizontal path families", () => {
    const directions = Array.from({ length: 20 }, (_, pathIndex) => {
      const { start, end } = createFoliagePathEndpoints(
        { bounds: BOUNDS, pathCount: 20, pathIndex },
        { seed: 5000, variation: 0.85 }
      );
      const dx = Math.abs(end.x - start.x) / (BOUNDS.max.x - BOUNDS.min.x);
      const dy = Math.abs(end.y - start.y) / (BOUNDS.max.y - BOUNDS.min.y);
      return dx > dy * 1.5 ? "horizontal" : dy > dx * 1.5 ? "vertical" : "diagonal";
    });

    expect(directions).toContain("horizontal");
    expect(directions).toContain("vertical");
    expect(directions).toContain("diagonal");
  });
});
