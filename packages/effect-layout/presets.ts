import type {
  EffectLayoutMode,
  EffectLayoutRegion,
  EffectLayoutRegionRole,
} from "./types";

export const EFFECT_LAYOUT_MODES = [
  "cover",
  "fill",
  "frame",
  "sides",
  "corners",
  "top",
  "bottom",
] as const satisfies readonly EffectLayoutMode[];

export function getDefaultEffectLayoutThickness(
  mode: EffectLayoutMode,
): number {
  switch (mode) {
    case "frame":
      return 0.2;
    case "sides":
      return 0.22;
    case "corners":
      return 0.28;
    case "top":
    case "bottom":
      return 0.32;
    case "cover":
    case "fill":
    default:
      return 1;
  }
}

export function resolveEffectLayoutThickness(
  mode: EffectLayoutMode,
  value: number | undefined,
): number {
  if (mode === "cover" || mode === "fill") return 1;

  const fallback = getDefaultEffectLayoutThickness(mode);
  const candidate = Number.isFinite(value) ? (value as number) : fallback;

  switch (mode) {
    case "frame":
      return clamp(candidate, 0.08, 0.45);
    case "sides":
      return clamp(candidate, 0.08, 0.48);
    case "corners":
      return clamp(candidate, 0.12, 0.5);
    case "top":
    case "bottom":
      return clamp(candidate, 0.08, 0.75);
    default:
      return fallback;
  }
}

export function createEffectLayoutPresetRegions(
  mode: EffectLayoutMode,
  thickness: number,
): readonly EffectLayoutRegion[] {
  switch (mode) {
    case "frame":
      return createFrameRegions(thickness);
    case "sides":
      return [
        region("left", "left", 0, 0, thickness, 1, 1),
        region("right", "right", 1 - thickness, 0, thickness, 1, 1),
      ];
    case "corners":
      return [
        region("top-left", "top-left", 0, 0, thickness, thickness, 1),
        region("top-right", "top-right", 1 - thickness, 0, thickness, thickness, 1),
        region("bottom-left", "bottom-left", 0, 1 - thickness, thickness, thickness, 0.9),
        region("bottom-right", "bottom-right", 1 - thickness, 1 - thickness, thickness, thickness, 0.9),
      ];
    case "top":
      return [region("top", "top", 0, 0, 1, thickness, 1)];
    case "bottom":
      return [region("bottom", "bottom", 0, 1 - thickness, 1, thickness, 1)];
    case "fill":
      return [region("fill", "full", 0, 0, 1, 1, 1)];
    case "cover":
    default:
      return [region("cover", "full", 0, 0, 1, 1, 1)];
  }
}

function createFrameRegions(thickness: number): readonly EffectLayoutRegion[] {
  const sideHeight = Math.max(0, 1 - thickness * 2);

  return [
    region("top", "top", 0, 0, 1, thickness, 1.2),
    region("bottom", "bottom", 0, 1 - thickness, 1, thickness, 0.9),
    region("left", "left", 0, thickness, thickness, sideHeight, 1),
    region("right", "right", 1 - thickness, thickness, thickness, sideHeight, 1),
  ];
}

function region(
  id: string,
  role: EffectLayoutRegionRole,
  x: number,
  y: number,
  width: number,
  height: number,
  weight: number,
): EffectLayoutRegion {
  return {
    id,
    role,
    x: clamp01(x),
    y: clamp01(y),
    width: clamp(width, 0, 1),
    height: clamp(height, 0, 1),
    weight: Math.max(0, weight),
  };
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
