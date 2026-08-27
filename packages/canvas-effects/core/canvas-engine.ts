export interface CanvasViewport {
  width: number;
  height: number;
  pixelWidth: number;
  pixelHeight: number;
  dpr: number;
}

export interface CanvasFrame {
  context: CanvasRenderingContext2D;
  viewport: CanvasViewport;
  deltaTime: number;
  elapsedTime: number;
}

export interface CanvasEngineHooks {
  onFrame(frame: CanvasFrame): void;
  onResize?(viewport: CanvasViewport): void;
}

export interface CanvasEngineOptions {
  autoStart?: boolean;
  maxDeltaTime?: number;
  maxDpr?: number;
}

export interface CanvasEngine {
  readonly context: CanvasRenderingContext2D;
  getViewport(): CanvasViewport;
  setMaxDpr(maxDpr: number): void;
  start(): void;
  stop(): void;
  resize(): void;
  destroy(): void;
}

const DEFAULT_MAX_DPR = 2;
const DEFAULT_MAX_DELTA_TIME = 1 / 20;

function getCanvasSize(canvas: HTMLCanvasElement, maxDpr: number): CanvasViewport {
  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(1, bounds.width || canvas.clientWidth || canvas.width || 1);
  const height = Math.max(1, bounds.height || canvas.clientHeight || canvas.height || 1);
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, maxDpr));

  return {
    width,
    height,
    pixelWidth: Math.max(1, Math.round(width * dpr)),
    pixelHeight: Math.max(1, Math.round(height * dpr)),
    dpr
  };
}

export function createCanvasEngine(
  canvas: HTMLCanvasElement,
  hooks: CanvasEngineHooks,
  options: CanvasEngineOptions = {}
): CanvasEngine {
  const context = canvas.getContext("2d", { alpha: true });

  if (!context) {
    throw new Error("Canvas 2D is not supported in this environment.");
  }

  let maxDpr = options.maxDpr ?? DEFAULT_MAX_DPR;
  const maxDeltaTime = options.maxDeltaTime ?? DEFAULT_MAX_DELTA_TIME;
  let viewport = getCanvasSize(canvas, maxDpr);
  let animationFrame: number | null = null;
  let running = false;
  let destroyed = false;
  let startTime: number | null = null;
  let previousTime: number | null = null;

  const resize = (): void => {
    if (destroyed) return;

    const nextViewport = getCanvasSize(canvas, maxDpr);
    const changed =
      canvas.width !== nextViewport.pixelWidth ||
      canvas.height !== nextViewport.pixelHeight ||
      viewport.width !== nextViewport.width ||
      viewport.height !== nextViewport.height ||
      viewport.dpr !== nextViewport.dpr;

    viewport = nextViewport;

    if (!changed) return;

    canvas.width = viewport.pixelWidth;
    canvas.height = viewport.pixelHeight;
    context.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
    hooks.onResize?.(viewport);
  };

  const scheduleFrame = (): void => {
    if (!running || destroyed || animationFrame !== null || document.hidden) return;
    animationFrame = window.requestAnimationFrame(renderFrame);
  };

  const renderFrame = (time: number): void => {
    animationFrame = null;
    if (!running || destroyed) return;

    resize();
    startTime ??= time;
    const deltaTime =
      previousTime === null ? 0 : Math.min((time - previousTime) / 1000, maxDeltaTime);
    previousTime = time;

    context.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
    hooks.onFrame({
      context,
      viewport,
      deltaTime,
      elapsedTime: (time - startTime) / 1000
    });

    scheduleFrame();
  };

  const start = (): void => {
    if (running || destroyed) return;
    running = true;
    previousTime = null;
    resize();
    scheduleFrame();
  };

  const stop = (): void => {
    if (!running) return;
    running = false;
    previousTime = null;

    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  };

  const onVisibilityChange = (): void => {
    if (document.hidden) {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
      previousTime = null;
      return;
    }

    scheduleFrame();
  };

  const resizeObserver =
    typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => resize());

  if (resizeObserver) {
    resizeObserver.observe(canvas);
  } else {
    window.addEventListener("resize", resize);
  }

  document.addEventListener("visibilitychange", onVisibilityChange);
  resize();

  if (options.autoStart ?? true) start();

  return {
    context,
    getViewport: () => viewport,
    setMaxDpr: (nextMaxDpr) => {
      maxDpr = Math.max(1, nextMaxDpr);
      resize();
    },
    start,
    stop,
    resize,
    destroy: () => {
      if (destroyed) return;
      stop();
      destroyed = true;
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
  };
}
