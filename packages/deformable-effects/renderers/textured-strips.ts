import type { TextureResource } from "../core/resources";
import { Vec3 } from "../core/math/vec3";
import type { Node } from "../engines/constraint-graph";
import { createGlProgram } from "../core/webgl";

const VS = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec2 a_uv;
uniform mat4 u_projection;
out vec2 v_uv;
void main() {
  v_uv = a_uv;
  gl_Position = u_projection * vec4(a_position, 1.0);
}
`;

const FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform vec4 u_color;
uniform sampler2D u_texture;
uniform bool u_use_texture;
uniform bool u_rotate_texture;
out vec4 outColor;
void main() {
  vec2 sampleUv = u_rotate_texture ? vec2(v_uv.y, v_uv.x) : v_uv;
  vec4 tex = u_use_texture ? texture(u_texture, sampleUv) : vec4(1.0);
  if (tex.a < 0.02) discard;
  outColor = tex * u_color;
}
`;

export interface TexturedStripRenderOptions {
  width?: number;
  color?: readonly [number, number, number, number];
  texture?: WebGLTexture | TextureResource;
  textureDirection?: "vertical" | "horizontal";
}

export class TexturedStripRenderer {
  private gl: WebGL2RenderingContext;
  private program: ReturnType<typeof createGlProgram>;
  private vao: WebGLVertexArrayObject;
  private vbo: WebGLBuffer;
  private vertexData: Float32Array;
  private cameraForward = new Vec3(0, 0, 1);

  constructor(gl: WebGL2RenderingContext, maxNodes = 2000) {
    this.gl = gl;
    this.program = createGlProgram(gl, VS, FS);
    this.vertexData = new Float32Array(maxNodes * 2 * 5);

    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    if (!vao || !vbo) throw new Error("Textured strip buffer creation failed");
    this.vao = vao;
    this.vbo = vbo;

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertexData.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12);
    gl.bindVertexArray(null);
  }

  renderChain(
    chain: ReadonlyArray<Node>,
    projectionMatrix: Float32Array,
    options: TexturedStripRenderOptions = {}
  ): void {
    this.renderChains([chain], projectionMatrix, options);
  }

  renderChains(
    chains: ReadonlyArray<ReadonlyArray<Node>>,
    projectionMatrix: Float32Array,
    options: TexturedStripRenderOptions = {}
  ): void {
    const width = options.width ?? 8;
    const color = options.color ?? [0.55, 0.45, 0.32, 1];
    const usableChains = chains.filter((chain) => chain.length >= 2);
    if (usableChains.length === 0) return;

    const requiredVertices =
      usableChains.reduce((sum, chain) => sum + chain.length * 2, 0) +
      Math.max(0, usableChains.length - 1) * 2;
    this.ensureCapacity(requiredVertices);

    let offset = 0;
    let hasPreviousChain = false;

    for (const chain of usableChains) {
      const first = chain[0]!.position;
      const firstRight = getTangent(chain, 0).cross(this.cameraForward).normalize();
      if (firstRight.lengthSq() < 1e-6) firstRight.set(1, 0, 0);
      firstRight.mul(width * 0.5);

      if (hasPreviousChain) {
        offset = copyStripVertex(this.vertexData, offset, offset - 5);
        offset = writeStripVertex(this.vertexData, offset, first, firstRight, -1, 0);
      }

      for (let i = 0; i < chain.length; i++) {
        const current = chain[i]!.position;
        const tangent = getTangent(chain, i);
        const right = tangent.cross(this.cameraForward).normalize();
        if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
        right.mul(width * 0.5);
        const v = i / (chain.length - 1);
        offset = writeStripVertex(this.vertexData, offset, current, right, -1, v);
        offset = writeStripVertex(this.vertexData, offset, current, right, 1, v);
      }
      hasPreviousChain = true;
    }

    const gl = this.gl;
    this.program.use();
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.program.program, "u_projection"),
      false,
      projectionMatrix
    );
    gl.uniform4f(
      gl.getUniformLocation(this.program.program, "u_color"),
      color[0],
      color[1],
      color[2],
      color[3]
    );
    const webglTexture = isWebGlTexture(options.texture) ? options.texture : undefined;
    gl.uniform1i(
      gl.getUniformLocation(this.program.program, "u_use_texture"),
      webglTexture ? 1 : 0
    );
    gl.uniform1i(
      gl.getUniformLocation(this.program.program, "u_rotate_texture"),
      options.textureDirection === "horizontal" ? 1 : 0
    );
    if (webglTexture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, webglTexture);
      gl.uniform1i(gl.getUniformLocation(this.program.program, "u_texture"), 0);
    }

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertexData, 0, offset);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, offset / 5);
    gl.bindVertexArray(null);
  }

  destroy(): void {
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteBuffer(this.vbo);
    this.program.destroy();
  }

  private ensureCapacity(vertexCount: number): void {
    if (vertexCount * 5 <= this.vertexData.length) return;
    const nextLength = Math.ceil(Math.max(vertexCount * 5, this.vertexData.length * 1.5));
    this.vertexData = new Float32Array(nextLength);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertexData.byteLength, this.gl.DYNAMIC_DRAW);
  }
}

function isWebGlTexture(
  texture: WebGLTexture | TextureResource | undefined
): texture is WebGLTexture {
  return typeof WebGLTexture !== "undefined" && texture instanceof WebGLTexture;
}

function getTangent(chain: ReadonlyArray<Node>, index: number): Vec3 {
  const current = chain[index]!.position;
  if (index === 0) return chain[index + 1]!.position.clone().sub(current).normalize();
  if (index === chain.length - 1)
    return current
      .clone()
      .sub(chain[index - 1]!.position)
      .normalize();
  return chain[index + 1]!.position.clone()
    .sub(chain[index - 1]!.position)
    .normalize();
}

function writeStripVertex(
  data: Float32Array,
  offset: number,
  center: Vec3,
  right: Vec3,
  side: -1 | 1,
  v: number
): number {
  data[offset++] = center.x + right.x * side;
  data[offset++] = center.y + right.y * side;
  data[offset++] = center.z + right.z * side;
  data[offset++] = side < 0 ? 0 : 1;
  data[offset++] = v;
  return offset;
}

function copyStripVertex(data: Float32Array, offset: number, sourceOffset: number): number {
  for (let index = 0; index < 5; index++) data[offset++] = data[sourceOffset + index] ?? 0;
  return offset;
}
