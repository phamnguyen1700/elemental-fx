import { Vec3 } from "../../core/math/vec3";
import { mergeFoliagePreset } from "../../effects/foliage-layer/config";
import type {
  FoliagePreset,
  FoliagePresetOverrides,
} from "../../effects/foliage-layer/types";

export const bougainvilleaPreset: FoliagePreset = {
  network: {
    anchorEvery: 4,
    anchorStiffness: 0.09,
    anchorStrategy: "distributed",
    bendStiffness: 0.075,
    curvature: 0.62,
    damping: (_index, _total, context) =>
      context.mode === "paths" ? 0.968 + context.depth * 0.01 : 0.975,
    edgeBias: 0.94,
    flexibility: (_index, _total, context) =>
      context.mode === "paths" ? 0.78 + context.depth * 0.5 : 1,
    mass: (_index, _total, context) =>
      context.mode === "paths" ? 1.35 - context.depth * 0.34 : 1,
    mode: "paths",
    nodesPerPath: 16,
    orientationVariation: 0.88,
    overlap: 0.76,
    pathCount: 18,
    pathLength: 0.98,
    pathLengthVariation: 0.24,
    preferredDirection: new Vec3(0, -1, 0),
    seed: 5000,
    stiffness: 0.68,
    variation: 0.85,
  },
  growth: {
    attachmentStiffness: 0.92,

    /**
     * Secondary branches should fan naturally away from the main runners
     * without becoming perpendicular decorative spikes.
     */
    branchAngle: [0.32, 1.04],

    branchBendStiffness: 0.07,

    /**
     * Slightly more curvature helps short offshoots read as organic wall growth.
     */
    branchCurvature: 0.42,

    branchDamping: 0.958,

    /**
     * More numerous, shorter secondary branches.
     */
    branchLength: [18, 36],

    branchMass: 0.68,
    branchNodeCount: [3, 5],

    /**
     * The visual mass should come from secondary growth rather than adding
     * more independent main runners.
     */
    branchProbability: 0.78,

    branchRootStiffness: 0.12,
    branchStiffness: 0.6,

    carrierDamping: 0.965,
    carrierMass: 0.8,

    density: 1,

    /**
     * More local density variation prevents uniformly decorated vines.
     */
    densityModulation: 0.28,

    depthOffset: 5,
    flexibility: 1.16,

    /**
     * Main-runner attachment density stays moderate. Secondary attachments
     * receive their own probabilities in distribution.
     */
    flowerProbability: 0.26,
    leafProbability: 0.5,

    maxBranches: 320,
    maxGrowthNodes: 520,

    seed: 5037,

    /**
     * More growth sites per runner.
     */
    spacing: 24,
    spacingJitter: 0.3,

    variation: 0.85,
  },

  interaction: {
    depthFalloff: 0.018,
    lift: 14,
    radius: 34,
    strength: 16,
    velocityScale: 2.1,
  },

  wind: null,
  gravity: null,
  depth: {
    pointerPlane: 28,
    spread: 58,
  },

  distribution: {
    branchFlexibility: [0.8, 1.14],
    branchFlutter: [0.46, 0.84],

    /**
     * Common structural-asset scale.
     */
    branchScale: [0.88, 1.08],

    /**
     * Main runners should remain readable as the structural backbone without
     * visually dominating the secondary growth.
     */
    mainBranchScale: [0.76, 0.94],

    /**
     * Secondary branches are deliberately more visible so the layer reads as
     * a wall-clinging network rather than a few large decorated cables.
     */
    secondaryBranchScale: [1.08, 1.34],

    depthJitter: 5,

    flowerFlexibility: [1.05, 1.42],
    flowerFlutter: [0.9, 1.34],
    flowerScale: [12, 18],

    lateralSpread: 3.5,

    leafFlexibility: [0.86, 1.24],
    leafFlutter: [0.72, 1.12],
    leafScale: [10, 15],

    /**
     * Secondary structural skin now contributes many more instances.
     */
    maxInstances: 1600,

    /**
     * Accent secondary growth more strongly than main runners.
     */
    secondaryFlowerProbability: 0.24,
    secondaryLeafProbability: 0.42,

    seed: 5000,

    structuralOverlap: 1.14,

    variation: 0.85,
  },

  render: {
    alphaCutoff: 0.035,
    ambientLight: 0.72,
    atlasResolution: 1024,
    backlight: 0.2,
    branchStemColor: [0.12, 0.25, 0.075, 0.72],
    branchStemWidth: 0.86,
    contactShadow: 0.14,
    depthDarkening: 0.24,
    directionalLight: 0.42,
    flutterStrength: 1,
    idleFlutter: 0,
    stemColor: [0.075, 0.18, 0.045, 0.8],
    stemWidth: 1.15,
  },
};

export function createBougainvilleaPreset(
  overrides: FoliagePresetOverrides = {},
): FoliagePreset {
  return mergeFoliagePreset(bougainvilleaPreset, overrides);
}
