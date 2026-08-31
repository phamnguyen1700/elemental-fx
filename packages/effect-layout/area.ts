import type {
  EffectArea,
  EffectAreaAlignX,
  EffectAreaAlignY,
  ResolvedEffectArea,
} from "./types";

export function resolveEffectArea(area: EffectArea = {}): ResolvedEffectArea {
  const width = clampRatio(area.width ?? 1);
  const height = clampRatio(area.height ?? 1);

  return {
    x: resolveOffset(width, area.alignX ?? "center"),
    y: resolveOffset(height, area.alignY ?? "center"),
    width,
    height,
  };
}

function resolveOffset(
  size: number,
  alignment: EffectAreaAlignX | EffectAreaAlignY,
): number {
  if (alignment === "left" || alignment === "top") return 0;
  if (alignment === "right" || alignment === "bottom") {
    return roundRatio(1 - size);
  }

  return roundRatio((1 - size) * 0.5);
}

function clampRatio(value: number): number {
  return Math.min(1, Math.max(0.01, Number.isFinite(value) ? value : 1));
}

function roundRatio(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
