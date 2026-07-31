import type { QuadBatch } from '@flighthq/sdk';
import {
  createGlCanvasElement,
  createGlRenderState,
  defaultGlQuadBatchRenderer,
  prepareScene2DRender,
  QuadBatchKind,
  registerStandardGlMaterial,
  registerStandardGlTextureResolvers,
  registerRenderer,
  renderGlBackground,
  renderGlScene2D,
  createMatrix,
} from '@flighthq/sdk';

const pixelRatio = window.devicePixelRatio || 1;
export const canvas = createGlCanvasElement(800, 600, pixelRatio);
document.getElementById('app')?.remove();
document.body.appendChild(canvas);

export const state = createGlRenderState(canvas, {
  pixelRatio,
  sceneGraphSyncPolicy: 'requiresInvalidation',
  backgroundColor: 0xffffffff,
});
registerRenderer(state, QuadBatchKind, defaultGlQuadBatchRenderer);
registerStandardGlMaterial(state);
registerStandardGlTextureResolvers(state);
state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);
export const scale = 1;

export function render(root: QuadBatch): void {
  if (!prepareScene2DRender(state, root)) return;
  renderGlBackground(state);
  renderGlScene2D(state, root);
}
