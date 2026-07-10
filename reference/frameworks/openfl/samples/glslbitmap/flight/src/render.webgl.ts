import type { DisplayObject, GlRenderEffectPipeline, RenderEffect } from '@flighthq/sdk';
import {
  BitmapKind,
  beginGlRenderEffectPipeline,
  createGlCanvasElement,
  createGlRenderEffectPipeline,
  createGlRenderState,
  defaultGlBitmapRenderer,
  endGlRenderEffectPipeline,
  prepareDisplayObjectRender,
  registerCustomShaderGlRenderEffect,
  registerDefaultGlMaterial,
  registerRenderer,
  renderGlBackground,
  renderGlDisplayObject,
} from '@flighthq/sdk';

const pixelRatio = window.devicePixelRatio || 1;
const canvas = createGlCanvasElement(550, 400, pixelRatio);
document.getElementById('app')?.remove();
document.body.appendChild(canvas);

export const container = canvas;
export const state = createGlRenderState(canvas, {
  sceneGraphSyncPolicy: 'requiresInvalidation',
  backgroundColor: 0xffffffff,
});
registerRenderer(state, BitmapKind, defaultGlBitmapRenderer);
registerDefaultGlMaterial(state);
registerCustomShaderGlRenderEffect(state);

const pipeline: GlRenderEffectPipeline = createGlRenderEffectPipeline(state);

export const scale = pixelRatio;

export function render(root: DisplayObject, effects: ReadonlyArray<RenderEffect>): void {
  if (!prepareDisplayObjectRender(state, root)) return;
  beginGlRenderEffectPipeline(state, pipeline);
  renderGlBackground(state);
  renderGlDisplayObject(state, root);
  endGlRenderEffectPipeline(state, pipeline, effects);
}
