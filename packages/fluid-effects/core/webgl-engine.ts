export interface WebGLViewport {
  width: number;
  height: number;
  pixelWidth: number;
  pixelHeight: number;
  dpr: number;
}

export interface WebGLFrame {
  gl: WebGL2RenderingContext;
  viewport: WebGLViewport;
  deltaTime: number;
  elapsedTime: number;
}

export interface WebGLEngineHooks {
  onFrame(frame: WebGLFrame): void;
  onResize?(viewport: WebGLViewport): void;
  onContextLost?(): void;
  onContextRestored?(): void;
}

export interface WebGLEngineOptions {
  autoStart?: boolean;
  maxDeltaTime?: number;
  maxDpr?: number;
}

export interface WebGLEngine {
  readonly gl: WebGL2RenderingContext;
  getViewport(): WebGLViewport;
  setMaxDpr(maxDpr: number): void;
  start(): void;
  stop(): void;
  resize(): void;
  destroy(): void;
}

function getViewport(canvas: HTMLCanvasElement, maxDpr: number): WebGLViewport {
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

export function createWebGLEngine(
  canvas: HTMLCanvasElement,
  hooks: WebGLEngineHooks,
  options: WebGLEngineOptions = {}
): WebGLEngine {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    stencil: false
  });

  if (!gl) throw new Error("WebGL 2 is required for fluid effects.");

  let maxDpr = options.maxDpr ?? 2;
  const maxDeltaTime = options.maxDeltaTime ?? 1 / 20;
  let viewport = getViewport(canvas, maxDpr);
  let animationFrame: number | null = null;
  let running = false;
  let destroyed = false;
  let contextLost = false;
  let startTime: number | null = null;
  let previousTime: number | null = null;

  const resize = (): void => {
    if (destroyed || contextLost) return;
    const next = getViewport(canvas, maxDpr);
    const changed =
      canvas.width !== next.pixelWidth ||
      canvas.height !== next.pixelHeight ||
      viewport.width !== next.width ||
      viewport.height !== next.height ||
      viewport.dpr !== next.dpr;
    viewport = next;
    if (!changed) return;

    canvas.width = viewport.pixelWidth;
    canvas.height = viewport.pixelHeight;
    hooks.onResize?.(viewport);
  };

  const scheduleFrame = (): void => {
    if (!running || destroyed || contextLost || animationFrame !== null || document.hidden) {
      return;
    }
    animationFrame = window.requestAnimationFrame(renderFrame);
  };

  const renderFrame = (time: number): void => {
    animationFrame = null;
    if (!running || destroyed || contextLost) return;
    resize();
    startTime ??= time;
    const deltaTime =
      previousTime === null ? 0 : Math.min((time - previousTime) / 1000, maxDeltaTime);
    previousTime = time;
    hooks.onFrame({ gl, viewport, deltaTime, elapsedTime: (time - startTime) / 1000 });
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

  const onContextLost = (event: Event): void => {
    event.preventDefault();
    contextLost = true;
    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    hooks.onContextLost?.();
  };

  const onContextRestored = (): void => {
    if (destroyed) return;
    contextLost = false;
    previousTime = null;
    hooks.onContextRestored?.();
    resize();
    scheduleFrame();
  };

  const resizeObserver =
    typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => resize());
  if (resizeObserver) resizeObserver.observe(canvas);
  else window.addEventListener("resize", resize);

  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  document.addEventListener("visibilitychange", onVisibilityChange);
  resize();
  if (options.autoStart ?? true) start();

  return {
    gl,
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
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
    }
  };
}
