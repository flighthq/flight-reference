import type { DisplayObject } from '@flighthq/sdk';
import {
  BitmapKind,
  createGlCanvasElement,
  createGlRenderState,
  defaultGlBitmapRenderer,
  defaultGlShapeCommands,
  defaultGlShapeRenderer,
  defaultGlTextLabelRenderer,
  prepareScene2DRender,
  registerStandardGlMaterial,
  registerGlShapeCommands,
  registerRenderer,
  renderGlBackground,
  renderGlScene2D,
  ShapeKind,
  TextLabelKind,
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
registerRenderer(state, BitmapKind, defaultGlBitmapRenderer);
registerRenderer(state, ShapeKind, defaultGlShapeRenderer);
registerRenderer(state, TextLabelKind, defaultGlTextLabelRenderer);
registerGlShapeCommands(defaultGlShapeCommands);
registerStandardGlMaterial(state);

state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);
export const scale = 1;

export function render(root: DisplayObject): void {
  if (!prepareScene2DRender(state, root)) return;
  renderGlBackground(state);
  renderGlScene2D(state, root);
}
