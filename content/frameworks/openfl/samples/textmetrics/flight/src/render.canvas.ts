import type { DisplayObject } from '@flighthq/sdk';
import {
  createCanvasRenderState,
  defaultCanvasRichTextRenderer,
  defaultCanvasBeginFill,
  defaultCanvasDrawRectangle,
  defaultCanvasShapeRenderer,
  prepareScene2DRender,
  registerCanvasShapeCommands,
  registerRenderer,
  renderCanvasBackground,
  renderCanvasScene2D,
  RichTextKind,
  ShapeKind,
  createMatrix,
} from '@flighthq/sdk';

const pixelRatio = window.devicePixelRatio || 1;
const canvas = document.createElement('canvas');
canvas.width = 800 * pixelRatio;
canvas.height = 600 * pixelRatio;
canvas.style.width = '800px';
canvas.style.height = '600px';
document.body.style.margin = '0';
document.getElementById('app')?.remove();
document.body.appendChild(canvas);

export const container = canvas;
export const state = createCanvasRenderState(canvas, {
  sceneGraphSyncPolicy: 'requiresInvalidation',
  backgroundColor: 0xa0a0a0ff,
  pixelRatio,
});
registerRenderer(state, RichTextKind, defaultCanvasRichTextRenderer);
registerRenderer(state, ShapeKind, defaultCanvasShapeRenderer);
registerCanvasShapeCommands([defaultCanvasBeginFill, defaultCanvasDrawRectangle]);
state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);
export const scale = 1;

export function render(root: DisplayObject): void {
  if (!prepareScene2DRender(state, root)) return;
  renderCanvasBackground(state);
  renderCanvasScene2D(state, root);
}

export function setSize(w: number, h: number): void {
  canvas.width = w * pixelRatio;
  canvas.height = h * pixelRatio;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
}
