import type { Camera, GlRenderState, GlRenderTarget, SceneLights, SceneNode } from '@flighthq/sdk';
import {
  createGlCanvasElement,
  createGlRenderState,
  createGlRenderTarget,
  presentGlScene,
  registerBlinnPhongGlMaterial,
  registerStandardPbrGlMaterial,
  registerUnlitGlMaterial,
  resizeGlRenderTarget,
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
    backgroundColor: options.backgroundColor ?? 0x000000ff,
    contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: false },
    pixelRatio,
  });

  registerUnlitGlMaterial(state);
  registerBlinnPhongGlMaterial(state);
  registerStandardPbrGlMaterial(state);

  let renderTarget: GlRenderTarget | null = null;

  return {
    canvas,
    height,
    render(scene, camera, lights) {
      const w = canvas.width;
      const h = canvas.height;

      if (renderTarget === null) {
        renderTarget = createGlRenderTarget(state, { width: w, height: h, format: 'rgba16f', depth: 'depth-stencil' });
      } else {
        resizeGlRenderTarget(state, renderTarget, w, h);
      }

      presentGlScene(state, renderTarget, scene, camera, lights);
    },
    state,
    width,
  };
}
