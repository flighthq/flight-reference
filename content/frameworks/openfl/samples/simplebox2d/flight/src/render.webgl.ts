import type { DisplayObject } from '@flighthq/sdk';
import {
  createCanvasShapeRasterizer,
  createCanvasTextureResolvers,
  createGlCanvasElement,
  createGlRenderState,
  createMatrix,
  defaultCanvasShapeCommands,
  defaultGlShapeRenderer,
  prepareScene2DRender,
  registerCanvasShapeCommands,
  registerGlShapeRasterizer,
  registerGlStandardMaterial,
  registerRenderer,
  renderGlBackground,
  renderGlScene2D,
  ShapeKind,
} from '@flighthq/sdk';

const pixelRatio = window.devicePixelRatio || 1;
export const canvas = createGlCanvasElement(500, 400, pixelRatio);
document.getElementById('app')?.remove();
document.body.appendChild(canvas);

export const state = createGlRenderState(canvas, {
  pixelRatio,
  sceneGraphSyncPolicy: 'requiresInvalidation',
  backgroundColor: 0xffffffff,
});
const resolvers = createCanvasTextureResolvers();
registerCanvasShapeCommands(defaultCanvasShapeCommands);
registerRenderer(state, ShapeKind, defaultGlShapeRenderer);
registerGlShapeRasterizer(state, createCanvasShapeRasterizer(resolvers, true));
registerGlStandardMaterial(state);
state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);
export const scale = 1;

export function render(root: DisplayObject): void {
  if (!prepareScene2DRender(state, root)) return;
  renderGlBackground(state);
  renderGlScene2D(state, root);
}
