import { describe, expect, it } from "vitest";

import { Vec3 } from "../../core/math/vec3";
import {
  resolveVineLayout,
  resolveVineLayoutPathCounts,
  resolveVineLayoutRegionBounds,
} from "./vine-layout";

describe("vine layout adapter", () => {
  it("defaults to cover and preserves the generic full-area region", () => {
    const layout = resolveVineLayout(undefined, 0.85);

    expect(layout.spatial.mode).toBe("cover");
    expect(layout.spatial.variation).toBe(0.85);
    expect(layout.spatial.regions).toHaveLength(1);
    expect(layout.spatial.regions[0]).toMatchObject({
      role: "full",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });

  it("uses cover as the full-area vine layout", () => {
    const cover = resolveVineLayout("cover");

    expect(cover.spatial.mode).toBe("cover");
    expect(cover.spatial.regions).toHaveLength(1);

    expect(cover.spatial.regions[0]).toMatchObject({
      role: "full",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });

    expect(cover.pathCountScale).toBeGreaterThan(0);
    expect(cover.growthDensityScale).toBeGreaterThan(0);
    expect(cover.spacingScale).toBeGreaterThan(0);
  });

  it("resolves rectangular corner layout", () => {
    const layout = resolveVineLayout({
      mode: "corners",
      shape: "rect",
      thickness: 0.3,
    });

    expect(layout.spatial.mode).toBe("corners");
    expect(layout.cornerShape).toBe("rect");
  });

  it("resolves round corner layout", () => {
    const layout = resolveVineLayout({
      mode: "corners",
      shape: "round",
      thickness: 0.3,
    });

    expect(layout.spatial.mode).toBe("corners");
    expect(layout.cornerShape).toBe("round");
  });

  it("supports adjustable top height through generic thickness", () => {
    const layout = resolveVineLayout({
      mode: "top",
      thickness: 1 / 3,
    });

    const region = layout.spatial.regions[0]!;

    expect(region.role).toBe("top");
    expect(region.height).toBeCloseTo(1 / 3);

    const bounds = resolveVineLayoutRegionBounds(
      {
        min: new Vec3(-100, -50, -20),
        max: new Vec3(100, 50, 20),
      },
      region,
    );

    expect(bounds.min.y).toBeCloseTo(-50);
    expect(bounds.max.y).toBeCloseTo(-50 + 100 / 3);
  });

  it("keeps corners as four independent macro regions", () => {
    const layout = resolveVineLayout({
      mode: "corners",
      thickness: 0.3,
    });

    expect(layout.spatial.regions.map((region) => region.role)).toEqual([
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
    ]);
  });
});
