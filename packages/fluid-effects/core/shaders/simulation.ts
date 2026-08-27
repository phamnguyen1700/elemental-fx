export const CLEAR_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D uTexture;
uniform float uValue;
out vec4 outColor;

void main() {
  outColor = texture(uTexture, vUv) * uValue;
}
`;

export const SPLAT_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D uTarget;
uniform float uAspectRatio;
uniform vec2 uPoint;
uniform float uRadius;
uniform vec4 uValue;
out vec4 outColor;

void main() {
  vec2 offset = vUv - uPoint;
  offset.x *= uAspectRatio;
  float influence = exp(-dot(offset, offset) / max(uRadius * uRadius, 0.000001));
  outColor = texture(uTarget, vUv) + uValue * influence;
}
`;

export const ADVECTION_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uVelocityTexelSize;
uniform vec2 uSourceTexelSize;
uniform float uDeltaTime;
uniform float uDissipation;
out vec4 outColor;

vec4 bilerp(sampler2D source, vec2 uv, vec2 texelSize) {
  vec2 position = uv / texelSize - 0.5;
  vec2 index = floor(position);
  vec2 fraction = fract(position);
  vec2 lower = (index + 0.5) * texelSize;

  vec4 a = texture(source, lower);
  vec4 b = texture(source, lower + vec2(texelSize.x, 0.0));
  vec4 c = texture(source, lower + vec2(0.0, texelSize.y));
  vec4 d = texture(source, lower + texelSize);
  return mix(mix(a, b, fraction.x), mix(c, d, fraction.x), fraction.y);
}

void main() {
  vec2 velocity = bilerp(uVelocity, vUv, uVelocityTexelSize).xy;
  vec2 coordinate = vUv - uDeltaTime * velocity * uVelocityTexelSize;
  float decay = 1.0 + uDissipation * uDeltaTime;
  outColor = bilerp(uSource, coordinate, uSourceTexelSize) / decay;
}
`;

export const CURL_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;
out vec4 outColor;

void main() {
  float left = texture(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).y;
  float right = texture(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).y;
  float bottom = texture(uVelocity, vUv - vec2(0.0, uTexelSize.y)).x;
  float top = texture(uVelocity, vUv + vec2(0.0, uTexelSize.y)).x;
  float value = 0.5 * (right - left - top + bottom);
  outColor = vec4(value, 0.0, 0.0, 1.0);
}
`;

export const VORTICITY_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform vec2 uTexelSize;
uniform float uCurlStrength;
uniform float uDeltaTime;
out vec4 outColor;

void main() {
  float left = abs(texture(uCurl, vUv - vec2(uTexelSize.x, 0.0)).x);
  float right = abs(texture(uCurl, vUv + vec2(uTexelSize.x, 0.0)).x);
  float bottom = abs(texture(uCurl, vUv - vec2(0.0, uTexelSize.y)).x);
  float top = abs(texture(uCurl, vUv + vec2(0.0, uTexelSize.y)).x);
  float center = texture(uCurl, vUv).x;

  vec2 force = 0.5 * vec2(top - bottom, right - left);
  force /= length(force) + 0.0001;
  force *= uCurlStrength * center;
  force.y *= -1.0;

  vec2 velocity = texture(uVelocity, vUv).xy + force * uDeltaTime;
  outColor = vec4(velocity, 0.0, 1.0);
}
`;

export const DIVERGENCE_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;
out vec4 outColor;

void main() {
  vec2 center = texture(uVelocity, vUv).xy;
  float left = texture(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;
  float right = texture(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;
  float bottom = texture(uVelocity, vUv - vec2(0.0, uTexelSize.y)).y;
  float top = texture(uVelocity, vUv + vec2(0.0, uTexelSize.y)).y;

  if (vUv.x < uTexelSize.x) left = -center.x;
  if (vUv.x > 1.0 - uTexelSize.x) right = -center.x;
  if (vUv.y < uTexelSize.y) bottom = -center.y;
  if (vUv.y > 1.0 - uTexelSize.y) top = -center.y;

  float divergence = 0.5 * (right - left + top - bottom);
  outColor = vec4(divergence, 0.0, 0.0, 1.0);
}
`;

export const PRESSURE_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexelSize;
out vec4 outColor;

void main() {
  float left = texture(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
  float right = texture(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
  float bottom = texture(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
  float top = texture(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
  float divergence = texture(uDivergence, vUv).x;
  float pressure = (left + right + bottom + top - divergence) * 0.25;
  outColor = vec4(pressure, 0.0, 0.0, 1.0);
}
`;

export const GRADIENT_SUBTRACT_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;
out vec4 outColor;

void main() {
  float left = texture(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
  float right = texture(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
  float bottom = texture(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
  float top = texture(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
  vec2 velocity = texture(uVelocity, vUv).xy;
  velocity -= 0.5 * vec2(right - left, top - bottom);
  outColor = vec4(velocity, 0.0, 1.0);
}
`;

export const DISPLAY_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D uTexture;
out vec4 outColor;

void main() {
  vec4 dye = texture(uTexture, vUv);
  outColor = vec4(clamp(dye.rgb, 0.0, 1.0), clamp(dye.a, 0.0, 1.0));
}
`;
