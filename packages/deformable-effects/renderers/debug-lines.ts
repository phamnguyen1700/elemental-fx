import type { Node } from "../engines/constraint-graph";
import type { Constraint } from "../engines/constraint-graph";
import { DistanceConstraint } from "../constraints/distance";
import { AngularConstraint } from "../constraints/angular";
import { PathDirectionConstraint } from "../constraints/path-direction";
import { SegmentAttachmentConstraint } from "../constraints/segment-attachment";
import { createGlProgram } from "../core/webgl";
import { Vec3 } from "../core/math/vec3";

export class DebugRenderer {
  gl: WebGL2RenderingContext;
  program: ReturnType<typeof createGlProgram>;
  vao: WebGLVertexArrayObject | null;
  vbo: WebGLBuffer | null;
  capacity: number;

  constructor(gl: WebGL2RenderingContext, capacity = 10000) {
    this.gl = gl;
    this.capacity = capacity;

    const vs = `#version 300 es
      in vec3 a_position;
      in vec4 a_color;
      uniform mat4 u_projection;
      out vec4 v_color;
      void main() {
        gl_Position = u_projection * vec4(a_position, 1.0);
        v_color = a_color;
      }
    `;
    const fs = `#version 300 es
      precision mediump float;
      in vec4 v_color;
      out vec4 outColor;
      void main() {
        outColor = v_color;
      }
    `;

    this.program = createGlProgram(gl, vs, fs);
    this.vao = gl.createVertexArray();
    this.vbo = gl.createBuffer();

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

    // 7 floats per vertex: x, y, z, r, g, b, a
    gl.bufferData(gl.ARRAY_BUFFER, capacity * 7 * 4, gl.DYNAMIC_DRAW);

    const posLoc = gl.getAttribLocation(this.program.program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 28, 0);

    const colLoc = gl.getAttribLocation(this.program.program, "a_color");
    gl.enableVertexAttribArray(colLoc);
    gl.vertexAttribPointer(colLoc, 4, gl.FLOAT, false, 28, 12);

    gl.bindVertexArray(null);
  }

  render(
    nodes: ReadonlyArray<Node>,
    constraints: ReadonlyArray<Constraint>,
    projectionMatrix: Float32Array,
    pointer?: { from: Vec3; to: Vec3; radius: number }
  ): void {
    const gl = this.gl;

    let vertexCount = 0;
    const pointerSegments = 20;
    const maxVertices =
      constraints.length * 2 + nodes.length * 4 + (pointer ? 6 + pointerSegments * 4 : 0);
    this.ensureCapacity(maxVertices);

    const data = new Float32Array(maxVertices * 7);
    let offset = 0;

    const addLinePositions = (p1: Vec3, p2: Vec3, r: number, g: number, b: number) => {
      data[offset++] = p1.x;
      data[offset++] = p1.y;
      data[offset++] = p1.z;
      data[offset++] = r;
      data[offset++] = g;
      data[offset++] = b;
      data[offset++] = 1.0;

      data[offset++] = p2.x;
      data[offset++] = p2.y;
      data[offset++] = p2.z;
      data[offset++] = r;
      data[offset++] = g;
      data[offset++] = b;
      data[offset++] = 1.0;
      vertexCount += 2;
    };
    const addLine = (p1: Node, p2: Node, r: number, g: number, b: number) =>
      addLinePositions(p1.position, p2.position, r, g, b);

    for (const c of constraints) {
      if (c instanceof DistanceConstraint) {
        const isBranch =
          c.nodeA.metadata.vineRole === "branch" ||
          c.nodeB.metadata.vineRole === "branch";
        if (isBranch) addLine(c.nodeA, c.nodeB, 1, 0.48, 0.2);
        else addLine(c.nodeA, c.nodeB, 0.38, 0.62, 1);
      } else if (c instanceof SegmentAttachmentConstraint) {
        addLinePositions(c.carrier.position, c.getTarget(), 0.96, 0.28, 0.72);
      } else if (c instanceof PathDirectionConstraint) {
        addLine(c.root, c.child, 0.98, 0.68, 0.24);
      } else if (c instanceof AngularConstraint) {
        addLine(c.nodeA, c.nodeB, 1.0, 0.5, 0.5); // Red for angular
      }
    }

    for (const node of nodes) {
      const isAnchor = node.isPinned || node.metadata.anchor === "soft";
      const role = node.metadata.vineRole;
      const isGrowth = role === "growth-node";
      const isBranch = role === "branch";
      const size = isAnchor ? 2.5 : isGrowth ? 2.2 : isBranch ? 1.7 : 1.5;
      const depth = Math.min(1, Math.max(0, (node.position.z + 100) / 200));
      const color = isAnchor
        ? [1, 0.85, 0.25]
        : isGrowth
          ? [0.98, 0.28, 0.72]
          : isBranch
            ? [1, 0.52, 0.22]
            : [0.35 + depth * 0.4, 0.95 - depth * 0.25, 0.75];
      addLinePositions(
        node.position.clone().add(new Vec3(-size, 0, 0)),
        node.position.clone().add(new Vec3(size, 0, 0)),
        color[0]!,
        color[1]!,
        color[2]!
      );
      addLinePositions(
        node.position.clone().add(new Vec3(0, -size, 0)),
        node.position.clone().add(new Vec3(0, size, 0)),
        color[0]!,
        color[1]!,
        color[2]!
      );
    }

    if (pointer) {
      addLinePositions(pointer.from, pointer.to, 0.95, 0.95, 0.95);
      const movement = pointer.to.clone().sub(pointer.from);
      const movementLength = Math.hypot(movement.x, movement.y);
      const normal =
        movementLength > 0.0001
          ? new Vec3(-movement.y / movementLength, movement.x / movementLength, 0)
          : new Vec3(0, 1, 0);
      addLinePositions(
        pointer.from.clone().addScaled(normal, pointer.radius),
        pointer.to.clone().addScaled(normal, pointer.radius),
        0.95,
        0.95,
        0.95
      );
      addLinePositions(
        pointer.from.clone().addScaled(normal, -pointer.radius),
        pointer.to.clone().addScaled(normal, -pointer.radius),
        0.95,
        0.95,
        0.95
      );
      for (const center of [pointer.from, pointer.to]) {
        for (let index = 0; index < pointerSegments; index++) {
          const angle = (index / pointerSegments) * Math.PI * 2;
          const nextAngle = ((index + 1) / pointerSegments) * Math.PI * 2;
          addLinePositions(
            center
              .clone()
              .add(new Vec3(Math.cos(angle) * pointer.radius, Math.sin(angle) * pointer.radius, 0)),
            center
              .clone()
              .add(
                new Vec3(
                  Math.cos(nextAngle) * pointer.radius,
                  Math.sin(nextAngle) * pointer.radius,
                  0
                )
              ),
            0.95,
            0.95,
            0.95
          );
        }
      }
    }

    this.program.use();

    const projLoc = gl.getUniformLocation(this.program.program, "u_projection");
    gl.uniformMatrix4fv(projLoc, false, projectionMatrix);

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data.subarray(0, offset));

    gl.drawArrays(gl.LINES, 0, vertexCount);
    gl.bindVertexArray(null);
  }

  destroy(): void {
    this.program.destroy();
    if (this.vao) this.gl.deleteVertexArray(this.vao);
    if (this.vbo) this.gl.deleteBuffer(this.vbo);
  }

  private ensureCapacity(vertexCount: number): void {
    if (vertexCount <= this.capacity || !this.vbo) return;
    this.capacity = Math.ceil(vertexCount * 1.5);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.capacity * 7 * 4, this.gl.DYNAMIC_DRAW);
  }
}
