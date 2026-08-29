import { useState } from "react";

import { WaterSurface } from "@elemental-fx/canvas-effects/react";

import { PauseControl, WorkspaceScaffold } from "../shared/WorkspaceScaffold";

const PARAMETERS = [
  "color",
  "highlightColor",
  "shadowColor",
  "tension",
  "damping",
  "hoverStrength",
  "clickStrength"
];

export function WaterSurfaceWorkspace() {
  const [paused, setPaused] = useState(false);
  const [frontClicks, setFrontClicks] = useState(0);
  const [backClicks, setBackClicks] = useState(0);

  return (
    <WorkspaceScaffold
      controls={<PauseControl checked={paused} onChange={setPaused} />}
      family="Canvas 2D · wave-grid"
      parameters={PARAMETERS}
      stageClassName="water-stage"
      summary="Tests WaterSurface both above and behind interactive content."
      title="Water Surface"
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          width: "100%",
          height: "100%",
          overflow: "hidden"
        }}
      >
        {/* LEFT — WATER ABOVE CONTENT */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            overflow: "hidden",
            borderRight: "1px solid rgba(255,255,255,0.25)"
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              zIndex: 1,
              background: "linear-gradient(135deg, #51a8ff 0%, #4c57ec 50%, #3e85db 100%)"
            }}
          >
            <TestCard
              title="Water above model"
              description="Canvas renders above the content."
              count={frontClicks}
              onClick={() => setFrontClicks((value) => value + 1)}
            />
          </div>

          <WaterSurface
            aria-label="Water surface above content"
            clickStrength={10}
            color="hsl(193 67% 36%)"
            highlightColor="hsl(186 100% 96%)"
            hoverStrength={0.95}
            opacity={0.78}
            paused={paused}
            shadowColor="hsl(213 82% 2%)"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              zIndex: 2,

              // UI phía dưới vẫn click được vì
              // input của effect đã lấy từ window.
              pointerEvents: "none",

              opacity: 0.35
            }}
          />

          <LayerLabel>WATER ABOVE</LayerLabel>
        </div>

        {/* RIGHT — WATER BEHIND CONTENT */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            overflow: "hidden",
            background: "linear-gradient(135deg, #51a8ff 0%, #4c57ec 50%, #3e85db 100%)"
          }}
        >
          <WaterSurface
            aria-label="Water surface behind content"
            clickStrength={10}
            color="hsl(193 67% 36%)"
            highlightColor="hsl(186 100% 96%)"
            hoverStrength={0.95}
            opacity={0.78}
            paused={paused}
            shadowColor="hsl(213 82% 2%)"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              zIndex: 1,
              pointerEvents: "none",
              opacity: 0.35
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              zIndex: 2
            }}
          >
            <TestCard
              title="Water behind model"
              description="Content renders above the water."
              count={backClicks}
              onClick={() => setBackClicks((value) => value + 1)}
            />
          </div>

          <LayerLabel>WATER BEHIND</LayerLabel>
        </div>
      </div>
    </WorkspaceScaffold>
  );
}

interface TestCardProps {
  title: string;
  description: string;
  count: number;
  onClick: () => void;
}

function TestCard({ title, description, count, onClick }: TestCardProps) {
  return (
    <div
      style={{
        padding: "32px 40px",
        borderRadius: 24,
        background: "rgba(255, 0, 0, 0.85)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        textAlign: "center"
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 28
        }}
      >
        {title}
      </h2>

      <p
        style={{
          marginTop: 12
        }}
      >
        {description}
      </p>

      <button
        type="button"
        onClick={onClick}
        style={{
          marginTop: 16,
          padding: "10px 18px",
          borderRadius: 999,
          cursor: "pointer"
        }}
      >
        Test button · {count}
      </button>
    </div>
  );
}

function LayerLabel({ children }: { children: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        zIndex: 10,
        padding: "6px 10px",
        borderRadius: 999,
        background: "rgba(0,0,0,0.65)",
        color: "white",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        pointerEvents: "none"
      }}
    >
      {children}
    </div>
  );
}
