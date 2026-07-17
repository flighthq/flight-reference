import type { Camera, GlRenderState, SceneLights, SceneNode } from '@flighthq/sdk';
import {
  drawGlScene,
  createGlCanvasElement,
  createGlRenderState,
  registerBlinnPhongGlMaterial,
  registerStandardPbrGlMaterial,
  registerUnlitGlMaterial,
  renderGlBackground,
} from '@flighthq/sdk';

import type { GammaTarget } from './gamma';
import { beginGammaPass, createGammaTarget, endGammaPass, resizeGammaTarget } from './gamma';

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
    contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: true },
    pixelRatio,
  });

  registerUnlitGlMaterial(state);
  registerBlinnPhongGlMaterial(state);
  registerStandardPbrGlMaterial(state);

  let gammaTarget: GammaTarget | null = null;

  return {
    canvas,
    height,
    render(scene, camera, lights) {
      const gl = state.gl;
      const w = canvas.width;
      const h = canvas.height;

      if (gammaTarget === null) {
        gammaTarget = createGammaTarget(gl, w, h);
      } else {
        resizeGammaTarget(gl, gammaTarget, w, h);
      }

      beginGammaPass(gl, gammaTarget);
      renderGlBackground(state);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.clearDepth(1);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      drawGlScene(state, scene, camera, lights);
      endGammaPass(gl, gammaTarget);
    },
    state,
    width,
  };
}
