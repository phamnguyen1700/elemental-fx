import type { Node } from "../engines/constraint-graph";
import type { AttachmentResource, VisualResource } from "../core/resources";
import { createGlProgram } from "../core/webgl";
import { Vec3 } from "../core/math/vec3";

const VS = `#version 300 es
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_uv;
layout(location = 2) in vec3 a_instance_pos;

uniform mat4 u_projection;
uniform float u_scale;

out vec2 v_uv;

void main() {
  v_uv = a_uv;
  vec3 pos = a_instance_pos + vec3(a_position * u_scale, 0.0);
  gl_Position = u_projection * vec4(pos, 1.0);
}
`;

const FS = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
void main() {
  float d = length(v_uv - 0.5);
  if(d > 0.5) discard;
  outColor = vec4(1.0, 0.8, 0.2, 1.0);
}
`;

export class AttachmentRenderer {
  private gl: WebGL2RenderingContext;
  private program: ReturnType<typeof createGlProgram>;
  private vao: WebGLVertexArrayObject;
  private quadVbo: WebGLBuffer;
  private instanceVbo: WebGLBuffer;
  private positionData: Float32Array;

  constructor(gl: WebGL2RenderingContext, maxInstances: number = 1000) {
    this.gl = gl;
    this.program = createGlProgram(gl, VS, FS);

    const quadVerts = new Float32Array([
      -0.5, -0.5, 0.0, 0.0, 0.5, -0.5, 1.0, 0.0, -0.5, 0.5, 0.0, 1.0, 0.5, 0.5, 1.0, 1.0
    ]);

    this.positionData = new Float32Array(maxInstances * 3);

    const vao = gl.createVertexArray();
    if (!vao) throw new Error("VAO creation failed");
    this.vao = vao;
    gl.bindVertexArray(vao);

    const quadVbo = gl.createBuffer();
    if (!quadVbo) throw new Error("Quad VBO creation failed");
    this.quadVbo = quadVbo;
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVbo);
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

    // a_position
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    // a_uv
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

    const instanceVbo = gl.createBuffer();
    if (!instanceVbo) throw new Error("VBO creation failed");
    this.instanceVbo = instanceVbo;
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceVbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.positionData.byteLength, gl.DYNAMIC_DRAW);

    // a_instance_pos
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 12, 0);
    gl.vertexAttribDivisor(2, 1); // instanced

    gl.bindVertexArray(null);
  }

  render(nodes: ReadonlyArray<Node>, projectionMatrix: Float32Array, scale = 5.0): void {
    this.renderPositions(
      nodes.map((node) => node.position),
      projectionMatrix,
      scale
    );
  }

  renderAttachments(
    attachments: ReadonlyArray<AttachmentPoint>,
    projectionMatrix: Float32Array,
    scale = 5.0
  ): void {
    this.renderPositions(attachments.map(resolveAttachmentPosition), projectionMatrix, scale);
  }

  renderPositions(
    positions: ReadonlyArray<Vec3>,
    projectionMatrix: Float32Array,
    scale = 5.0
  ): void {
    const gl = this.gl;
    this.program.use();

    // Update instance buffer
    let count = 0;
    for (const position of positions) {
      if (count >= this.positionData.length / 3) break;
      this.positionData[count * 3] = position.x;
      this.positionData[count * 3 + 1] = position.y;
      this.positionData[count * 3 + 2] = position.z;
      count++;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceVbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.positionData, 0, count * 3);

    const locProj = gl.getUniformLocation(this.program.program, "u_projection");
    gl.uniformMatrix4fv(locProj, false, projectionMatrix);

    const locScale = gl.getUniformLocation(this.program.program, "u_scale");
    gl.uniform1f(locScale, scale);

    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    gl.bindVertexArray(null);
  }

  destroy(): void {
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteBuffer(this.quadVbo);
    this.gl.deleteBuffer(this.instanceVbo);
    this.program.destroy();
  }
}

export type AttachmentPoint<T = VisualResource> =
  | ({ kind: "node"; node: Node; offset?: Vec3 } & AttachmentResource<T>)
  | ({
      kind: "segment";
      from: Node;
      to: Node;
      t: number;
      offset?: Vec3;
    } & AttachmentResource<T>);

export function resolveAttachmentPosition(attachment: AttachmentPoint): Vec3 {
  const offset = attachment.offset ?? new Vec3();
  if (attachment.kind === "node") {
    return attachment.node.position.clone().add(offset);
  }

  const t = Math.min(Math.max(attachment.t, 0), 1);
  return attachment.from.position.clone().lerp(attachment.to.position, t).add(offset);
}
