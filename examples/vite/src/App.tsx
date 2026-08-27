import { useState } from "react";

import { WaterSurface } from "@elemental-fx/canvas-effects/react";
import { InkCursor } from "@elemental-fx/fluid-effects/react";

export function App() {
  const [waterPaused, setWaterPaused] = useState(false);
  const [inkPaused, setInkPaused] = useState(false);
  const [inkError, setInkError] = useState<string | null>(null);

  return (
    <main className="playground-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">elemental-fx</p>
          <h1>Effect playground</h1>
        </div>
        <span className="build-tag">Water + Ink</span>
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
