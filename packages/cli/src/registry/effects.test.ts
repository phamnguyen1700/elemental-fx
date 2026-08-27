import { describe, expect, it } from "vitest";

import { getEffectDefinition } from "./effects";

describe("effect registry", () => {
  it("returns water-surface metadata", () => {
    const effect = getEffectDefinition("water-surface");

    expect(effect.fileName).toBe("water-surface.tsx");
    expect(effect.dependencies).toEqual(["@elemental-fx/canvas-effects"]);
    expect(effect.template()).toContain("createWaterSurfaceEffect");
  });

  it("returns ink-cursor metadata", () => {
    const effect = getEffectDefinition("ink-cursor");

    expect(effect.fileName).toBe("ink-cursor.tsx");
    expect(effect.dependencies).toEqual(["@elemental-fx/fluid-effects"]);
    expect(effect.template()).toContain("createInkCursorEffect");
  });
});
