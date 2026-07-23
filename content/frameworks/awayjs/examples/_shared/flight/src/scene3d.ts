import type {
  Adjustment,
  Camera3D,
  Environment,
  GlRenderEffectPipeline,
  GlRenderState,
  RenderEffect,
  SceneLights,
  SceneNode,
} from '@flighthq/sdk';
import {
  beginGlRenderEffectPipeline,
  createGlCanvasElement,
  createGlRenderEffectPipeline,
  createGlRenderState,
  drawGlEnvironmentSkybox,
  drawGlScene,
  endGlRenderEffectPipeline,
  registerBlinnPhongGlMaterial,
  registerDefaultGlRenderEffects,
  registerSpecularPbrGlMaterial,
  registerStandardPbrGlMaterial,
  registerUnlitGlMaterial,
  renderGlBackground,
} from '@flighthq/sdk';
import { createGlFrameVerifier } from './verify';

export interface Scene3DContext {
  canvas: HTMLCanvasElement;
  height: number;
  render: (scene: Readonly<SceneNode>, camera: Readonly<Camera3D>, lights: Readonly<SceneLights>) => void;
  state: GlRenderState;
  width: number;
}

export interface Scene3DOptions {
  backgroundColor?: number;
  height?: number;
  width?: number;
  effects?: ReadonlyArray<RenderEffect | Adjustment>;
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
  registerSpecularPbrGlMaterial(state);

  const verifyFrame = createGlFrameVerifier(state);

  const effects = options.effects ?? [];
  registerDefaultGlRenderEffects(state);

  let pipeline: GlRenderEffectPipeline | null = null;

  return {
    canvas,
    height,
    render(scene, camera, lights) {
      if (pipeline === null) {
        pipeline = createGlRenderEffectPipeline(state, { format: 'rgba16f', depth: 'depth-stencil' });
      }
      beginGlRenderEffectPipeline(state, pipeline);
      renderGlBackground(state);
      const gl = state.gl;
      gl.depthMask(true);
      gl.clearDepth(1);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      drawGlScene(state, scene, camera, lights);
      endGlRenderEffectPipeline(state, pipeline, effects);

      verifyFrame();
    },
    state,
    width,
  };
}

export interface SkyboxRenderState {
  pipeline: GlRenderEffectPipeline | null;
}

export function renderSkyboxScene(
  state: GlRenderState,
  canvas: HTMLCanvasElement,
  ref: SkyboxRenderState,
  environment: Readonly<Environment>,
  scene: Readonly<SceneNode>,
  camera: Readonly<Camera3D>,
  lights: Readonly<SceneLights>,
): void {
  if (ref.pipeline === null) {
    ref.pipeline = createGlRenderEffectPipeline(state, { format: 'rgba16f', depth: 'depth-stencil' });
  }
  beginGlRenderEffectPipeline(state, ref.pipeline);
  renderGlBackground(state);
  const gl = state.gl;
  gl.depthMask(true);
  gl.clearDepth(1);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  drawGlEnvironmentSkybox(state, environment, camera, canvas.width / canvas.height);
  drawGlScene(state, scene, camera, lights);
  endGlRenderEffectPipeline(state, ref.pipeline, []);
}
