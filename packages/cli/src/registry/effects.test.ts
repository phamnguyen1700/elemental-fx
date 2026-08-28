import { describe, expect, it } from "vitest";

import { ELEMENTAL_FX_VERSION } from "../version";
import { getEffectDefinition } from "./effects";

describe("effect registry", () => {
  it("returns water-surface metadata", () => {
    const effect = getEffectDefinition("water-surface");

    expect(effect.fileName).toBe("water-surface.tsx");
    expect(effect.dependencies).toEqual([`@elemental-fx/canvas-effects@${ELEMENTAL_FX_VERSION}`]);
    expect(effect.template()).toContain("createWaterSurfaceEffect");
  });

  it("returns ink-cursor metadata", () => {
    const effect = getEffectDefinition("ink-cursor");

    expect(effect.fileName).toBe("ink-cursor.tsx");
    expect(effect.dependencies).toEqual([`@elemental-fx/fluid-effects@${ELEMENTAL_FX_VERSION}`]);
    expect(effect.template()).toContain("createInkCursorEffect");
  });

  it("returns sand-surface metadata", () => {
    const effect = getEffectDefinition("sand-surface");

    expect(effect.fileName).toBe("sand-surface.tsx");
    expect(effect.dependencies).toEqual([`@elemental-fx/canvas-effects@${ELEMENTAL_FX_VERSION}`]);
    expect(effect.template()).toContain("createSandSurfaceEffect");
  });
});
