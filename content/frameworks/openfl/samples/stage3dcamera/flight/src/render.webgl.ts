import { drawGlScene3D } from '@flighthq/scene3d-gl';
import type { Camera3D, GlRenderState, Scene3DLights, Node3D } from '@flighthq/sdk';
import {
  createGlCanvasElement,
  createGlRenderState,
  registerUnlitGlMaterial,
  registerVertexColorGlMaterial,
  renderGlBackground,
} from '@flighthq/sdk';

import type {
  GlMeshMaterialRenderer,
  GlMeshProgram,
  Material,
  MeshGeometry,
  Scene3DLightBlock,
  Scene3DRenderProxy,
} from '@flighthq/sdk';
import {
  beginGlMeshDraw,
  compileGlProgram,
  drawGlMeshSubset,
  ensureGlScene3DProgram,
  getGlScene3DRuntime,
  registerGlMeshMaterialRenderer,
  setGlMeshViewProjection,
} from '@flighthq/sdk';
import { UnlitMaterialKind } from '@flighthq/sdk';

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
    _lights: Readonly<Scene3DLightBlock>,
    camera: Readonly<Camera3D>,
  ): void {
    const gl = state.gl;
    const program = ensureGlScene3DProgram<PassthroughProgram>(state, 'passthrough', (gl) => {
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

  draw(state: GlRenderState, proxy: Readonly<Scene3DRenderProxy>, geometry: Readonly<MeshGeometry>): void {
    const program = getGlScene3DRuntime(state).activeMeshProgram;
    if (program === null) return;
    drawGlMeshSubset(state, program, proxy, geometry);
  },
};

export function registerPassthroughGlMaterial(state: GlRenderState): void {
  registerGlMeshMaterialRenderer(state, UnlitMaterialKind, passthroughRenderer);
}

export interface SceneWebglPreview {
  canvas: HTMLCanvasElement;
  height: number;
  render: (scene: Readonly<Node3D>, camera: Readonly<Camera3D>, lights: Readonly<Scene3DLights>) => void;
  scale: number;
  state: GlRenderState;
  width: number;
}

export interface SceneWebglPreviewOptions {
  backgroundColor?: number;
  height?: number;
  passthrough?: boolean;
  registerUnlit?: boolean;
  registerVertexColor?: boolean;
  width?: number;
}

export function createSceneWebglPreview(options: Readonly<SceneWebglPreviewOptions> = {}): SceneWebglPreview {
  const width = options.width ?? 550;
  const height = options.height ?? 400;
  const pixelRatio = window.devicePixelRatio || 1;
  const mount = document.getElementById('app');
  const canvas = createGlCanvasElement(width, height, pixelRatio);

  if (mount) {
    mount.replaceWith(canvas);
  } else {
    document.body.appendChild(canvas);
  }

  document.body.style.margin = '0';

  const state = createGlRenderState(canvas, {
    backgroundColor: options.backgroundColor ?? 0xffffffff,
    contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: false },
    pixelRatio,
  });

  if (options.registerUnlit !== false) registerUnlitGlMaterial(state);
  if (options.registerVertexColor) registerVertexColorGlMaterial(state);
  if (options.passthrough) registerPassthroughGlMaterial(state);

  return {
    canvas,
    height,
    render(scene, camera, lights) {
      renderGlBackground(state);
      const gl = state.gl;
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.clearDepth(1);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      drawGlScene3D(state, scene, camera, lights);
    },
    scale: pixelRatio,
    state,
    width,
  };
}

export const preview = createSceneWebglPreview({ passthrough: true });
export const render = preview.render;
export const width = preview.width;
export const height = preview.height;
export const scale = preview.scale;
