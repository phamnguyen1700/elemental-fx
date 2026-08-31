import { describe, expect, it } from "vitest";
import { resolveEffectArea } from "./area";

describe("resolveEffectArea", () => {
  it("defaults to the full normalized plane", () => {
    expect(resolveEffectArea()).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });

  it("aligns a partial area in the center", () => {
    expect(
      resolveEffectArea({
        width: 0.8,
        height: 0.6,
        alignX: "center",
        alignY: "center",
      }),
    ).toEqual({
      x: 0.1,
      y: 0.2,
      width: 0.8,
      height: 0.6,
    });
  });

  it("supports edge alignment", () => {
    expect(
      resolveEffectArea({
        width: 0.4,
        height: 0.3,
        alignX: "right",
        alignY: "bottom",
      }),
    ).toEqual({
      x: 0.6,
      y: 0.7,
      width: 0.4,
      height: 0.3,
    });
  });
});
