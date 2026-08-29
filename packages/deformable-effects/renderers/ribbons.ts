import type { Node } from "../engines/constraint-graph";
import { createGlProgram } from "../core/webgl";
import { Vec3 } from "../core/math/vec3";

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

export class RibbonRenderer {
  private gl: WebGL2RenderingContext;
  private program: ReturnType<typeof createGlProgram>;
  private vao: WebGLVertexArrayObject;
  private vbo: WebGLBuffer;
  private vertexData: Float32Array;
  private cameraFwd: Vec3 = new Vec3(0, 0, 1);

  constructor(gl: WebGL2RenderingContext, maxNodes: number = 2000) {
    this.gl = gl;
    this.program = createGlProgram(gl, VS, FS);

    // Each node generates 2 vertices for the ribbon strip
    this.vertexData = new Float32Array(maxNodes * 2 * 3);

    const vao = gl.createVertexArray();
    if (!vao) throw new Error("VAO creation failed");
    this.vao = vao;
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer();
    if (!vbo) throw new Error("VBO creation failed");
    this.vbo = vbo;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertexData.byteLength, gl.DYNAMIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
  }

  // Expects strands (arrays of nodes)
  render(
    strands: ReadonlyArray<ReadonlyArray<Node>>,
    width: number,
    projectionMatrix: Float32Array,
    color: readonly [number, number, number, number] = [0.2, 0.7, 0.4, 1]
  ): void {
    const gl = this.gl;
    this.program.use();

    const locProj = gl.getUniformLocation(this.program.program, "u_projection");
    gl.uniformMatrix4fv(locProj, false, projectionMatrix);
    const locColor = gl.getUniformLocation(this.program.program, "u_color");
    gl.uniform4f(locColor, color[0], color[1], color[2], color[3]);

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

    for (const strand of strands) {
      if (strand.length < 2) continue;

      let vertexCount = 0;
      for (let i = 0; i < strand.length; i++) {
        const current = strand[i]!.position;
        // calculate tangent
        let tangent: Vec3;
        if (i === 0) {
          tangent = strand[i + 1]!.position.clone().sub(current).normalize();
        } else if (i === strand.length - 1) {
          tangent = current
            .clone()
            .sub(strand[i - 1]!.position)
            .normalize();
        } else {
          const prev = strand[i - 1]!.position;
          const next = strand[i + 1]!.position;
          tangent = next.clone().sub(prev).normalize();
        }

        // normal to tangent and camera forward gives the ribbon width vector
        const right = tangent.cross(this.cameraFwd).normalize();
        if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
        right.mul(width * 0.5);

        // left vertex
        this.vertexData[vertexCount * 3] = current.x - right.x;
        this.vertexData[vertexCount * 3 + 1] = current.y - right.y;
        this.vertexData[vertexCount * 3 + 2] = current.z - right.z;
        vertexCount++;

        // right vertex
        this.vertexData[vertexCount * 3] = current.x + right.x;
        this.vertexData[vertexCount * 3 + 1] = current.y + right.y;
        this.vertexData[vertexCount * 3 + 2] = current.z + right.z;
        vertexCount++;
      }

      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertexData, 0, vertexCount * 3);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexCount);
    }

    gl.bindVertexArray(null);
  }

  destroy() {
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteBuffer(this.vbo);
    this.program.destroy();
  }
}
