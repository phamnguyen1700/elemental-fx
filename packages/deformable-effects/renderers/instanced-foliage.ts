import { createGlProgram, loadImageSource } from "../core/webgl";
import type {
  FoliageAsset,
  FoliageRenderConfig,
  FoliageRenderInstance,
} from "../effects/foliage-layer/types";

const FLOATS_PER_INSTANCE = 20;

const VS = `#version 300 es
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_uv;
layout(location = 2) in vec3 a_anchor;
layout(location = 3) in vec4 a_transform;
layout(location = 4) in vec4 a_tint;
layout(location = 5) in vec4 a_material;
layout(location = 6) in vec4 a_dynamics;

uniform mat4 u_projection;
uniform float u_time;
uniform float u_flutter_strength;
uniform float u_idle_flutter;

out vec2 v_uv;
out vec4 v_tint;
flat out float v_layer;
out float v_orientation_light;
out float v_depth;
out float v_kind;
out float v_contact;
out float v_backlight;
flat out float v_green_mask;

void main() {
  float angle = a_transform.x;
  float scale = a_transform.y;
  float aspect = a_transform.z;
  float flip = a_transform.w;
  float flexibility = a_material.y;
  float flutter = a_material.z;
  float phase = a_material.w;
  float motion = a_dynamics.x;
  float kind = a_dynamics.z;

  float idle = sin(u_time * (0.82 + flutter * 0.56) + phase + a_anchor.x * 0.018)
    * (0.025 + flutter * 0.055) * u_idle_flutter;
  float secondary = sin(u_time * (1.74 + flutter * 0.44) + phase * 1.73)
    * flutter * 0.018 * u_idle_flutter;
  float motionBend = clamp(motion * 0.032, -0.42, 0.42) * flexibility;
  float bend = (idle + secondary + motionBend) * u_flutter_strength;
  float resolvedAngle = angle + bend * 0.42;

  float localY = kind < 0.5 ? a_position.y - 0.5 : a_position.y;
  vec2 local = kind < 0.5
    ? vec2(a_position.x * scale * aspect, -localY * scale * flip)
    : vec2(a_position.x * scale * aspect * flip, -localY * scale);
  local.x += bend * scale * localY * abs(localY) * 0.34 * flip;
  float cosine = cos(resolvedAngle);
  float sine = sin(resolvedAngle);
  vec2 rotated = vec2(
    local.x * cosine - local.y * sine,
    local.x * sine + local.y * cosine
  );

  vec3 world = a_anchor + vec3(rotated, bend * localY * 2.4);
  gl_Position = u_projection * vec4(world, 1.0);

  v_uv = a_uv;
  v_tint = a_tint;
  v_layer = a_material.x;
  v_orientation_light = 0.5 + 0.5 * (sin(resolvedAngle) * 0.72 + cos(resolvedAngle) * 0.28);
  v_depth = a_dynamics.y;
  v_kind = kind;
  v_green_mask = step(1.5, a_dynamics.w);
  v_contact = a_dynamics.w - v_green_mask * 2.0;
  v_backlight = abs(sin(resolvedAngle - 0.72)) * (0.62 + kind * 0.38);
}
`;

const FS = `#version 300 es
precision highp float;
precision highp sampler2DArray;

in vec2 v_uv;
in vec4 v_tint;
flat in float v_layer;
in float v_orientation_light;
in float v_depth;
in float v_kind;
in float v_contact;
in float v_backlight;
flat in float v_green_mask;

uniform sampler2DArray u_textures;
uniform float u_alpha_cutoff;
uniform float u_ambient;
uniform float u_directional;
uniform float u_backlight;
uniform float u_depth_darkening;
uniform float u_contact_shadow;

out vec4 outColor;

void main() {
  vec4 texel = texture(u_textures, vec3(v_uv, v_layer));
  if (texel.a < u_alpha_cutoff) discard;
  if (v_green_mask > 0.5) {
    float channelMax = max(texel.r, max(texel.g, texel.b));
    float channelMin = min(texel.r, min(texel.g, texel.b));
    float chroma = channelMax - channelMin;
    bool greenDominant = texel.g >= texel.r * 0.74 && texel.g >= texel.b * 1.04;
    bool woodyStem = channelMax < 0.58
      && texel.r >= texel.g * 0.9
      && texel.g >= texel.b * 1.02;
    if ((!greenDominant || chroma < 0.055) && (!woodyStem || chroma < 0.025)) discard;
  }

  float depthLight = 1.0 - (1.0 - v_depth) * u_depth_darkening;
  float orientationLight = u_ambient + v_orientation_light * u_directional;
  float thinSurface = v_backlight * u_backlight * (0.72 + v_kind * 0.45);
  float stemContact = (1.0 - smoothstep(0.0, 0.32, v_uv.y))
    * u_contact_shadow
    * (0.35 + v_contact * 0.65);
  vec3 lit = texel.rgb * v_tint.rgb * (orientationLight * depthLight + thinSurface);
  lit *= 1.0 - stemContact;

  outColor = vec4(lit, texel.a * v_tint.a);
}
`;

export interface InstancedFoliageRendererOptions {
  maxInstances: number;
  depthRange: number;
  requiredResources?: ReadonlyArray<FoliageAsset>;
  onError?: (error: Error) => void;
  onReady?: () => void;
}

export class InstancedFoliageRenderer {
  private readonly program: ReturnType<typeof createGlProgram>;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadVbo: WebGLBuffer;
  private readonly instanceVbo: WebGLBuffer;
  private readonly instanceData: Float32Array;
  private readonly resourceLayers = new Map<string, number>();
  private readonly resourceAspects = new Map<string, number>();
  private textureArray: WebGLTexture | null = null;
  private destroyed = false;
  private loadError: Error | null = null;

  constructor(
    private readonly gl: WebGL2RenderingContext,
    resources: ReadonlyArray<FoliageAsset>,
    private readonly config: FoliageRenderConfig,
    private readonly options: InstancedFoliageRendererOptions,
  ) {
    this.program = createGlProgram(gl, VS, FS);
    this.instanceData = new Float32Array(
      options.maxInstances * FLOATS_PER_INSTANCE,
    );

    const vao = gl.createVertexArray();
    const quadVbo = gl.createBuffer();
    const instanceVbo = gl.createBuffer();
    if (!vao || !quadVbo || !instanceVbo) {
      throw new Error("Instanced foliage buffer creation failed.");
    }
    this.vao = vao;
    this.quadVbo = quadVbo;
    this.instanceVbo = instanceVbo;

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVbo);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -0.5, 0, 0, 0, 0.5, 0, 1, 0, -0.5, 1, 0, 1, 0.5, 1, 1, 1,
      ]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

    gl.bindBuffer(gl.ARRAY_BUFFER, instanceVbo);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      this.instanceData.byteLength,
      gl.DYNAMIC_DRAW,
    );
    const stride = FLOATS_PER_INSTANCE * 4;
    enableInstanceAttribute(gl, 2, 3, stride, 0);
    enableInstanceAttribute(gl, 3, 4, stride, 12);
    enableInstanceAttribute(gl, 4, 4, stride, 32);
    enableInstanceAttribute(gl, 5, 4, stride, 48);
    enableInstanceAttribute(gl, 6, 4, stride, 64);
    gl.bindVertexArray(null);

    void this.prepareTextureArray(resources);
  }

  render(
    instances: ReadonlyArray<FoliageRenderInstance>,
    projectionMatrix: Float32Array,
    time: number,
  ): void {
    if (this.destroyed || this.loadError || !this.textureArray) return;

    let count = 0;
    for (const instance of instances) {
      if (count >= this.options.maxInstances) break;
      const key = resourceKey(instance.resource);
      const layer = this.resourceLayers.get(key);
      const aspect = this.resourceAspects.get(key);
      if (layer === undefined || aspect === undefined) continue;

      const t = clamp01(instance.t);
      const from = instance.from.position;
      const to = instance.to.position;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.max(0.0001, Math.hypot(dx, dy));
      const tangentX = dx / length;
      const tangentY = dy / length;
      const normalX = -tangentY;
      const normalY = tangentX;
      const dynamicAnchor = instance.anchor?.position;
      const anchorX =
        (dynamicAnchor?.x ?? lerp(from.x, to.x, t)) +
        normalX * instance.lateralOffset +
        tangentX * instance.axialOffset;
      const anchorY =
        (dynamicAnchor?.y ?? lerp(from.y, to.y, t)) +
        normalY * instance.lateralOffset +
        tangentY * instance.axialOffset;
      const anchorZ =
        (dynamicAnchor?.z ?? lerp(from.z, to.z, t)) + instance.depthBias;
      const angle =
        (instance.kind === "branch"
          ? Math.atan2(tangentY, tangentX)
          : Math.atan2(tangentX, -tangentY)) + instance.orientationOffset;
      const velocityX =
        instance.anchor?.velocity.x ??
        lerp(instance.from.velocity.x, instance.to.velocity.x, t);
      const velocityY =
        instance.anchor?.velocity.y ??
        lerp(instance.from.velocity.y, instance.to.velocity.y, t);
      const motion = velocityX * normalX + velocityY * normalY;
      const restFrom = instance.from.restPosition;
      const restTo = instance.to.restPosition;
      const restDx = restTo.x - restFrom.x;
      const restDy = restTo.y - restFrom.y;
      const restLength = Math.max(0.0001, Math.hypot(restDx, restDy));
      const restTangentX = restDx / restLength;
      const restTangentY = restDy / restLength;
      const restNormalX = -restTangentY;
      const restNormalY = restTangentX;
      const restAnchor = instance.anchor?.restPosition;
      const restX =
        (restAnchor?.x ?? lerp(restFrom.x, restTo.x, t)) +
        restNormalX * instance.lateralOffset +
        restTangentX * instance.axialOffset;
      const restY =
        (restAnchor?.y ?? lerp(restFrom.y, restTo.y, t)) +
        restNormalY * instance.lateralOffset +
        restTangentY * instance.axialOffset;
      const contact = Math.min(
        1,
        Math.hypot(anchorX - restX, anchorY - restY) / 18,
      );
      const depth = clamp01(
        (anchorZ + this.options.depthRange) / (this.options.depthRange * 2),
      );
      const offset = count * FLOATS_PER_INSTANCE;

      this.instanceData[offset] = anchorX;
      this.instanceData[offset + 1] = anchorY;
      this.instanceData[offset + 2] = anchorZ;
      this.instanceData[offset + 3] = angle;
      const crossScale = Math.max(0.05, instance.crossScale);
      this.instanceData[offset + 4] =
        instance.kind === "branch"
          ? (instance.scale / Math.max(0.01, aspect)) * crossScale
          : instance.scale;
      this.instanceData[offset + 5] =
        instance.kind === "branch" ? aspect / crossScale : aspect;
      this.instanceData[offset + 6] = instance.flip;
      this.instanceData[offset + 7] = depth;
      this.instanceData[offset + 8] = instance.tint[0];
      this.instanceData[offset + 9] = instance.tint[1];
      this.instanceData[offset + 10] = instance.tint[2];
      this.instanceData[offset + 11] = instance.tint[3];
      this.instanceData[offset + 12] = layer;
      this.instanceData[offset + 13] = instance.flexibility;
      this.instanceData[offset + 14] = instance.flutter;
      this.instanceData[offset + 15] = instance.phase;
      this.instanceData[offset + 16] = motion;
      this.instanceData[offset + 17] = depth;
      this.instanceData[offset + 18] = resolveKindCode(instance.kind);
      this.instanceData[offset + 19] = contact + (instance.greenMask ? 2 : 0);
      count++;
    }

    if (count === 0) return;
    const gl = this.gl;
    this.program.use();
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.program.program, "u_projection"),
      false,
      projectionMatrix,
    );
    gl.uniform1f(gl.getUniformLocation(this.program.program, "u_time"), time);
    gl.uniform1f(
      gl.getUniformLocation(this.program.program, "u_flutter_strength"),
      this.config.flutterStrength,
    );
    gl.uniform1f(
      gl.getUniformLocation(this.program.program, "u_idle_flutter"),
      this.config.idleFlutter,
    );
    gl.uniform1f(
      gl.getUniformLocation(this.program.program, "u_alpha_cutoff"),
      this.config.alphaCutoff,
    );
    gl.uniform1f(
      gl.getUniformLocation(this.program.program, "u_ambient"),
      this.config.ambientLight,
    );
    gl.uniform1f(
      gl.getUniformLocation(this.program.program, "u_directional"),
      this.config.directionalLight,
    );
    gl.uniform1f(
      gl.getUniformLocation(this.program.program, "u_backlight"),
      this.config.backlight,
    );
    gl.uniform1f(
      gl.getUniformLocation(this.program.program, "u_depth_darkening"),
      this.config.depthDarkening,
    );
    gl.uniform1f(
      gl.getUniformLocation(this.program.program, "u_contact_shadow"),
      this.config.contactShadow,
    );
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.textureArray);
    gl.uniform1i(gl.getUniformLocation(this.program.program, "u_textures"), 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceVbo);
    gl.bufferSubData(
      gl.ARRAY_BUFFER,
      0,
      this.instanceData,
      0,
      count * FLOATS_PER_INSTANCE,
    );
    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    gl.bindVertexArray(null);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteBuffer(this.quadVbo);
    this.gl.deleteBuffer(this.instanceVbo);
    if (this.textureArray) this.gl.deleteTexture(this.textureArray);
    this.textureArray = null;
    this.program.destroy();
  }

  private async prepareTextureArray(
    resources: ReadonlyArray<FoliageAsset>,
  ): Promise<void> {
    try {
      const uniqueResources = dedupeResources(resources);
      const maxLayers = this.gl.getParameter(
        this.gl.MAX_ARRAY_TEXTURE_LAYERS,
      ) as number;
      if (uniqueResources.length > maxLayers) {
        throw new Error(
          `Foliage resource count (${uniqueResources.length}) exceeds the WebGL layer limit (${maxLayers}).`,
        );
      }
      const settled = await Promise.allSettled(
        uniqueResources.map(async (resource) => ({
          resource,
          image: await loadImageSource(resource.handle),
        })),
      );
      const images = settled.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      settled.forEach((result) => {
        if (result.status === "rejected")
          this.options.onError?.(asError(result.reason));
      });
      const loadedKeys = new Set(
        images.map(({ resource }) => resourceKey(resource)),
      );
      const required = dedupeResources(this.options.requiredResources ?? []);
      if (
        required.length > 0 &&
        required.every((resource) => !loadedKeys.has(resourceKey(resource)))
      ) {
        throw new Error(
          "VineLayer could not load any required branch resource.",
        );
      }
      if (images.length === 0)
        throw new Error("VineLayer could not load any visual resource.");
      if (this.destroyed) return;

      const size = Math.max(32, Math.floor(this.config.atlasResolution));
      const levels = Math.floor(Math.log2(size)) + 1;
      const texture = this.gl.createTexture();
      if (!texture) throw new Error("Foliage texture-array creation failed.");
      this.textureArray = texture;
      this.gl.bindTexture(this.gl.TEXTURE_2D_ARRAY, texture);
      this.gl.texStorage3D(
        this.gl.TEXTURE_2D_ARRAY,
        levels,
        this.gl.RGBA8,
        size,
        size,
        images.length,
      );
      this.gl.texParameteri(
        this.gl.TEXTURE_2D_ARRAY,
        this.gl.TEXTURE_MIN_FILTER,
        this.gl.LINEAR_MIPMAP_LINEAR,
      );
      this.gl.texParameteri(
        this.gl.TEXTURE_2D_ARRAY,
        this.gl.TEXTURE_MAG_FILTER,
        this.gl.LINEAR,
      );
      const anisotropy = this.gl.getExtension("EXT_texture_filter_anisotropic");

      if (anisotropy) {
        const maxAnisotropy = this.gl.getParameter(
          anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT,
        ) as number;

        this.gl.texParameterf(
          this.gl.TEXTURE_2D_ARRAY,
          anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,
          Math.min(8, maxAnisotropy),
        );
      }
      this.gl.texParameteri(
        this.gl.TEXTURE_2D_ARRAY,
        this.gl.TEXTURE_WRAP_S,
        this.gl.CLAMP_TO_EDGE,
      );
      this.gl.texParameteri(
        this.gl.TEXTURE_2D_ARRAY,
        this.gl.TEXTURE_WRAP_T,
        this.gl.CLAMP_TO_EDGE,
      );
      this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, 1);
      this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);

      const staging = document.createElement("canvas");
      staging.width = size;
      staging.height = size;
      const context = staging.getContext("2d");
      if (!context)
        throw new Error("Foliage texture staging canvas is unavailable.");

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      images.forEach(({ resource, image }, layer) => {
        context.clearRect(0, 0, size, size);
        context.drawImage(image, 0, 0, size, size);
        this.gl.texSubImage3D(
          this.gl.TEXTURE_2D_ARRAY,
          0,
          0,
          0,
          layer,
          size,
          size,
          1,
          this.gl.RGBA,
          this.gl.UNSIGNED_BYTE,
          staging,
        );
        const key = resourceKey(resource);
        this.resourceLayers.set(key, layer);
        this.resourceAspects.set(
          key,
          image.naturalWidth / Math.max(1, image.naturalHeight),
        );
      });

      this.gl.generateMipmap(this.gl.TEXTURE_2D_ARRAY);
      this.gl.bindTexture(this.gl.TEXTURE_2D_ARRAY, null);
      this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, 0);
      this.options.onReady?.();
    } catch (error) {
      this.loadError = asError(error);
      this.options.onError?.(this.loadError);
    }
  }
}

function enableInstanceAttribute(
  gl: WebGL2RenderingContext,
  location: number,
  size: number,
  stride: number,
  offset: number,
): void {
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset);
  gl.vertexAttribDivisor(location, 1);
}

function dedupeResources(
  resources: ReadonlyArray<FoliageAsset>,
): FoliageAsset[] {
  const result: FoliageAsset[] = [];
  const seen = new Set<string>();
  for (const resource of resources) {
    const key = resourceKey(resource);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(resource);
  }
  return result;
}

function resourceKey(resource: FoliageAsset): string {
  return String(resource.handle);
}

function resolveKindCode(kind: FoliageRenderInstance["kind"]): number {
  if (kind === "flower") return 1;
  if (kind === "leaf") return 2;
  return 0;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
