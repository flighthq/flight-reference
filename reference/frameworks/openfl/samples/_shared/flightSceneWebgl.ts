import { drawGlScene } from '@flighthq/scene-gl';
import type { Camera, GlRenderState, SceneLights, SceneNode } from '@flighthq/sdk';
import {
  createGlCanvasElement,
  createGlRenderState,
  registerUnlitGlMaterial,
  registerVertexColorGlMaterial,
  renderGlBackground,
} from '@flighthq/sdk';

import { registerPassthroughGlMaterial } from './flightPassthroughMaterial';

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
    contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: true },
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
      drawGlScene(state, scene, camera, lights);
    },
    scale: pixelRatio,
    state,
    width,
  };
}
