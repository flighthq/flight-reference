import { drawGlScene } from '@flighthq/scene-gl';
import type { Camera, GlRenderEffectPipeline, GlRenderState, SceneLights, SceneNode } from '@flighthq/sdk';
import {
  beginGlRenderEffectPipeline,
  createGlCanvasElement,
  createGlRenderEffectPipeline,
  createGlRenderState,
  endGlRenderEffectPipeline,
  prepareSceneRender,
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
  height?: number;
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
    contextAttributes: { alpha: false, preserveDrawingBuffer: true },
    pixelRatio,
  });

  if (options.registerUnlit !== false) registerUnlitGlMaterial(state);
  if (options.registerVertexColor) registerVertexColorGlMaterial(state);

  const pipeline: GlRenderEffectPipeline = createGlRenderEffectPipeline(state, {
    depth: 'depth-stencil',
    format: 'rgba16f',
    sampleCount: 4,
  });

  return {
    canvas,
    height,
    render(scene, camera, lights) {
      beginGlRenderEffectPipeline(state, pipeline);
      renderGlBackground(state);
      const gl = state.gl;
      gl.depthMask(true);
      gl.clearDepth(1);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      prepareSceneRender(state, scene, camera, lights);
      drawGlScene(state, scene, camera, lights);
      endGlRenderEffectPipeline(state, pipeline, []);
    },
    scale: pixelRatio,
    state,
    width,
  };
}
