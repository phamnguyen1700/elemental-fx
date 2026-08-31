import { describe, expect, it } from "vitest";

import { PointerSweepForce, WindForce } from "../../forces";
import { createFoliageComposition } from "./composition";

const asset = (handle: string) => ({ handle });

describe("vine composition", () => {
  it("composes network paths, growth carriers, branches, and generic forces", () => {
    const composition = createFoliageComposition(
      {
        assets: { branches: [asset("branch-a")] },
        density: 0.35,
        quality: "low",
        seed: 14,
      },
      1.4,
      1,
    );

    expect(composition.topology.metadata?.mode).toBe("paths");
    expect(composition.topology.metadata?.vineGrowth).toBe(true);
    expect(composition.vine.mainPaths.length).toBeGreaterThan(0);
    expect(composition.vine.growthNodes.length).toBeGreaterThan(0);
    expect(composition.vine.branches.length).toBeGreaterThan(0);
    expect(composition.pointerSweep).toBeInstanceOf(PointerSweepForce);
    expect(composition.wind).toBeNull();
    expect(composition.gravity).toBeNull();
    expect(composition.scene.engine.nodes).toHaveLength(
      composition.topology.nodes.length,
    );
    composition.destroy();
    expect(composition.scene.destroyed).toBe(true);
  });

  it("maps full and partial areas directly into main-vine bounds", () => {
    const full = createFoliageComposition(
      {
        assets: { branches: [asset("branch-a")] },
        density: 0.2,
        quality: "low",
      },
      1,
      1,
    );
    const partial = createFoliageComposition(
      {
        area: { alignX: "right", alignY: "bottom", height: 0.5, width: 0.4 },
        assets: { branches: [asset("branch-a")] },
        density: 0.2,
        quality: "low",
      },
      1,
      1,
    );

    expect(full.networkBounds.min.x).toBeCloseTo(-96);
    expect(full.networkBounds.max.x).toBeCloseTo(96);
    expect(partial.area).toEqual({ height: 0.5, width: 0.4, x: 0.6, y: 0.5 });
    expect(
      partial.vine.mainPaths
        .flat()
        .every(
          (node) =>
            node.restPosition.x >= partial.networkBounds.min.x &&
            node.restPosition.x <= partial.networkBounds.max.x &&
            node.restPosition.y >= partial.networkBounds.min.y &&
            node.restPosition.y <= partial.networkBounds.max.y,
        ),
    ).toBe(true);
    full.destroy();
    partial.destroy();
  });

  it("uses one density control for macro paths and local biological growth", () => {
    const common = {
      assets: { branches: [asset("branch-a")] },
      quality: "high" as const,
      seed: 22,
    };
    const sparse = createFoliageComposition(
      { ...common, density: 0.45 },
      1.3,
      1,
    );
    const dense = createFoliageComposition({ ...common, density: 1.6 }, 1.3, 1);

    expect(dense.vine.mainPaths.length).toBeGreaterThan(
      sparse.vine.mainPaths.length,
    );
    expect(dense.vine.growthNodes.length).toBeGreaterThan(
      sparse.vine.growthNodes.length,
    );
    expect(dense.vine.branches.length).toBeGreaterThan(
      sparse.vine.branches.length,
    );
    sparse.destroy();
    dense.destroy();
  });

  it("maps branch size and optional wind without changing path semantics", () => {
    const common = {
      assets: { branches: [asset("branch-a")] },
      density: 0.35,
      growth: { branchProbability: 1 },
      quality: "low" as const,
      seed: 31,
    };
    const defaultSize = createFoliageComposition(common, 1, 1);
    const smaller = createFoliageComposition(
      {
        ...common,
        size: { branch: 0.5, flower: 0.6, leaf: 0.7 },
        wind: { strength: 0.3 },
      },
      1,
      1,
    );
    const defaultBranch = defaultSize.distribution.instances.find(
      (instance) => instance.kind === "branch",
    );
    const smallerBranch = smaller.distribution.instances.find(
      (instance) => instance.kind === "branch",
    );

    expect(smallerBranch?.crossScale).toBeLessThan(
      defaultBranch?.crossScale ?? 0,
    );
    expect(smaller.wind).toBeInstanceOf(WindForce);
    expect(smaller.vine.mainPaths).toHaveLength(
      defaultSize.vine.mainPaths.length,
    );
    defaultSize.destroy();
    smaller.destroy();
  });

  it("allows an exact one-vine diagnostic through the advanced network override", () => {
    const composition = createFoliageComposition(
      {
        assets: { branches: [asset("branch-a")] },
        density: 1,
        network: { pathCount: 1 },
        quality: "high",
      },
      2,
      1,
    );

    expect(composition.vine.mainPaths).toHaveLength(1);
    expect(composition.vine.growthNodes.length).toBeGreaterThan(3);
    composition.destroy();
  });

  it("creates four independent corner regions", () => {
    const composition = createFoliageComposition(
      {
        assets: {
          branches: [asset("branch-a")],
        },
        density: 1,
        layout: {
          mode: "corners",
          thickness: 0.3,
        },
        network: {
          pathCount: 20,
        },
        quality: "high",
        seed: 91,
      },
      1,
      1,
    );

    expect(
      composition.layout.spatial.regions.map((region) => region.role),
    ).toEqual(["top-left", "top-right", "bottom-left", "bottom-right"]);

    composition.destroy();
  });

  it("supports adjustable top height", () => {
    const composition = createFoliageComposition(
      {
        assets: {
          branches: [asset("branch-a")],
        },
        layout: {
          mode: "top",
          thickness: 1 / 3,
        },
        quality: "low",
      },
      1,
      1,
    );

    expect(composition.layout.spatial.regions[0]?.height).toBeCloseTo(1 / 3);

    composition.destroy();
  });
});
