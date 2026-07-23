import type { DisplayObject } from '@flighthq/sdk';
import {
  BitmapKind,
  createGlRenderState,
  defaultGlBitmapRenderer,
  defaultGlRichTextRenderer,
  prepareDisplayObjectRender,
  registerDefaultGlMaterial,
  registerRenderer,
  renderGlBackground,
  renderGlDisplayObject,
  RichTextKind,
  createMatrix,
} from '@flighthq/sdk';

const WIDTH = 800;
const HEIGHT = 600;
const pixelRatio = window.devicePixelRatio || 1;
const canvas = document.createElement('canvas');
canvas.width = WIDTH * pixelRatio;
canvas.height = HEIGHT * pixelRatio;
canvas.style.width = `${WIDTH}px`;
canvas.style.height = `${HEIGHT}px`;
canvas.style.display = 'block';
document.body.style.margin = '0';
document.getElementById('app')?.remove();
document.body.appendChild(canvas);

export const state = createGlRenderState(canvas, {
  pixelRatio,
  backgroundColor: 0xa0a0a0ff,
  sceneGraphSyncPolicy: 'requiresInvalidation',
});
registerRenderer(state, BitmapKind, defaultGlBitmapRenderer);
registerRenderer(state, RichTextKind, defaultGlRichTextRenderer);
registerDefaultGlMaterial(state);
state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);
export const scale = 1;

export function render(root: DisplayObject): void {
  if (!prepareDisplayObjectRender(state, root)) return;
  renderGlBackground(state);
  renderGlDisplayObject(state, root);
}
