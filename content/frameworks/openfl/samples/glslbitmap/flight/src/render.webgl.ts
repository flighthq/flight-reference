import { applyCustomShaderEffectToGl, registerGlCustomShaderSource } from '@flighthq/effects-gl/contract';
import type { CustomShaderEffect, DisplayObject, GlRenderEffectPipeline, RenderEffect } from '@flighthq/sdk';
import {
  beginGlRenderEffectPipeline,
  createGlCanvasElement,
  createGlRenderEffectPipeline,
  createGlRenderState,
  defaultGlSpriteRenderer,
  endGlRenderEffectPipeline,
  prepareScene2DRender,
  registerGlRenderEffect,
  registerGlStandardMaterial,
  registerStandardGlTextureResolvers,
  registerRenderer,
  renderGlBackground,
  renderGlScene2D,
  SpriteKind,
  createMatrix,
} from '@flighthq/sdk';

const pixelRatio = window.devicePixelRatio || 1;
const canvas = createGlCanvasElement(800, 600, pixelRatio);
document.getElementById('app')?.remove();
document.body.appendChild(canvas);

export const container = canvas;
export const state = createGlRenderState(canvas, {
  pixelRatio,
  sceneGraphSyncPolicy: 'requiresInvalidation',
  backgroundColor: 0xffffffff,
});
registerStandardGlTextureResolvers(state);
registerRenderer(state, SpriteKind, defaultGlSpriteRenderer);
registerGlStandardMaterial(state);
registerGlRenderEffect(state, 'CustomShaderEffect', (context, effect) => {
  applyCustomShaderEffectToGl(context.state, context.source, context.dest, effect as CustomShaderEffect);
});

const pipeline: GlRenderEffectPipeline = createGlRenderEffectPipeline(state);

state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);
export const scale = 1;

export function registerCustomShader(shaderKey: string, fragmentSource: string): void {
  registerGlCustomShaderSource(state, shaderKey, fragmentSource);
}

export function render(root: DisplayObject, effects: ReadonlyArray<RenderEffect>): void {
  if (!prepareScene2DRender(state, root)) return;
  beginGlRenderEffectPipeline(state, pipeline);
  renderGlBackground(state);
  renderGlScene2D(state, root);
  endGlRenderEffectPipeline(state, pipeline, effects);
}
