import { describe, expect, it } from "vitest";

import { resolveQualityBudget } from "./quality";

describe("resolveQualityBudget", () => {
  it("resolves all quality modes to real budgets", () => {
    expect(resolveQualityBudget("high").iterations).toBeGreaterThan(
      resolveQualityBudget("low").iterations
    );
    expect(resolveQualityBudget("medium").dprCap).toBeGreaterThan(1);
    expect(resolveQualityBudget("auto", 2).quality).toBe("medium");
  });
});
