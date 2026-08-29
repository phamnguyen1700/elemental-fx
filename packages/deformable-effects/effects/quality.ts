export type DeformableQuality = "auto" | "high" | "medium" | "low";

export interface QualityBudget {
  quality: Exclude<DeformableQuality, "auto">;
  nodeScale: number;
  substeps: number;
  iterations: number;
  dprCap: number;
  rendererScale: number;
}

export function resolveQualityBudget(
  quality: DeformableQuality = "medium",
  devicePixelRatio = 1
): QualityBudget {
  const resolved = quality === "auto" ? (devicePixelRatio > 1.5 ? "medium" : "high") : quality;

  switch (resolved) {
    case "high":
      return {
        quality: "high",
        nodeScale: 1,
        substeps: 8,
        iterations: 4,
        dprCap: 2,
        rendererScale: 1
      };
    case "low":
      return {
        quality: "low",
        nodeScale: 0.45,
        substeps: 2,
        iterations: 1,
        dprCap: 1,
        rendererScale: 0.55
      };
    case "medium":
    default:
      return {
        quality: "medium",
        nodeScale: 0.7,
        substeps: 4,
        iterations: 2,
        dprCap: 1.5,
        rendererScale: 0.75
      };
  }
}
