import type { Camera, GlRenderState, SceneLights, SceneNode } from '@flighthq/sdk';
import {
  drawGlScene,
  createGlCanvasElement,
  createGlRenderState,
  registerBlinnPhongGlMaterial,
  registerUnlitGlMaterial,
  renderGlBackground,
} from '@flighthq/sdk';

export interface Scene3DContext {
  canvas: HTMLCanvasElement;
  height: number;
  render: (scene: Readonly<SceneNode>, camera: Readonly<Camera>, lights: Readonly<SceneLights>) => void;
  state: GlRenderState;
  width: number;
}

export interface Scene3DOptions {
  backgroundColor?: number;
  height?: number;
  width?: number;
}

export function createScene3DContext(options: Readonly<Scene3DOptions> = {}): Scene3DContext {
  const width = options.width ?? 800;
  const height = options.height ?? 600;
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
    backgroundColor: options.backgroundColor ?? 0xff000000,
    contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: true },
    pixelRatio,
  });

  registerUnlitGlMaterial(state);
  registerBlinnPhongGlMaterial(state);

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
    state,
    width,
  };
}
