import type { DisplayObject } from '@flighthq/sdk';
import {
  BitmapKind,
  createGlCanvasElement,
  createGlRenderState,
  defaultGlBitmapRenderer,
  prepareDisplayObjectRender,
  registerDefaultGlMaterial,
  registerRenderer,
  renderGlBackground,
  renderGlDisplayObject,
} from '@flighthq/sdk';

const pixelRatio = window.devicePixelRatio || 1;
const canvas = createGlCanvasElement(400, 400, pixelRatio);
document.getElementById('app')?.remove();
document.body.appendChild(canvas);

export const state = createGlRenderState(canvas, {
  sceneGraphSyncPolicy: 'requiresInvalidation',
  backgroundColor: 0xffffffff,
  imageSmoothingEnabled: false,
});
registerRenderer(state, BitmapKind, defaultGlBitmapRenderer);
registerDefaultGlMaterial(state);
export const scale = pixelRatio;

export function render(root: DisplayObject): void {
  if (!prepareDisplayObjectRender(state, root)) return;
  renderGlBackground(state);
  renderGlDisplayObject(state, root);
}
