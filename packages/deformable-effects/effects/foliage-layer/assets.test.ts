import { describe, expect, it } from "vitest";

import type { VineAssets } from "./types";
import { listVineResources, resolveVineAssets } from "./assets";

const asset = (handle: string) => ({ handle });

describe("vine assets", () => {
  it("requires branches while keeping flower and leaf pools optional", () => {
    const minimal = resolveVineAssets({ branches: [asset("branch-a")] });

    expect(minimal.branches.size).toBe(1);
    expect(minimal.flowers.size).toBe(0);
    expect(minimal.leaves.size).toBe(0);
    expect(() => resolveVineAssets({ branches: [] })).toThrow(/branches/i);
  });

  it("accepts baseFoliage only as a compatibility alias", () => {
    const resolved = resolveVineAssets({ baseFoliage: [asset("legacy-a")] });
    expect(resolved.branches.at(0)?.handle).toBe("legacy-a");
  });

  it.each([
    ["one branch", { branches: [asset("branch-a")] }, [1, 0, 0]],
    [
      "branch and flowers",
      { branches: [asset("branch-a")], flowers: [asset("flower-a")] },
      [1, 1, 0]
    ],
    [
      "multiple branches",
      {
        branches: [asset("branch-a"), asset("branch-b"), asset("branch-c")]
      },
      [3, 0, 0]
    ],
    [
      "complete pools",
      {
        branches: [asset("branch-a"), asset("branch-b")],
        flowers: [asset("flower-a")],
        leaves: [asset("leaf-a"), asset("leaf-b")]
      },
      [2, 1, 2]
    ]
  ])("resolves %s", (_label, input, expected) => {
    const resolved = resolveVineAssets(input satisfies VineAssets);
    expect([resolved.branches.size, resolved.flowers.size, resolved.leaves.size]).toEqual(
      expected
    );
  });

  it("preserves weighted selection and arbitrary resource counts", () => {
    const shared = asset("branch-a");
    const resolved = resolveVineAssets({
      branches: [
        { resource: shared, weight: 4 },
        ...Array.from({ length: 19 }, (_, index) => asset(`branch-${index + 1}`))
      ]
    });

    expect(resolved.branches.size).toBe(20);
    expect(resolved.branches.pick(0.01)).toBe(shared);
  });

  it("lists each concrete resource once", () => {
    const shared = asset("shared");
    const resolved = resolveVineAssets({
      branches: [shared],
      flowers: [shared, asset("flower-a")],
      leaves: [asset("leaf-a")]
    });

    expect(listVineResources(resolved).map((resource) => resource.handle)).toEqual([
      "shared",
      "flower-a",
      "leaf-a"
    ]);
  });
});
