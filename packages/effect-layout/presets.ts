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
  if (mode === "cover" || mode === "fill") {
    return 1;
  }

  const fallback = getDefaultEffectLayoutThickness(mode);

  const candidate = Number.isFinite(value) ? (value as number) : fallback;

  /**
   * Thickness is a semantic control, not a normalized geometry value.
   *
   * There is intentionally no upper bound. Individual layout modes convert
   * this value into their own normalized geometric extent.
   */
  return Math.max(0, candidate);
}

export function resolveEffectLayoutExtent(
  mode: EffectLayoutMode,
  thickness: number,
): number {
  switch (mode) {
    case "frame":
      return resolveExpandedExtent(
        thickness,

        // Preserve the current default frame appearance.
        getDefaultEffectLayoutThickness("frame"),

        // A frame becomes a full area when its inset reaches the center.
        0.5,
      );

    case "corners":
      return resolveExpandedExtent(
        thickness,

        // Preserve the current default corner appearance.
        getDefaultEffectLayoutThickness("corners"),

        // Maximum distance from the center to its nearest corner.
        Math.SQRT1_2,
      );

    case "sides":
    case "top":
    case "bottom":
      /**
       * These modes may simply extrapolate. Region geometry itself naturally
       * saturates once the normalized area is covered.
       */
      return thickness;

    case "cover":
    case "fill":
    default:
      return 1;
  }
}

function resolveExpandedExtent(
  thickness: number,
  preservedExtent: number,
  fullExtent: number,
): number {
  const value = Math.max(0, thickness);

  /**
   * Keep the familiar low-range behavior unchanged.
   */
  if (value <= preservedExtent) {
    return value;
  }

  /**
   * Thickness 3 is the point where this preset naturally becomes full-area.
   *
   * We intentionally do NOT clamp the result. Values above 3 continue to
   * extrapolate; the geometry itself will simply already be fully covered.
   */
  const fullAt = 3;

  const progress = (value - preservedExtent) / (fullAt - preservedExtent);

  return preservedExtent + progress * (fullExtent - preservedExtent);
}

export function getDefaultEffectLayoutFeather(
  mode: EffectLayoutMode,
  thickness: number,
): number {
  switch (mode) {
    case "frame":
      return Math.min(0.06, thickness * 0.35);

    case "corners":
      return Math.min(0.08, thickness * 0.35);

    case "sides":
    case "top":
    case "bottom":
      return Math.min(0.05, thickness * 0.3);

    case "cover":
    case "fill":
    default:
      return 0;
  }
}

export function resolveEffectLayoutFeather(
  mode: EffectLayoutMode,
  thickness: number,
  value: number | undefined,
): number {
  const fallback = getDefaultEffectLayoutFeather(mode, thickness);

  const candidate = Number.isFinite(value) ? (value as number) : fallback;

  return clamp(candidate, 0, Math.min(0.25, thickness));
}

export function getDefaultEffectLayoutCornerRadius(
  mode: EffectLayoutMode,
  thickness: number,
): number {
  if (mode !== "frame") {
    return 0;
  }

  return Math.min(0.16, Math.max(0, 0.5 - thickness));
}

export function resolveEffectLayoutCornerRadius(
  mode: EffectLayoutMode,
  thickness: number,
  value: number | undefined,
): number {
  if (mode !== "frame") {
    return 0;
  }

  const maxRadius = Math.max(0, 0.5 - thickness);

  const fallback = getDefaultEffectLayoutCornerRadius(mode, thickness);

  const candidate = Number.isFinite(value) ? (value as number) : fallback;

  return clamp(candidate, 0, maxRadius);
}

export function createEffectLayoutPresetRegions(
  mode: EffectLayoutMode,
  extent: number,
): readonly EffectLayoutRegion[] {
  switch (mode) {
    case "frame":
      return createFrameRegions(extent);
    case "sides":
      return [
        region("left", "left", 0, 0, extent, 1, 1),
        region("right", "right", 1 - extent, 0, extent, 1, 1),
      ];
    case "corners":
      return [
        region("top-left", "top-left", 0, 0, extent, extent, 1),
        region("top-right", "top-right", 1 - extent, 0, extent, extent, 1),
        region(
          "bottom-left",
          "bottom-left",
          0,
          1 - extent,
          extent,
          extent,
          0.9,
        ),
        region(
          "bottom-right",
          "bottom-right",
          1 - extent,
          1 - extent,
          extent,
          extent,
          0.9,
        ),
      ];
    case "top":
      return [region("top", "top", 0, 0, 1, extent, 1)];
    case "bottom":
      return [region("bottom", "bottom", 0, 1 - extent, 1, extent, 1)];
    case "fill":
      return [region("fill", "full", 0, 0, 1, 1, 1)];
    case "cover":
    default:
      return [region("cover", "full", 0, 0, 1, 1, 1)];
  }
}

function createFrameRegions(thickness: number): readonly EffectLayoutRegion[] {
  return [
    region("top", "top", 0, 0, 1, thickness, 1.2),

    region("bottom", "bottom", 0, 1 - thickness, 1, thickness, 0.9),

    region("left", "left", 0, 0, thickness, 1, 1),

    region("right", "right", 1 - thickness, 0, thickness, 1, 1),
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
