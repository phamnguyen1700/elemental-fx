import { describe, expect, it } from "vitest";

import { createGranularField, type GranularFieldState } from "./granular-field";

function sum(values: Float32Array): number {
  return values.reduce((total, value) => total + value, 0);
}

function distanceFromRest(state: GranularFieldState): number {
  let distance = 0;
  for (let index = 0; index < state.heights.length; index += 1) {
    distance += Math.abs((state.heights[index] ?? 0) - (state.restHeights[index] ?? 0));
  }
  return distance;
}

function maxSlope(state: GranularFieldState): number {
  let steepest = 0;

  for (let row = 0; row < state.rows; row += 1) {
    for (let column = 0; column < state.columns; column += 1) {
      const index = row * state.columns + column;
      if (column + 1 < state.columns) {
        steepest = Math.max(
          steepest,
          Math.abs((state.heights[index] ?? 0) - (state.heights[index + 1] ?? 0))
        );
      }
      if (row + 1 < state.rows) {
        steepest = Math.max(
          steepest,
          Math.abs((state.heights[index] ?? 0) - (state.heights[index + state.columns] ?? 0))
        );
      }
    }
  }

  return steepest;
}

describe("granular-field", () => {
  it("starts as a centered dune height field", () => {
    const field = createGranularField({ columns: 48, rows: 36, duneHeight: 8 });
    const { heights } = field.getState();

    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(4);
    expect(Math.abs(sum(heights) / heights.length)).toBeLessThan(0.01);
  });

  it("carves a broad trench and deposits raised sand", () => {
    const field = createGranularField({
      columns: 36,
      rows: 24,
      duneHeight: 0,
      maxDepth: 100,
      maxHeight: 100
    });

    field.applyStroke(5, 12, 30, 12, 5, 1.4);
    const { heights } = field.getState();
    const affected = Array.from(heights).filter((height) => Math.abs(height) > 0.05);

    expect(Math.min(...heights)).toBeLessThan(-0.5);
    expect(Math.max(...heights)).toBeGreaterThan(0.25);
    expect(affected.length).toBeGreaterThan(100);
  });

  it("conserves displaced material away from field boundaries", () => {
    const field = createGranularField({
      columns: 48,
      rows: 32,
      duneHeight: 0,
      maxDepth: 100,
      maxHeight: 100
    });
    const before = sum(field.getState().heights);

    field.applyStroke(10, 16, 37, 16, 5, 1.2);
    const after = sum(field.getState().heights);

    expect(Math.abs(after - before)).toBeLessThan(0.01);
  });

  it("relaxes slopes above the angle of repose", () => {
    const field = createGranularField({
      columns: 24,
      rows: 24,
      duneHeight: 0,
      recovery: 0,
      spread: 0.2,
      angleOfRepose: 0.5,
      maxDepth: 100,
      maxHeight: 100
    });

    field.applyDepression(12, 12, 4, 8);
    const before = maxSlope(field.getState());
    for (let frame = 0; frame < 20; frame += 1) field.step(1 / 60);
    const after = maxSlope(field.getState());

    expect(after).toBeLessThan(before);
  });

  it("slowly restores the authored dune profile", () => {
    const field = createGranularField({
      columns: 24,
      rows: 24,
      recovery: 0.1,
      spread: 0,
      maxDepth: 100,
      maxHeight: 100
    });

    field.applyDepression(12, 12, 4, 4);
    const before = distanceFromRest(field.getState());
    field.step(1 / 60);
    const after = distanceFromRest(field.getState());

    expect(after).toBeLessThan(before);
  });

  it("resizes and regenerates all height data", () => {
    const field = createGranularField({ columns: 4, rows: 5 });

    field.applyDepression(2, 2, 2, 2);
    field.resize(7, 9);
    const state = field.getState();

    expect(state.columns).toBe(7);
    expect(state.rows).toBe(9);
    expect(state.heights).toHaveLength(63);
    expect(state.restHeights).toHaveLength(63);
    expect(Array.from(state.heights)).toEqual(Array.from(state.restHeights));
  });
});
