export type EffectAreaAlignX = "left" | "center" | "right";
export type EffectAreaAlignY = "top" | "center" | "bottom";

export interface EffectArea {
  width?: number;
  height?: number;
  alignX?: EffectAreaAlignX;
  alignY?: EffectAreaAlignY;
}

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResolvedEffectArea extends NormalizedRect {}

export type EffectLayoutMode =
  "cover" | "fill" | "frame" | "sides" | "corners" | "top" | "bottom";

export type EffectLayoutRegionRole =
  | "full"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export interface EffectLayoutOptions {
  mode: EffectLayoutMode;
  coverage?: number;
  thickness?: number;
  variation?: number;

  /**
   * Soft transition width at the active layout boundary.
   * Normalized to the local EffectArea.
   */
  feather?: number;

  /**
   * Radius of the rounded inner safe area used by frame.
   * Normalized to the local EffectArea.
   */
  cornerRadius?: number;
}

export type EffectLayout = EffectLayoutMode | EffectLayoutOptions;

export interface EffectLayoutRegion extends NormalizedRect {
  id: string;
  role: EffectLayoutRegionRole;
  weight: number;
}

export interface ResolvedEffectLayout {
  mode: EffectLayoutMode;
  coverage: number;

  /**
   * Public semantic thickness value.
   *
   * This value is intentionally not upper-clamped.
   */
  thickness: number;

  /**
   * Normalized geometric extent derived from thickness.
   *
   * Consumers that work with normalized spatial geometry should use this
   * instead of thickness.
   */
  extent: number;

  variation: number;
  feather: number;
  cornerRadius: number;

  regions: readonly EffectLayoutRegion[];
}

export interface PlacedEffectLayout extends Omit<
  ResolvedEffectLayout,
  "regions"
> {
  area: ResolvedEffectArea;
  regions: readonly EffectLayoutRegion[];
}
