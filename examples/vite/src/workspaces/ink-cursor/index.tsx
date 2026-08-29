import { useState } from "react";

import { InkCursor } from "@elemental-fx/fluid-effects/react";

import { PauseControl, WorkspaceScaffold } from "../shared/WorkspaceScaffold";

const PARAMETERS = [
  "color",
  "density",
  "splatForce",
  "curl",
  "densityDissipation",
  "pressureIterations",
  "quality"
];

export function InkCursorWorkspace() {
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <WorkspaceScaffold
      controls={<PauseControl checked={paused} onChange={setPaused} />}
      family="WebGL 2 · fluid-simulation"
      parameters={PARAMETERS}
      stageClassName="ink-stage"
      summary="A GPU fluid preset with pressure, curl, advection, and pointer-driven ink splats."
      title="Ink Cursor"
    >
      {error ? <p className="effect-error">{error}</p> : null}
      <InkCursor
        aria-label="Interactive ink cursor"
        color="hsl(222 22% 9%)"
        curl={28}
        density={0.82}
        onError={(nextError) => setError(nextError.message)}
        paused={paused}
      />
    </WorkspaceScaffold>
  );
}
