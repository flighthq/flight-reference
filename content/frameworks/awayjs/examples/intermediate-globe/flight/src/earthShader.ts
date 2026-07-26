import type { GlRenderState } from '@flighthq/sdk';
import { registerCustomShaderGlMaterial, registerGlCustomMaterialShader } from '@flighthq/sdk';

// Earth day/night: an opaque custom shader that lights the day texture by the sun and cross-fades to
// the city-lights texture on the night side (AwayJS composited the night lights as the ambient term).
// It is one OPAQUE material because custom-shader materials only draw in drawGlScene3D's opaque pass,
// not its transparent pass. Specular is the ocean mask; sRGB textures are decoded to linear here so
// the linear->sRGB present pass encodes once.
export function registerEarthShader(state: GlRenderState): void {
  registerCustomShaderGlMaterial(state);
  registerGlCustomMaterialShader(state, 'globeEarth', {
    vertex: `#version 300 es
in vec3 a_position;
in vec3 a_normal;
in vec2 a_uv0;
uniform mat4 u_viewProjection;
uniform mat4 u_model;
uniform mat3 u_normalMatrix;
out vec3 v_normal;
out vec3 v_worldPos;
out vec2 v_uv;
void main() {
  vec4 worldPos = u_model * vec4(a_position, 1.0);
  v_worldPos = worldPos.xyz;
  v_normal = normalize(u_normalMatrix * a_normal);
  v_uv = a_uv0;
  gl_Position = u_viewProjection * worldPos;
}`,
    fragment: `#version 300 es
precision highp float;
in vec3 v_normal;
in vec3 v_worldPos;
in vec2 v_uv;
uniform sampler2D u_dayTex;
uniform sampler2D u_nightTex;
uniform sampler2D u_specTex;
uniform vec3 u_sunDir;
uniform vec3 u_cameraPosition;
out vec4 o_color;
vec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }
void main() {
  vec3 N = normalize(v_normal);
  vec3 L = -normalize(u_sunDir);
  float ndl = dot(N, L);
  float dayAmount = smoothstep(-0.05, 0.2, ndl);
  vec3 day = toLinear(texture(u_dayTex, v_uv).rgb);
  vec3 night = toLinear(texture(u_nightTex, v_uv).rgb);
  vec3 ambient = vec3(0.04, 0.05, 0.08);
  vec3 dayColor = day * (max(ndl, 0.0) * 1.25 + ambient);
  vec3 V = normalize(u_cameraPosition - v_worldPos);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 40.0) * texture(u_specTex, v_uv).r * step(0.0, ndl);
  dayColor += vec3(0.3, 0.36, 0.5) * spec;
  vec3 cities = max(night - vec3(0.03, 0.05, 0.12), 0.0) * 6.0;
  vec3 nightColor = night * 0.5 + cities;
  o_color = vec4(mix(nightColor, dayColor, dayAmount), 1.0);
}`,
  });
}
