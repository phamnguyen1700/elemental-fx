import type { Constraint, Node } from "../engines/constraint-graph";
import type { TopologyEdge } from "../topologies";
import { DistanceConstraint } from "../constraints/distance";
import { AngularConstraint } from "../constraints/angular";
import { createGlProgram } from "../core/webgl";

const VS = `#version 300 es
layout(location = 0) in vec3 a_position;
uniform mat4 u_projection;
void main() {
  gl_Position = u_projection * vec4(a_position, 1.0);
}
`;

const FS = `#version 300 es
precision highp float;
uniform vec4 u_color;
out vec4 outColor;
void main() {
  outColor = u_color;
}
`;

export interface LineRendererConfig {
  maxSegments?: number;
  color?: readonly [number, number, number, number];
  lineWidth?: number;
}

export class LineRenderer {
  private gl: WebGL2RenderingContext;
  private program: ReturnType<typeof createGlProgram>;
  private vao: WebGLVertexArrayObject;
  private vbo: WebGLBuffer;
  private vertexData: Float32Array;
  private color: readonly [number, number, number, number];
  private maxSegments: number;
  private lineWidth: number;

  constructor(gl: WebGL2RenderingContext, config: LineRendererConfig = {}) {
    this.gl = gl;
    this.maxSegments = config.maxSegments ?? 10000;
    this.color = config.color ?? [0.78, 0.82, 0.86, 1];
    this.lineWidth = config.lineWidth ?? 1;
    this.program = createGlProgram(gl, VS, FS);
    this.vertexData = new Float32Array(this.maxSegments * 2 * 3);

    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    if (!vao || !vbo) throw new Error("Line renderer buffer creation failed");
    this.vao = vao;
    this.vbo = vbo;

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertexData.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  renderFromConstraints(
    constraints: Constraint[],
    projectionMatrix: Float32Array,
    color = this.color
  ): void {
    const edges = constraints.flatMap((constraint) =>
      constraint instanceof DistanceConstraint || constraint instanceof AngularConstraint
        ? [{ from: constraint.nodeA, to: constraint.nodeB }]
        : []
    );
    this.renderEdges(edges, projectionMatrix, color);
  }

  renderEdges(
    edges: ReadonlyArray<Pick<TopologyEdge, "from" | "to">>,
    projectionMatrix: Float32Array,
    color = this.color
  ): void {
    let offset = 0;
    const segmentCount = Math.min(edges.length, this.maxSegments);
    for (let i = 0; i < segmentCount; i++) {
      const edge = edges[i]!;
      offset = writePosition(this.vertexData, offset, edge.from);
      offset = writePosition(this.vertexData, offset, edge.to);
    }
    this.draw(offset / 3, projectionMatrix, color);
  }

  renderChains(
    chains: ReadonlyArray<ReadonlyArray<Node>>,
    projectionMatrix: Float32Array,
    color = this.color
  ): void {
    let offset = 0;
    let segments = 0;
    for (const chain of chains) {
      for (let i = 1; i < chain.length && segments < this.maxSegments; i++) {
        offset = writePosition(this.vertexData, offset, chain[i - 1]!);
        offset = writePosition(this.vertexData, offset, chain[i]!);
        segments++;
      }
    }
    this.draw(offset / 3, projectionMatrix, color);
  }

  destroy(): void {
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteBuffer(this.vbo);
    this.program.destroy();
  }

  private draw(
    vertexCount: number,
    projectionMatrix: Float32Array,
    color: readonly [number, number, number, number]
  ): void {
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
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertexData, 0, vertexCount * 3);
    gl.lineWidth(this.lineWidth);
    gl.drawArrays(gl.LINES, 0, vertexCount);
    gl.bindVertexArray(null);
  }
}

function writePosition(data: Float32Array, offset: number, node: Node): number {
  data[offset++] = node.position.x;
  data[offset++] = node.position.y;
  data[offset++] = node.position.z;
  return offset;
}
