import { describe, expect, it } from "vitest";
import {
  containsNormalizedPoint,
  mapNormalizedRect,
} from "./geometry";

describe("normalized geometry", () => {
  it("maps a local region into a parent area", () => {
    const mapped = mapNormalizedRect(
      { x: 0.1, y: 0.2, width: 0.8, height: 0.6 },
      { x: 0.25, y: 0.5, width: 0.5, height: 0.5 },
    );

    expect(mapped.x).toBeCloseTo(0.3);
    expect(mapped.y).toBeCloseTo(0.5);
    expect(mapped.width).toBeCloseTo(0.4);
    expect(mapped.height).toBeCloseTo(0.3);
  });

  it("tests normalized point containment", () => {
    const rect = { x: 0.2, y: 0.2, width: 0.2, height: 0.2 };

    expect(containsNormalizedPoint(rect, 0.3, 0.3)).toBe(true);
    expect(containsNormalizedPoint(rect, 0.5, 0.5)).toBe(false);
  });
});
