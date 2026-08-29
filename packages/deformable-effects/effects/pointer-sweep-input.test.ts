import { describe, expect, it, vi } from "vitest";

import { bindPointerSweepInput } from "./pointer-sweep-input";

describe("pointer sweep input", () => {
  it("tracks wrapper movement while the render canvas remains non-interactive", () => {
    const wrapper = document.createElement("div");
    const canvas = document.createElement("canvas");
    const button = document.createElement("button");
    canvas.style.pointerEvents = "none";
    wrapper.append(canvas, button);
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      bottom: 150,
      height: 100,
      left: 100,
      right: 300,
      top: 50,
      width: 200,
      x: 100,
      y: 50,
      toJSON: () => ({})
    });

    const sweeps: Array<{ from: [number, number, number]; to: [number, number, number] }> = [];
    const remove = bindPointerSweepInput({
      canvas,
      eventTarget: wrapper,
      getBounds: () => ({ halfHeight: 50, halfWidth: 100, pointerPlane: 12 }),
      onSweep: (from, to) => {
        sweeps.push({ from: [from.x, from.y, from.z], to: [to.x, to.y, to.z] });
      }
    });
    wrapper.dispatchEvent(
      new MouseEvent("pointermove", { bubbles: true, clientX: 150, clientY: 100 })
    );
    wrapper.dispatchEvent(
      new MouseEvent("pointermove", { bubbles: true, clientX: 250, clientY: 125 })
    );

    let clicks = 0;
    button.addEventListener("click", () => clicks++);
    button.click();

    expect(canvas.style.pointerEvents).toBe("none");
    expect(sweeps).toEqual([{ from: [-50, 0, 12], to: [50, 25, 12] }]);
    expect(clicks).toBe(1);
    remove();
  });
});
