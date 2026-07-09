import { drawGlScene } from '@flighthq/scene-gl';
import type { Camera, GlRenderState, SceneLights, SceneNode } from '@flighthq/sdk';
import {
  createGlCanvasElement,
  createGlRenderState,
  registerUnlitGlMaterial,
  registerVertexColorGlMaterial,
  renderGlBackground,
} from '@flighthq/sdk';

export interface SceneWebglPreview {
  canvas: HTMLCanvasElement;
  height: number;
  render: (scene: Readonly<SceneNode>, camera: Readonly<Camera>, lights: Readonly<SceneLights>) => void;
  scale: number;
  state: GlRenderState;
  width: number;
}

export interface SceneWebglPreviewOptions {
  backgroundColor?: number;
  gammaCorrect?: boolean;
  height?: number;
  registerUnlit?: boolean;
  registerVertexColor?: boolean;
  width?: number;
}

interface GammaCorrectionPass {
  depthRenderbuffer: WebGLRenderbuffer;
  framebuffer: WebGLFramebuffer;
  program: WebGLProgram;
  texture: WebGLTexture;
  vao: WebGLVertexArrayObject;
}

function createGammaCorrectionPass(gl: WebGL2RenderingContext, w: number, h: number): GammaCorrectionPass {
  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const depthRenderbuffer = gl.createRenderbuffer()!;
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderbuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);

  const framebuffer = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRenderbuffer);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  const vs = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(
    vs,
    `#version 300 es
    const vec2 pos[3] = vec2[](vec2(-1,-1), vec2(3,-1), vec2(-1,3));
    out vec2 v_uv;
    void main() { v_uv = pos[gl_VertexID] * 0.5 + 0.5; gl_Position = vec4(pos[gl_VertexID], 0, 1); }`,
  );
  gl.compileShader(vs);

  const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(
    fs,
    `#version 300 es
    precision highp float;
    in vec2 v_uv;
    uniform sampler2D u_tex;
    out vec4 o;
    vec3 linearToSrgb(vec3 c) {
      vec3 lo = c * 12.92;
      vec3 hi = pow(c, vec3(1.0/2.4)) * 1.055 - 0.055;
      return mix(lo, hi, step(0.0031308, c));
    }
    void main() { vec4 s = texture(u_tex, v_uv); o = vec4(linearToSrgb(s.rgb), s.a); }`,
  );
  gl.compileShader(fs);

  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  const vao = gl.createVertexArray()!;

  return { depthRenderbuffer, framebuffer, program, texture, vao };
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
    contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: true },
    pixelRatio,
  });

  if (options.registerUnlit !== false) registerUnlitGlMaterial(state);
  if (options.registerVertexColor) registerVertexColorGlMaterial(state);

  const gamma = options.gammaCorrect
    ? createGammaCorrectionPass(state.gl, Math.round(width * pixelRatio), Math.round(height * pixelRatio))
    : null;

  return {
    canvas,
    height,
    render(scene, camera, lights) {
      const gl = state.gl;

      if (gamma) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, gamma.framebuffer);
      }

      renderGlBackground(state);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.clearDepth(1);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      drawGlScene(state, scene, camera, lights);

      if (gamma) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.disable(gl.DEPTH_TEST);
        gl.useProgram(gamma.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, gamma.texture);
        gl.uniform1i(gl.getUniformLocation(gamma.program, 'u_tex'), 0);
        gl.bindVertexArray(gamma.vao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindVertexArray(null);
      }
    },
    scale: pixelRatio,
    state,
    width,
  };
}
