import type { Vec3 } from "../../core/math/vec3";
import type { VisualResource, WeightedResource } from "../../core/resources";
import type { Node } from "../../engines/constraint-graph";
import type { PointerSweepConfig, WindForceConfig } from "../../forces";
import type { NetworksConfig, VineGrowthConfig } from "../../topologies";
import type { EffectArea } from "../area";
import type { DeformableQuality } from "../quality";

export type VineAsset = VisualResource;
export type VineAssetEntry = VineAsset | WeightedResource<VineAsset>;
export type VineVisualKind = "branch" | "flower" | "leaf";

interface VineAccentAssets {
  flowers?: ReadonlyArray<VineAssetEntry>;
  leaves?: ReadonlyArray<VineAssetEntry>;
}

export type VineAssets = VineAccentAssets &
  (
    | {
        branches: ReadonlyArray<VineAssetEntry>;
        /** @deprecated Use `branches`. */
        baseFoliage?: ReadonlyArray<VineAssetEntry>;
      }
    | {
        branches?: undefined;
        /** @deprecated Compatibility alias for `branches`. */
        baseFoliage: ReadonlyArray<VineAssetEntry>;
      }
  );

/** @deprecated Use `VineAsset`. */
export type FoliageAsset = VineAsset;
/** @deprecated Use `VineAssetEntry`. */
export type FoliageAssetEntry = VineAssetEntry;
/** @deprecated Use `VineAssets`. */
export type FoliageAssets = VineAssets;
/** @deprecated Use `VineVisualKind`. */
export type FoliageVisualKind = VineVisualKind;

export interface FoliageDepthConfig {
  spread: number;
  pointerPlane: number;
}

export interface VineDistributionConfig {
  maxInstances: number;
  structuralOverlap: number;
  lateralSpread: number;
  depthJitter: number;
  branchScale: readonly [number, number];
  flowerScale: readonly [number, number];
  leafScale: readonly [number, number];
  branchFlexibility: readonly [number, number];
  flowerFlexibility: readonly [number, number];
  leafFlexibility: readonly [number, number];
  branchFlutter: readonly [number, number];
  flowerFlutter: readonly [number, number];
  leafFlutter: readonly [number, number];
  secondaryFlowerProbability: number;
  secondaryLeafProbability: number;
  variation: number;
  seed: number;
}

/** @deprecated Use `VineDistributionConfig`. */
export type FoliageDistributionConfig = VineDistributionConfig;

export interface FoliageRenderConfig {
  atlasResolution: number;
  alphaCutoff: number;
  stemWidth: number;
  stemColor: readonly [number, number, number, number];
  branchStemWidth: number;
  branchStemColor: readonly [number, number, number, number];
  ambientLight: number;
  directionalLight: number;
  backlight: number;
  depthDarkening: number;
  contactShadow: number;
  flutterStrength: number;
  idleFlutter: number;
}

export type VineSizeValue = number | readonly [number, number];

export interface VineSize {
  branch?: VineSizeValue;
  flower?: VineSizeValue;
  leaf?: VineSizeValue;
  /** @deprecated Use `branch`. */
  base?: VineSizeValue;
}

/** @deprecated Use `VineSizeValue`. */
export type FoliageSizeValue = VineSizeValue;
/** @deprecated Use `VineSize`. */
export type FoliageSize = VineSize;

export interface FoliagePreset {
  network: Partial<NetworksConfig>;
  growth: VineGrowthConfig;
  interaction: PointerSweepConfig;
  wind: WindForceConfig | null;
  gravity: Vec3 | null;
  depth: FoliageDepthConfig;
  distribution: VineDistributionConfig;
  render: FoliageRenderConfig;
}

export interface FoliagePresetOverrides {
  network?: Partial<NetworksConfig>;
  growth?: Partial<VineGrowthConfig>;
  interaction?: PointerSweepConfig;
  wind?: WindForceConfig | null;
  gravity?: Vec3 | null;
  depth?: Partial<FoliageDepthConfig>;
  distribution?: Partial<VineDistributionConfig>;
  render?: Partial<FoliageRenderConfig>;
}

export interface VineLayerConfig extends FoliagePresetOverrides {
  assets: VineAssets;
  preset?: FoliagePreset;
  quality?: DeformableQuality;
  area?: EffectArea;
  seed?: number;
  density?: number;
  size?: VineSize;
  variation?: number;
  debug?: boolean;
  autoStart?: boolean;
  interactionTarget?: HTMLElement | Window | null;
  onError?: (error: Error) => void;
}

/** @deprecated Use `VineLayerConfig`. */
export type FoliageLayerConfig = VineLayerConfig;

export interface VineRenderInstance {
  id: number;
  kind: VineVisualKind;
  pathIndex: number;
  growthNodeId: number;
  branchId: number | null;
  from: Node;
  to: Node;
  anchor?: Node;
  t: number;
  lateralOffset: number;
  axialOffset: number;
  orientationOffset: number;
  scale: number;
  flip: -1 | 1;
  resource: VineAsset;
  flexibility: number;
  flutter: number;
  phase: number;
  depthBias: number;
  tint: readonly [number, number, number, number];
  greenMask: boolean;
  crossScale: number;
  structuralRole: "main" | "secondary" | null;
}

/** @deprecated Use `VineRenderInstance`. */
export type FoliageRenderInstance = VineRenderInstance;
