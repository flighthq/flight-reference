import { createBlurEffect } from '@flighthq/effects';
import type { DisplayObject } from '@flighthq/sdk';
import {
  BitmapKind,
  createCanvasRenderState,
  defaultCanvasBitmapRenderer,
  defaultCanvasBeginFill,
  defaultCanvasDrawRectangle,
  defaultCanvasEndFill,
  defaultCanvasShapeRenderer,
  defaultCanvasTextLabelRenderer,
  enableCanvasCssFilter,
  prepareScene2DRender,
  registerCanvasShapeCommands,
  registerRenderer,
  renderCanvasBackground,
  renderCanvasScene2D,
  setCanvasCssFilter,
  ShapeKind,
  TextLabelKind,
  createMatrix,
} from '@flighthq/sdk';

const pixelRatio = window.devicePixelRatio || 1;
const canvas = document.createElement('canvas');
canvas.width = window.innerWidth * pixelRatio;
canvas.height = window.innerHeight * pixelRatio;
canvas.style.width = `${window.innerWidth}px`;
canvas.style.height = `${window.innerHeight}px`;
document.getElementById('app')?.remove();
document.body.appendChild(canvas);

export const container = canvas;
export const state = createCanvasRenderState(canvas, {
  pixelRatio,
  sceneGraphSyncPolicy: 'requiresInvalidation',
  backgroundColor: 0xffffffff,
});
registerRenderer(state, BitmapKind, defaultCanvasBitmapRenderer);
registerRenderer(state, ShapeKind, defaultCanvasShapeRenderer);
registerRenderer(state, TextLabelKind, defaultCanvasTextLabelRenderer);
registerCanvasShapeCommands([defaultCanvasBeginFill, defaultCanvasDrawRectangle, defaultCanvasEndFill]);
enableCanvasCssFilter(state);
state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);
export const scale = 1;

export function setSize(w: number, h: number): void {
  canvas.width = w * pixelRatio;
  canvas.height = h * pixelRatio;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
}

export function render(root: DisplayObject): void {
  if (!prepareScene2DRender(state, root)) return;
  renderCanvasBackground(state);
  renderCanvasScene2D(state, root);
}

// OpenFL: Background.filters = [new BlurFilter(10, 10)] — a CSS filter applied at draw. The
// returned callback is a no-op: the filter re-applies on every draw, so resizes need no re-bake.
export function applyBackgroundBlur(node: DisplayObject): () => void {
  const effect = createBlurEffect({ blurX: 10, blurY: 10 });
  const radius = Math.max(0, ((effect.blurX ?? 4) + (effect.blurY ?? 4)) / 2);
  setCanvasCssFilter(state, node, `blur(${radius}px)`);
  return () => {};
}
