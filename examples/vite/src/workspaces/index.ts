import { DeformableLabWorkspace } from "./deformable-lab";
import { FoliageLayerWorkspace } from "./foliage-layer";
import { InkCursorWorkspace } from "./ink-cursor";
import { SandSurfaceWorkspace } from "./sand-surface";
import type { EffectWorkspaceDefinition, WorkspaceId } from "./types";
import { WaterSurfaceWorkspace } from "./water-surface";

export const effectWorkspaces = [
  {
    id: "foliage-layer",
    label: "Foliage",
    family: "Deformable",
    component: FoliageLayerWorkspace
  },
  {
    id: "water-surface",
    label: "Water",
    family: "Canvas 2D",
    component: WaterSurfaceWorkspace
  },
  {
    id: "sand-surface",
    label: "Sand",
    family: "Canvas 2D",
    component: SandSurfaceWorkspace
  },
  {
    id: "ink-cursor",
    label: "Ink",
    family: "WebGL Fluid",
    component: InkCursorWorkspace
  },
  {
    id: "deformable-lab",
    label: "Lab",
    family: "Deformable",
    component: DeformableLabWorkspace
  }
] as const satisfies readonly EffectWorkspaceDefinition[];

export type { WorkspaceId };
