import { describe, expect, it } from "vitest";
import { allocateWeightedCounts } from "./allocation";

describe("allocateWeightedCounts", () => {
  it("preserves the total budget", () => {
    const counts = allocateWeightedCounts(20, [1.2, 0.9, 1, 1]);
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(20);
  });

  it("prioritizes heavier items when budget is smaller than item count", () => {
    expect(allocateWeightedCounts(2, [1, 4, 3, 2])).toEqual([
      0,
      1,
      1,
      0,
    ]);
  });

  it("ignores invalid and non-positive weights", () => {
    expect(allocateWeightedCounts(5, [1, 0, -2, Number.NaN])).toEqual([
      5,
      0,
      0,
      0,
    ]);
  });
});
