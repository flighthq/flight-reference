import type {
  Camera,
  GlRenderEffectPipeline,
  GlRenderState,
  GlRenderTarget,
  RenderEffect,
  SceneLights,
  SceneNode,
} from '@flighthq/sdk';
import {
  beginGlRenderEffectPipeline,
  createGlCanvasElement,
  createGlRenderEffectPipeline,
  createGlRenderState,
  createGlRenderTarget,
  drawGlScene,
  endGlRenderEffectPipeline,
  presentGlScene,
  registerBlinnPhongGlMaterial,
  registerDefaultGlRenderEffects,
  registerSpecularPbrGlMaterial,
  registerStandardPbrGlMaterial,
  registerUnlitGlMaterial,
  renderGlBackground,
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
  // Optional post-process stack. When non-empty, the frame renders through the SDK render-effect
  // pipeline (HDR scene target -> effects -> present) instead of presentGlScene. Applied in order,
  // e.g. [createToneMapEffect(), createVignetteEffect()].
  effects?: ReadonlyArray<RenderEffect>;
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

  const effects = options.effects ?? [];
  if (effects.length > 0) registerDefaultGlRenderEffects(state);

  let renderTarget: GlRenderTarget | null = null;
  let pipeline: GlRenderEffectPipeline | null = null;

  return {
    canvas,
    height,
    render(scene, camera, lights) {
      const w = canvas.width;
      const h = canvas.height;

      if (effects.length === 0) {
        if (renderTarget === null) {
          renderTarget = createGlRenderTarget(state, {
            width: w,
            height: h,
            format: 'rgba16f',
            depth: 'depth-stencil',
          });
        } else {
          resizeGlRenderTarget(state, renderTarget, w, h);
        }
        presentGlScene(state, renderTarget, scene, camera, lights);
        return;
      }

      // Effect-pipeline path: draw the scene into the pipeline's HDR target (it owns sizing,
      // background is ours to clear as presentGlScene would), then run the post-process stack.
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
    },
    state,
    width,
  };
}
