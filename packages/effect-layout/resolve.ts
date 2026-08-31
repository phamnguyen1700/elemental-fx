import { resolveEffectArea } from "./area";
import { mapNormalizedRect } from "./geometry";
import {
  createEffectLayoutPresetRegions,
  resolveEffectLayoutThickness,
} from "./presets";
import type {
  EffectArea,
  EffectLayout,
  EffectLayoutMode,
  EffectLayoutRegion,
  PlacedEffectLayout,
  ResolvedEffectLayout,
} from "./types";

export function resolveEffectLayout(
  input: EffectLayout | undefined,
  fallbackVariation = 1,
): ResolvedEffectLayout {
  const mode = resolveMode(input);
  const options = typeof input === "object" ? input : undefined;

  const coverage = clamp(finiteOr(options?.coverage, 1), 0.25, 2);
  const variation = clamp01(finiteOr(options?.variation, fallbackVariation));
  const thickness = resolveEffectLayoutThickness(mode, options?.thickness);

  return {
    mode,
    coverage,
    thickness,
    variation,
    regions: createEffectLayoutPresetRegions(mode, thickness),
  };
}

export function resolveEffectLayoutInArea(
  layoutInput: EffectLayout | undefined,
  areaInput: EffectArea = {},
  fallbackVariation = 1,
): PlacedEffectLayout {
  const layout = resolveEffectLayout(layoutInput, fallbackVariation);
  const area = resolveEffectArea(areaInput);

  const regions: EffectLayoutRegion[] = layout.regions.map((region) => ({
    ...region,
    ...mapNormalizedRect(area, region),
  }));

  return {
    area,
    mode: layout.mode,
    coverage: layout.coverage,
    thickness: layout.thickness,
    variation: layout.variation,
    regions,
  };
}

function resolveMode(input: EffectLayout | undefined): EffectLayoutMode {
  if (typeof input === "string") return input;
  return input?.mode ?? "cover";
}

function finiteOr(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) ? value : fallback;
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
