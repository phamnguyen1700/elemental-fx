import { describe, expect, it } from "vitest";

import { getFluidResolution } from "./fluid-simulation";

describe("fluid resolution", () => {
  it("preserves landscape aspect ratio", () => {
    expect(getFluidResolution(128, 1600, 900)).toEqual({ width: 228, height: 128 });
  });

  it("preserves portrait aspect ratio", () => {
    expect(getFluidResolution(128, 900, 1600)).toEqual({ width: 128, height: 228 });
  });

  it("guards zero-sized canvases", () => {
    expect(getFluidResolution(64, 0, 0)).toEqual({ width: 64, height: 64 });
  });
});
