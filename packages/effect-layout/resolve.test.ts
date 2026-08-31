import { describe, expect, it } from "vitest";
import { containsNormalizedPoint } from "./geometry";
import {
  resolveEffectLayout,
  resolveEffectLayoutInArea,
} from "./resolve";

describe("resolveEffectLayout", () => {
  it("defaults to cover", () => {
    const layout = resolveEffectLayout(undefined, 0.8);

    expect(layout.mode).toBe("cover");
    expect(layout.variation).toBe(0.8);
    expect(layout.regions).toHaveLength(1);
    expect(layout.regions[0]).toMatchObject({
      id: "cover",
      role: "full",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });

  it("preserves fill as a semantic full-area mode", () => {
    const layout = resolveEffectLayout({
      mode: "fill",
      coverage: 1.4,
    });

    expect(layout.mode).toBe("fill");
    expect(layout.coverage).toBe(1.4);
    expect(layout.regions[0]?.role).toBe("full");
  });

  it("keeps the center free in frame mode", () => {
    const layout = resolveEffectLayout("frame");
    const centerCovered = layout.regions.some((region) =>
      containsNormalizedPoint(region, 0.5, 0.5),
    );

    expect(centerCovered).toBe(false);
    expect(layout.regions.map((region) => region.role)).toEqual([
      "top",
      "bottom",
      "left",
      "right",
    ]);
  });

  it("creates left and right side regions", () => {
    expect(resolveEffectLayout("sides").regions.map((region) => region.role)).toEqual([
      "left",
      "right",
    ]);
  });

  it("creates four independent corner regions", () => {
    expect(resolveEffectLayout("corners").regions.map((region) => region.role)).toEqual([
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
    ]);
  });

  it("provides generic top and bottom presets", () => {
    expect(resolveEffectLayout("top").regions[0]?.role).toBe("top");
    expect(resolveEffectLayout("bottom").regions[0]?.role).toBe("bottom");
  });

  it("maps layout regions into an outer effect area", () => {
    const placed = resolveEffectLayoutInArea(
      "sides",
      {
        width: 0.8,
        height: 0.6,
        alignX: "center",
        alignY: "center",
      },
    );

    expect(placed.area).toEqual({
      x: 0.1,
      y: 0.2,
      width: 0.8,
      height: 0.6,
    });

    expect(placed.regions[0]).toMatchObject({
      role: "left",
      x: 0.1,
      y: 0.2,
      height: 0.6,
    });
    expect(placed.regions[1]?.x).toBeGreaterThan(0.7);
  });
});
