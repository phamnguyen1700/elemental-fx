import { useEffect, useRef } from "react";
import { createDeformableScene } from "../effects/scene";
import type { DeformableScene, SceneConfig } from "../effects/scene";

export function useDeformableScene(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  config: Partial<SceneConfig>
) {
  const sceneRef = useRef<DeformableScene | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = createDeformableScene(config);
    sceneRef.current = scene;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      scene.resize(rect.width || canvas.width, rect.height || canvas.height);
      canvas.width = scene.width;
      canvas.height = scene.height;
    };

    const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (reducedMotion?.matches) scene.paused = true;

    let frameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      scene.update(dt);
      scene.render();

      frameId = requestAnimationFrame(loop);
    };

    const handleVisibility = () => {
      scene.paused = document.hidden || Boolean(reducedMotion?.matches);
      lastTime = performance.now();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    document.addEventListener("visibilitychange", handleVisibility);
    resize();
    frameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      scene.destroy();
      sceneRef.current = null;
    };
  }, [canvasRef, config]);

  return sceneRef;
}

export * from "./lab";
export * from "./primitives/DeformableEffect";
export * from "./effects/foliage-layer";
