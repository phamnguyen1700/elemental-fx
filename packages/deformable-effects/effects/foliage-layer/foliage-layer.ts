import type { DeformableEffectHandle } from "../types";
import { Vec3 } from "../../core/math/vec3";
import { bindPointerSweepInput } from "../pointer-sweep-input";
import { createFoliageComposition } from "./composition";
import type { FoliageComposition } from "./composition";
import { FoliageSceneRenderer } from "./scene-renderer";
import type { VineLayerConfig } from "./types";

export function createVineLayerEffect(
  canvas: HTMLCanvasElement,
  initialConfig: VineLayerConfig,
): DeformableEffectHandle<VineLayerConfig> {
  let config = initialConfig;
  let composition: FoliageComposition | null = null;
  let destroyed = false;
  let requestedRunning = config.autoStart ?? true;
  let hidden = document.hidden;
  let frameId = 0;
  let lastFrameTime = performance.now();
  let cssWidth = 1;
  let cssHeight = 1;
  let dpr = globalThis.devicePixelRatio ?? 1;
  let pointerPending = false;
  let settleMinUntil = 0;
  let settleMaxUntil = 0;
  let removePointerListeners = () => {};
  const reducedMotion = globalThis.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  );
  let reduceMotion = Boolean(reducedMotion?.matches);

  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: true,
    depth: true,
    premultipliedAlpha: true,
  });
  if (!gl) throw new Error("VineLayer requires WebGL 2.");

  const reportError = (error: unknown) => {
    const resolved = error instanceof Error ? error : new Error(String(error));
    config.onError?.(resolved);
  };

  const renderOnce = () => {
    if (!destroyed) composition?.scene.render();
  };

  const resizeScene = () => {
    if (!composition) return;
    composition.scene.resize(cssWidth, cssHeight, dpr);
    canvas.width = composition.scene.width;
    canvas.height = composition.scene.height;
  };

  const rebuild = () => {
    composition?.destroy();
    composition = null;
    try {
      const next = createFoliageComposition(
        config,
        cssWidth / Math.max(1, cssHeight),
        dpr,
      );
      const renderer = new FoliageSceneRenderer(gl, next, {
        debug: config.debug ?? false,
        onError: reportError,
        onReady: renderOnce,
      });
      next.scene.addRenderer(renderer);
      composition = next;
      resizeScene();
      renderOnce();
    } catch (error) {
      reportError(error);
      throw error;
    }
  };

  const resize = () => {
    if (destroyed) return;
    const rect = canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, rect.width || canvas.clientWidth || 1);
    const nextHeight = Math.max(1, rect.height || canvas.clientHeight || 1);
    const nextAspect = nextWidth / nextHeight;
    const previousAspect = cssWidth / cssHeight;
    const aspectChanged = Math.abs(nextAspect - previousAspect) > 0.08;
    cssWidth = nextWidth;
    cssHeight = nextHeight;
    dpr = globalThis.devicePixelRatio ?? 1;

    if (!composition || aspectChanged) rebuild();
    else {
      resizeScene();
      renderOnce();
    }
  };

  const clearPointerSweep = () => {
    composition?.pointerSweep.updatePointer(new Vec3(), false);
    pointerPending = false;
  };

  const bindPointerTarget = () => {
    removePointerListeners();
    const eventTarget = config.interactionTarget;
    removePointerListeners = bindPointerSweepInput({
      canvas,
      ...(eventTarget === undefined ? {} : { eventTarget }),
      getBounds: () =>
        composition
          ? {
              halfHeight: composition.bounds.halfHeight,
              halfWidth: composition.bounds.halfWidth,
              pointerPlane: composition.preset.depth.pointerPlane,
            }
          : null,
      onReset: clearPointerSweep,
      onSweep: (from, to) => {
        if (!composition) return;
        composition.pointerSweep.updatePointer(from, true);
        composition.pointerSweep.updatePointer(to, true);
        pointerPending = true;
        wakeForInteraction();
      },
    });
  };

  const hasContinuousMotion = () =>
    Boolean(
      composition?.wind ||
      composition?.gravity ||
      (composition?.preset.render.idleFlutter ?? 0) > 0,
    );

  const hasPhysicalMotion = () =>
    Boolean(
      composition?.scene.engine.nodes.some(
        (node) =>
          !node.isPinned &&
          (node.velocity.lengthSq() > 0.0001 ||
            node.position.distanceToSq(node.restPosition) > 0.001),
      ),
    );

  const shouldAnimate = () => {
    if (!requestedRunning || hidden || reduceMotion || destroyed) return false;
    if (hasContinuousMotion()) return true;
    const now = performance.now();
    return (
      now < settleMinUntil || (now < settleMaxUntil && hasPhysicalMotion())
    );
  };

  const scheduleFrame = () => {
    if (frameId === 0 && shouldAnimate())
      frameId = requestAnimationFrame(frame);
  };

  const wakeForInteraction = () => {
    const now = performance.now();
    const wasSleeping = frameId === 0;
    settleMinUntil = Math.max(settleMinUntil, now + 450);
    settleMaxUntil = Math.max(settleMaxUntil, now + 3200);
    if (wasSleeping) lastFrameTime = now;
    scheduleFrame();
  };

  const frame = (time: number) => {
    frameId = 0;
    if (!shouldAnimate()) return;
    const dt = Math.min(0.05, Math.max(0, (time - lastFrameTime) / 1000));
    lastFrameTime = time;
    composition?.scene.update(dt);
    composition?.scene.render();
    if (pointerPending) clearPointerSweep();
    scheduleFrame();
  };

  const start = () => {
    requestedRunning = true;
    lastFrameTime = performance.now();
    scheduleFrame();
    renderOnce();
  };

  const stop = () => {
    requestedRunning = false;
    if (frameId !== 0) cancelAnimationFrame(frameId);
    frameId = 0;
    renderOnce();
  };

  const handleVisibility = () => {
    hidden = document.hidden;
    lastFrameTime = performance.now();
    if (hidden && frameId !== 0) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    } else {
      scheduleFrame();
    }
  };

  const handleReducedMotion = () => {
    reduceMotion = Boolean(reducedMotion?.matches);
    if (reduceMotion && frameId !== 0) {
      cancelAnimationFrame(frameId);
      frameId = 0;
      renderOnce();
    } else {
      lastFrameTime = performance.now();
      scheduleFrame();
    }
  };

  const handleContextLost = (event: Event) => {
    event.preventDefault();
    if (frameId !== 0) cancelAnimationFrame(frameId);
    frameId = 0;
  };

  const handleContextRestored = () => {
    rebuild();
    lastFrameTime = performance.now();
    scheduleFrame();
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  document.addEventListener("visibilitychange", handleVisibility);
  reducedMotion?.addEventListener("change", handleReducedMotion);
  canvas.addEventListener("webglcontextlost", handleContextLost);
  canvas.addEventListener("webglcontextrestored", handleContextRestored);
  bindPointerTarget();
  resize();
  if (requestedRunning) start();

  return {
    start,
    stop,
    resize,
    update: (nextConfig) => {
      if (destroyed) return;
      config = mergeLayerConfig(config, nextConfig);
      bindPointerTarget();
      rebuild();
      if (requestedRunning) start();
      else stop();
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      if (frameId !== 0) cancelAnimationFrame(frameId);
      frameId = 0;
      resizeObserver.disconnect();
      removePointerListeners();
      document.removeEventListener("visibilitychange", handleVisibility);
      reducedMotion?.removeEventListener("change", handleReducedMotion);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      composition?.destroy();
      composition = null;
    },
  };
}

/** @deprecated Use `createVineLayerEffect`. */
export const createFoliageLayerEffect = createVineLayerEffect;

function mergeLayerConfig(
  current: VineLayerConfig,
  next: Partial<VineLayerConfig>,
): VineLayerConfig {
  const wind =
    next.wind === undefined
      ? current.wind
      : next.wind === null
        ? null
        : { ...(current.wind ?? {}), ...next.wind };
  const layout =
    next.layout === undefined
      ? current.layout
      : typeof next.layout === "string"
        ? next.layout
        : typeof current.layout === "object" &&
            current.layout.mode === next.layout.mode
          ? {
              ...current.layout,
              ...next.layout,
            }
          : next.layout;
  return {
    ...current,
    ...next,
    assets: next.assets ?? current.assets,
    area: { ...current.area, ...next.area },
    size: { ...current.size, ...next.size },
    network: { ...current.network, ...next.network },
    growth: { ...current.growth, ...next.growth },
    ...(layout === undefined ? {} : { layout }),
    interaction: { ...current.interaction, ...next.interaction },
    ...(wind === undefined ? {} : { wind }),
    depth: { ...current.depth, ...next.depth },
    distribution: { ...current.distribution, ...next.distribution },
    render: { ...current.render, ...next.render },
  };
}
