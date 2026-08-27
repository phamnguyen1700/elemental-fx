import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { assertInsideProject, resolveOutputFile } from "./path";

describe("output paths", () => {
  it("defaults to src/components/effects when src exists", () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "elemental-fx-"));
    mkdirSync(path.join(cwd, "src"));

    try {
      expect(resolveOutputFile(cwd, undefined, "water-surface.tsx")).toBe(
        path.join(cwd, "src", "components", "effects", "water-surface.tsx")
      );
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("refuses output outside the project", () => {
    const cwd = path.join(tmpdir(), "elemental-fx-project");
    const outside = path.join(tmpdir(), "water-surface.tsx");

    expect(() => assertInsideProject(cwd, outside)).toThrow("outside the project");
  });
});
