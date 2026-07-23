import type {
  Camera3D,
  GlMeshMaterialRenderer,
  GlRenderState,
  Material,
  MeshGeometry,
  SceneLightBlock,
  SceneRenderProxy,
} from '@flighthq/sdk';
import {
  beginGlMeshDraw,
  compileGlProgram,
  drawGlMeshSubset,
  ensureGlSceneProgram,
  getGlSceneRuntime,
  registerGlMeshMaterialRenderer,
  setGlMeshViewProjection,
} from '@flighthq/sdk';
import { UnlitMaterialKind } from '@flighthq/sdk';

import type { GlMeshProgram } from '@flighthq/scene-gl';

interface PassthroughProgram extends GlMeshProgram {
  locColor: WebGLUniformLocation | null;
  locColorMap: WebGLUniformLocation | null;
}

const VERT = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 3) in vec2 a_uv0;
uniform mat4 u_viewProjection;
uniform mat4 u_model;
out vec2 v_uv0;
void main() {
  v_uv0 = a_uv0;
  gl_Position = u_viewProjection * u_model * vec4(a_position, 1.0);
}
`;

// No srgbToLinear — direct texture passthrough like OpenFL's AGAL.
const FRAG = `#version 300 es
precision highp float;
in vec2 v_uv0;
uniform vec4 u_color;
uniform sampler2D u_colorMap;
out vec4 fragColor;
void main() {
  vec4 sampled = texture(u_colorMap, v_uv0);
  fragColor = u_color * sampled;
}
`;

const textureCache = new WeakMap<CanvasImageSource, WebGLTexture>();

function bindPassthroughTexture(gl: WebGL2RenderingContext, source: CanvasImageSource): void {
  let tex = textureCache.get(source);
  if (!tex) {
    tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // Straight alpha — no premultiplication, matching OpenFL's Stage3D texture upload.
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source as TexImageSource);
    textureCache.set(source, tex);
  } else {
    gl.bindTexture(gl.TEXTURE_2D, tex);
  }
}

const passthroughRenderer: GlMeshMaterialRenderer = {
  bind(
    state: GlRenderState,
    material: Readonly<Material> | null,
    _lights: Readonly<SceneLightBlock>,
    camera: Readonly<Camera3D>,
  ): void {
    const gl = state.gl;
    const program = ensureGlSceneProgram<PassthroughProgram>(state, 'passthrough', (gl) => {
      const prog = compileGlProgram(gl, VERT, FRAG);
      return {
        locColor: gl.getUniformLocation(prog, 'u_color'),
        locColorMap: gl.getUniformLocation(prog, 'u_colorMap'),
        locModel: gl.getUniformLocation(prog, 'u_model'),
        locNormalMatrix: null,
        locViewProjection: gl.getUniformLocation(prog, 'u_viewProjection'),
        program: prog,
      };
    });

    beginGlMeshDraw(state, program, material !== null && (material as { doubleSided?: boolean }).doubleSided === true);
    setGlMeshViewProjection(gl, program.locViewProjection, camera);

    gl.uniform4f(program.locColor, 1, 1, 1, 1);

    const unlit = material as { baseColorMap?: { image?: { source?: CanvasImageSource } } } | null;
    if (unlit?.baseColorMap?.image?.source) {
      gl.activeTexture(gl.TEXTURE0);
      bindPassthroughTexture(gl, unlit.baseColorMap.image.source);
      gl.uniform1i(program.locColorMap, 0);
    }
  },

  draw(state: GlRenderState, proxy: Readonly<SceneRenderProxy>, geometry: Readonly<MeshGeometry>): void {
    const program = getGlSceneRuntime(state).activeMeshProgram;
    if (program === null) return;
    drawGlMeshSubset(state, program, proxy, geometry);
  },
};

export function registerPassthroughGlMaterial(state: GlRenderState): void {
  registerGlMeshMaterialRenderer(state, UnlitMaterialKind, passthroughRenderer);
}
