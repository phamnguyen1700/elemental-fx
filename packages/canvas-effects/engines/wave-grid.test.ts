import { describe, expect, it } from "vitest";

import { createWaveGrid } from "./wave-grid";

describe("wave-grid", () => {
  it("spreads a local impulse to neighbouring cells", () => {
    const grid = createWaveGrid({ columns: 9, rows: 9, damping: 0.98, spread: 0.2 });
    grid.applyImpulse(4, 4, 0.5, 8);
    grid.step(1 / 30);

    const { heights, columns } = grid.getState();
    expect(heights[4 * columns + 4]).not.toBe(0);
    expect(heights[4 * columns + 5]).not.toBe(0);
  });

  it("returns toward rest as energy is damped", () => {
    const grid = createWaveGrid({
      columns: 7,
      rows: 7,
      damping: 0.9,
      tension: 0.04,
      spread: 0.14
    });
    grid.applyImpulse(3, 3, 1, 5);
    grid.step(1 / 60);
    const initialEnergy = grid
      .getState()
      .heights.reduce((sum, height) => sum + Math.abs(height), 0);

    for (let frame = 0; frame < 600; frame += 1) grid.step(1 / 60);

    const finalEnergy = grid.getState().heights.reduce((sum, height) => sum + Math.abs(height), 0);
    expect(finalEnergy).toBeLessThan(initialEnergy * 0.02);
  });

  it("reinitializes state when its dimensions change", () => {
    const grid = createWaveGrid({ columns: 4, rows: 4 });
    grid.applyImpulse(2, 2, 1, 4);
    grid.resize(6, 5);

    const state = grid.getState();
    expect(state.columns).toBe(6);
    expect(state.rows).toBe(5);
    expect(state.heights).toHaveLength(30);
    expect(state.heights.every((value) => value === 0)).toBe(true);
  });
});
