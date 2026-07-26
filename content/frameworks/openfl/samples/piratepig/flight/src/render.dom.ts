import { createBlurEffect } from '@flighthq/effects';
import type { DisplayObject } from '@flighthq/sdk';
import {
  BitmapKind,
  createDomRenderState,
  defaultCanvasBeginFill,
  defaultCanvasDrawRectangle,
  defaultCanvasEndFill,
  defaultDomBitmapRenderer,
  defaultDomShapeRenderer,
  defaultDomTextLabelRenderer,
  enableDomCssFilterSupport,
  prepareScene2DRender,
  registerCanvasShapeCommands,
  registerRenderer,
  renderDomBackground,
  renderDomScene2D,
  setDomCssFilter,
  ShapeKind,
  TextLabelKind,
} from '@flighthq/sdk';

export const container = document.createElement('div');
document.getElementById('app')?.remove();
document.body.appendChild(container);

export const state = createDomRenderState(container, {
  sceneGraphSyncPolicy: 'requiresInvalidation',
  backgroundColor: 0xffffffff,
});
registerRenderer(state, BitmapKind, defaultDomBitmapRenderer);
registerRenderer(state, ShapeKind, defaultDomShapeRenderer);
registerRenderer(state, TextLabelKind, defaultDomTextLabelRenderer);
registerCanvasShapeCommands([defaultCanvasBeginFill, defaultCanvasDrawRectangle, defaultCanvasEndFill]);
enableDomCssFilterSupport(state);
export const scale = 1;

export function setSize(w: number, h: number): void {
  container.style.width = `${w}px`;
  container.style.height = `${h}px`;
}

export function render(root: DisplayObject): void {
  if (!prepareScene2DRender(state, root)) return;
  renderDomBackground(state);
  renderDomScene2D(state, root);
}

// OpenFL: Background.filters = [new BlurFilter(10, 10)] — a CSS filter applied at draw. The
// returned callback is a no-op: the filter re-applies on every draw, so resizes need no re-bake.
export function applyBackgroundBlur(node: DisplayObject): () => void {
  const effect = createBlurEffect({ blurX: 10, blurY: 10 });
  const radius = Math.max(0, ((effect.blurX ?? 4) + (effect.blurY ?? 4)) / 2);
  setDomCssFilter(state, node, `blur(${radius}px)`);
  return () => {};
}
