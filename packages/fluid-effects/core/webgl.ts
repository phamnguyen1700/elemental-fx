export interface GlProgram {
  readonly program: WebGLProgram;
  use(): void;
  uniform(name: string): WebGLUniformLocation;
  destroy(): void;
}

export interface RenderTarget {
  readonly texture: WebGLTexture;
  readonly framebuffer: WebGLFramebuffer;
  readonly width: number;
  readonly height: number;
  readonly texelSizeX: number;
  readonly texelSizeY: number;
  attach(unit: number): number;
  destroy(): void;
}

export interface DoubleRenderTarget {
  read: RenderTarget;
  write: RenderTarget;
  swap(): void;
  destroy(): void;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to allocate a WebGL shader.");

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) || "Unknown shader compilation error.";
    gl.deleteShader(shader);
    throw new Error(log);
  }

  return shader;
}

export function createGlProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string
): GlProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();

  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error("Unable to allocate a WebGL program.");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) || "Unknown shader link error.";
    gl.deleteProgram(program);
    throw new Error(log);
  }

  const uniforms = new Map<string, WebGLUniformLocation>();
  let destroyed = false;

  return {
    program,
    use: () => gl.useProgram(program),
    uniform: (name) => {
      const cached = uniforms.get(name);
      if (cached) return cached;

      const location = gl.getUniformLocation(program, name);
      if (!location) throw new Error(`Shader uniform "${name}" is unavailable.`);
      uniforms.set(name, location);
      return location;
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      gl.deleteProgram(program);
      uniforms.clear();
    }
  };
}

export function createRenderTarget(
  gl: WebGL2RenderingContext,
  width: number,
  height: number
): RenderTarget {
  const texture = gl.createTexture();
  const framebuffer = gl.createFramebuffer();
  if (!texture || !framebuffer) {
    if (texture) gl.deleteTexture(texture);
    if (framebuffer) gl.deleteFramebuffer(framebuffer);
    throw new Error("Unable to allocate a WebGL render target.");
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    gl.deleteTexture(texture);
    gl.deleteFramebuffer(framebuffer);
    throw new Error("This device cannot render to floating-point WebGL textures.");
  }

  gl.viewport(0, 0, width, height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  let destroyed = false;
  return {
    texture,
    framebuffer,
    width,
    height,
    texelSizeX: 1 / width,
    texelSizeY: 1 / height,
    attach: (unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      return unit;
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      gl.deleteTexture(texture);
      gl.deleteFramebuffer(framebuffer);
    }
  };
}

export function createDoubleRenderTarget(
  gl: WebGL2RenderingContext,
  width: number,
  height: number
): DoubleRenderTarget {
  const target = {
    read: createRenderTarget(gl, width, height),
    write: createRenderTarget(gl, width, height),
    swap: () => {
      const previousRead = target.read;
      target.read = target.write;
      target.write = previousRead;
    },
    destroy: () => {
      target.read.destroy();
      target.write.destroy();
    }
  };

  return target;
}

export function blit(gl: WebGL2RenderingContext, target: RenderTarget | null): void {
  gl.bindFramebuffer(gl.FRAMEBUFFER, target?.framebuffer ?? null);
  gl.viewport(
    0,
    0,
    target?.width ?? gl.drawingBufferWidth,
    target?.height ?? gl.drawingBufferHeight
  );
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
