import type { ComponentType } from "react";

export type WorkspaceId =
  "water-surface" | "sand-surface" | "ink-cursor" | "deformable-lab" | "foliage-layer";

export interface EffectWorkspaceDefinition {
  id: WorkspaceId;
  label: string;
  family: string;
  component: ComponentType;
}
