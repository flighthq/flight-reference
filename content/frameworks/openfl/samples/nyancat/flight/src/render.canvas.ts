import type { DisplayObject } from '@flighthq/sdk';
import {
  SpriteKind,
  createCanvasElement,
  createCanvasRenderState,
  defaultCanvasSpriteRenderer,
  prepareScene2DRender,
  registerCanvasImageTextureResolver,
  registerRenderer,
  renderCanvasBackground,
  renderCanvasScene2D,
  createMatrix,
} from '@flighthq/sdk';

const pixelRatio = window.devicePixelRatio || 1;
const canvas = createCanvasElement(600, 600, pixelRatio);
document.getElementById('app')?.remove();
document.body.appendChild(canvas);

export const state = createCanvasRenderState(canvas, {
  pixelRatio,
  sceneGraphSyncPolicy: 'requiresInvalidation',
  backgroundColor: 0xffffffff,
  imageSmoothingEnabled: false,
});
registerRenderer(state, SpriteKind, defaultCanvasSpriteRenderer);
registerCanvasImageTextureResolver(state);
state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);
export const scale = 1;

export function render(root: DisplayObject): void {
  if (!prepareScene2DRender(state, root)) return;
  renderCanvasBackground(state);
  renderCanvasScene2D(state, root);
}
