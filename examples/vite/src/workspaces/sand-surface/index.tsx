import { useState } from "react";

import { SandSurface } from "@elemental-fx/canvas-effects/react";

import { PauseControl, WorkspaceScaffold } from "../shared/WorkspaceScaffold";

const PARAMETERS = [
  "color",
  "duneHeight",
  "dragRadius",
  "dragStrength",
  "angleOfRepose",
  "castShadowStrength",
  "recovery"
];

export function SandSurfaceWorkspace() {
  const [paused, setPaused] = useState(false);

  return (
    <WorkspaceScaffold
      controls={<PauseControl checked={paused} onChange={setPaused} />}
      family="Canvas 2D · granular-field"
      parameters={PARAMETERS}
      stageClassName="sand-stage"
      summary="A deformable dune field with displaced mass, slope settling, and height-aware light."
      title="Sand Surface"
    >
      <SandSurface
        angleOfRepose={0.9}
        aria-label="Interactive sand surface"
        castShadowStrength={0.42}
        color="hsl(39 52% 59%)"
        dragRadius={8.5}
        dragStrength={1.15}
        duneHeight={6.8}
        duneScale={0.115}
        grain={0.16}
        heightScale={0.78}
        highlightColor="hsl(45 94% 86%)"
        lightZ={0.8}
        paused={paused}
        pressRadius={10}
        pressStrength={9}
        recovery={0.001}
        shadowColor="hsl(31 44% 25%)"
      />
    </WorkspaceScaffold>
  );
}
