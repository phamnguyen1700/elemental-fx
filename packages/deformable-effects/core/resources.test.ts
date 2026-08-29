import { describe, expect, it } from "vitest";

import { ResourceSet } from "./resources";
import type { VisualResource } from "./resources";

describe("ResourceSet", () => {
  it("supports empty optional collections", () => {
    expect(new ResourceSet<VisualResource>().pick(0.5)).toBeUndefined();
  });

  it("supports one and several resources", () => {
    const one = new ResourceSet([{ handle: "cable" }]);
    const many = new ResourceSet([{ handle: "a" }, { handle: "b" }, { handle: "c" }]);
    expect(one.pick(0.9)?.handle).toBe("cable");
    expect(many.at(2)?.handle).toBe("c");
  });

  it("selects by deterministic weighted sample", () => {
    const set = new ResourceSet([
      { resource: { handle: "rare" }, weight: 1 },
      { resource: { handle: "common" }, weight: 9 }
    ]);
    expect(set.pick(0.05)?.handle).toBe("rare");
    expect(set.pick(0.5)?.handle).toBe("common");
  });
});
