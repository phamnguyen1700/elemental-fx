import { describe, expect, it } from "vitest";

import { Vec3 } from "../../core/math/vec3";
import { bougainvilleaPreset, createBougainvilleaPreset } from "./bougainvillea";

describe("bougainvillea vine preset", () => {
  it("uses pointer-driven paths with local level-one growth", () => {
    expect(bougainvilleaPreset.network.mode).toBe("paths");
    expect(bougainvilleaPreset.network.pathCount).toBeGreaterThan(10);
    expect(bougainvilleaPreset.network.anchorStrategy).toBe("distributed");
    expect(bougainvilleaPreset.growth.spacing).toBeGreaterThan(10);
    expect(bougainvilleaPreset.growth.branchNodeCount[0]).toBeGreaterThanOrEqual(2);
    expect(bougainvilleaPreset.growth.branchNodeCount[1]).toBeLessThanOrEqual(5);
    expect(bougainvilleaPreset.growth.branchProbability).toBeGreaterThan(0.5);
    expect(bougainvilleaPreset.growth.flowerProbability).toBeGreaterThan(0);
    expect(bougainvilleaPreset.interaction.velocityScale).toBeGreaterThan(1);
    expect(bougainvilleaPreset.wind).toBeNull();
    expect(bougainvilleaPreset.gravity).toBeNull();
    expect(bougainvilleaPreset.render.idleFlutter).toBe(0);
  });

  it("merges nested growth overrides without mutating the shared preset", () => {
    const resolved = createBougainvilleaPreset({
      growth: { branchProbability: 0.4, spacing: 36 },
      interaction: { strength: 19 },
      network: { bendStiffness: 0.04, preferredDirection: new Vec3(1, -1, 0) },
      wind: { direction: new Vec3(-1, 0, 0), strength: 0.4 }
    });

    expect(resolved.interaction.strength).toBe(19);
    expect(resolved.network.bendStiffness).toBe(0.04);
    expect(resolved.network.preferredDirection).not.toBe(
      bougainvilleaPreset.network.preferredDirection
    );
    expect(resolved.growth.spacing).toBe(36);
    expect(resolved.growth.branchProbability).toBe(0.4);
    expect(resolved.wind?.direction?.x).toBe(-1);
    expect(bougainvilleaPreset.growth.spacing).toBe(29);
  });
});
