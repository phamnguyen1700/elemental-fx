import { DeformableLab } from "@elemental-fx/deformable-effects/react";

import { WorkspaceScaffold } from "../shared/WorkspaceScaffold";

const PARAMETERS = [
  "topology",
  "force",
  "renderer",
  "topologyConfig",
  "forceConfig",
  "rendererConfig",
  "sceneConfig"
];

export function DeformableLabWorkspace() {
  return (
    <WorkspaceScaffold
      family="WebGL 2 · constraint graph"
      parameters={PARAMETERS}
      stageClassName="deformable-stage"
      summary="A diagnostic surface for topologies, constraints, force systems, and render strategies."
      title="Deformable Lab"
    >
      <DeformableLab
        force="pointer-sweep"
        forceConfig={{
          pointerLift: 14,
          pointerRadius: 44,
          pointerStrength: 5.5,
          pointerVelocityScale: 1.5
        }}
        renderer="ribbons"
        rendererConfig={{
          backgroundColor: [0.055, 0.065, 0.06, 1],
          ribbonColor: [0.34, 0.72, 0.44, 1],
          ribbonWidth: 6
        }}
        topology="network-paths"
        topologyConfig={{
          anchorEvery: 4,
          anchorStiffness: 0.1,
          bendStiffness: 0.08,
          curvature: 0.68,
          damping: 0.972,
          nodesPerPath: 12,
          orientationVariation: 0.9,
          overlap: 0.8,
          pathCount: 11,
          seed: 19,
          stiffness: 0.68,
          variation: 0.88
        }}
      />
    </WorkspaceScaffold>
  );
}
