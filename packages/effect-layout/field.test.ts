import { describe, expect, it } from "vitest";

import {
  getEffectLayoutWeight,
  getPlacedEffectLayoutWeight,
} from "./field";
import {
  resolveEffectLayout,
  resolveEffectLayoutInArea,
} from "./resolve";

describe("effect layout spatial field", () => {
  it("keeps cover and fill active across the full area", () => {
    const cover = resolveEffectLayout("cover");
    const fill = resolveEffectLayout("fill");

    expect(getEffectLayoutWeight(cover, 0.5, 0.5)).toBe(1);
    expect(getEffectLayoutWeight(fill, 0.5, 0.5)).toBe(1);
  });

  it("turns corners into radial fields instead of boxes", () => {
    const layout = resolveEffectLayout({
      mode: "corners",
      thickness: 0.3,
      feather: 0.08,
    });

    expect(getEffectLayoutWeight(layout, 0, 0)).toBe(1);
    expect(getEffectLayoutWeight(layout, 1, 0)).toBe(1);
    expect(getEffectLayoutWeight(layout, 0, 1)).toBe(1);
    expect(getEffectLayoutWeight(layout, 1, 1)).toBe(1);

    expect(getEffectLayoutWeight(layout, 0.27, 0.27)).toBe(0);
    expect(getEffectLayoutWeight(layout, 0.5, 0.5)).toBe(0);
  });

  it("keeps a rounded safe area inside frame mode", () => {
    const layout = resolveEffectLayout({
      mode: "frame",
      thickness: 0.2,
      cornerRadius: 0.16,
      feather: 0.05,
    });

    expect(getEffectLayoutWeight(layout, 0.5, 0)).toBe(1);
    expect(getEffectLayoutWeight(layout, 0, 0.5)).toBe(1);
    expect(getEffectLayoutWeight(layout, 0.5, 0.5)).toBe(0);
    expect(getEffectLayoutWeight(layout, 0.23, 0.23)).toBeGreaterThan(0);
  });

  it("feathers the inner edge of top mode", () => {
    const layout = resolveEffectLayout({
      mode: "top",
      thickness: 0.3,
      feather: 0.1,
    });

    expect(getEffectLayoutWeight(layout, 0.5, 0)).toBe(1);
    expect(getEffectLayoutWeight(layout, 0.5, 0.15)).toBe(1);

    const transition = getEffectLayoutWeight(layout, 0.5, 0.25);

    expect(transition).toBeGreaterThan(0);
    expect(transition).toBeLessThan(1);

    expect(getEffectLayoutWeight(layout, 0.5, 0.31)).toBe(0);
  });

  it("maps placed layouts into local field space", () => {
    const layout = resolveEffectLayoutInArea(
      {
        mode: "corners",
        thickness: 0.3,
      },
      {
        width: 0.8,
        height: 0.6,
        alignX: "center",
        alignY: "center",
      },
    );

    expect(getPlacedEffectLayoutWeight(layout, 0.1, 0.2)).toBe(1);
    expect(getPlacedEffectLayoutWeight(layout, 0.5, 0.5)).toBe(0);
    expect(getPlacedEffectLayoutWeight(layout, 0.02, 0.5)).toBe(0);
  });
});
