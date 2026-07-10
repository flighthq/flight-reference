import type { DisplayObject } from '@flighthq/sdk';
import {
  ShapeKind,
  createGlCanvasElement,
  createGlRenderState,
  defaultGlDrawCircle,
  defaultGlLineStyle,
  defaultGlLineTo,
  defaultGlMoveTo,
  defaultGlShapeRenderer,
  prepareDisplayObjectRender,
  registerDefaultGlMaterial,
  registerGlShapeCommands,
  registerRenderer,
  renderGlBackground,
  renderGlDisplayObject,
} from '@flighthq/sdk';

const pixelRatio = window.devicePixelRatio || 1;
const canvas = createGlCanvasElement(170, 170, pixelRatio);
document.getElementById('app')?.remove();
document.body.appendChild(canvas);

export const container = canvas;
export const state = createGlRenderState(canvas, {
  sceneGraphSyncPolicy: 'requiresInvalidation',
  backgroundColor: 0xffffffff,
});
registerRenderer(state, ShapeKind, defaultGlShapeRenderer);
registerGlShapeCommands([defaultGlDrawCircle, defaultGlLineStyle, defaultGlLineTo, defaultGlMoveTo]);
registerDefaultGlMaterial(state);
export const scale = pixelRatio;

export function render(root: DisplayObject): void {
  if (!prepareDisplayObjectRender(state, root)) return;
  renderGlBackground(state);
  renderGlDisplayObject(state, root);
}
