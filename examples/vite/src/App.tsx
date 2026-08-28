import { useState } from "react";

import { SandSurface, WaterSurface } from "@elemental-fx/canvas-effects/react";
import { InkCursor } from "@elemental-fx/fluid-effects/react";

export function App() {
  const [waterPaused, setWaterPaused] = useState(false);
  const [sandPaused, setSandPaused] = useState(false);
  const [inkPaused, setInkPaused] = useState(false);
  const [inkError, setInkError] = useState<string | null>(null);

  return (
    <main className="playground-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">elemental-fx</p>
          <h1>Effect playground</h1>
        </div>
        <span className="build-tag">Water + Sand + Ink</span>
      </header>

      <section className="effect-grid" aria-label="Effect previews">
        <article className="effect-panel">
          <header className="effect-toolbar">
            <div>
              <p className="effect-family">Canvas 2D</p>
              <h2>Water Surface</h2>
            </div>
            <label className="toggle-control">
              <input
                checked={waterPaused}
                onChange={(event) => setWaterPaused(event.target.checked)}
                type="checkbox"
              />
              <span>Pause</span>
            </label>
          </header>
          <div className="effect-stage water-stage">
            <WaterSurface
              aria-label="Interactive water surface"
              clickStrength={10}
              color="hsl(193 67% 36%)"
              highlightColor="hsl(186 100% 96%)"
              hoverStrength={0.95}
              opacity={0.78}
              paused={waterPaused}
              shadowColor="hsl(211 54% 16%)"
            />
          </div>
        </article>

        <article className="effect-panel">
          <header className="effect-toolbar">
            <div>
              <p className="effect-family">Canvas 2D</p>
              <h2>Sand Surface</h2>
            </div>
            <label className="toggle-control">
              <input
                checked={sandPaused}
                onChange={(event) => setSandPaused(event.target.checked)}
                type="checkbox"
              />
              <span>Pause</span>
            </label>
          </header>
          <div className="effect-stage sand-stage">
            <SandSurface
              aria-label="Interactive sand surface"
              angleOfRepose={0.9}
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
              paused={sandPaused}
              pressRadius={10}
              pressStrength={9}
              recovery={0.001}
              shadowColor="hsl(31 44% 25%)"
            />
          </div>
        </article>

        <article className="effect-panel">
          <header className="effect-toolbar">
            <div>
              <p className="effect-family">WebGL 2</p>
              <h2>Ink Cursor</h2>
            </div>
            <label className="toggle-control">
              <input
                checked={inkPaused}
                onChange={(event) => setInkPaused(event.target.checked)}
                type="checkbox"
              />
              <span>Pause</span>
            </label>
          </header>
          <div className="effect-stage ink-stage">
            {inkError ? <p className="effect-error">{inkError}</p> : null}
            <InkCursor
              aria-label="Interactive ink cursor"
              color="hsl(222 22% 9%)"
              curl={28}
              density={0.82}
              onError={(error) => setInkError(error.message)}
              paused={inkPaused}
            />
          </div>
        </article>
      </section>
    </main>
  );
}
