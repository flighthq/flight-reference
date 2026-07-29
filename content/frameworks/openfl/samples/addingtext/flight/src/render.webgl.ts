import type { DisplayObject } from '@flighthq/sdk';
import {
  createGlCanvasElement,
  createGlRenderState,
  defaultGlTextLabelRenderer,
  prepareScene2DRender,
  registerStandardGlMaterial,
  registerRenderer,
  renderGlBackground,
  renderGlScene2D,
  TextLabelKind,
  createMatrix,
} from '@flighthq/sdk';

const pixelRatio = window.devicePixelRatio || 1;
const canvas = createGlCanvasElement(800, 600, pixelRatio);
document.getElementById('app')?.remove();
document.body.appendChild(canvas);

export const state = createGlRenderState(canvas, {
  pixelRatio,
  sceneGraphSyncPolicy: 'requiresInvalidation',
  backgroundColor: 0xffffffff,
});
registerRenderer(state, TextLabelKind, defaultGlTextLabelRenderer);
registerStandardGlMaterial(state);
state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);
export const scale = 1;

export function render(root: DisplayObject): void {
  if (!prepareScene2DRender(state, root)) return;
  renderGlBackground(state);
  renderGlScene2D(state, root);
}
