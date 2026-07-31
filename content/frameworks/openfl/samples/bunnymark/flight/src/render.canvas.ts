import type { QuadBatch } from '@flighthq/sdk';
import {
  createCanvasElement,
  createCanvasRenderState,
  defaultCanvasQuadBatchRenderer,
  prepareScene2DRender,
  QuadBatchKind,
  registerCanvasImageTextureResolver,
  registerRenderer,
  renderCanvasBackground,
  renderCanvasScene2D,
  createMatrix,
} from '@flighthq/sdk';

const pixelRatio = window.devicePixelRatio || 1;
export const canvas = createCanvasElement(800, 600, pixelRatio);
document.getElementById('app')?.remove();
document.body.appendChild(canvas);

export const state = createCanvasRenderState(canvas, {
  pixelRatio,
  sceneGraphSyncPolicy: 'requiresInvalidation',
  backgroundColor: 0xffffffff,
});
registerRenderer(state, QuadBatchKind, defaultCanvasQuadBatchRenderer);
registerCanvasImageTextureResolver(state);
state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);
export const scale = 1;

export function render(root: QuadBatch): void {
  if (!prepareScene2DRender(state, root)) return;
  renderCanvasBackground(state);
  renderCanvasScene2D(state, root);
}
