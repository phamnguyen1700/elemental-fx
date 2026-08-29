import { describe, expect, it } from "vitest";

import { resolveEffectArea } from "./area";

describe("resolveEffectArea", () => {
  it("resolves a full canvas area by default", () => {
    expect(resolveEffectArea()).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  });

  it("aligns partial regions horizontally and vertically", () => {
    expect(resolveEffectArea({ width: 0.4, alignX: "left" })).toEqual({
      x: 0,
      y: 0,
      width: 0.4,
      height: 1
    });
    expect(
      resolveEffectArea({ width: 0.35, height: 0.5, alignX: "right", alignY: "bottom" })
    ).toEqual({ x: 0.65, y: 0.5, width: 0.35, height: 0.5 });
    expect(resolveEffectArea({ width: 0.5, height: 0.8 })).toEqual({
      x: 0.25,
      y: 0.1,
      width: 0.5,
      height: 0.8
    });
  });

  it("keeps malformed ratios inside normalized bounds", () => {
    expect(resolveEffectArea({ width: 2, height: -1 })).toEqual({
      x: 0,
      y: 0.495,
      width: 1,
      height: 0.01
    });
  });
});
