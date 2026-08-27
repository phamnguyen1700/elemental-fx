import { describe, expect, it } from "vitest";

import { parseCssColor, resolveCssColor } from "./color";

describe("canvas color utilities", () => {
  it("resolves CSS variables with a fallback", () => {
    const element = document.createElement("div");
    element.style.setProperty("--test-color", "210 50% 40%");
    document.body.append(element);

    expect(resolveCssColor(element, "hsl(var(--test-color) / 0.5)", "black")).toBe(
      "hsl(210 50% 40% / 0.5)"
    );
    element.remove();
  });

  it("parses HSL component colors into RGBA", () => {
    const color = parseCssColor("hsl(0 0% 50% / 0.25)", { r: 0, g: 0, b: 0, a: 1 });
    expect(color.r).toBeCloseTo(127.5);
    expect(color.g).toBeCloseTo(127.5);
    expect(color.b).toBeCloseTo(127.5);
    expect(color.a).toBe(0.25);
  });
});
