import { describe, it, expect } from "vitest";
import { Vec3 } from "./vec3";

describe("Vec3", () => {
  it("initializes to zero by default", () => {
    const v = new Vec3();
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
    expect(v.z).toBe(0);
  });

  it("adds vectors", () => {
    const v1 = new Vec3(1, 2, 3);
    const v2 = new Vec3(4, 5, 6);
    v1.add(v2);
    expect(v1.x).toBe(5);
    expect(v1.y).toBe(7);
    expect(v1.z).toBe(9);
  });

  it("calculates length", () => {
    const v = new Vec3(0, 3, 4);
    expect(v.length()).toBe(5);
  });
});
