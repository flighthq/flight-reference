import type { DisplayObject } from '@flighthq/sdk';
import {
  createCanvasShapeRasterizer,
  createCanvasTextureResolvers,
  defaultGlShapeCommands,
  ShapeKind,
  createGlCanvasElement,
  createGlRenderState,
  defaultGlShapeRenderer,
  prepareScene2DRender,
  registerGlStandardMaterial,
  registerGlShapeCommands,
  registerGlShapeRasterizer,
  registerRenderer,
  renderGlBackground,
  renderGlScene2D,
  createMatrix,
} from '@flighthq/sdk';

const pixelRatio = window.devicePixelRatio || 1;
const canvas = createGlCanvasElement(170, 170, pixelRatio);
document.getElementById('app')?.remove();
document.body.appendChild(canvas);

export const container = canvas;
export const state = createGlRenderState(canvas, {
  pixelRatio,
  sceneGraphSyncPolicy: 'requiresInvalidation',
  backgroundColor: 0xffffffff,
});
registerRenderer(state, ShapeKind, defaultGlShapeRenderer);
registerGlShapeCommands(defaultGlShapeCommands);
registerGlShapeRasterizer(state, createCanvasShapeRasterizer(createCanvasTextureResolvers(), true));
registerGlStandardMaterial(state);
state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);
export const scale = 1;

export function render(root: DisplayObject): void {
  if (!prepareScene2DRender(state, root)) return;
  renderGlBackground(state);
  renderGlScene2D(state, root);
}
